import { MessageEmbed, MessageActionRow, MessageButton } from 'discord.js'
import { getActiveWorld } from '../repositories/guilds.js'
import {
  getWorldName,
  getWorldGroups,
  getCoordinatesByWorld,
  getCoordinatesByUser,
  getCoordinatesByAll,
} from '../repositories/coordinates.js'

export const defaultRecordsPerPage = 20

export async function getPages(
  recordsPerPage,
  groupBy,
  guild,
  filters,
  formatting
) {
  const precede = formatting ? formatting.precede : ``,
    delimiter = formatting ? formatting.delimiter : `\n`,
    succeed = formatting ? formatting.succeed : ``

  let query, activeWorldName

  switch (groupBy) {
    case `coordinates-world`:
      query = await getCoordinatesByWorld(guild.id, filters)
      break
    case `coordinates-user`:
      query = await getCoordinatesByUser(guild, filters)
      break
    case `coordinates-all`:
      query = await getCoordinatesByAll(guild.id, filters)
      break
    case `worlds-world`:
      query = await getWorldGroups(guild.id, filters)
      const activeWorldId = await getActiveWorld(guild.id)
      activeWorldName = await getWorldName(activeWorldId)
  }

  if (activeWorldName)
    query.forEach(record => {
      if (record.values === activeWorldName)
        record.values = `**${activeWorldName} (active world)**`
    })

  const groups = [...new Set(query.map(record => record.group))],
    groupedValues = groups.map(groupValue => {
      return query
        .filter(record => record.group === groupValue)
        .map(record => record.values)
    }),
    formattedBuckets = []

  let counter = 0,
    subPage = 1,
    subPageTotal = 0

  for (let i = 0; i < groups.length; i++) {
    const groupValue = groups[i]

    if (counter === recordsPerPage) counter = 0

    if (counter === 0) {
      formattedBuckets.push([])
    }

    counter++

    if (counter === recordsPerPage) {
      i--

      continue
    }

    const page = formattedBuckets.length - 1,
      groupValues = groupedValues[i],
      _groupValues = []

    while (groupValues.length !== 0) {
      if (counter === recordsPerPage) break

      _groupValues.push(groupValues.shift())

      counter++
    }

    if (groupValues.length !== 0) {
      subPageTotal = Math.ceil(groupValues.length / recordsPerPage) + subPage

      formattedBuckets[page].push({
        name: `${groupValue} ⋅ ${subPage} of ${subPageTotal}`,
        value: `${precede}${_groupValues.join(delimiter)}${succeed}`,
      })

      subPage++
      i--
    } else if (subPage === subPageTotal) {
      formattedBuckets[page].push({
        name: `${groupValue} ⋅ ${subPage} of ${subPageTotal}`,
        value: `${precede}${_groupValues.join(delimiter)}${succeed}`,
      })

      subPage = 1
      subPageTotal = 0
    } else {
      formattedBuckets[page].push({
        name: groupValue,
        value: `${precede}${_groupValues.join(delimiter)}${succeed}`,
      })
    }
  }

  return formattedBuckets
}

export async function generateListMessage(pages, title, description) {
  description = description ? `${description} \n` : ``

  const totalPages = pages.length,
    onlyOnePage = totalPages === 1 ? true : false,
    listButtons = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(`!change-page: first`)
        .setLabel(`«`)
        .setStyle('PRIMARY')
        .setDisabled(true),
      new MessageButton()
        .setCustomId(`!change-page: -1`)
        .setLabel(`‹`)
        .setStyle('PRIMARY')
        .setDisabled(true),
      new MessageButton()
        .setCustomId(`!refresh-embed:`)
        .setLabel(`⟳`)
        .setStyle('PRIMARY'),
      new MessageButton()
        .setCustomId(`!change-page: 1`)
        .setLabel(`›`)
        .setStyle('PRIMARY')
        .setDisabled(onlyOnePage),
      new MessageButton()
        .setCustomId(`!change-page: last`)
        .setLabel(`»`)
        .setStyle('PRIMARY')
        .setDisabled(onlyOnePage)
    )

  const listEmbed = new MessageEmbed()
    .setColor('#0099ff')
    .setTitle(title)
    .setDescription(`${description}──────────────────────────────`)
    .addFields(pages[0])
    .setFooter({ text: `Page 1 of ${totalPages}` })
    .setTimestamp()

  return {
    embeds: [listEmbed],
    components: [listButtons],
    ephemeral: true,
  }
}
