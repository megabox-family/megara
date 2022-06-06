import { addMemberToChannel } from '../utils/channels.js'
import { getIdForJoinableChannel } from '../repositories/channels.js'

export const description = `Allows you to join a channel by name (use \`/channel-list\` to list channels).`
export const defaultPermission = false,
  options = [
    {
      name: `channel-name`,
      description: `The name of the channel that you would like to join.`,
      type: `STRING`,
      required: true,
    },
  ]

export default async function (interaction) {
  const guild = interaction.guild,
    options = interaction.options,
    channelName = options.getString(`channel-name`),
    joinableChannelId = await getIdForJoinableChannel(guild.id, channelName)

  if (!joinableChannelId) {
    interaction.reply({
      content: `${channelName} is either a channel that doesn't exist or one that you can't join 🤔`,
      ephemeral: true,
    })

    return
  }

  const channel = guild.channels.cache.get(joinableChannelId)

  if (!channel) {
    interaction.reply({
      content: `I was unable to add you to ${channelName} for an unknown reason, please contact a server administrator for help. 😬`,
      ephemeral: true,
    })

    return
  }

  const guildMember = interaction.member,
    result = await addMemberToChannel(guildMember, channel.id)

  if (result === `added`)
    interaction.reply({
      content: `You've been added to **${channel}** 😁`,
      ephemeral: true,
    })
  else
    interaction.reply({
      content: `You already have access **${channel}** 🤔`,
      ephemeral: true,
    })
}
