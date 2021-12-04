import Discord from 'discord.js'

export default async function (message, commandSymbol) {
  const commandListEmbed = new Discord.MessageEmbed()
    .setColor('#ff8bdb')
    .setTitle('Command List')
    .addFields(
      {
        name: `1. \`${commandSymbol}name <Your name here>\``,
        value: `
          Use this command to set your nickname within Megabox.\
          \nTypically this is only done once when you join the server.\nExample: \`${commandSymbol}name Megara\`
        `,
      },
      {
        name: `2. \`${commandSymbol}color list\``,
        value: `Displays the list of possible color roles to choose from.`,
      },
      {
        name: `3. \`${commandSymbol}color <color>\``,
        value: `Sets your color.\nExample: \`${commandSymbol}color sobble\``,
      },
      {
        name: `4. \`${commandSymbol}channel list\``,
        value: `Displays the list of joinable channels.`,
      },
      {
        name: `5. \`${commandSymbol}join <channel>\``,
        value: `
          Adds you to the specified channel, if it's joinable.\
          \nExample: \`${commandSymbol}join games-general\`
        `,
      },
      {
        name: `6. \`${commandSymbol}leave <channel>\``,
        value: `
          Removes you from the specified channel.\
          \nExample: \`${commandSymbol}leave sports\`
        `,
      },
      {
        name: `7. \`${commandSymbol}roll [count]d[die]\``,
        value: `
          Roll any number of dice of any size (limited by discord message size).\
          \nExample: \`${commandSymbol}roll 4d8\`
        `,
      },
      {
        name: '8. `${commandSymbol}voice`',
        value: `Type this in any joinable topic channel and a voice channel specific to that topic will be opened up alongside it.`,
      }
    )
  message.channel.send(commandListEmbed)
}
