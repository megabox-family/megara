import {
  CommandInteractionOptionResolver,
  MessageActionRow,
  MessageButton,
} from 'discord.js'

export async function toggleListButtons(
  newPage,
  totalPages,
  paginationButtons
) {
  if (totalPages === 1) {
    paginationButtons.components[0].setDisabled(true)
    paginationButtons.components[1].setDisabled(true)
    paginationButtons.components[3].setDisabled(true)
    paginationButtons.components[4].setDisabled(true)
  } else if (newPage === totalPages) {
    paginationButtons.components[0].setDisabled(false)
    paginationButtons.components[1].setDisabled(false)
    paginationButtons.components[3].setDisabled(true)
    paginationButtons.components[4].setDisabled(true)
  } else if (newPage === 1) {
    paginationButtons.components[0].setDisabled(true)
    paginationButtons.components[1].setDisabled(true)
    paginationButtons.components[3].setDisabled(false)
    paginationButtons.components[4].setDisabled(false)
  } else {
    paginationButtons.components[0].setDisabled(false)
    paginationButtons.components[1].setDisabled(false)
    paginationButtons.components[3].setDisabled(false)
    paginationButtons.components[4].setDisabled(false)
  }

  return paginationButtons
}

export function getColorButtons(fields, memberRoles, override) {
  const valueArray = fields[0].value.split(`\n`),
    buttonArrays = []

  let counter = 0

  for (let i = 0; i < 4; i++) {
    buttonArrays.push([])

    const lastArray = buttonArrays.length - 1

    for (let j = 0; j < 5; j++) {
      const value = valueArray.shift()

      if (!value) {
        buttonArrays[lastArray].push(
          new MessageButton()
            .setCustomId(`!color-role: ${counter}`)
            .setLabel(` `)
            .setStyle('SECONDARY')
            .setDisabled(true)
        )

        counter--

        continue
      }

      const colorRoleId = value.match(`(?<=&)[0-9]+`)[0],
        buttonNumber = value.match(`[0-9]+(?=\\.)`)[0]

      if (override?.roleId === colorRoleId) {
        if (!override.remove)
          buttonArrays[lastArray].push(
            new MessageButton()
              .setCustomId(`!color-role: ${buttonNumber}`)
              .setLabel(`${buttonNumber}`)
              .setStyle('SUCCESS')
          )
        else
          buttonArrays[lastArray].push(
            new MessageButton()
              .setCustomId(`!color-role: ${buttonNumber}`)
              .setLabel(`${buttonNumber}`)
              .setStyle('SECONDARY')
          )

        continue
      }

      if (memberRoles.includes(colorRoleId))
        buttonArrays[lastArray].push(
          new MessageButton()
            .setCustomId(`!color-role: ${buttonNumber}`)
            .setLabel(`${buttonNumber}`)
            .setStyle('SUCCESS')
        )
      else
        buttonArrays[lastArray].push(
          new MessageButton()
            .setCustomId(`!color-role: ${buttonNumber}`)
            .setLabel(`${buttonNumber}`)
            .setStyle('SECONDARY')
        )
    }
  }

  const colorButtonComponents = []

  buttonArrays.forEach(buttonArray =>
    colorButtonComponents.push(
      new MessageActionRow().addComponents(buttonArray)
    )
  )

  return colorButtonComponents
}

export function getChannelButtons(
  fields,
  memberId,
  channels,
  channelType,
  override
) {
  const valueArray = []

  fields.forEach(field => {
    valueArray.push(...field.value.split(`\n`))
  })

  const buttonArrays = []

  let counter = 0

  for (let i = 0; i < 4; i++) {
    buttonArrays.push([])

    const lastArray = buttonArrays.length - 1

    for (let j = 0; j < 5; j++) {
      const value = valueArray.shift()

      if (!value) {
        buttonArrays[lastArray].push(
          new MessageButton()
            .setCustomId(`!channel: ${counter}`)
            .setLabel(` `)
            .setStyle('SECONDARY')
            .setDisabled(true)
        )

        counter--

        continue
      }

      const channelId = value.match(`(?<=#)[0-9]+`)[0],
        buttonNumber = value.match(`[0-9]+(?=\\.)`)[0],
        channel = channels.get(channelId)

      if (channelId === override?.channelId) {
        if (override.result === `added`)
          buttonArrays[lastArray].push(
            new MessageButton()
              .setCustomId(`!channel: ${buttonNumber}`)
              .setLabel(`${buttonNumber}`)
              .setStyle('SUCCESS')
          )
        else
          buttonArrays[lastArray].push(
            new MessageButton()
              .setCustomId(`!channel: ${buttonNumber}`)
              .setLabel(`${buttonNumber}`)
              .setStyle('SECONDARY')
          )

        continue
      }

      let isJoined = false

      if (
        [`channels-joinable`, `channels-archived`].includes(channelType) &&
        channel.permissionOverwrites.cache.get(memberId)
      )
        isJoined = true
      else if (
        channelType === `channels-public` &&
        !channel.permissionOverwrites.cache.get(memberId)
      )
        isJoined = true

      if (isJoined)
        buttonArrays[lastArray].push(
          new MessageButton()
            .setCustomId(`!channel: ${buttonNumber}`)
            .setLabel(`${buttonNumber}`)
            .setStyle('SUCCESS')
        )
      else
        buttonArrays[lastArray].push(
          new MessageButton()
            .setCustomId(`!channel: ${buttonNumber}`)
            .setLabel(`${buttonNumber}`)
            .setStyle('SECONDARY')
        )
    }
  }

  const colorButtonComponents = []

  buttonArrays.forEach(buttonArray =>
    colorButtonComponents.push(
      new MessageActionRow().addComponents(buttonArray)
    )
  )

  return colorButtonComponents
}
