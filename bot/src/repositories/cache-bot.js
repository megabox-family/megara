let _guild = null

export function cacheBot(guild) {
  _guild = guild
}

export function getBot() {
  return _guild
}
