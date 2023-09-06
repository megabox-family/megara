import { getThreadById } from './threads.js'

export default async function (bot) {
  const guild = bot.guilds.cache.get(`711043006253367426`),
    channel = guild.channels.cache.get(`1123430789300895886`),
    channelFlags = channel.flags.serialize(),
    thread = await getThreadById(channel, `1148889970187182120`),
    threadFlags = thread.flags.serialize()

  console.log(channelFlags)
}
