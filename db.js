const mongoose = require('mongoose');

// Le lien de connexion fourni par le propriétaire
const MONGO_URI = "mongodb+srv://helixo131_db_user:EB4fZP8i01cA8L5v@cluster0.k2zsim5.mongodb.net/protect_bot?retryWrites=true&w=majority";

const GuildConfigSchema = new mongoose.Schema({
  guildId: String,
  config: Object
});

const GlobalDataSchema = new mongoose.Schema({
  id: { type: String, default: 'global' },
  data: Object
});

const GuildConfig = mongoose.model('GuildConfig', GuildConfigSchema);
const GlobalData = mongoose.model('GlobalData', GlobalDataSchema);

let cachedData = {};

// Connexion à MongoDB
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log("✅ [DB] Connecté à MongoDB Atlas");
    
    // Charger toutes les données en mémoire
    const guilds = await GuildConfig.find();
    for (const g of guilds) {
      cachedData[g.guildId] = g.config;
    }
    
    const global = await GlobalData.findOne({ id: 'global' });
    if (global) cachedData.global = global.data;
  })
  .catch(err => console.error("❌ [DB] Erreur de connexion à MongoDB :", err));

// Sauvegarde asynchrone sur le cloud
function saveToMongo(guildId) {
  if (guildId === 'global') {
    GlobalData.findOneAndUpdate(
      { id: 'global' },
      { data: cachedData.global },
      { upsert: true, new: true }
    ).catch(err => console.error("[DB] Erreur save global:", err));
  } else {
    GuildConfig.findOneAndUpdate(
      { guildId },
      { config: cachedData[guildId] },
      { upsert: true, new: true }
    ).catch(err => console.error(`[DB] Erreur save guild ${guildId}:`, err));
  }
}

module.exports = {
  getGuildConfig(guildId) {
    if (!cachedData[guildId]) {
      cachedData[guildId] = {
        prefix: '&', // Préfixe par défaut du bot Protect
        whitelist: [],
        blacklist: [],
        ownerRoles: [],
        adminRoles: [],
        logsChannel: null,
        antiLink: true,
        antiSpam: true,
        antiMassPing: true,
        antiRaid: true,
        antiInvite: false,
        antiAlt: false,
        piconlyChannels: [],
        badwords: [],
        mutedRole: null,
        backups: [],
        theme: '#5865F2'
      };
      saveToMongo(guildId);
    }
    return cachedData[guildId];
  },
  
  updateGuildConfig(guildId, newConfig) {
    cachedData[guildId] = { ...this.getGuildConfig(guildId), ...newConfig };
    saveToMongo(guildId);
    return cachedData[guildId];
  },

  getGlobalData() {
    if (!cachedData.global) {
      cachedData.global = {
        blacklist: []
      };
      saveToMongo('global');
    }
    return cachedData.global;
  },

  updateGlobalData(newData) {
    cachedData.global = { ...this.getGlobalData(), ...newData };
    saveToMongo('global');
    return cachedData.global;
  }
};
