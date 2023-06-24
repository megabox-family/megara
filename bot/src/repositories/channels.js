import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'
import { getWelcomeChannel } from './guilds.js'

export async function createChannelRecord(channel, positionOverride = null) {
  const { id, name, guild } = channel

  return await pgPool
    .query(
      SQL`
        insert into channels (id, name, guild_id, position_override)
        values(${id}, ${name}, ${guild.id}, ${positionOverride});
      `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function updateChannelRecord(channel) {
  return await pgPool
    .query(
      SQL`
        update channels
        set
          name = ${channel.name}
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

export async function getChannelsByGuild(guildId) {
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

// sort channels chaos hell of the devil
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

// sort channels chaos hell of the devil
export async function getAlphabeticalChannelsByCategory(categoryId) {
  return await pgPool
    .query(
      SQL`
        select 
          name,
          id,
          channel_type
        from channels 
        where category_id = ${categoryId}
        order by name
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

// GBYE
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
          id,
          position_override
        from channels
        where guild_id = ${guildId}
         position_override is not null
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })

  return query
}
