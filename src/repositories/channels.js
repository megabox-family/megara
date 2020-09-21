const pgPool = require('../pg-pool')
const camelize = require('camelize')

const getIdForJoinableChannel = async channel => {
  return await pgPool
    .query(
      `select id from channels where name = $1 AND channel_type = 'joinable';`,
      [channel]
    )
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
}

const getIdForChannel = async channel => {
  return await pgPool
    .query(`select id from channels where name = $1;`, [channel])
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
}

const getChannelsForAnnouncement = async () => {
  return await pgPool
    .query(
      `select * from channels where is_pending_announcement = true and channel_type != 'category';`
    )
    .then(res => camelize(res.rows))
}

const setChannelsAsAnnounced = async () => {
  return await pgPool
    .query(
      `update channels set is_pending_announcement = false where is_pending_announcement = true returning *;`
    )
    .then(res => camelize(res.rows))
}

const getJoinableChannels = async () => {
  return await pgPool
    .query(
      `select c1.id, c2.name as category_name, c1.name from channels c1
    join channels c2 on c1.category_id = c2.id and c2.channel_type = 'category'
    where c1.channel_type = 'joinable';`
    )
    .then(res => camelize(res.rows))
}

const getCommandLevelForChannel = async channel => {
  return await pgPool
    .query(`select command_level from channels where id = $1;`, [channel])
    .then(res => (res.rows[0] ? camelize(res.rows[0]).commandLevel : {}))
}

module.exports = {
  getIdForChannel,
  getChannelsForAnnouncement,
  setChannelsAsAnnounced,
  getIdForJoinableChannel,
  getJoinableChannels,
  getCommandLevelForChannel,
}
