import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'
import { getWelcomeChannel } from './guilds.js'

export async function getIdForJoinableChannel(channel) {
  const guild = channel.guild,
    _welcomeChannelId = await getWelcomeChannel(guild.id),
    welcomeChannelId = _welcomeChannelId ? _welcomeChannelId : ``,
    _roomChannelId = await getRoomChannelId(guild.id),
    roomChannelId = _roomChannelId ? _roomChannelId : ``,
    _unverifiedRoomId = await getUnverifiedRoomChannelId(guild.id),
    unverifiedRoomId = _unverifiedRoomId ? _unverifiedRoomId : ``

  return await pgPool
    .query(
      SQL`
        select 
          id 
        from channels 
        where id = ${channel.id} and 
          id not in (${welcomeChannelId}, ${roomChannelId}, ${unverifiedRoomId})
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
}

export async function getChannelId(channelName, guildId) {
  return await pgPool
    .query(
      SQL`
        select 
          id 
        from channels 
        where guild_id = ${guildId} and
          name = ${channelName} and
          channel_type in ('joinable', 'private', 'public')
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
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
  positionOverride = null
) {
  const { id, name, guild, parentId, rawPosition } = channel

  return await pgPool
    .query(
      SQL`
        insert into channels (id, name, guild_id, category_id, channel_type, position_override, position)
        values(${id}, ${name}, ${guild.id}, ${parentId}, ${channelType}, ${positionOverride}, ${rawPosition});
      `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function updateChannelRecord(channel, channelType) {
  return await pgPool
    .query(
      SQL`
        update channels
        set
          name = ${channel.name},
          category_id = ${channel.parentId},
          channel_type = ${channelType},
          position = ${channel.rawPosition}
        where id = ${channel.id}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function deleteChannelRecord(channelId) {
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
        select 
          id,
          channel_type
        from channels 
        where category_id is null and 
          guild_id = ${guildId} 
        order by name
      `
    )
    .then(res => camelize(res.rows))
}

export async function getAlphabeticalChannelsByCategory(categoryId) {
  return await pgPool
    .query(
      SQL`
        select 
          id,
          channel_type
        from channels 
        where category_id = ${categoryId}
        order by name
      `
    )
    .then(res => camelize(res.rows))
}

export async function getPublicChannels(guildId) {
  const _welcomeChannelId = await getWelcomeChannel(guildId),
    welcomeChannelId = _welcomeChannelId ? _welcomeChannelId : ``

  return await pgPool
    .query(
      SQL`
        select
          channels.id,
          channels.name
        from channels as categories, channels as channels
        where categories.id = channels.category_id and
          channels.channel_type = 'public' and
          channels.name not like 'room%' and
          categories.guild_id = ${guildId} and
          channels.id != ${welcomeChannelId}
        order by categories.position, categories.id, channels.position;
      `
    )
    .then(res => camelize(res.rows))
}

export async function deleteAllGuildChannels(guildId) {
  return await pgPool
    .query(
      SQL`
      delete from channels 
      where guild_id = ${guildId}
      returning *;
    `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function getChannelType(channelId) {
  return await pgPool
    .query(
      SQL`
    select 
      channel_type
    from channels 
    where id = ${channelId};
  `
    )
    .then(res => (res.rows[0] ? res.rows[0].channel_type : undefined))
}

export async function getAllVoiceChannelIds(guildId) {
  const query = await pgPool
    .query(
      SQL`
        select 
          id
        from channels 
        where guild_id = ${guildId} and
        channel_type = 'voice';
      `
    )
    .then(res => (res.rows[0] ? camelize(res.rows) : undefined))

  return query.map(record => record.id)
}

export async function getAllTextChannelNames(guildId) {
  const query = await pgPool
    .query(
      SQL`
        select 
          name
        from channels 
        where guild_id = ${guildId} and
          channel_type in ('joinable', 'private', 'public')
      `
    )
    .then(res => (res.rows[0] ? camelize(res.rows) : undefined))

  return query.map(record => record.name)
}

export async function getRoomChannelId(guildId) {
  return await pgPool
    .query(
      SQL`
        select
          id
        from channels
        where guild_id = ${guildId} and
          name = 'rooms' and
          channel_type not in ('voice', 'category', 'archived', 'hidden')
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
}

export async function getUnverifiedRoomChannelId(guildId) {
  return await pgPool
    .query(
      SQL`
        select
          id
        from channels
        where guild_id = ${guildId} and
          name = 'unverified-rooms' and
          channel_type not in ('voice', 'category', 'archived', 'hidden')
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
}

export async function getPositionOverride(channelId) {
  return await pgPool
    .query(
      SQL`
        select
          position_override
        from channels
        where id = ${channelId}
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].position_override : undefined))
}

export async function setPositionOverride(channelId, positionOverride) {
  return await pgPool
    .query(
      SQL`
        update channels
        set 
          position_override = ${positionOverride}
        where id = ${channelId}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function getPositionOverrides(guildId) {
  let query = await pgPool
    .query(
      SQL`
        select 

        case
          when categories.position_override is null then 0
          when categories.position_override < 0 then categories.position_override * -1 + 10000
          else categories.position_override 
        end as "cateogrySort",
        categories.name as "categoryName",
        case
          when categories.name is null then 'aaaaaaaa'
          else concat('<#', categories.id, '>')
        end as "group",
        case
          when channels.position_override is null then 0
          when channels.position_override < 0 then categories.position_override * -1 + 10000
          else channels.position_override
        end as "channelSort",
        channels.name as "channelName",
        concat('<#', channels.id, '>: ', cast(channels.position_override as varchar)) as "values"
        from channels
        left join channels as categories
          on channels.category_id = categories.id
        where channels.guild_id = ${guildId} and
          channels.position_override is not null
        order by "cateogrySort", "categoryName", "channelSort", "channelName"
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })

  query = query.map(record => {
    if (record.group === `aaaaaaaa`) record.group = `*no category*`

    return record
  })

  return query
}
