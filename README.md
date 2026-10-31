# JASON BOT — WhatsApp

Assistant WhatsApp automatique connecté à l'API IA de Jason Aloma.

**Identité :** Jason Bot  
**Créateur :** Jason Aloma, développeur congolais 🇨🇩  
**Compte à connecter :** +243 847 500 590  
**API IA :** https://davbot-v3.vercel.app/api/intelligence-artificielle/ask

## Important : sécurité de l'archive d'origine

L'archive `Keith-main.zip` fournie contenait notamment un `index.js` obfusqué qui télécharge du code distant puis l'exécute avec `eval`, ainsi que d'autres fichiers obfusqués. Ce comportement est dangereux et le code d'origine n'a pas été conservé. Cette archive Jason Bot est une base propre et minimale. N'utilise pas l'ancienne session chiffrée.

## Installation

Il faut un hébergement ou un ordinateur avec **Node.js 20 ou plus** et une connexion Internet stable. Le téléphone Android seul, avec TrebEdit, ne suffit pas à maintenir un bot WhatsApp actif 24h/24. Utilise un hébergement Node.js qui permet un processus permanent et un stockage persistant pour `session/`.

1. Décompresse ce ZIP.
2. Copie `.env.example` vers `.env` et vérifie `OWNER_NUMBER=243847500590`.
3. Installe les dépendances :
   ```bash
   npm install
   ```
4. Lance :
   ```bash
   npm start
   ```
5. Dans le terminal, récupère le code de jumelage affiché.
6. Sur le WhatsApp du numéro indiqué : **Appareils connectés → Connecter un appareil → Lier avec un numéro de téléphone**, puis saisis le code.

La session est enregistrée dans `session/`. Ne partage jamais ce dossier : il donne accès au compte WhatsApp connecté. Active un stockage persistant sur l'hébergement pour ne pas perdre la session lors d'un redémarrage.

## Utilisation

- Les messages privés entrants reçoivent une réponse IA.
- Les groupes sont ignorés par défaut.
- `!menu` ou `!aide` : menu.
- `!reset` : efface le contexte temporaire de la discussion.
- `!humain` : indique au client que Jason lui répondra dès qu'il sera disponible.
- Le bot indique clairement qu'il est automatisé et qu'il a été créé par Jason Aloma 🇨🇩.

## API IA

Le bot envoie un POST JSON côté serveur (pas de problème CORS navigateur) avec `message`, `knowledge`, `rules` et `history`. Le code accepte les champs de réponse usuels `answer`, `response`, `message`, `result`, `text`, `output`, `data.answer` et `data.response`. Si ton API renvoie un autre format, adapte `askAI()` dans `index.js`.

## Déploiement

Déploie ce dossier sur un hébergement Node.js compatible avec les connexions WebSocket sortantes et un processus permanent. Configure les variables de `.env` dans le tableau de bord de l'hébergeur. Ne publie jamais `.env` ou `session/`.

WhatsApp peut limiter ou déconnecter les automatisations non officielles. Utilise le compte avec le consentement de son propriétaire et respecte les règles WhatsApp. Pour un usage professionnel à grande échelle, privilégie l'API officielle WhatsApp Business Platform.
