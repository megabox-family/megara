const config = require('../config')

const commands = {
 name: require('./commands/change-nickname'),
 join: require('./commands/join-channel'),
 leave: require('./commands/leave-channel'),
 roll: require('./commands/dice-roller'),
 color: require('./commands/set-color'),
 ids: require('./commands/get-ids'),
 channel: require('./commands/get-channel-info'),
 sync: require('./commands/sync-missing-data')
}

const Discord = require('discord.js')
const bot = new Discord.Client()

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`)
})

bot.on('message', message => {
  const messageText = message.content
  if (messageText.substring(0, 1) === '!') {
    const command = messageText.includes(' ')
      ? messageText.substring(1, messageText.indexOf(' '))
      : messageText.substring(1)
    const args = messageText.substring(messageText.indexOf(' ') + 1)

    if(commands[command.toLowerCase()]) {
      commands[command.toLowerCase()](args, message)
    }
  }
})

bot.login(config.botToken)
