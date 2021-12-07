import { MessageActionRow, MessageButton } from 'discord.js'
import { getCommandLevelForChannel } from '../repositories/channels.js'

export default function (message) {
  if ((await getCommandLevelForChannel(message.channel.id)) !== `admin`) {
    message.reply(
      `
        Sorry, \`${commandSymbol}${command}\` is not a valid command 😔\
        \nUse the \`!help\` command to get a valid list of commands 🥰
      `
    )

    return
  }

  const deleteButtonRow = new MessageActionRow().addComponents(
    new MessageButton()
      .setCustomId(`!delete-message:`)
      .setLabel(`Delete this message 😭`)
      .setStyle('DANGER')
  )

  message.reply({
    content: `
      [content goes here]
    `,
    components: [deleteButtonRow],
  })
}
