import { getBot } from '../cache-bot.js'
import { getCommandName, adminCheck } from '../utils/text-commands.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol, args) {
  getBot().guilds.cache.forEach(guild => {
    const serverNotificationSquad = guild.roles.cache.find(
        role => role.name === `server notification squad`
      ),
      channelNotificationSquad = guild.roles.cache.find(
        role => role.name === `channel notification squad`
      ),
      colorNotificationSquad = guild.roles.cache.find(
        role => role.name === `color notification squad`
      )

    guild.members.cache.forEach(member => {
      // member => console.log(member.user.username)

      if (![`Omegara`, `megara`].includes(member.user.username)) {
        member.roles.add(serverNotificationSquad.id)
        member.roles.add(channelNotificationSquad.id)
        member.roles.add(colorNotificationSquad.id)
      }
    })
  })
}
