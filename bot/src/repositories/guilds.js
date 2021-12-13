import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'
import { deleteNewRoles } from '../utils/general.js'
import { syncChannels } from '../utils/channels.js'
import { deleteAllGuildChannels } from './channels.js'

export async function createGuild(guild, syncBool = false) {
  await deleteNewRoles(guild)

  if (!syncBool) await syncChannels(guild)

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

export async function deleteGuild(guild) {
  let guildId

  if (guild?.id) guildId = guild.id
  else guildId = guild

  await deleteAllGuildChannels(guildId)

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

export async function syncGuilds(guilds) {
  const liveGuildIds = []

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
        const guild = guilds.get(guildId)

        if (
          liveGuildIds.includes(guildId) &&
          !tabledGuildIds.includes(guildId)
        ) {
          createGuild(guild, true)
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

export async function setWelcomeChannel(guildId, channelId) {
  return await pgPool.query(
    SQL`
        update guilds
        set
          welcome_channel = ${channelId}
        where id = ${guildId}
        returning *;
      `
  )
}

export async function getAdminChannel(guildId) {
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

export async function getLogChannel(guildId) {
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

export async function getWelcomeChannel(guildId) {
  return await pgPool
    .query(
      SQL`
        select 
          welcome_channel 
        from guilds 
        where id = ${guildId}
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].welcome_channel : undefined))
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
    .then(res => (res.rows[0] ? res.rows[0].rules : undefined))
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

export async function setRoleSorting(guildId, roleSorting) {
  return await pgPool.query(
    SQL`
        update guilds
        set
          role_sorting = ${roleSorting}
        where id = ${guildId}
        returning *;
      `
  )
}

export async function getRoleSorting(guildId) {
  return await pgPool
    .query(
      SQL`
        select
          role_sorting
        from guilds
        where id = ${guildId};
      `
    )
    .then(res => (res.rows[0] ? camelize(res.rows[0].role_sorting) : undefined))
}

export async function setCommandSymbol(guildId, commandSymbol) {
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
    .then(res => (res.rows[0] ? res.rows[0].command_symbol : undefined))
}

export async function getFunctionChannels(guildId) {
  return await pgPool
    .query(
      SQL`
      select 
        admin_channel,
        log_channel,
        announcement_channel,
        verification_channel,
        welcome_channel
      from guilds 
      where id = ${guildId}
    `
    )
    .then(res => (res.rows[0] ? camelize(res.rows[0]) : undefined))
}

export async function setNameGuidelines(guildId, nameGuidelines) {
  return await pgPool.query(
    SQL`
        update guilds
        set
          name_guidelines = ${nameGuidelines}
        where id = ${guildId}
        returning *;
      `
  )
}

export async function getNameGuidelines(guildId) {
  return await pgPool
    .query(
      SQL`
        select 
          name_guidelines
        from guilds 
        where id = ${guildId};
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].name_guidelines : undefined))
}
