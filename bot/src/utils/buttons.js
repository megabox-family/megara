import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
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
        .setLabel(`unsubscribe from ${getNotificationRoleBasename(role.name)}`)
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

export function chunckButtons(buttons, chunkSize = 5, rowLimit = 5) {
  const rows = []

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
    .setLabel(`retract my vote`)
    .setStyle(ButtonStyle.Danger)
}
