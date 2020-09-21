const pgPool = require('../pg-pool')
const { getCommandLevelForChannel } = require('../repositories/channels')
const { formatReply } = require('../utils')

module.exports = async (dataType, { message, guild, isDirectMessage }) => {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)
  if (commandLevel !== 'admin') return

  if (dataType.toLowerCase() === 'channels') {
    pgPool
      .query('select id from channels;')
      .then(res => {
        const existingChannelIds = res.rows.map(x => x.id)
        const channels = guild.channels.cache.filter(
          x => x.type !== 'voice' && !existingChannelIds.includes(x.id)
        )

        if (channels.size === 0)
          message.reply(
            formatReply(`everything's up to date!`, isDirectMessage)
          )
        else {
          const insertStatement = `
        insert into channels(id, category_id, name, channel_type, is_pending_announcement)
        values($1, $2, $3, $4, $5)
        returning *;
      `
          Promise.all(
            channels.map(channel => {
              pgPool.query(insertStatement, [
                channel.id,
                channel.parentID,
                channel.name,
                channel.type === 'category' ? channel.type : 'joinable',
                true,
              ])
            })
          )
            .then(insertedRows => {
              message.reply(
                formatReply(
                  `synced ${insertedRows.length} unregistered channel(s)!
                  \nWould you like me to make an announcement for the new channels? Type \`!announce\` to announce them or \`!skip\` to skip these ones.`,
                  isDirectMessage
                )
              )
            })
            .catch(err => console.log(err))
        }
      })
      .catch(err => console.log(err))
  } else
    message.reply(
      formatReply(`sorry, I cannot sync ${dataType}...`, isDirectMessage)
    )
}
