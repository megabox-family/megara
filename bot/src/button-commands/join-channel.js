import { MessageActionRow, MessageButton } from 'discord.js'
import { getBot } from '../cache-bot.js'
import {
  getChannelById,
  getChannelByName,
  getUnrestrictedChannels,
} from '../repositories/channels.js'

export default async function (interaction) {
  const interactionChannelRecord = await getChannelById(
      `${interaction.customId.match(`(?!:)[0-9]+`)[0]}`
    ),
    botCommandsChannelRecord = await getChannelByName(`bot-commands`),
    leaveButtonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!leave-channel: ${interactionChannelRecord.id}`)
        .setLabel(`Leave ${interactionChannelRecord.name}`)
        .setStyle('DANGER')
    ),
    unrestrictedChannels = await getUnrestrictedChannels(),
    compatibleChannels = unrestrictedChannels.map(
      unrestrictedChannel => `<#${unrestrictedChannel.id}>`
    )

  if (interactionChannelRecord.channelType === `joinable`) {
    if (
      getBot()
        .channels.cache.get(interactionChannelRecord.id)
        .permissionOverwrites.cache.filter(
          permissionOverwrite => permissionOverwrite.id === interaction.user.id
        ).size < 1
    ) {
      getBot()
        .channels.cache.get(interactionChannelRecord.id)
        .permissionOverwrites.create(interaction.user.id, {
          VIEW_CHANNEL: true,
        })
        .then(() =>
          interaction.user.send({
            content: `
              You have been added to <#${interactionChannelRecord.id}>! 😁\
              \nIf you joined by accident press the button below, or use the \`!leave\` command (ex: \`!leave ${
                interactionChannelRecord.name
              }\`) to leave.\
              \nThe \`!leave\` command works in these channels: ${compatibleChannels.join(
                `, `
              )}
            `,
            components: [leaveButtonRow],
          })
        )
    } else
      interaction.user.send({
        content: `
          You already have access to <#${interactionChannelRecord.id}> 👍\
          \nIf you'd like to leave press the button below, or use the \`!leave\` command (ex: \`!leave ${
            interactionChannelRecord.name
          }\`).\
          \nThe \`!leave\` command works in these channels: ${compatibleChannels.join(
            `, `
          )}
        `,
        components: [leaveButtonRow],
      })
  } else
    interaction.user.send(
      `Sorry, ${interactionChannelRecord.name} is not a joinable channel 🥺`
    )
}
