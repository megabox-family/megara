import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'

export async function addEvent(messageId, userId, allowGuests, requestVenmo) {
  return await pgPool
    .query(
      SQL`
        insert into events (id, created_by, allow_guests, request_venmo)
        values(${messageId}, ${userId}, ${allowGuests}, ${requestVenmo});
      `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function checkIfGuestsAreAllowed(messageId) {
  return await pgPool
    .query(
      SQL`
        select 
          allow_guests
        from events
        where id = ${messageId} 
      `
    )
    .then(res => res.rows[0]?.allow_guests)
    .catch(error => {
      console.log(error)
    })
}

export async function checkIfVenmoIsRequired(messageId) {
  return await pgPool
    .query(
      SQL`
        select 
          request_venmo
        from events
        where id = ${messageId} 
      `
    )
    .then(res => res.rows[0]?.request_venmo)
    .catch(error => {
      console.log(error)
    })
}

export async function getEventRecord(messageId) {
  return await pgPool
    .query(
      SQL`
        select *
        from events
        where id = ${messageId}
      `
    )
    .then(res => camelize(res.rows?.[0]))
    .catch(error => {
      console.log(error)
    })
}
