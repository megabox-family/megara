import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'
import { randomUUID } from 'crypto'
import { getVenmoTag } from './venmo.js'

export async function addAttendee(userId, messageId, guestCount = 0) {
  return await pgPool
    .query(
      SQL`
        insert into attendees (id, user_id, event_id, guest_count)
        values(${randomUUID()}, ${userId}, ${messageId}, ${guestCount});
      `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function getAttendeeRecord(userId, messageId) {
  return await pgPool
    .query(
      SQL`
        select 
          *
        from attendees
        where user_id = ${userId} and
          event_id = ${messageId}
      `
    )
    .then(res => camelize(res?.rows?.[0]))
    .catch(error => {
      console.log(error)
    })
}

export async function getAttendeeRecords(messageId) {
  return await pgPool
    .query(
      SQL`
        select 
          *
        from attendees
        where event_id = ${messageId}
      `
    )
    .then(res => camelize(res?.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function getViewAttendeePages(messageId) {
  const query = await getAttendeeRecords(messageId)

  if (!(query?.length > 0)) return

  let guests = 0,
    totalHeadcount = 0

  const pageData = query.map(record => {
    const { userId, guestCount } = record

    let guestInfo = ``

    if (guestCount === 1) guestInfo = `(${guestCount} guest)`
    else if (guestCount > 1) guestInfo = `(${guestCount} guests)`

    guests += guestCount
    totalHeadcount += 1 + guestCount

    return {
      group: `known attendees`,
      values: `<@${userId}> ${guestInfo}`,
    }
  })

  pageData.unshift({
    group: `headcount`,
    values: `***total - ${totalHeadcount}***`,
  })
  pageData.unshift({ group: `headcount`, values: `guests - ${guests}` })
  pageData.unshift({
    group: `headcount`,
    values: `known attendees - ${query.length}`,
  })

  return pageData
}

export async function getOrganizerView(messageId, guild) {
  const query = await getAttendeeRecords(messageId)

  if (!(query?.length > 0)) return

  const pageData = []

  let guests = 0,
    totalHeadcount = 0

  await Promise.all(
    query.map(async record => {
      const { userId, guestCount } = record,
        member = guild.members.cache.get(userId),
        { nickname, user } = member || {},
        username = nickname ? nickname : user?.username,
        venmoTag = await getVenmoTag(userId)

      pageData.push({
        group: `${username}`,
        values: `user - ${member}`,
      })

      if (guestCount > 0) {
        pageData.push({
          group: `${username}`,
          values: `guests - ${guestCount}`,
        })
        pageData.push({
          group: `${username}`,
          values: `headcount - ${guestCount + 1}`,
        })
      }

      pageData.push({
        group: `${username}`,
        values: `venmo - ${venmoTag}`,
      })

      guests += guestCount
      totalHeadcount += 1 + guestCount
    })
  )

  pageData.unshift({
    group: `headcount`,
    values: `***total - ${totalHeadcount}***`,
  })
  pageData.unshift({ group: `headcount`, values: `guests - ${guests}` })
  pageData.unshift({
    group: `headcount`,
    values: `known attendees - ${query.length}`,
  })

  return pageData
}

export async function updateAttendee(userId, messageId, guestCount) {
  return await pgPool
    .query(
      SQL`
        update attendees
        set
          guest_count = ${guestCount}
        where user_id = ${userId} and
          event_id = ${messageId}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function deleteAttendee(userId, messageId) {
  return await pgPool
    .query(
      SQL`
        delete from attendees 
        where user_id = ${userId} and
          event_id = ${messageId}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}
