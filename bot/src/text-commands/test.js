import { MessageActionRow, MessageButton } from 'discord.js'

export default function (message) {
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
