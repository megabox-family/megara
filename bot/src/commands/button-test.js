import { MessageActionRow, MessageButton } from 'discord.js'

export default async function (roll, { message, isDirectMessage }) {
  const row = new MessageActionRow().addComponents(
    new MessageButton()
      .setURL('http://megabox.family/')
      .setLabel('Click here to gain access to Megabox')
      .setStyle('LINK')
  )

  message.channel.send({
    content: '711043006781849686',
  })
}
