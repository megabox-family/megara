const Discord = require('discord.js')
const { getCommandLevelForChannel } = require('../repositories/channels')

module.exports = async (args, { message }) => {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)
  if (commandLevel === 'restricted') return

  const commandListEmbed = new Discord.MessageEmbed()
    .setColor('#ff8bdb')
    .setTitle('Command List')
    .addFields(
      {
        name: '1. `!name <Your name here>`',
        value: `Use this command to set your nickname within Megabox.\nTypically this is only done once when you join the server.\nExample: \`!name Megara\``,
      },
      {
        name: '2. `!color list`',
        value: 'Displays the list of possible color roles to choose from.',
      },
      {
        name: '3. `!color <color>`',
        value: `Sets your color.\nExample: \`!color sobble\``,
      },
      {
        name: '4. `!channel list`',
        value: 'Displays the list of joinable channels.',
      },
      {
        name: '5. `!join <channel>`',
        value:
          "Adds you to the specified channel, if it's joinable.\nExample: `!join games-general`",
      },
      {
        name: '6. `!leave <channel>`',
        value:
          'Removes you from the specified channel.\nExample: `!leave sports`',
      },
      {
        name: '7. `!roll [count]d[die]`',
        value:
          'Roll any number of dice of any size (limited by discord message size).\nExample: `!roll 4d8`',
      }
    )
  message.channel.send(commandListEmbed)
}
