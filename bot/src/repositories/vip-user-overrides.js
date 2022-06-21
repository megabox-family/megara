import pgPool from '../pg-pool.js'
import SQL from 'sql-template-strings'
import camelize from 'camelize'
import { randomUUID } from 'crypto'

export async function getVipOverriedId(userId, guildId) {
  return await pgPool
    .query(
      SQL`
        select 
          id
        from vip_user_overrides
        where user_id = ${userId} and
          guild_id = ${guildId}
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
    .catch(error => {
      console.log(error)
    })
}

export async function addUserToVipOverrides(userId, guildId) {
  return await pgPool
    .query(
      SQL`
      insert into vip_user_overrides (id, user_id, guild_id)
      values(
        ${randomUUID()},
        ${userId},
        ${guildId}
      );
    `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function removeUserFromVipOverrides(id) {
  return await pgPool
    .query(
      SQL`
        delete from vip_user_overrides
        where id = ${id}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function getVipUserIdArray(guildId) {
  const result = await pgPool
    .query(
      SQL`
        select 
          user_id
        from vip_user_overrides
        where guild_id = ${guildId}
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })

  return result.map(record => record.userId)
}
