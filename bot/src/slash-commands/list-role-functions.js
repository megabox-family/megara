import { EmbedBuilder } from 'discord.js'
import { paramCase } from 'change-case'
import { queueApiCall } from '../api-queue.js'
import { getFunctionRoles } from '../repositories/guilds.js'

export const description = `Lists each role function and the role currently associated with it.`
export const dmPermission = false,
  defaultMemberPermissions = `0`

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild } = interaction,
    functionRoles = await getFunctionRoles(guild.id),
    fields = Object.keys(functionRoles).map(roleKey => {
      const roleId = functionRoles[roleKey],
        displayRole = roleId ? `${guild.roles.cache.get(roleId)}` : `*none*`,
        displayKey = paramCase(roleKey.replace(`RoleId`, ``))

      return { name: displayKey, value: displayRole }
    }),
    embed = new EmbedBuilder()
      .setColor(`#6725BC`)
      .setTitle(`role functions`)
      .addFields(fields)
      .setTimestamp()

  await queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: { content: `You ask and I deliver 😊`, embeds: [embed] },
  })
}
