import { pushToChannelVisibilityQueue } from '../utils/channels.js'
import {
  setAdminChannel,
  setAnnouncementChannel,
  setVerificationChannel,
  setWelcomeChannel,
  getFunctionChannels,
} from '../repositories/guilds.js'

const setCommands = {
  admin: setAdminChannel,
  announcement: setAnnouncementChannel,
  verification: setVerificationChannel,
  welcome: setWelcomeChannel,
}

export const description = `Sets or removes a specific channels special function (admin, announcements, verification, welcome).`
export const defaultPermission = false,
  options = [
    {
      name: `channel-function`,
      description: `The function you want to give or remove from a channel.`,
      type: `STRING`,
      required: true,
      choices: [
        { name: `admin`, value: `admin` },
        { name: `announcement`, value: `announcement` },
        { name: `verification`, value: `verification` },
        { name: `welcome`, value: `welcome` },
      ],
    },
    {
      name: `channel-id`,
      description: `The id for the channel you want to give the function to (input 'null' to remove).`,
      type: `STRING`,
      required: true,
    },
  ]

export default async function (interaction) {
  const guild = interaction.guild,
    options = interaction.options,
    channelFunction = options.getString(`channel-function`),
    optionChannelId = options.getString(`channel-id`),
    _optionChannelId = optionChannelId === `null` ? null : optionChannelId

  if (!_optionChannelId) {
    await setCommands[channelFunction](guild.id, null)

    interaction.reply({
      content: `The ${channelFunction} function has been removed from it's channel 😬`,
      ephemeral: true,
    })

    return
  }

  const optionChannel = guild.channels.cache.get(optionChannelId)

  if (!optionChannel) {
    interaction.reply({
      content: `You provided an invalid channel ID 🤔`,
      ephemeral: true,
    })

    return
  }

  const functionChannels = await getFunctionChannels(guild.id),
    isAlreadyFunctionChannel = Object.keys(functionChannels).find(
      key => functionChannels[key] === optionChannel.id
    ),
    existingChannelFunction = isAlreadyFunctionChannel
      ? isAlreadyFunctionChannel.match(`^[a-z]+`)[0]
      : null

  if (!guild.channels.cache.get(optionChannel.id)) {
    interaction.reply({
      content: `${optionChannel} is not a valid channel id. 😔`,
      ephemeral: true,
    })

    return
  } else if (isAlreadyFunctionChannel) {
    interaction.reply({
      content: `${optionChannel} is already set as the ${existingChannelFunction} channel, and any given channel can only have one function 🤔`,
      ephemeral: true,
    })

    return
  } else {
    await setCommands[channelFunction](guild.id, optionChannel.id)

    pushToChannelVisibilityQueue(optionChannel.id)

    interaction.reply({
      content: `The ${optionChannel} channel has been set as the ${channelFunction} channel! 👍`,
      ephemeral: true,
    })
  }
}
