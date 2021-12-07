import { getBot } from './cache-bot.js'

const _channelCache = []

export function cacheChannel(guildId, roleName, channelId) {
  const stringRecord = JSON.stringify({
    guild: guildId,
    role: roleName,
    channel: channelId,
  })

  if (!_channelCache.includes(stringRecord)) _channelCache.push(stringRecord)
}

export function getChannelCache(guildId, roleName) {
  return _channelCache
    .filter(stringRecord => {
      const record = JSON.parse(stringRecord)

      if (
        record?.guild === guildId &&
        record.roleName === roleName &&
        getBot().channels.cache.get(record.channel)
      ) {
        return true
      }
    })
    .map(record => record.channel)
}
