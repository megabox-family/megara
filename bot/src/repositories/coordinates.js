import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'
import { randomUUID } from 'crypto'

export async function getWorldId(worldName, guildId) {
  return await pgPool
    .query(
      SQL`
        select
          id
        from worlds
        where guild_id = ${guildId} and
          name = ${worldName}
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
}

export async function createWorld(worldName, member) {
  return await pgPool
    .query(
      SQL`
        insert into worlds (id, name, guild_id, created_by)
        values(
          ${randomUUID()}, 
          ${worldName}, 
          ${member.guild.id}, 
          ${member.id}
        );
      `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function deleteWorld(worldName, guildId) {
  return await pgPool
    .query(
      SQL`
        delete from worlds 
        where name = ${worldName} and
          guild_id = ${guildId}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function getCoordinatesId(name, world_id) {
  return await pgPool
    .query(
      SQL`
        select
          id
        from coordinates
        where name = ${name} and
          world_id = ${world_id}
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
}

export async function createCoordinate(coordinates) {
  return await pgPool
    .query(
      `insert into coordinates (id, name, world_id, user_id, x, y, z) values($1, $2, $3, $4, $5, $6, $7) returning *;`,
      [randomUUID(), ...coordinates]
    )
    .catch(error => {
      console.log(error)
    })
}

export async function setCoordinates(coordinates) {
  return await pgPool
    .query(
      `insert into coordinates(id, name, owner, x, y, z) values($1, $2, $3, $4, $5, $6) returning *;`,
      [uuid(), ...coordinates]
    )
    .then(res => camelize(res.rows))
}
