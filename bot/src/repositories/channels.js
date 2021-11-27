import { getBot } from './cache-bot.js'
import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'
import {
  checkType,
  getCommandLevel,
  announceNewChannel,
  sortChannelsIntoCategories,
  getPositionOverride,
} from '../utils.js'

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

export async function getAdminChannelId(guildId) {
  return await pgPool
    .query(`select admin_channel from guilds where id = $1;`, [guildId])
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
}

export function createChannel(channel, skipAnnouncement = false) {
  const channelType = checkType(channel),
    commandLevel = getCommandLevel(channel),
    positionOverride = getPositionOverride(channel)

  pgPool
    .query(
      SQL`
        insert into channels (id, name, guild_id, category_id, channel_type, command_level, position_override)
        values(${channel.id}, ${channel.name}, ${channel.guild.id}, ${channel.parentId}, ${channelType}, ${commandLevel}, ${positionOverride});
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })

  if (skipAnnouncement) {
    if (channelType === 'joinable') return channel.id
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

export async function modifyChannel(
  oldChannel,
  newChannel,
  skipAnnouncement = false
) {
  const oldCatergoryId = oldChannel?.categoryId
      ? oldChannel.categoryId
      : oldChannel.parentId,
    oldChannelType = oldChannel?.channelType
      ? oldChannel.channelType
      : checkType(oldChannel),
    oldCommandLevel = oldChannel?.commandLevel
      ? oldChannel.commandLevel
      : getCommandLevel(oldChannel),
    oldPositionOverride = oldChannel?.positionOverride
      ? oldChannel.positionOverride
      : getPositionOverride(oldChannel),
    newChannelType = checkType(newChannel),
    newCommandLevel = getCommandLevel(newChannel),
    newPositionOverride = getPositionOverride(newChannel)

  if (
    oldChannel.name !== newChannel.name ||
    oldCatergoryId !== newChannel.parentId ||
    oldChannelType !== newChannelType ||
    oldCommandLevel !== newCommandLevel ||
    oldPositionOverride !== newPositionOverride
  ) {
    await pgPool
      .query(
        SQL`
        update channels
        set
          category_id = ${channel.parentId},
          name = ${channel.name},
          channel_type = ${channelType},
          command_level = ${commandLevel},
          position_override = ${positionOverride}
        where id = ${channel.id}
        returning *;
      `
      )
      .then(res => camelize(res.rows))
      .catch(error => {
        console.log(error)
      })

    if (!oldChannelType === `joinable` && newChannelType === `joinable`) {
      if (skipAnnouncement) return newChannel.id
      else announceNewChannel(channel)
    }
  }
}

export async function syncChannels() {
  getBot().guilds.cache.forEach(guild => {
    const liveChannelIds = [],
      channels = guild.channels.cache,
      roles = guild.roles.cache

    channels.forEach(channel => {
      if (!channel.deleted) liveChannelIds.push(channel.id)
    })

    pgPool
      .query(
        SQL`
          select *
          from channels
          where guild_id = ${guild.id};
        `
      )
      .then(table => {
        const rows = camelize(table.rows),
          tabledChannelIds = rows.map(row => row.id),
          allIds = [...new Set([...liveChannelIds, ...tabledChannelIds])],
          channelsToAnnounce = []

        allIds.forEach(id => {
          const channel = channels.get(id)

          if (liveChannelIds.includes(id) && !tabledChannelIds.includes(id)) {
            const channelId = createChannel(channel, true)
            if (channelId) channelsToAnnounce.push(channelId)
          } else if (
            !liveChannelIds.includes(id) &&
            tabledChannelIds.includes(id)
          ) {
            deleteChannel(id)
          } else {
            const record = rows.find(row => {
              return row.id === id
            })

            const channelId = modifyChannel(record, channel, true)

            if (channelId) channelsToAnnounce.push(channelId)
          }
        })

        if (channelsToAnnounce.length >= 5) {
          const adminChannelId = await getAdminChannelId(guild.id)
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
  })
}

export async function getCategoryName(categoryId) {
  return await pgPool
    .query(`select name from channels where id = $1;`, [categoryId])
    .then(res => (res.rows[0] ? camelize(res.rows[0]).name : undefined))
}

export async function getChannelById(id) {
  return await pgPool
    .query(
      SQL`
        select *
        from channels 
        where id = ${id};
      `
    )
    .then(res => (res.rows[0] ? camelize(res.rows[0]) : undefined))
}

export async function getChannelByName(name) {
  return await pgPool
    .query(
      SQL`
        select *
        from channels 
        where name = ${name};
      `
    )
    .then(res => (res.rows[0] ? camelize(res.rows[0]) : undefined))
}

export async function sortChannels(guildId) {
  const guild = getBot().guilds.cache.get(guildId),
    channelsWithPositionOverrides = {}

  guild.channels.cache.forEach(
    channel =>
      (channelsWithPositionOverrides[channel.id] = getPositionOverride(channel))
  )

  // const categories = await
}
