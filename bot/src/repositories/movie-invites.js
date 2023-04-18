import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'
import moment from 'moment'

export async function createMovieInviteData(messageId) {
  const timestamp = moment().valueOf()

  return await pgPool
    .query(
      SQL`
        insert into movie_invites (id, last_updated)
        values(
          ${messageId}, 
          ${timestamp}
        );
      `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function editMovieInviteData(messageId, timestamp) {
  return await pgPool
    .query(
      SQL`
        update movie_invites
        set
          last_updated = ${timestamp}
        where id = ${messageId}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function getMovieInviteLastUpdated(messageId) {
  return await pgPool
    .query(
      SQL`
        select 
          last_updated
        from movie_invites
        where id = ${messageId} 
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].last_updated : undefined))
    .catch(error => {
      console.log(error)
    })
}
