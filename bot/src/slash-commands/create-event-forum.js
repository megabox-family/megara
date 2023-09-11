import {
  ChannelType,
  ApplicationCommandOptionType,
  ThreadAutoArchiveDuration,
  PermissionOverwrites,
  PermissionsBitField,
  Collection,
} from 'discord.js'
import { queueApiCall } from '../api-queue.js'
import { getCommandByName } from '../utils/slash-commands.js'
import { convertSerialzedPermissionsToPermissionsBitfield } from '../utils/channels.js'

export const description = `Generates a forum channel for creating events and tracking attendance.`
export const dmPermission = false,
  defaultMemberPermissions = `0`,
  options = [
    {
      name: `channel-name`,
      description: `The name of the channel you're creating.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `default-reaction`,
      description: `The default reaction emoji for the channel.`,
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: `category`,
      description: `The category you'd like to create the forum channel in.`,
      type: ApplicationCommandOptionType.Channel,
      required: false,
      autocomplete: true,
      channelTypes: [ChannelType.GuildCategory],
    },
  ]

function createPermissions(guild, category) {
  const permissions = new Collection(),
    parentPermissionOverwrites = category?.permissionOverwrites?.cache

  if (parentPermissionOverwrites?.size > 0) {
    parentPermissionOverwrites.forEach(permissionOverwrite => {
      const { id, type, allow, deny } = permissionOverwrite,
        allowPermissions = allow.serialize(),
        denyPermissions = deny.serialize(),
        newAllowPermissions = {
          ...allowPermissions,
          SendMessages: false,
        },
        newDenyPermissions = {
          ...denyPermissions,
          SendMessages: true,
        },
        newPermissionOverwrite = new PermissionOverwrites()

      newPermissionOverwrite.id = id
      newPermissionOverwrite.type = type
      newPermissionOverwrite.allow =
        convertSerialzedPermissionsToPermissionsBitfield(newAllowPermissions)
      newPermissionOverwrite.deny =
        convertSerialzedPermissionsToPermissionsBitfield(newDenyPermissions)

      permissions.set(newPermissionOverwrite.id, newPermissionOverwrite)
    })
  } else {
    const everyoneRole = guild.roles.cache.find(
        role => role.name === `@everyone`
      ),
      everyoneOverwrite = new PermissionOverwrites()

    everyoneOverwrite.id = everyoneRole.id
    everyoneOverwrite.type = 0

    // everyone overwrite, disable chat
    everyoneOverwrite.allow = new PermissionsBitField()
    everyoneOverwrite.deny = new PermissionsBitField([
      PermissionsBitField.Flags.SendMessages,
    ])

    permissions.set(everyoneOverwrite.id, everyoneOverwrite)
  }

  return permissions
}

export default async function (interaction) {
  await queueApiCall({
    apiCall: `deferReply`,
    djsObject: interaction,
    parameters: { ephemeral: true },
  })

  const { guild, options } = interaction,
    category = options.getChannel(`category`),
    defaultReactionEmoji = options.getString(`default-reaction`)

  let channelName = options.getString(`channel-name`)

  if (channelName.match(`\\s`)) channelName = channelName.replaceAll(` `, `-`)

  const existingChannel = guild.channels.cache.get(
    channel =>
      channel.name === channelName && channel.type === ChannelType.GuildForum
  )

  if (existingChannel) {
    queueApiCall({
      apiCall: `editReply`,
      djsObject: interaction,
      parameters: `${existingChannel} already exists 🤔`,
    })

    return
  }

  const formattedChannelName = channelName.replaceAll(`-`, ` `),
    generalThreadName = `${formattedChannelName} scheduler`,
    permissions = createPermissions(guild, category),
    parent = category ? category.children : guild.channels,
    newChannel = await queueApiCall({
      apiCall: `create`,
      djsObject: parent,
      parameters: {
        name: channelName,
        type: ChannelType.GuildForum,
        permissionOverwrites: permissions,
        availableTags: [
          { name: `bot commands`, emoji: { name: `🤖` } },
          { name: `event`, emoji: { name: `🆕` } },
          { name: `spoilers`, emoji: { name: `❗` } },
        ],
        defaultReactionEmoji: { name: defaultReactionEmoji },
        topic:
          `Use the /schedule-event command in the ${generalThreadName} post to create new events.` +
          `\n\nPlease avoid sending messages in the ${generalThreadName} post to keep it clean.`,
      },
    })

  await queueApiCall({
    apiCall: `edit`,
    djsObject: newChannel,
    parameters: {
      flags: `RequireTag`,
    },
  })

  const eventCommand = getCommandByName(`schedule-event`),
    eventCommandTag = `</${eventCommand.name}:${eventCommand.id}>`,
    discussionTag = newChannel.availableTags.find(
      tag => tag.name === `bot commands`
    ),
    thread = await queueApiCall({
      apiCall: `create`,
      djsObject: newChannel.threads,
      parameters: {
        name: generalThreadName,
        type: ChannelType.PublicThread,
        reason: `Needed a post to use bot commands in.`,
        message:
          `Use the ${eventCommandTag} command to create new events.` +
          `\n\nPlease avoid sending messages in this channel to keep it clean.`,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        appliedTags: [discussionTag.id],
      },
    })

  await queueApiCall({
    apiCall: `edit`,
    djsObject: thread,
    parameters: {
      flags: `Pinned`,
    },
  })

  const message = category
    ? `${newChannel} has been created in the **${category.name}** category 🙌`
    : `${newChannel} has been created 🙌`

  queueApiCall({
    apiCall: `editReply`,
    djsObject: interaction,
    parameters: message,
  })
}
