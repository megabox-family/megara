import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'

export async function addEvent({
  messageId,
  eventTitle,
  threadName,
  eventType,
  startDatetime,
  endDatetime,
  startUnix,
  endUnix,
  location,
  allowGuests,
  requestVenmo,
  eventTitleOverride,
  activities,
  imageUrl,
  imdbUrl,
  accountForTrailers,
  channelId,
  parentChannelId,
  channelIsPost,
  screen,
  seats,
  hideScreen,
  hideSeats,
  createdById,
  concluded = false
}) {
  return await pgPool
  .query(
    SQL`
      insert into events (
        id, 
        event_title, 
        thread_name, 
        event_type, 
        start_datetime, 
        end_datetime, 
        start_unix,
        end_unix,
        location, 
        allow_guests, 
        request_venmo, 
        event_title_override, 
        activities, 
        image_url, 
        imdb_url, 
        account_for_trailers, 
        channel_id, 
        parent_channel_id, 
        channel_is_post, 
        screen,
        seats,
        hide_screen,
        hide_seats,
        created_by,
        concluded
      )
      values(
        ${messageId}, 
        ${eventTitle}, 
        ${threadName}, 
        ${eventType}, 
        ${startDatetime}, 
        ${endDatetime}, 
        ${startUnix},
        ${endUnix},
        ${location}, 
        ${allowGuests}, 
        ${requestVenmo}, 
        ${eventTitleOverride}, 
        ${activities}, 
        ${imageUrl}, 
        ${imdbUrl}, 
        ${accountForTrailers}, 
        ${channelId}, 
        ${parentChannelId}, 
        ${channelIsPost}, 
        ${screen},
        ${seats},
        ${hideScreen},
        ${hideSeats},
        ${createdById},
        ${concluded}
      );
    `
  )
  .catch(error => {
    console.log(error)
  })
}

export async function editEvent({
  messageId,
  eventTitle,
  threadName,
  eventType,
  startDatetime,
  endDatetime,
  startUnix,
  endUnix,
  location,
  allowGuests,
  requestVenmo,
  eventTitleOverride,
  activities,
  imageUrl,
  imdbUrl,
  accountForTrailers,
  screen,
  seats,
  hideScreen,
  hideSeats,
}) {
  return await pgPool
  .query(
    SQL`
      update events
      set
        event_title = ${eventTitle},
        thread_name = ${threadName},
        event_type = ${eventType},
        start_datetime = ${startDatetime},
        end_datetime = ${endDatetime},
        start_unix = ${startUnix},
        end_unix = ${endUnix},
        location = ${location},
        allow_guests = ${allowGuests},
        request_venmo = ${requestVenmo},
        event_title_override = ${eventTitleOverride},
        activities = ${activities},
        image_url = ${imageUrl},
        imdb_url = ${imdbUrl},
        account_for_trailers = ${accountForTrailers},
        screen = ${screen},
        seats = ${seats},
        hide_screen = ${hideScreen},
        hide_seats = ${hideSeats}
      where id = ${messageId}
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
        where channel_is_post = true and
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