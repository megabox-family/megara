import { EmbedBuilder } from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import {
  getActiveVoiceCategoryId,
  getInactiveVoiceCategoryId,
} from '../repositories/guilds.js'

export const description = `Lists categories associated with custom voice functionality.`
export const dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild } = interaction,
    activeVoiceCategoryId = await getActiveVoiceCategoryId(guild.id),
    inactiveVoiceCategoryId = await getInactiveVoiceCategoryId(guild.id),
    fields = [
      {
        name: `active voice category`,
        value: activeVoiceCategoryId
          ? `<#${activeVoiceCategoryId}>`
          : `*not set*`,
      },
      {
        name: `inactive voice category`,
        value: inactiveVoiceCategoryId
          ? `<#${inactiveVoiceCategoryId}>`
          : `*not set*`,
      },
    ],
    embed = new EmbedBuilder()
      .setColor(`#6725BC`)
      .setTitle(`voice categories`)
      .addFields(fields)
      .setTimestamp()

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: { content: `You ask and I deliver 😊`, embeds: [embed] },
  })
}
