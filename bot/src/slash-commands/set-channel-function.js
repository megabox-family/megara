import { ApplicationCommandOptionType, ChannelType } from 'discord.js'
import {
  setAdminChannel,
  setAnnouncementChannel,
  setVerificationChannel,
  setWelcomeChannel,
  getFunctionChannels,
} from '../repositories/guilds.js'
import { queueApiCall } from '../api-queue.js'

const setCommands = {
  admin: setAdminChannel,
  announcement: setAnnouncementChannel,
  verification: setVerificationChannel,
  welcome: setWelcomeChannel,
}

export const description = `Sets the specified channel's special function.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `channel-function`,
      description: `The function you want to assign to the specified channel.`,
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: `admin`, value: `admin` },
        { name: `announcement`, value: `announcement` },
        { name: `verification`, value: `verification` },
        { name: `welcome`, value: `welcome` },
      ],
    },
    {
      name: `channel`,
      description: `The channel you want to give the function to.`,
      type: ApplicationCommandOptionType.Channel,
      required: true,
      autocomplete: true,
      channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
    },
  ]

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, options } = interaction,
    channelFunction = options.getString(`channel-function`),
    optionChannel = options.getChannel(`channel`),
    functionChannels = await getFunctionChannels(guild.id),
    isAlreadyFunctionChannel = Object.keys(functionChannels).find(
      key => functionChannels[key] === optionChannel.id
    ),
    existingChannelFunction = isAlreadyFunctionChannel
      ? isAlreadyFunctionChannel.match(`^[a-z]+`)[0]
      : null

  if (isAlreadyFunctionChannel) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `${optionChannel} is already set as the ${existingChannelFunction} channel, and any given channel can only have one function 🤔`,
    })

    return
  } else {
    await setCommands[channelFunction](guild.id, optionChannel.id)

    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `The ${optionChannel} channel has been set as the ${channelFunction} channel! 👍`,
    })
  }
}
