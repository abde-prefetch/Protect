require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildWebhooks,
  ],
});

client.db = require('./db.js');

// Chargement des événements
const eventsPath = path.join(__dirname, 'events');
if (!fs.existsSync(eventsPath)) fs.mkdirSync(eventsPath);

const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Serveur HTTP pour Render/UptimeRobot
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('S-V Guard is running!');
}).listen(process.env.PORT || 3000, () => {
  console.log(`📡 S-V Guard Web Server actif sur le port ${process.env.PORT || 3000}`);
});

// Écouteurs de debug pour comprendre le blocage Discord
client.on('debug', m => console.log(`[Discord Debug] ${m}`));
client.on('error', e => console.error(`[Discord Error]`, e));

console.log("[Diagnostic] Test de connexion HTTP vers l'API de Discord...");
fetch('https://discord.com/api/v10/gateway/bot', {
  headers: { Authorization: `Bot ${process.env.TOKEN}` }
})
  .then(res => {
    console.log(`[Diagnostic] Statut HTTP Discord: ${res.status} (${res.statusText})`);
    return res.json();
  })
  .then(data => console.log(`[Diagnostic] Réponse API Discord reçue avec succès.`))
  .catch(err => console.error(`[Diagnostic] Échec de la connexion HTTP vers Discord:`, err));

client.login(process.env.TOKEN);
