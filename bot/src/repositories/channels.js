import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'
import { sortChannels } from '../utils/channels.js'

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

export async function getCommandLevelForChannel(channelId) {
  return await pgPool
    .query(SQL`select command_level from channels where id = ${channelId};`)
    .then(res => (res.rows[0] ? camelize(res.rows[0]).commandLevel : {}))
}

export async function getUnrestrictedChannels() {
  return await pgPool
    .query(
      SQL`
      select
        id
      from channels
      where command_level = 'unrestricted';
    `
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

export async function getChannelsGuildById(channelId) {
  return await pgPool
    .query(
      SQL`
      select guild_id
      from channels 
      where id = ${channelId};
    `
    )
    .then(res => (res.rows[0] ? res.rows[0].guild_id : undefined))
}

export async function createChannelRecord(
  channel,
  channelType,
  commandLevel,
  positionOverride
) {
  return await pgPool
    .query(
      SQL`
        insert into channels (id, name, guild_id, category_id, channel_type, command_level, position_override, position)
        values(${channel.id}, ${channel.name}, ${channel.guild.id}, ${channel.parentId}, ${channelType}, ${commandLevel}, ${positionOverride}, ${channel.position});
      `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function updateChannelRecord(
  channel,
  channelType,
  commandLevel,
  positionOverride
) {
  return await pgPool
    .query(
      SQL`
        update channels
        set
          name = ${channel.name},
          category_id = ${channel.parentId},
          channel_type = ${channelType},
          command_level = ${commandLevel},
          position_override = ${positionOverride},
          position = ${channel.position}
        where id = ${channel.id}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function deleteChannel(channel, skipAnnouncementAndSort = false) {
  const guildId = await getChannelsGuildById(channel.id)

  if (!skipAnnouncementAndSort) sortChannels(guildId)

  return await pgPool
    .query(
      SQL`
        delete from channels 
        where id = ${channel.id} 
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function getChannelTableByGuild(guildId) {
  return await pgPool
    .query(
      SQL`
          select *
          from channels
          where guild_id = ${guildId};
        `
    )
    .then(res => camelize(res.rows))
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

export async function getAlphabeticalCategories(guildId) {
  return await pgPool
    .query(
      SQL`
        select id
        from channels 
        where channel_type = 'category' and guild_id = ${guildId} 
        order by name
      `
    )
    .then(res => camelize(res.rows))
}

export async function getAlphabeticalChannelsByCategory(categoryId) {
  return await pgPool
    .query(
      SQL`
        select id
        from channels 
        where category_id = ${categoryId}
        order by name
      `
    )
    .then(res => camelize(res.rows))
}
