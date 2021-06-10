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

const getChannelIdFromEmoji = async emoji => {
  return await pgPool
    .query(`select id, name, message_id from channels where emoji = $1;`, [
      emoji,
    ])
    .then(res => camelize(res.rows[0]))
}

const getJoinableChannelsWithEmoji = async () => {
  return await pgPool
    .query(
      `select c1.id, c2.name as category_name, c1.name, c1.emoji, c1.has_priority from channels c1
    join channels c2 on c1.category_id = c2.id and c2.channel_type = 'category'
    where c1.channel_type = 'joinable' and c1.emoji is not null
    order by category_name, c1.name;`
    )
    .then(res => camelize(res.rows))
}

const updateChannelMessageId = async (channelId, messageId) => {
  return await pgPool
    .query(`update channels set message_id = $1 where id = $2 returning *;`, [
      messageId,
      channelId,
    ])
    .then(res => camelize(res.rows))
    .catch(err => console.log(err))
}

const getJoinableChannelsMessageIds = async () => {
  return await pgPool
    .query(
      `select distinct message_id from channels where message_id is not null;`
    )
    .then(res => camelize(res.rows).map(x => x.messageId))
}

const setActiveVoiceChannelId = async (channelId, voiceChannelId) => {
  return await pgPool.query(
    `update channels set active_voice_channel_id = $1 where id = $2;`,
    [voiceChannelId, channelId]
  )
}

const removeActiveVoiceChannelId = async voiceChannelId => {
  return await pgPool.query(
    `update channels set active_voice_channel_id = null where active_voice_channel_id = $1;`,
    [voiceChannelId]
  )
}

const channelWithVoiceChannelIsJoinable = async voiceChannelId => {
  return await pgPool
    .query(
      `select id from channels where active_voice_channel_id = $1 and channel_type = 'joinable';`,
      [voiceChannelId]
    )
    .then(res => !!res.rows[0])
}

const channelIsJoinable = async channelId => {
  return await pgPool
    .query(
      `select id from channels where id = $1 and channel_type = 'joinable';`,
      [channelId]
    )
    .then(res => !!res.rows[0])
}

const channelHasActiveVoiceChannel = async channelId => {
  return await pgPool
    .query(
      `select active_voice_channel_id from channels where id = $1 and active_voice_channel_id is not null;`,
      [channelId]
    )
    .then(res => !!res.rows[0])
}

const getActiveVoiceChannelIds = async () => {
  return await pgPool
    .query(
      `select active_voice_channel_id from channels where channel_type = 'joinable' and active_voice_channel_id is not null;`
    )
    .then(res => camelize(res.rows))
}

module.exports = {
  getIdForChannel,
  getChannelsForAnnouncement,
  setChannelsAsAnnounced,
  getIdForJoinableChannel,
  getJoinableChannels,
  getCommandLevelForChannel,
  getChannelIdFromEmoji,
  getJoinableChannelsWithEmoji,
  updateChannelMessageId,
  getJoinableChannelsMessageIds,
  setActiveVoiceChannelId,
  removeActiveVoiceChannelId,
  channelWithVoiceChannelIsJoinable,
  channelIsJoinable,
  channelHasActiveVoiceChannel,
  getActiveVoiceChannelIds,
}
