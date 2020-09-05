const pgPool = require('../pg-pool')

module.exports = (dataType, message) => {
  //should only be useable from the #admin channel
  if (dataType.toLowerCase() === 'channels') {
    pgPool
      .query('select id from channels;')
      .then((res) => {
        const existingChannelIds = res.rows.map((x) => x.id)
        const channels = message.guild.channels.filter(
          (x) => x.type !== 'voice' && !existingChannelIds.includes(x.id)
        )

        if (channels.size === 0) message.reply(`everything's up to date!`)
        else {
          const insertStatement = `
        insert into channels(id, category_id, name, channel_type)
        values($1, $2, $3, $4)
        returning *;
      `
          Promise.all(
            channels.map((channel) => {
              pgPool.query(insertStatement, [
                channel.id,
                channel.parentID,
                channel.name,
                channel.type === 'category' ? channel.type : 'joinable',
              ])
            })
          )
            .then((insertedRows) => {
              message.reply(
                `synced ${insertedRows.length} unregistered channel(s)!`
              )
            })
            .catch((err) => console.log(err))
        }
      })
      .catch((err) => console.log(err))
  } else message.reply(`sorry, I cannot sync ${dataType}...`)
}
