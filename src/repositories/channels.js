const pgPool = require('../pg-pool')
const camelize = require('camelize')

const getIdForJoinableChannel = async (channel) => {
  return await pgPool
    .query(
      `select id from channels where name = $1 AND channel_type = 'joinable';`,
      [channel]
    )
    .then((res) => (res.rows[0] ? res.rows[0].id : undefined))
}

const getJoinableChannels = async (channel) => {
  return await pgPool
    .query(`select * from channels where channel_type = 'joinable';`)
    .then((res) => camelize(res.rows))
}

module.exports = {
  getIdForJoinableChannel,
  getJoinableChannels
}
