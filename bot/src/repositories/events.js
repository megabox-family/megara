import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'

export async function addEvent(
  messageId,
  eventTitle,
  threadName,
  eventType,
  userId,
  allowGuests,
  requestVenmo,
  parentId,
  startUnix,
  endUnix,
  isPost = false
) {
  return await pgPool
    .query(
      SQL`
        insert into events (id, event_title, thread_name, event_type, created_by, allow_guests, request_venmo, parent_id, start_unix, end_unix, is_post)
        values(${messageId}, ${eventTitle}, ${threadName}, ${eventType}, ${userId}, ${allowGuests}, ${requestVenmo}, ${parentId}, ${startUnix}, ${endUnix}, ${isPost});
      `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function setConcluded(messageId) {
  return await pgPool
    .query(
      SQL`
        update events
        set concluded = true
        where id = ${messageId}
      `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function getUnconcludedPosts() {
  return await pgPool
    .query(
      SQL`
        select *
        from events
        where is_post = true and
          concluded = false
      `
    )
    .then(res => camelize(res.rows))
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
