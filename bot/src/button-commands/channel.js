import { directMessageError } from '../utils/error-logging.js'
import {
  addMemberToChannel,
  removeMemberFromChannel,
} from '../utils/channels.js'
import { getChannelButtons } from '../utils/buttons.js'
import { getChannelType } from '../repositories/channels.js'
import { getButtonContext } from '../utils/validation.js'
import { getPages } from '../utils/slash-commands.js'
import { getListInfo } from '../repositories/lists.js'

export default async function (interaction) {
  await interaction.deferUpdate()

  const guild = interaction.guild,
    member = interaction.member,
    channelId = getButtonContext(interaction.customId),
    channel = guild.channels.cache.get(channelId),
    message = interaction.message,
    listInfo = await getListInfo(message.id)

  if (!listInfo) {
    interaction.editReply(
      `Something went wrong retreiving a page in the list, please dismiss this message and create a new list message 😬`
    )
    return
  }

  const recordsPerPage = listInfo.recordsPerPage,
    group = listInfo.groupBy,
    filters = listInfo.filters,
    pages = await getPages(recordsPerPage, group, guild, filters),
    existingEmbed = message.embeds[0],
    existingFooter = existingEmbed.footer,
    currentPage = existingFooter.text.match(`[0-9]+(?=\\sof)`) - 1

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
  else result = await removeMemberFromChannel(member, channel)

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
    pages[currentPage],
    member.id,
    guild.channels.cache,
    `channels-${channelType}`,
    { channelId: channel.id, result: result }
  )

  await interaction.editReply({
    components: [message.components[0], ...channelButtonComponents],
  })
}
