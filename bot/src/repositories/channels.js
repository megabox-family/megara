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

export async function getJoinableChannels() {
  return await pgPool
    .query(
      `select c1.id, c2.name as category_name, c1.name from channels c1
    join channels c2 on c1.category_id = c2.id and c2.channel_type = 'category'
    where c1.channel_type = 'joinable';`
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

export async function createChannelRecord(channel, channelType) {
  return await pgPool
    .query(
      SQL`
        insert into channels (id, name, guild_id, category_id, channel_type, position)
        values(${channel.id}, ${channel.name}, ${channel.guild.id}, ${channel.parentId}, ${channelType}, ${channel.position});
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
        select id
        from channels 
        where channel_type = 'category' and 
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

export async function getJoinableChannelList(guildId) {
  const query = await pgPool
    .query(
      SQL`
      select
        categories.name as group,
        concat('#', channels.name, ' (', channels.id, ')') as values
      from channels as categories, channels as channels
      where categories.id = channels.category_id and
        channels.channel_type = 'joinable' and
        categories.guild_id = ${guildId}
      order by categories.position, categories.id, channels.position;
    `
    )
    .then(res => camelize(res.rows))

  query.forEach(
    (record, index) => (record.values = `${index + 1}. ${record.values}`)
  )

  return query
}

export async function getArchivedChannelList(guildId) {
  const query = await pgPool
    .query(
      SQL`
        select
          categories.name as group,
          concat('#', channels.name, ' (', channels.id, ')') as values
        from channels as categories, channels as channels
        where categories.id = channels.category_id and
          channels.channel_type = 'archived' and
          categories.guild_id = ${guildId}
        order by categories.position, categories.id, channels.position;
      `
    )
    .then(res => camelize(res.rows))

  query.forEach(
    (record, index) => (record.values = `${index + 1}. ${record.values}`)
  )

  return query
}

export async function getPublicChannelList(guildId) {
  const _welcomeChannelId = await getWelcomeChannel(guildId),
    welcomeChannelId = _welcomeChannelId ? _welcomeChannelId : ``,
    query = await pgPool
      .query(
        SQL`
        select
          categories.name as group,
          concat('#', channels.name, ' (', channels.id, ')') as values
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

  query.forEach(
    (record, index) => (record.values = `${index + 1}. ${record.values}`)
  )

  return query
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
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
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

// 981719152106545232
