import { MessageActionRow, MessageButton } from 'discord.js'
import { getBot } from '../repositories/cache-bot.js'
import { getChannelById, getChannelByName } from '../repositories/channels.js'

export default async function (interaction) {
  const interactionChannelRecord = await getChannelById(
      `${interaction.customId.match(`(?!:)[0-9]+`)[0]}`
    ),
    botCommandsChannelRecord = await getChannelByName(`bot-commands`),
    joinButtonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!joinChannel: ${interactionChannelRecord.id}`)
        .setLabel(`Join ${interactionChannelRecord.name}`)
        .setStyle('SUCCESS')
    )

  if (
    getBot()
      .channels.cache.get(interactionChannelRecord.id)
      .permissionOverwrites.cache.filter(
        permissionOverwrite => permissionOverwrite.id === interaction.user.id
      ).size > 0
  ) {
    getBot()
      .channels.cache.get(interactionChannelRecord.id)
      .permissionOverwrites.delete(interaction.user.id)
      .then(() =>
        interaction.user.send({
          content: `
              You have been removed from <#${interactionChannelRecord.id}>! 👋\
              \nIf you left by accident press the button below, or use the \`!join\` command here / in <#${botCommandsChannelRecord.id}> (ex: \`!join ${interactionChannelRecord.name}\`) to re-join.
            `,
          components: [joinButtonRow],
        })
      )
  } else
    interaction.user.send({
      content: `
          You tried to leave a channel you aren't a part of, <#${interactionChannelRecord.id}> 🤔\
          \nIf you'd like to join press the button below, or use the \`!join\` command here / in <#${botCommandsChannelRecord.id}> (ex: \`!join ${interactionChannelRecord.name}\`).
        `,
      components: [joinButtonRow],
    })
}
