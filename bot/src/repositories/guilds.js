import { getBot } from '../cache-bot.js'
import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'

export async function createGuild(guild) {
  pgPool
    .query(
      SQL`
        insert into guilds (id, guild_name)
        values(${guild.id}, ${guild.name});
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function modifyGuild(guild) {
  return await pgPool
    .query(
      SQL`
        update guilds 
        set 
          guild_name = ${guild.name}
        where id = ${guild.id} 
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function deleteGuild(guildId) {
  return await pgPool
    .query(
      SQL`
        delete from guilds 
        where id = ${guildId} 
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function syncGuilds() {
  const liveGuildIds = [],
    guilds = getBot().guilds.cache

  guilds.forEach(guild => {
    if (!guild.deleted) liveGuildIds.push(guild.id)
  })

  pgPool
    .query(
      `
        select
          id,
          guild_name
        from guilds
      `
    )
    .then(table => {
      const rows = camelize(table.rows),
        tabledGuildIds = rows.map(row => row.id),
        allGuildIds = [...new Set([...liveGuildIds, ...tabledGuildIds])]

      allGuildIds.forEach(guildId => {
        const guild = getBot().guilds.cache.get(guildId)

        if (
          liveGuildIds.includes(guildId) &&
          !tabledGuildIds.includes(guildId)
        ) {
          createGuild(guild)
        } else if (
          !liveGuildIds.includes(guildId) &&
          tabledGuildIds.includes(guildId)
        ) {
          deleteGuild(guildId)
        } else {
          const guildRecord = rows.find(row => row.id === guildId)

          if (guild.name !== guildRecord.name) {
            modifyGuild(guild)
          }
        }
      })
    })
}

export async function setAdminChannel(guildId, channelId) {
  return await pgPool.query(
    SQL`
        update guilds
        set
          admin_channel = ${channelId}
        where id = ${guildId}
        returning *;
      `
  )
}

export async function setLogChannel(guildId, channelId) {
  return await pgPool.query(
    SQL`
        update guilds
        set
          log_channel = ${channelId}
        where id = ${guildId}
        returning *;
      `
  )
}

export async function setAnnouncementChannel(guildId, channelId) {
  return await pgPool.query(
    SQL`
        update guilds
        set
          announcement_channel = ${channelId}
        where id = ${guildId}
        returning *;
      `
  )
}

export async function setVerificationChannel(guildId, channelId) {
  return await pgPool.query(
    SQL`
        update guilds
        set
          verification_channel = ${channelId}
        where id = ${guildId}
        returning *;
      `
  )
}

export async function getAdminChannelId(guildId) {
  return await pgPool
    .query(
      SQL`
        select 
          admin_channel 
        from guilds 
        where id = ${guildId}
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].admin_channel : undefined))
}

export async function getLogChannelId(guildId) {
  return await pgPool
    .query(
      SQL`
        select 
          log_channel 
        from guilds 
        where id = ${guildId}
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].log_channel : undefined))
}

export async function getAnnouncementChannel(guildId) {
  return await pgPool
    .query(
      SQL`
        select 
          announcement_channel 
        from guilds 
        where id = ${guildId}
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].announcement_channel : undefined))
}

export async function getVerificationChannel(guildId) {
  return await pgPool
    .query(
      SQL`
        select 
          verification_channel 
        from guilds 
        where id = ${guildId}
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].verification_channel : undefined))
}

export async function setRules(guildId, rules) {
  return await pgPool.query(
    SQL`
        update guilds
        set
          rules = ${rules}
        where id = ${guildId}
        returning *;
      `
  )
}

export async function getRules(guildId) {
  return await pgPool
    .query(
      SQL`
        select 
          rules
        from guilds 
        where id = ${guildId};
      `
    )
    .then(res => (res.rows[0] ? camelize(res.rows[0].rules) : undefined))
}

export async function setChannelSorting(guildId, channelSorting) {
  return await pgPool.query(
    SQL`
        update guilds
        set
          channel_sorting = ${channelSorting}
        where id = ${guildId}
        returning *;
      `
  )
}

export async function getChannelSorting(guildId) {
  return await pgPool
    .query(
      SQL`
        select 
          channel_sorting
        from guilds 
        where id = ${guildId};
      `
    )
    .then(res =>
      res.rows[0] ? camelize(res.rows[0].channel_sorting) : undefined
    )
}

export async function setCommandSymbole(guildId, commandSymbol) {
  return await pgPool.query(
    SQL`
        update guilds
        set
          command_symbol = ${commandSymbol}
        where id = ${guildId}
        returning *;
      `
  )
}

export async function getCommandSymbol(guildId) {
  return await pgPool
    .query(
      SQL`
        select 
          command_symbol
        from guilds 
        where id = ${guildId};
      `
    )
    .then(res =>
      res.rows[0] ? camelize(res.rows[0].command_symbol) : undefined
    )
}
