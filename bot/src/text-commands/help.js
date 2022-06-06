import { getBot } from '../cache-bot.js'
import { MessageEmbed } from 'discord.js'
import { getCommandName, commandLevelCheck } from '../utils/text-commands.js'
import { getCommandLevelForChannel } from '../repositories/channels.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol) {
  if (!(await commandLevelCheck(message, commandSymbol, command))) return

  //admin commands go here
  const adminCommands = [
    `${commandSymbol}setNameGuidelines`,
    `${commandSymbol}setRules`,
  ]

  //full command list goes here
  const commandArray = [
    {
      name: `\`${commandSymbol}setNameGuidelines\``,
      value: `\
        \nAllows you to set the servers rules, also enables that a user accepts your rules before gaining full access to the server.\
        \nExample:\
        \n\`\`\`${commandSymbol}${command}\
          \nWe recommend setting your nickname to what people call you in real life.\
          \nwe're all on a first name basis in this server.\
        \n\`\`\`\
      `,
    },
    {
      name: `\`${commandSymbol}setRules\``,
      value: `\
        \nAllows you to set the servers rules, also enables that a user accepts your rules before gaining full access to the server.\
        \nExample:\
        \n\`\`\`${commandSymbol}setRules\
          \nTo continue you must accept [server names] rules\
          \n- No kicking\
          \n- No screamin\
          \n...\
        \n\`\`\`\
      `,
    },
  ]

  //full command list is filtered using the admin commands array
  const commandLevel = await getCommandLevelForChannel(message.channel.id)
  let filteredCommandArray

  if (commandLevel === `admin`) {
    filteredCommandArray = commandArray.filter(command => {
      if (
        adminCommands.find(adminCommand => {
          if (command.name.match(`\\${adminCommand}(\\s|\`)`)) return true
        })
      ) {
        return command
      }
    })
  } else {
    filteredCommandArray = commandArray.filter(command => {
      if (
        adminCommands.every(adminCommand => {
          if (!command.name.match(`\\${adminCommand}(\\s|\`)`)) return true
        })
      ) {
        return command
      }
    })
  }

  //index is added to name of each command
  const finalCommandArray = filteredCommandArray.map((command, index) => {
    return {
      name: `${index + 1}. ${command?.name}`,
      value: command?.value,
    }
  })

  if (finalCommandArray.length < 1) {
    message.reply(`
      \nThere are currently no text commands in this server.\
      \nMost commands are slash commands, type \`/\` to get a list of available commands in this channel.
    `)

    return
  }

  const commandListEmbed = new MessageEmbed()
    .setColor('#ff8bdb')
    .setTitle('Command List')
    .addFields(finalCommandArray)

  message.reply({ embeds: [commandListEmbed] })
}
