import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'
import { checkType } from '../utils.js'

export async function getIdForJoinableChannel(channel) {
  return await pgPool
    .query(
      `select id from channels where name = $1 AND channel_type = 'joinable';`,
      [channel]
    )
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
}

export async function getIdForChannel(channel) {
  return await pgPool
    .query(`select id from channels where name = $1;`, [channel])
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
}

export async function getChannelsForAnnouncement() {
  return await pgPool
    .query(
      `select * from channels where is_pending_announcement = true and channel_type != 'category';`
    )
    .then(res => camelize(res.rows))
}

export async function setChannelsAsAnnounced() {
  return await pgPool
    .query(
      `update channels set is_pending_announcement = false where is_pending_announcement = true returning *;`
    )
    .then(res => camelize(res.rows))
}

export async function getJoinableChannels() {
  return await pgPool
    .query(
      `select c1.id, c2.name as category_name, c1.name from channels c1
    join channels c2 on c1.category_id = c2.id and c2.channel_type = 'category'
    where c1.channel_type = 'joinable';`
    )
    .then(res => camelize(res.rows))
}

export async function getCommandLevelForChannel(channel) {
  return await pgPool
    .query(`select command_level from channels where id = $1;`, [channel])
    .then(res => (res.rows[0] ? camelize(res.rows[0]).commandLevel : {}))
}

export async function getChannelIdFromEmoji(emoji) {
  return await pgPool
    .query(`select id, name, message_id from channels where emoji = $1;`, [
      emoji,
    ])
    .then(res => camelize(res.rows[0]))
}

export async function getJoinableChannelsWithEmoji() {
  return await pgPool
    .query(
      `select c1.id, c2.name as category_name, c1.name, c1.emoji, c1.has_priority from channels c1
    join channels c2 on c1.category_id = c2.id and c2.channel_type = 'category'
    where c1.channel_type = 'joinable' and c1.emoji is not null
    order by category_name, c1.name;`
    )
    .then(res => camelize(res.rows))
}

export async function updateChannelMessageId(channelId, messageId) {
  return await pgPool
    .query(`update channels set message_id = $1 where id = $2 returning *;`, [
      messageId,
      channelId,
    ])
    .then(res => camelize(res.rows))
    .catch(err => console.log(err))
}

export async function getJoinableChannelsMessageIds() {
  return await pgPool
    .query(
      `select distinct message_id from channels where message_id is not null;`
    )
    .then(res => camelize(res.rows).map(x => x.messageId))
}

export async function setActiveVoiceChannelId(channelId, voiceChannelId) {
  return await pgPool.query(
    `update channels set active_voice_channel_id = $1 where id = $2;`,
    [voiceChannelId, channelId]
  )
}

export async function removeActiveVoiceChannelId(voiceChannelId) {
  return await pgPool.query(
    `update channels set active_voice_channel_id = null where active_voice_channel_id = $1;`,
    [voiceChannelId]
  )
}

export async function channelWithVoiceChannelIsJoinable(voiceChannelId) {
  return await pgPool
    .query(
      `select id from channels where active_voice_channel_id = $1 and channel_type = 'joinable';`,
      [voiceChannelId]
    )
    .then(res => !!res.rows[0])
}

export async function channelIsJoinable(channelId) {
  return await pgPool
    .query(
      `select id from channels where id = $1 and channel_type = 'joinable';`,
      [channelId]
    )
    .then(res => !!res.rows[0])
}

export async function channelHasActiveVoiceChannel(channelId) {
  return await pgPool
    .query(
      `select active_voice_channel_id from channels where id = $1 and active_voice_channel_id is not null;`,
      [channelId]
    )
    .then(res => !!res.rows[0])
}

export async function getActiveVoiceChannelIds() {
  return await pgPool
    .query(
      `select active_voice_channel_id from channels where channel_type = 'joinable' and active_voice_channel_id is not null;`
    )
    .then(res => camelize(res.rows))
}

export async function createChannel(channel, textType = `private`) {
  let channelType, isPendingAnnouncement

  switch (channel.type) {
    case `GUILD_CATEGORY`:
      channelType = `category`
      isPendingAnnouncement = false
      break
    case `GUILD_TEXT`:
      channelType = textType
      isPendingAnnouncement = textType !== `private` ? true : false
      break
    case `GUILD_VOICE`:
      channelType = `voice`
      isPendingAnnouncement = false
      break
  }
  console.log({ channelType: channel.type, isPendingAnnouncement })

  return await pgPool
    .query(
      SQL`
        insert into channels (id, category_id, name, channel_type, is_pending_announcement)
        values(${channel.id}, ${channel.parentID}, ${channel.name}, ${channelType}, ${isPendingAnnouncement}) 
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function deleteChannel(channelID) {
  return await pgPool
    .query(
      SQL`
        delete from channels 
        where id = ${channelID} 
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function modifyChannel(
  channel,
  channelType,
  isPendingAnnouncement
) {
  return await pgPool
    .query(
      SQL`
        update channels 
        set 
          category_id = ${channel.parentID}, 
          name = ${channel.name}, 
          channel_type = ${channelType}, 
          is_pending_announcement = ${isPendingAnnouncement} 
        where id = ${channel.id} 
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function syncChannels(channels, roles) {
  const liveChannelIds = []

  channels.forEach(channel => {
    if (!channel.deleted) liveChannelIds.push(channel.id)
  })

  pgPool
    .query(
      `
    select
      id,
      category_id,
      name,
      channel_type
    from channels
  `
    )
    .then(table => {
      const rows = camelize(table.rows),
        tabledChannelIds = rows.map(row => row.id),
        allIds = [...new Set([...liveChannelIds, ...tabledChannelIds])]

      allIds.forEach(id => {
        if (id === '871316166059130910') {
          console.log(
            id,
            liveChannelIds.includes(id),
            tabledChannelIds.includes(id)
          )
        }

        if (liveChannelIds.includes(id) && !tabledChannelIds.includes(id)) {
          const channel = channels.get(id),
            textType = checkType(channel, roles)

          createChannel(channel, textType)
        } else if (
          !liveChannelIds.includes(id) &&
          tabledChannelIds.includes(id)
        ) {
          deleteChannel(id)
        } else {
          const channel = channels.get(id),
            record = rows.filter(row => row.id === id)

          let channelType

          switch (channel.type) {
            case `GUILD_CATEGORY`:
              channelType = `category`
              break
            case `GUILD_TEXT`:
              channelType = checkType(channel, roles)
              break
            case `GUILD_VOICE`:
              channelType = `voice`
              break
          }

          if (
            channel.name !== record.name ||
            channel.parentID !== record.categoryId ||
            channelType !== record.channelType
          ) {
            const isPendingAnnouncement =
              channelType !== record.channelType && channelType === `joinable`
                ? true
                : false

            modifyChannel(channel, channelType, isPendingAnnouncement)
          }
        }
      })
    })
    .catch(error => console.log(error))
}
