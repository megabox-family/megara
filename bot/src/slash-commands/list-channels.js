import { MessageEmbed } from 'discord.js'
import {
  getJoinableChannelList,
  getArchivedChannelList,
  getPublicChannelList,
} from '../repositories/channels.js'

export const description = `Displays a list of a specific type of channels within the server (joinable, public, archived).`
export const defaultPermission = false,
  options = [
    {
      name: `channel-type`,
      description: `The type of channels you want to be listed.`,
      type: `STRING`,
      required: true,
      choices: [
        { name: `joinable`, value: `joinable` },
        { name: `public`, value: `public` },
        { name: `archived`, value: `archived` },
      ],
    },
  ]

function formatEmbedChannelArray(channelList) {
  const categoryArray = [
    ...new Set(channelList.map(record => record.categoryName)),
  ]

  return categoryArray.map(categoryName => {
    const formattedChannelList = channelList
      .filter(record => record.categoryName === categoryName)
      .map(record => record.channelId)
      .join(`>\n<#`)

    return { name: categoryName, value: `<#${formattedChannelList}>` }
  })
}

export default async function (interaction) {
  const guild = interaction.guild,
    options = interaction.options,
    channelType = options.getString(`channel-type`)

  let channelListEmbed

  if (channelType === `joinable`) {
    const joinableChannelList = await getJoinableChannelList(guild.id),
      embedChannelArray = formatEmbedChannelArray(joinableChannelList)

    channelListEmbed = new MessageEmbed()
      .setColor('#ff8bdb')
      .setTitle(`Joinable channel list`)
      .addFields(embedChannelArray)
  } else if (channelType.toLowerCase() === `public`) {
    const publicChannelList = await getPublicChannelList(guild.id),
      embedChannelArray = formatEmbedChannelArray(publicChannelList)

    channelListEmbed = new MessageEmbed()
      .setColor('#ff8bdb')
      .setTitle(`Public channel list`)
      .addFields(embedChannelArray)
  } else {
    const archivedChannelList = await getArchivedChannelList(guild.id),
      embedChannelArray = formatEmbedChannelArray(archivedChannelList)

    channelListEmbed = new MessageEmbed()
      .setColor('#ff8bdb')
      .setTitle(`Archived channel list`)
      .addFields(embedChannelArray)
  }

  interaction.reply({
    content: `Use the \`/join\` & \`/leave\` commands to join & leave the channels in this list:`,
    embeds: [channelListEmbed],
    ephemeral: true,
  })
}
