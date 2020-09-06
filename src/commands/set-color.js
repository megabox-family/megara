const { getIdForColorRole, getColorRoleIds } = require('../repositories/roles')

module.exports = async (colorCommand, { message, guild }) => {
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
              `your color has been changed to ${lowerCaseColorCommand}!~`
            )
          )
      )
  } else
    message.reply(
      "sorry, that isn't a valid color. <:pepehands:641024485339693057> Use `!color list` to see the list of available colors."
    )
}
