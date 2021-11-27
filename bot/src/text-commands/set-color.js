import { getIdForColorRole, getColorRoleIds } from '../repositories/roles.js'
import { getCommandLevelForChannel } from '../repositories/channels.js'
import { formatReply } from '../utils.js'

export default async function (
  colorCommand,
  { message, guild, isDirectMessage }
) {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)
  if (commandLevel === 'restricted') return

  const lowerCaseColorCommand = colorCommand.toLowerCase()
  const colorRoleId = await getIdForColorRole(lowerCaseColorCommand)

  if (lowerCaseColorCommand === 'list')
    message.channel.send('Your wish is my command! ^-^', {
      files: ['./src/media/role-colors.PNG'],
    })
  else if (colorRoleId) {
    const colorRoles = await getColorRoleIds()
    const guildMember = guild.members.cache.get(message.author.id)
    const currentRoles = Array.from(guildMember.roles.cache.values()).map(
      x => x.id
    )
    const rolesToRemove = currentRoles.filter(x => colorRoles.includes(x))

    guildMember.roles
      .remove(rolesToRemove)
      .then(() =>
        guildMember.roles
          .add(colorRoleId)
          .then(() =>
            message.reply(
              formatReply(
                `your color has been changed to ${lowerCaseColorCommand}!~`,
                isDirectMessage
              )
            )
          )
      )
  } else
    message.reply(
      formatReply(
        "sorry, that isn't a valid color. <:pepehands:641024485339693057> Use `!color list` to see the list of available colors.",
        isDirectMessage
      )
    )
}
