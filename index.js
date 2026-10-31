require('dotenv').config();
const {
  default: makeWASocket, useMultiFileAuthState, DisconnectReason,
  fetchLatestBaileysVersion, jidNormalizedUser
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const BOT_NAME = process.env.BOT_NAME || 'Jason Bot';
const OWNER_NUMBER = (process.env.OWNER_NUMBER || '243847500590').replace(/\D/g, '');
const AI_URL = process.env.AI_URL || 'https://davbot-v3.vercel.app/api/intelligence-artificielle/ask';
const PREFIX = process.env.PREFIX || '!';
const AUTH_DIR = path.join(__dirname, 'session');
const CREATOR = 'Je suis Jason Bot, créé par Jason Aloma, un développeur congolais 🇨🇩.';
const RULES = `Tu es ${BOT_NAME}, assistant WhatsApp officiel de Jason Aloma. Réponds en français, avec politesse, naturellement et clairement. Tu aides les clients même lorsque Jason est absent. Présente-toi comme un assistant automatisé, jamais comme Jason lui-même. Pour les demandes nécessitant une décision, un paiement, un prix non confirmé, un délai ou une intervention humaine, dis que Jason Aloma confirmera. Ne demande jamais de mot de passe, code WhatsApp, code bancaire ou code OTP. Si on te demande qui t'a créé, réponds exactement : ${CREATOR} Ne prétends pas qu'une commande, un paiement ou une réservation est confirmé sans preuve.`;

const history = new Map();
const HISTORY_LIMIT = 8;
const processed = new Set();

function getText(msg) {
  const m = msg.message || {};
  return m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption || '';
}
function getHistory(jid) {
  if (!history.has(jid)) history.set(jid, []);
  return history.get(jid);
}
async function askAI(jid, message) {
  const h = getHistory(jid);
  const payload = {
    message,
    knowledge: `Nom du bot : ${BOT_NAME}. Créateur : Jason Aloma, développeur congolais 🇨🇩. Numéro WhatsApp professionnel fourni par le propriétaire : +${OWNER_NUMBER}. Le bot répond aux clients pendant l'absence du propriétaire. Ne révèle pas de données privées.`,
    rules: RULES,
    history: h.slice(-HISTORY_LIMIT).map(x => ({ role: x.role, content: x.content }))
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(AI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const raw = await response.text();
    if (!response.ok) throw new Error(`API ${response.status}: ${raw.slice(0,250)}`);
    let data;
    try { data = JSON.parse(raw); } catch { data = { response: raw }; }
    const answer = data.answer || data.response || data.message || data.result ||
      data.text || data.output || data.data?.answer || data.data?.response;
    if (typeof answer !== 'string' || !answer.trim()) {
      throw new Error('Format de réponse API non reconnu : ' + raw.slice(0,300));
    }
    h.push({ role: 'user', content: message }, { role: 'assistant', content: answer.trim() });
    if (h.length > HISTORY_LIMIT * 2) h.splice(0, h.length - HISTORY_LIMIT * 2);
    return answer.trim();
  } finally { clearTimeout(timeout); }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch {}
  const sock = makeWASocket({
    ...(version ? { version } : {}),
    auth: state,
    logger: pino({ level: process.env.LOG_LEVEL || 'silent' }),
    printQRInTerminal: false,
    browser: [BOT_NAME, 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\nScanne ce QR avec WhatsApp > Appareils connectés > Connecter un appareil :');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      console.log(`✅ ${BOT_NAME} connecté. Créateur : Jason Aloma 🇨🇩`);
      console.log('Compte WhatsApp :', sock.user?.id || 'connecté');
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        console.log('Connexion interrompue. Reconnexion...');
        setTimeout(startBot, 4000);
      } else {
        console.log('Session déconnectée. Supprime le dossier session et reconnecte le compte.');
      }
    }
  });

  // Code de jumelage facultatif : demander un code depuis le terminal si activé.
  if (!state.creds.registered && process.env.PAIRING_CODE === 'true') {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(OWNER_NUMBER);
        console.log(`\nCode de jumelage WhatsApp pour +${OWNER_NUMBER} : ${code}\n`);
      } catch (e) { console.error('Impossible de générer le code de jumelage :', e.message); }
    }, 2500);
  }

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      if (!m.message || m.key.fromMe || m.key.remoteJid === 'status@broadcast') continue;
      const jid = m.key.remoteJid;
      // Répondre uniquement aux conversations privées pour éviter le spam dans les groupes.
      if (jid.endsWith('@g.us')) continue;
      const id = m.key.id;
      if (!id || processed.has(id)) continue;
      processed.add(id);
      if (processed.size > 500) processed.clear();

      const text = getText(m).trim();
      if (!text) continue;
      const sender = jidNormalizedUser(m.key.participant || jid);
      const command = text.toLowerCase();

      if (command === `${PREFIX}menu` || command === `${PREFIX}aide`) {
        await sock.sendMessage(jid, { text:
`🤖 *${BOT_NAME.toUpperCase()}*

Je suis l'assistant automatique de Jason Aloma 🇨🇩.

• Écris directement ta question pour parler avec l'IA.
• ${PREFIX}menu : afficher ce menu
• ${PREFIX}reset : effacer le contexte de cette discussion
• ${PREFIX}humain : demander à parler à Jason

👨🏽‍💻 Créé par Jason Aloma, développeur congolais 🇨🇩.` }, { quoted: m });
        continue;
      }
      if (command === `${PREFIX}reset`) {
        history.delete(jid);
        await sock.sendMessage(jid, { text: '🧹 Notre conversation a été réinitialisée. Comment puis-je t’aider ?' }, { quoted: m });
        continue;
      }
      if (command === `${PREFIX}humain`) {
        await sock.sendMessage(jid, { text: `📩 Ta demande a été notée. Jason Aloma te répondra dès qu’il sera disponible.\n\n${CREATOR}` }, { quoted: m });
        continue;
      }

      try {
        await sock.sendPresenceUpdate('composing', jid);
        const answer = await askAI(sender, text);
        await sock.sendMessage(jid, { text: answer }, { quoted: m });
      } catch (err) {
        console.error('Erreur IA:', err.message);
        await sock.sendMessage(jid, { text: `Désolé, je rencontre un problème temporaire avec mon assistant IA. Réessaie dans quelques instants ou écris ${PREFIX}humain pour demander Jason.\n\n— ${BOT_NAME}` }, { quoted: m });
      } finally {
        try { await sock.sendPresenceUpdate('paused', jid); } catch {}
      }
    }
  });
}

const app = require('express')();
app.get('/', (_req, res) => res.type('text').send(`${BOT_NAME} — bot WhatsApp actif. Créé par Jason Aloma 🇨🇩.`));
app.get('/health', (_req, res) => res.json({ ok: true, bot: BOT_NAME, creator: 'Jason Aloma 🇨🇩' }));
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`Health server: http://localhost:${port}/health`));

startBot().catch(err => { console.error('Erreur de démarrage:', err); process.exit(1); });
