import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'
import { checkType, announceNewChannel } from '../utils.js'

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

export function createChannel(
  channel,
  textType = `private`,
  skipAnnouncement = false
) {
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

  pgPool
    .query(
      SQL`
        insert into channels (id, category_id, name, channel_type)
        values(${channel.id}, ${channel.parentId}, ${channel.name}, ${channelType});
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })

  if (skipAnnouncement) {
    if (isPendingAnnouncement) return channel
  } else {
    announceNewChannel(channel)
  }
}

export async function deleteChannel(channelId) {
  return await pgPool
    .query(
      SQL`
        delete from channels 
        where id = ${channelId} 
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function modifyChannel(channel, channelType) {
  return await pgPool
    .query(
      SQL`
        update channels 
        set 
          category_id = ${channel.parentId}, 
          name = ${channel.name}, 
          channel_type = ${channelType}
        where id = ${channel.id} 
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function syncChannels(guild, adminChannelId) {
  const liveChannelIds = [],
    channels = guild.channels.cache,
    roles = guild.roles.cache

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
        allIds = [...new Set([...liveChannelIds, ...tabledChannelIds])],
        channelsToAnnounce = []

      allIds.forEach(id => {
        if (liveChannelIds.includes(id) && !tabledChannelIds.includes(id)) {
          const channel = channels.get(id),
            textType = checkType(channel, roles),
            channelID = createChannel(channel, textType, true)

          if (channelID) channelsToAnnounce.push(channelID)
        } else if (
          !liveChannelIds.includes(id) &&
          tabledChannelIds.includes(id)
        ) {
          deleteChannel(id)
        } else {
          const channel = channels.get(id),
            record = rows.filter(row => {
              return row.id === id
            })[0]

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
            channel.parentId !== record.categoryId ||
            channelType !== record.channelType
          ) {
            if (
              channelType === `joinable` &&
              !record.channelType === `joinable`
            )
              channelsToAnnounce.push(channel)

            modifyChannel(channel, channelType)
          }
        }
      })

      if (channelsToAnnounce.length >= 5) {
        guild.channels.cache.get(adminChannelId).send(
          `Potential oopsie detected. More than five channels were marked for announcement: 
            ${channelsToAnnounce.join(', ')}`
        )
      } else {
        channelsToAnnounce.forEach(channelToAnnounce => {
          announceNewChannel(channelToAnnounce)
        })
      }
    })
    .catch(error => console.log(error))
}

export async function getCategoryName(categoryId) {
  return await pgPool
    .query(`select name from channels where id = $1;`, [categoryId])
    .then(res => (res.rows[0] ? camelize(res.rows[0]).name : undefined))
}
