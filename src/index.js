const config = require('../config')
const changeNickname = require('./commands/change-nickname')

const Discord = require('discord.js')
const bot = new Discord.Client()

bot.on('ready', () => {
  console.log(`Logged in as ${bot.user.tag}!`)
})

bot.on('message', msg => {
  const messageText = msg.content
  if (messageText.substring(0, 1) === '!') {
    const command = messageText.substring(1, messageText.indexOf(' '))
    const args = messageText.substring(messageText.indexOf(' ') + 1)

    switch (command.toLowerCase()) {
      case 'nickname':
        changeNickname(args, msg)
        break
    }
  }
})

bot.login(config.botToken)
