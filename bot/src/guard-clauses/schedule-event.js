import { ChannelType } from "discord.js";
import { isChannelThread } from "../utils/channels.js";
import { queueApiCall } from "../api-queue.js";

export default class ScheduleEventGaurdClauses {
  constructor(interation) {
    const { guild, options, channel, user, command } = interation

    this.guild = guild
    this.options = options
    this.channel = channel
    this.user = user
    this.parent = guild.channels.cache.get(channel.parentId)
    this.commandTag = `</${command.name}:${command.id}>`
  }

  async sendReply({ content, ephemeral = true }) {
    await queueApiCall({
      apiCall: `reply`,
      djsObject: this.interaction,
      parameters: {
        content,
        ephemeral,
      },
    })
  }
  
  CheckIfChannelIsCompatible() {
    const channelIsThread = isChannelThread(this.channel),
      parentIsForum = this.channel.parent?.type  === ChannelType.GuildForum

    if (channelIsThread && !parentIsForum) {
      this.sendReply({
        content: `${this.commandTag} cannot be used in a thread 🤔`
      });

      return false
    }

    return true
  }
}
