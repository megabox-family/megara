import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'
import { randomUUID } from 'crypto'

export async function getWorldId(name, guildId) {
  return await pgPool
    .query(
      SQL`
        select
          id
        from worlds
        where guild_id = ${guildId} and
          name = ${name}
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
}

export async function createWorld(name, guildId) {
  return await pgPool
    .query(
      SQL`
        insert into worlds (id, name, guild_id)
        values(
          ${randomUUID()}, 
          ${name}, 
          ${guildId}
        );
      `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function editWorld(id, name) {
  return await pgPool
    .query(
      SQL`
        update worlds
        set
          name = ${name}
        where id = ${id}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function deleteWorld(id) {
  return await pgPool
    .query(
      SQL`
        delete from worlds 
        where id = ${id}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function getWorldGroups(guildId) {
  return await pgPool
    .query(
      SQL`
      select 
        'Worlds' as "group",
        name as "values"
      from worlds
      where guild_id = ${guildId}
      order by name
    `
    )
    .then(res => res.rows)
    .catch(error => {
      console.log(error)
    })
}

export async function getCoordinatesId(name, worldId, userId) {
  return await pgPool
    .query(
      SQL`
        select
          id
        from coordinates
        where name = ${name} and
          world_id = ${worldId} and
          created_by = ${userId}
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
}

export async function createCoordinates(coordinates) {
  return await pgPool
    .query(
      `insert into coordinates (id, name, world_id, created_by, x, y, z) values($1, $2, $3, $4, $5, $6, $7) returning *;`,
      [randomUUID(), ...coordinates]
    )
    .catch(error => {
      console.log(error)
    })
}

export async function getCoordinates(name, worldId, userId) {
  return await pgPool
    .query(
      SQL`
        select *
        from coordinates
        where name = ${name} and
          world_id = ${worldId} and
          created_by = ${userId}
      `
    )
    .then(res => camelize(res.rows[0]))
    .catch(error => {
      console.log(error)
    })
}

export async function editCoordinates(coordinates) {
  return await pgPool
    .query(
      SQL`
        update coordinates
        set
          name = ${coordinates.name},
          world_id = ${coordinates.worldId},
          x = ${coordinates.x},
          y = ${coordinates.y},
          z = ${coordinates.z}
        where id = ${coordinates.id}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function deleteCoordinates(id) {
  return await pgPool
    .query(
      SQL`
        delete from coordinates 
        where id = ${id}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function getWorldArray(guildId) {
  const result = await pgPool
    .query(
      SQL`
      select 
        name
      from worlds
      where guild_id = ${guildId}
    `
    )
    .then(res => res.rows)
    .catch(error => {
      console.log(error)
    })

  return result.map(record => record.name)
}

export async function getUserArray(guildId) {
  const result = await pgPool
    .query(
      SQL`
        select 
          created_by
        from coordinates
        join worlds on coordinates.world_id = worlds.id
        where guild_id = ${guildId}
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })

  return result.map(record => record.createdBy)
}

export async function getCoordinatesByWorld(guildId, filters) {
  const world = filters.world ? [filters.world] : await getWorldArray(guildId),
    userId = filters.userId ? [filters.userId] : await getUserArray(guildId)

  return await pgPool
    .query(
      SQL`
        select 
          worlds.name as "group",
          concat(coordinates.name, ' (', coordinates.x, ' / ', coordinates.y, ' / ', coordinates.z, ')' ) as values
        from coordinates
        join worlds on coordinates.world_id = worlds.id
        where guild_id = ${guildId} and
          worlds.name = any(${world}) and
          created_by = any(${userId})
        order by "group", values
      `
    )
    .then(res => res.rows)
    .catch(error => {
      console.log(error)
    })
}

export async function getCoordinatesByUser(guild, filters) {
  const world = filters.world ? [filters.world] : await getWorldArray(guild.id),
    userId = filters.userId ? [filters.userId] : await getUserArray(guild.id)

  const result = await pgPool
    .query(
      SQL`
        select 
          created_by as "group",
          concat(coordinates.name, ' (', coordinates.x, ' / ', coordinates.y, ' / ', coordinates.z, ')' ) as values
        from coordinates
        join worlds on coordinates.world_id = worlds.id
        where guild_id = ${guild.id} and
          worlds.name = any(${world}) and
          created_by = any(${userId})
        order by "group", values
      `
    )
    .then(res => res.rows)
    .catch(error => {
      console.log(error)
    })

  result.forEach(record => {
    const member = guild.members.cache.get(record.group)

    if (!member) {
      record.group = `Unknown#0000`
    } else {
      const user = member.user,
        memberName = member.nickname
          ? `${member.nickname} (${user.username}#${user.discriminator})`
          : `${user.username}#${user.discriminator}`

      record.group = memberName
    }
  })

  return result
}

export async function getCoordinatesByAll(guildId, filters) {
  const world = filters.world ? [filters.world] : await getWorldArray(guildId),
    userId = filters.userId ? [filters.userId] : await getUserArray(guildId)

  return await pgPool
    .query(
      SQL`
        select 
          'coordinates' as "group",
          concat(coordinates.name, ' (', coordinates.x, ' / ', coordinates.y, ' / ', coordinates.z, ')' ) as values
        from coordinates
        join worlds on coordinates.world_id = worlds.id
        where guild_id = ${guildId} and
          worlds.name = any(${world}) and
          created_by = any(${userId})
        order by "group", values
      `
    )
    .then(res => res.rows)
    .catch(error => {
      console.log(error)
    })
}

export async function getCoordinatesUserId(userId) {
  return await pgPool
    .query(
      SQL`
        select 
          created_by
        from coordinates
        where created_by = ${userId}
        group by created_by
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].created_by : undefined))
    .catch(error => {
      console.log(error)
    })
}
