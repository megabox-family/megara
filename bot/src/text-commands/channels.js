import { MessageEmbed } from 'discord.js'
import { getCommandName, commandLevelCheck } from '../utils/text-commands.js'
import {
  getJoinableChannelList,
  getArchivedChannelList,
  getPublicChannelList,
} from '../repositories/channels.js'

const command = getCommandName(import.meta.url)

function formatEmbedChannelArray(channelList) {
  const categoryArray = [
    ...new Set(channelList.map(record => record.categoryName)),
  ]

  return categoryArray.map(categoryName => {
    const formattedChannelList = `<#${channelList
      .filter(record => record.categoryName === categoryName)
      .map(record => record.channelId)
      .join(`>\n<#`)}>`

    return { name: categoryName, value: formattedChannelList }
  })
}

export default async function (message, commandSymbol, channelType) {
  if (!(await commandLevelCheck(message, commandSymbol, command))) return

  if (channelType)
    if (![`archived`, `public`].includes(channelType.toLowerCase())) {
      message.reply(`\
      \nInvlid channel type provided, your options are \`archived\` & \`public\`, if no option is provided joinable channels will be listed.\
      \nFor example: \`${commandSymbol}${command}\`, \`${commandSymbol}${command} archived\`, \`${commandSymbol}${command} public\`
    `)

      return
    }

  const guild = message.guild

  let channelListEmbed

  if (!channelType) {
    const joinableChannelList = await getJoinableChannelList(guild.id),
      embedChannelArray = formatEmbedChannelArray(joinableChannelList)

    channelListEmbed = new MessageEmbed()
      .setColor('#ff8bdb')
      .setTitle(`Joinable channel list`)
      .addFields(embedChannelArray)
  } else if (channelType.toLowerCase() === `archived`) {
    const archivedChannelList = await getArchivedChannelList(guild.id),
      embedChannelArray = formatEmbedChannelArray(archivedChannelList)

    channelListEmbed = new MessageEmbed()
      .setColor('#ff8bdb')
      .setTitle(`Archived channel list`)
      .addFields(embedChannelArray)
  } else {
    const publicChannelList = await getPublicChannelList(guild.id),
      embedChannelArray = formatEmbedChannelArray(publicChannelList)

    channelListEmbed = new MessageEmbed()
      .setColor('#ff8bdb')
      .setTitle(`Public channel list`)
      .addFields(embedChannelArray)
  }

  message.reply({
    content: `Use the \`${commandSymbol}join\` / \`${commandSymbol}leave\` commands to join / leave the channels in this list:`,
    embeds: [channelListEmbed],
  })
}
