import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { getChannelType } from '../repositories/channels.js'
import {
  getButtonNumber,
  getNotificationRoleBasename,
  getRoleIdFromTag,
} from './validation.js'

export async function toggleListButtons(
  newPage,
  totalPages,
  paginationButtons
) {
  if (totalPages === 1) {
    paginationButtons.components[0] = ButtonBuilder.from(
      paginationButtons.components[0]
    ).setDisabled(true)
    paginationButtons.components[1] = ButtonBuilder.from(
      paginationButtons.components[1]
    ).setDisabled(true)
    paginationButtons.components[3] = ButtonBuilder.from(
      paginationButtons.components[3]
    ).setDisabled(true)
    paginationButtons.components[4] = ButtonBuilder.from(
      paginationButtons.components[4]
    ).setDisabled(true)
  } else if (newPage === totalPages) {
    paginationButtons.components[0] = ButtonBuilder.from(
      paginationButtons.components[0]
    ).setDisabled(false)
    paginationButtons.components[1] = ButtonBuilder.from(
      paginationButtons.components[1]
    ).setDisabled(false)
    paginationButtons.components[3] = ButtonBuilder.from(
      paginationButtons.components[3]
    ).setDisabled(true)
    paginationButtons.components[4] = ButtonBuilder.from(
      paginationButtons.components[4]
    ).setDisabled(true)
  } else if (newPage === 1) {
    paginationButtons.components[0] = ButtonBuilder.from(
      paginationButtons.components[0]
    ).setDisabled(true)
    paginationButtons.components[1] = ButtonBuilder.from(
      paginationButtons.components[1]
    ).setDisabled(true)
    paginationButtons.components[3] = ButtonBuilder.from(
      paginationButtons.components[3]
    ).setDisabled(false)
    paginationButtons.components[4] = ButtonBuilder.from(
      paginationButtons.components[4]
    ).setDisabled(false)
  } else {
    paginationButtons.components[0] = ButtonBuilder.from(
      paginationButtons.components[0]
    ).setDisabled(false)
    paginationButtons.components[1] = ButtonBuilder.from(
      paginationButtons.components[1]
    ).setDisabled(false)
    paginationButtons.components[3] = ButtonBuilder.from(
      paginationButtons.components[3]
    ).setDisabled(false)
    paginationButtons.components[4] = ButtonBuilder.from(
      paginationButtons.components[4]
    ).setDisabled(false)
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
          new ButtonBuilder()
            .setCustomId(`!color-role: ${counter}`)
            .setLabel(`⠀`)
            .setStyle(ButtonStyle.Secondary)
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
            new ButtonBuilder()
              .setCustomId(`!color-role: ${buttonNumber}`)
              .setLabel(`${buttonNumber}`)
              .setStyle(ButtonStyle.Success)
          )
        else
          buttonArrays[lastArray].push(
            new ButtonBuilder()
              .setCustomId(`!color-role: ${buttonNumber}`)
              .setLabel(`${buttonNumber}`)
              .setStyle(ButtonStyle.Secondary)
          )

        continue
      }

      if (memberRoles.includes(colorRoleId))
        buttonArrays[lastArray].push(
          new ButtonBuilder()
            .setCustomId(`!color-role: ${buttonNumber}`)
            .setLabel(`${buttonNumber}`)
            .setStyle(ButtonStyle.Success)
        )
      else
        buttonArrays[lastArray].push(
          new ButtonBuilder()
            .setCustomId(`!color-role: ${buttonNumber}`)
            .setLabel(`${buttonNumber}`)
            .setStyle(ButtonStyle.Secondary)
        )
    }
  }

  const colorButtonComponents = []

  buttonArrays.forEach(buttonArray =>
    colorButtonComponents.push(
      new ActionRowBuilder().addComponents(buttonArray)
    )
  )

  return colorButtonComponents
}

export function getNotificationButtons(fields, memberRoles, override) {
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
          new ButtonBuilder()
            .setCustomId(`!notification-role: ${counter}`)
            .setLabel(`⠀`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        )

        counter--

        continue
      }

      const roleId = getRoleIdFromTag(value),
        buttonNumber = getButtonNumber(value)

      if (override?.roleId === roleId) {
        if (!override.removed)
          buttonArrays[lastArray].push(
            new ButtonBuilder()
              .setCustomId(`!notification-role: ${buttonNumber}`)
              .setLabel(`${buttonNumber}`)
              .setStyle(ButtonStyle.Success)
          )
        else
          buttonArrays[lastArray].push(
            new ButtonBuilder()
              .setCustomId(`!notification-role: ${buttonNumber}`)
              .setLabel(`${buttonNumber}`)
              .setStyle(ButtonStyle.Secondary)
          )

        continue
      }

      if (memberRoles.includes(roleId))
        buttonArrays[lastArray].push(
          new ButtonBuilder()
            .setCustomId(`!notification-role: ${buttonNumber}`)
            .setLabel(`${buttonNumber}`)
            .setStyle(ButtonStyle.Success)
        )
      else
        buttonArrays[lastArray].push(
          new ButtonBuilder()
            .setCustomId(`!notification-role: ${buttonNumber}`)
            .setLabel(`${buttonNumber}`)
            .setStyle(ButtonStyle.Secondary)
        )
    }
  }

  const colorButtonComponents = []

  buttonArrays.forEach(buttonArray =>
    colorButtonComponents.push(
      new ActionRowBuilder().addComponents(buttonArray)
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
          new ButtonBuilder()
            .setCustomId(`!channel: ${counter}`)
            .setLabel(`⠀`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        )

        counter--

        continue
      }

      const channelId = value.match(`(?<=\\()[0-9]+(?=\\))`)[0],
        buttonNumber = value.match(`[0-9]+(?=\\.)`)[0],
        channel = channels.get(channelId)

      if (channelId === override?.channelId) {
        if (override.result === `added`)
          buttonArrays[lastArray].push(
            new ButtonBuilder()
              .setCustomId(`!channel: ${channelId}`)
              .setLabel(`${buttonNumber}`)
              .setStyle(ButtonStyle.Success)
          )
        else
          buttonArrays[lastArray].push(
            new ButtonBuilder()
              .setCustomId(`!channel: ${channelId}`)
              .setLabel(`${buttonNumber}`)
              .setStyle(ButtonStyle.Secondary)
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
          new ButtonBuilder()
            .setCustomId(`!channel: ${channelId}`)
            .setLabel(`${buttonNumber}`)
            .setStyle(ButtonStyle.Success)
        )
      else
        buttonArrays[lastArray].push(
          new ButtonBuilder()
            .setCustomId(`!channel: ${channelId}`)
            .setLabel(`${buttonNumber}`)
            .setStyle(ButtonStyle.Secondary)
        )
    }
  }

  const colorButtonComponents = []

  buttonArrays.forEach(buttonArray =>
    colorButtonComponents.push(
      new ActionRowBuilder().addComponents(buttonArray)
    )
  )

  return colorButtonComponents
}

export function generateNotificationButtons(notificationRoles) {
  const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
    buttons = [],
    rows = []

  notificationRoles.sort((a, b) => collator.compare(a.name, b.name))

  let counter = 0

  for (const [roleId, role] of notificationRoles) {
    if (counter === 25) break

    buttons.push(
      new ButtonBuilder()
        .setCustomId(`!unsubscribe: ${role.id}`)
        .setLabel(`Unsubscribe from ${getNotificationRoleBasename(role.name)}`)
        .setStyle(ButtonStyle.Secondary)
    )
    counter++
  }

  const chunkSize = 5
  for (let i = 0; i < buttons.length; i += chunkSize) {
    rows.push(
      new ActionRowBuilder().addComponents(buttons.slice(i, i + chunkSize))
    )
  }

  return rows
}

export async function generateChannelButtons(mentionedChannels) {
  const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
    buttonDetails = [],
    buttons = [],
    rows = []

  for (const [channelId, channel] of mentionedChannels) {
    const channelType = await getChannelType(channel.id),
      customId =
        channelType === `joinable`
          ? `!join-channel: ${channel.id}`
          : `!leave-channel: ${channel.id}`,
      label =
        channelType === `joinable`
          ? `Join ${channel.name}`
          : `Leave ${channel.name}`,
      style =
        channelType === `joinable` ? ButtonStyle.Success : ButtonStyle.Danger

    buttonDetails.push({
      customId: customId,
      label: label,
      style: style,
    })
  }

  let counter = 0

  for (const buttonDetail of buttonDetails) {
    if (counter === 25) break

    buttons.push(
      new ButtonBuilder()
        .setCustomId(buttonDetail.customId)
        .setLabel(buttonDetail.label)
        .setStyle(buttonDetail.style)
    )

    counter++
  }

  const chunkSize = 5
  for (let i = 0; i < buttons.length; i += chunkSize) {
    rows.push(
      new ActionRowBuilder().addComponents(buttons.slice(i, i + chunkSize))
    )
  }

  return rows
}

export function getRetractVoteButton(pollId) {
  return new ButtonBuilder()
    .setCustomId(`!retract-vote: ${pollId}`)
    .setLabel(`Retract my vote`)
    .setStyle(ButtonStyle.Danger)
}
