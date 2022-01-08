import { MessageEmbed } from 'discord.js'
import { getCommandName, commandLevelCheck } from '../utils/text-commands.js'
import { getJoinableChannelList } from '../repositories/channels.js'

const command = getCommandName(import.meta.url)

export default async function (message, commandSymbol) {
  if (!(await commandLevelCheck(message, commandSymbol, command))) return

  const joinableChannelList = await getJoinableChannelList(message.guild.id),
    categoryArray = [
      ...new Set(joinableChannelList.map(record => record.categoryName)),
    ],
    embedChannelArray = categoryArray.map(categoryName => {
      const channelList = `<#${joinableChannelList
        .filter(record => record.categoryName === categoryName)
        .map(record => record.channelId)
        .join(`>\n<#`)}>`

      return { name: categoryName, value: channelList }
    }),
    channelListEmbed = new MessageEmbed()
      .setColor('#ff8bdb')
      .setTitle(`Joinable channel list`)
      .addFields(embedChannelArray)

  message.reply({
    content: `Use the ${commandSymbol}join command to join the channels in this list:`,
    embeds: [channelListEmbed],
  })
}
