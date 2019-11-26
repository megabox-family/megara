const config = require('../config')
const changeNickname = require('./commands/change-nickname')
const joinChannel = require('./commands/join-channel')
const rollDice = require('./commands/dice-roller')
const setColor = require('./commands/set-color')

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

    switch (command.toLowerCase()) {
      case 'name':
        changeNickname(args, message)
        break
      case 'join':
        joinChannel(args, message)
        break
      case 'roll':
        rollDice(args, message)
        break
      case 'color':
        setColor(args, message)
        break
    }
  }
})

bot.login(config.botToken)
