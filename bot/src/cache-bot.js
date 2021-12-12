let _bot = null

export function cacheBot(bot) {
  _bot = bot
}

export function getBot() {
  return _bot
}
