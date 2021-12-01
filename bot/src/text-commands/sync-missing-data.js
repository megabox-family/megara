import pgPool from '../pg-pool.js'
import { getCommandLevelForChannel } from '../repositories/channels.js'

export default async function (dataType, { message, guild, isDirectMessage }) {
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

        if (channels.size === 0) message.reply(`Everything's up to date!`)
        else {
          const insertStatement = `
        insert into channels(id, category_id, name, channel_type)
        values($1, $2, $3, $4, $5)
        returning *;
      `
          Promise.all(
            channels.map(channel => {
              pgPool.query(insertStatement, [
                channel.id,
                channel.parentId,
                channel.name,
                channel.type === 'category' ? channel.type : 'joinable',
                true,
              ])
            })
          )
            .then(insertedRows => {
              message.reply(
                `Synced ${insertedRows.length} unregistered channel(s)!
                  \nWould you like me to make an announcement for the new channels? Type \`!announce\` to announce them or \`!skip\` to skip these ones.`
              )
            })
            .catch(err => console.log(err))
        }
      })
      .catch(err => console.log(err))
  } else message.reply(`Sorry, I cannot sync ${dataType}...`)
}
