import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'

export async function addPinnedMessage(messageId, userId) {
  return await pgPool
    .query(
      SQL`
        insert into pinned_messages (id, pinned_by)
        values(${messageId}, ${userId});
      `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function removePinnedMessage(messageId) {
  return await pgPool
    .query(
      SQL`
        delete from pinned_messages 
        where id = ${messageId} 
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function getPinnedMessageUserId(messageId) {
  return await pgPool
    .query(
      SQL`
        select 
          pinned_by
        from pinned_messages
        where id = ${messageId} 
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].pinned_by : undefined))
    .catch(error => {
      console.log(error)
    })
}
