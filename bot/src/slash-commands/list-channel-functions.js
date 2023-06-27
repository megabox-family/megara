import { EmbedBuilder } from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import { getFunctionChannels } from '../repositories/guilds.js'

export const description = `Lists each channel function and the channel currently associated with it.`
export const dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild } = interaction,
    functionChannels = await getFunctionChannels(guild.id),
    fields = Object.keys(functionChannels).map(channelKey => {
      const channelId = functionChannels[channelKey],
        displayChannel = channelId ? `<#${channelId}>` : `*none*`,
        displayKey = channelKey.replace(`Channel`, ``)

      return { name: displayKey, value: displayChannel }
    }),
    embed = new EmbedBuilder()
      .setColor(`#6725BC`)
      .setTitle(`channel functions`)
      .addFields(fields)
      .setTimestamp()

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: { content: `You ask and I deliver 😊`, embeds: [embed] },
  })
}
