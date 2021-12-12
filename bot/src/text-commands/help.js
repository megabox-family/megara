import { getBot } from '../cache-bot.js'
import { MessageEmbed } from 'discord.js'
import camelize from 'camelize'
import { basename } from 'path'
import { fileURLToPath } from 'url'
import {
  getCommandLevelForChannel,
  getFormatedCommandChannels,
} from '../repositories/channels.js'

const command = camelize(basename(fileURLToPath(import.meta.url), '.js'))

export default async function (message, commandSymbol) {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)

  if ([`prohibited`, `restricted`].includes(commandLevel)) {
    const commandChannels = await getFormatedCommandChannels(
      message.guild.id,
      `unrestricted`
    )

    message.reply(
      `
          Sorry the \`${commandSymbol}${command}\` command is prohibited in this channel 😔\
          \nBut here's a list of channels you can use it in: ${commandChannels}
        `
    )

    return
  }

  //admin commands go here
  const adminCommands = [
    `${commandSymbol}channelFunction`,
    `${commandSymbol}commandSymbol`,
    `${commandSymbol}setNameGuidelines`,
    `${commandSymbol}setRules`,
    `${commandSymbol}sort`,
    `${commandSymbol}test`,
  ]

  //full command list goes here
  const commandArray = [
    {
      name: `\`${commandSymbol}channelFunction <channel id>\``,
      value: `\
        \nSet the function of a channel, needed for some of ${
          getBot().user.username
        }'s features.\
        \nExample: \`${commandSymbol}channelFunction log 822941461695299624\`\
      `,
    },
    {
      name: `\`${commandSymbol}channels\``,
      value: `Displays the list of joinable channels.`,
    },
    {
      name: `\`${commandSymbol}color list\``,
      value: `Displays the list of possible color roles to choose from.`,
    },
    {
      name: `\`${commandSymbol}color <color>\``,
      value: `
        Sets your color.\
        \nExample: \`${commandSymbol}color sobble\`\
      `,
    },
    {
      name: `\`${commandSymbol}commandSymbol <command symbol>\``,
      value: `
        Lets you set the command symbol for ${
          getBot().user.username
        }'s commands to avoid bot command overlapping.\
        \nExample: \`${commandSymbol}commandSymbol &\`
      `,
    },
    {
      name: `\`${commandSymbol}join <channel>\``,
      value: `
        \nAdds you to the specified channel, if it's joinable.\
        \nExample: \`${commandSymbol}join minecraft\`\
      `,
    },
    {
      name: `\`${commandSymbol}leave <channel>\``,
      value: `\
        \nRemoves you from the specified channel.\
        \nExample: \`${commandSymbol}leave minecraft\`
      `,
    },
    {
      name: `\`${commandSymbol}nameGuideLines\``,
      value: `Prints the servers name guidelines.`,
    },
    {
      name: `\`${commandSymbol}name <Your name here>\``,
      value: `\
        \nUse this command to set your nickname within Megabox.\
        \nTypically this is only done once when you join the server.\
        \nExample: \`${commandSymbol}name John\`\
      `,
    },
    {
      name: `\`${commandSymbol}roll [count]d[die]\``,
      value: `\
        \nRoll any number of dice of any size (limited by discord message size).\
        \nExample: \`${commandSymbol}roll 4d8\`\
      `,
    },
    {
      name: `\`${commandSymbol}rules\``,
      value: `Displays the servers rules.`,
    },
    {
      name: `\`${commandSymbol}setNameGuidelines\``,
      value: `\
        \nAllows you to set the servers rules, also enables that a user accepts your rules before gaining full access to the server.\
        \nExample:\
        \n\`\`\`${commandSymbol}${command}\
          \nWe reccomend setting your nickname to what people call you in real life.\
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
    {
      name: `\`${commandSymbol}sort channels <boolean>\``,
      value: `\
        \nEnables / disables category and channel sorting for the server.\
        \nCategories and channels will be sorted alphabetically unless overriden.\
        \nExample: \`${commandSymbol}sort channels true\`, \`${commandSymbol}sort channels false\`\
      `,
    },
    {
      name: `\`${commandSymbol}sort roles <boolean>\``,
      value: `\
        \nEnables / disables role sorting for the server.\
        \nThis is used to ensure color roles are places at the top for color priority, it also puts function roles at the bottom of the list.\
        \nRoles placed between color roles and function roles will retain their position, roles above ${
          getBot().user.username
        } will not be sorted.
        \nExample: \`${commandSymbol}sort roles true\`, \`${commandSymbol}sort roles false\`\
      `,
    },
    {
      name: `\`${commandSymbol}teams [count of teams]\``,
      value: `\
        \nIf this command is used while you're in a voice call with others, it will divy everyone in the call into a specified number of teams.\
        \nExample: \`${commandSymbol}teams 2\`\
      `,
    },
    {
      name: `\`${commandSymbol}test\``,
      value: `This command is a wildcard, used for development, proceed with care.`,
    },
    {
      name: `\`${commandSymbol}voice\``,
      value: `Type this in any joinable topic channel and a voice channel specific to that topic will be opened up alongside it.`,
    },
  ]

  //full command list is filtered using the admin commands array
  let filteredCommandArray

  if (commandLevel === `admin`) {
    filteredCommandArray = commandArray.filter(command => {
      if (
        adminCommands.find(adminCommand => {
          if (command.name.match(`${adminCommand}(\\s|\`)`)) return true
        })
      ) {
        return command
      }
    })
  } else {
    filteredCommandArray = commandArray.filter(command => {
      if (
        adminCommands.every(adminCommand => {
          if (!command.name.match(`${adminCommand}(\\s|\`)`)) return true
        })
      ) {
        return command
      }
    })
  }

  //index is added to name of each command
  const finalCommandArray = filteredCommandArray.map((command, index) => {
    return {
      name: `${index + 1}. ${command.name}`,
      value: command.value,
    }
  })

  const commandListEmbed = new MessageEmbed()
    .setColor('#ff8bdb')
    .setTitle('Command List')
    .addFields(finalCommandArray)

  message.reply({ embeds: [commandListEmbed] })
}
