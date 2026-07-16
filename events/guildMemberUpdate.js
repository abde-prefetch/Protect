const { AuditLogEvent, EmbedBuilder } = require('discord.js');

async function sendLog(guild, config, embed) {
  if (!config.logsChannel) return;
  const logsChan = guild.channels.cache.get(config.logsChannel);
  if (logsChan) await logsChan.send({ embeds: [embed] }).catch(() => {});
}

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    const guild = newMember.guild;
    const config = client.db.getGuildConfig(guild.id);
    if (config.antiRaid === false) return;

    // Détection d'un Mute (Time Out)
    const wasMuted = oldMember.isCommunicationDisabled();
    const isMuted = newMember.isCommunicationDisabled();

    if (!wasMuted && isMuted) {
      try {
        let entry = null;
        for (let i = 0; i < 4; i++) {
          const logs = await guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberUpdate });
          entry = logs.entries.find(e => e.target.id === newMember.id && e.changes.some(c => c.key === 'communication_disabled_until'));
          if (entry) break;
          await new Promise(r => setTimeout(r, 500));
        }

        if (!entry) return;

        const { executor, reason } = entry;
        if (executor.id === client.user.id) return; // Ignorer les actions du bot

        // Envoyer le log du mute
        const until = newMember.communicationDisabledUntil;
        const logEmbed = new EmbedBuilder()
          .setTitle('🔇 Action de Modération — Mute (Exclusion)')
          .addFields(
            { name: 'Membre Mute', value: `<@${newMember.id}> (${newMember.user.tag})`, inline: true },
            { name: 'Responsable', value: `<@${executor.id}> (${executor.tag})`, inline: true },
            { name: 'Fin du Mute', value: `<t:${Math.floor(until.getTime() / 1000)}:R>`, inline: false },
            { name: 'Raison', value: reason || 'Aucune raison spécifiée', inline: false }
          )
          .setColor('#FFFF00')
          .setTimestamp();
        
        await sendLog(guild, config, logEmbed);

      } catch (err) {
        console.error('[S-V Guard] guildMemberUpdate error:', err);
      }
    } else if (wasMuted && !isMuted) {
      // Détection d'un Unmute (Levée du Time Out)
      try {
        let entry = null;
        for (let i = 0; i < 4; i++) {
          const logs = await guild.fetchAuditLogs({ limit: 5, type: AuditLogEvent.MemberUpdate });
          entry = logs.entries.find(e => e.target.id === newMember.id && e.changes.some(c => c.key === 'communication_disabled_until'));
          if (entry) break;
          await new Promise(r => setTimeout(r, 500));
        }

        if (!entry) return;

        const { executor, reason } = entry;
        if (executor.id === client.user.id) return;

        const logEmbed = new EmbedBuilder()
          .setTitle('🔊 Action de Modération — Unmute')
          .addFields(
            { name: 'Membre Unmute', value: `<@${newMember.id}> (${newMember.user.tag})`, inline: true },
            { name: 'Responsable', value: `<@${executor.id}> (${executor.tag})`, inline: true },
            { name: 'Raison', value: reason || 'Aucune raison spécifiée', inline: false }
          )
          .setColor('#00FF00')
          .setTimestamp();
        
        await sendLog(guild, config, logEmbed);
      } catch (err) {}
    }
  },
};
