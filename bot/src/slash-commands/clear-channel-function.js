import { ApplicationCommandOptionType, ChannelType } from 'discord.js'
import {
  setAdminChannel,
  setAnnouncementChannel,
  setWelcomeChannel,
  getFunctionChannels,
} from '../repositories/guilds.js'
import { queueApiCall } from '../api-queue.js'

const setCommands = {
  admin: setAdminChannel,
  announcement: setAnnouncementChannel,
  welcome: setWelcomeChannel,
}

export const description = `Removes a special function from the channel it's assignd to.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `channel-function`,
      description: `The function you'd like to clear from it's currently assigned channel.`,
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: `admin`, value: `admin` },
        { name: `announcement`, value: `announcement` },
        { name: `welcome`, value: `welcome` },
      ],
    },
  ]

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, options } = interaction,
    { id: guildId, channels } = guild,
    channelFunction = options.getString(`channel-function`),
    functionChannels = await getFunctionChannels(guildId),
    oldChannelId = functionChannels?.[`${channelFunction}Channel`],
    oldChannel = channels.cache.get(oldChannelId)

  if (!oldChannelId) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `There is no channel set for the ${channelFunction} function 🤔`,
    })

    return
  }

  if (!oldChannel) {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `The channel previously set to the ${channelFunction} function no longer exists, but I cleared the association on my end 💾`,
    })
  } else {
    await queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `I've removed the ${channelFunction} function from ${oldChannel} 🫡`,
    })
  }

  await setCommands[channelFunction](guildId, null)
}
