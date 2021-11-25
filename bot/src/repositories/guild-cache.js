let _guild = null

export function cacheGuild(guild) {
  _guild = guild
}

export function getGuild() {
  return _guild
}
