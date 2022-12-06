let _commands = []

export function cacheCommands(commands) {
  _commands = [..._commands, ...commands]
}

export function getCommands() {
  return _commands
}
