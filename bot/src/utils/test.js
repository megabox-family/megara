import { getAlphaChannelType } from './channels.js'

export default async function (bot) {
  const guild = bot.guilds.cache.get(`711043006253367426`),
    channel = guild.channels.cache.get(`1123430789300895886`),
    alphaChannelType = getAlphaChannelType(channel)

  // console.log(channel?.name, alphaChannelType)
}
