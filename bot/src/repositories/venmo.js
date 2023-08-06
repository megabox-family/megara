import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'

export async function addVenmo(userId, tag) {
  return await pgPool
    .query(
      SQL`
        insert into venmo (id, tag)
        values(${userId}, ${tag});
      `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function getVenmoTag(userId) {
  return await pgPool
    .query(
      SQL`
      select 
        tag
      from venmo
      where id = ${userId}
    `
    )
    .then(res => res.rows?.[0]?.tag)
    .catch(error => {
      console.log(error)
    })
}

export async function updateVenmoTag(userId, tag) {
  return await pgPool
    .query(
      SQL`
        update venmo
        set
          tag = ${tag}
        where id = ${userId}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function deleteVenmo(userId) {
  return await pgPool
    .query(
      SQL`
        delete from venmo 
        where id = ${userId}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}
