import { directMessageError } from '../utils/error-logging.js'
import {
  addMemberToChannel,
  removeMemberFromChannel,
} from '../utils/channels.js'
import { getChannelButtons } from '../utils/buttons.js'
import { getChannelType } from '../repositories/channels.js'

export default async function (interaction) {
  await interaction.deferUpdate()

  const guild = interaction.guild,
    member = interaction.member,
    channelNumber = interaction.customId.match(`(?<=:\\s)-?[0-9A-Za-z]+`)[0],
    message = interaction.message,
    embed = message.embeds[0],
    fields = embed.fields,
    listChannelArray = []

  fields.forEach(field => listChannelArray.push(...field.value.split(`\n`)))

  const channelId = listChannelArray
      .find(value => value.match(`[0-9]+(?=\\.)`)[0] === channelNumber)
      .match(`(?<=#)[0-9]+`)[0],
    channel = guild.channels.cache.get(channelId)

  if (!channel) {
    member
      .send({
        content: `The channel you tried interacting with no longer exists, please refresh the channel list 😬`,
      })
      .catch(error => directMessageError(error, member))

    return
  }

  const channelType = await getChannelType(channel.id)

  let joinOrLeaveChannel, result

  if (
    [`joinable`, `archived`].includes(channelType) &&
    channel.permissionOverwrites.cache.get(member.id)
  )
    joinOrLeaveChannel = `leave`
  else if (
    channelType === `public` &&
    !channel.permissionOverwrites.cache.get(member.id)
  )
    joinOrLeaveChannel = `leave`
  else joinOrLeaveChannel = `join`

  if (joinOrLeaveChannel === `join`)
    result = await addMemberToChannel(member, channelId)
  else result = await removeMemberFromChannel(member, channelId)

  switch (result) {
    case `not added`:
      member
        .send({
          content: `We failed to add you to the channel for an unknown reason, please try again 😬`,
        })
        .catch(error => directMessageError(error, member))
      return
    case `not removed`:
      member
        .send({
          content: `We failed to remove you from the channel for an unknown reason, please try again 😬`,
          ephemeral: true,
        })
        .catch(error => directMessageError(error, member))
      return
  }

  const channelButtonComponents = getChannelButtons(
    fields,
    member.id,
    guild.channels.cache,
    `channels-${channelType}`,
    { channelId: channel.id, result: result }
  )

  await interaction.editReply({
    components: [message.components[0], ...channelButtonComponents],
  })
}
