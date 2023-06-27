import { deleteAllGuildChannels } from '../repositories/channels.js'
import {
  createGuild,
  deleteGuild,
  modifyGuild,
} from '../repositories/guilds.js'
import { syncChannels } from '../utils/channels.js'
import { deleteNewRoles } from '../utils/roles.js'

export async function handleGuildCreate(guild) {
  await deleteNewRoles(guild)
  await syncChannels(guild)
  await createGuild(guild)
}

export async function handleGuildUpdate(oldGuild, newGuild) {
  let guild

  if (newGuild) guild = newGuild
  else guild = oldGuild

  await modifyGuild(guild)
}

export async function handleGuildDelete(guild) {
  await deleteGuild(guild.id)
  await deleteAllGuildChannels(guild.id)
}
