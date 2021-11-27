import { getBot } from './cache-bot.js'
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
