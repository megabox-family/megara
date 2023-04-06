export function directMessageError(error, guildMember) {
  let guildmemberInfo

  if (guildMember?.nickname)
    guildmemberInfo = `${guildMember.nickname} (${guildMember.username}${guildMember.discriminator})`
  else guildmemberInfo = `${guildMember.username}${guildMember.discriminator}`

  console.log(
    `It's possible that ${guildmemberInfo} has DMs disabled. \n\n\n${error}`
  )
}
