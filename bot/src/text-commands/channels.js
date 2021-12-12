import { MessageEmbed } from 'discord.js'
import camelize from 'camelize'
import { basename } from 'path'
import { fileURLToPath } from 'url'
import {
  getCommandLevelForChannel,
  getFormatedCommandChannels,
  getJoinableChannelList,
} from '../repositories/channels.js'

const command = camelize(basename(fileURLToPath(import.meta.url), '.js'))

export default async function (message, commandSymbol) {
  const commandLevel = await getCommandLevelForChannel(message.channel.id)

  if ([`prohibited`, `restricted`].includes(commandLevel)) {
    const commandChannels = await getFormatedCommandChannels(
      message.guild.id,
      `unrestricted`
    )

    message.reply(
      `
        Sorry the \`${commandSymbol}${command}\` command is prohibited in this channel 😔\
        \nBut here's a list of channels you can use it in: ${commandChannels}
      `
    )

    return
  }

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

  message.reply({ embeds: [channelListEmbed] })
}