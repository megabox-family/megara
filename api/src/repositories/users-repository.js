const camelize = require('camelize')
const pgPool = require('../pg-pool')
const { randomUUID } = require('crypto')

const getUserById = id => {
  return pgPool
    .query(`select * from users where id = $1;`, [id])
    .then(res => camelize(res.rows[0]))
}

const getUserByDiscordId = discordId => {
  return pgPool
    .query(`select * from users where discord_id = $1;`, [discordId])
    .then(res => camelize(res.rows[0]))
}

const recordUserVisit = id => {
  const now = new Date().toISOString()

  return pgPool.query(
    `
  update users 
  set last_seen_at = $1 
  where id = $2;`,
    [now, id]
  )
}

const saveNewUser = (discordId, discordUsername) => {
  const id = randomUUID()
  const now = new Date().toISOString()

  return pgPool
    .query(
      `
    insert into users(id, discord_id, discord_username, last_seen_at) 
    values($1, $2, $3, $4)
    returning *;
    `,
      [id, discordId, discordUsername, now]
    )
    .then(res => camelize(res.rows[0]))
}

module.exports = {
  getUserById,
  getUserByDiscordId,
  recordUserVisit,
  saveNewUser,
}
