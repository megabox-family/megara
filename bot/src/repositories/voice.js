import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'
import {
  getDynamicVoiceChannelNumber,
  getVoiceChannelBasename,
} from '../utils/validation.js'

export async function getVoiceRecordById(channelId) {
  return await pgPool
    .query(
      SQL`
        select *
        from voice 
        where id = ${channelId}
      `
    )
    .then(res => camelize(res.rows[0]))
    .catch(error => {
      console.log(error)
    })
}

export async function createVoiceRecord(
  id,
  name,
  dynamic,
  temporary,
  alwaysActive,
  isPrivate,
  guildId,
  parentTextChannelId,
  parentThreadId,
  parentVoiceChannelId
) {
  const baseName = getVoiceChannelBasename(name),
    _baseName = baseName ? baseName : name,
    dynamicVoiceNumber = getDynamicVoiceChannelNumber(name)

  return await pgPool
    .query(
      SQL`
      insert into voice (
        id, name, base_name, dynamic, dynamic_number, temporary, always_active, is_private, 
        guild_id, parent_text_channel_id, parent_thread_id, parent_voice_channel_id
      )
      values(
        ${id}, ${name}, ${_baseName}, ${dynamic}, ${dynamicVoiceNumber}, ${temporary}, ${alwaysActive}, ${isPrivate}, 
        ${guildId}, ${parentTextChannelId}, ${parentThreadId}, ${parentVoiceChannelId}
      );
    `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function deleteVoiceRecord(channelId) {
  return await pgPool
    .query(
      SQL`
      delete from voice 
      where id = ${channelId} 
      returning *;
    `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function getVoiceTemporaryStatus(channelId) {
  return await pgPool
    .query(
      SQL`
      select 
        temporary
      from voice 
      where id = ${channelId}
    `
    )
    .then(res => camelize(res.rows[0]?.temporary))
    .catch(error => {
      console.log(error)
    })
}

export async function getVoiceDynamicStatus(channelId) {
  return await pgPool
    .query(
      SQL`
      select 
        dynamic
      from voice 
      where id = ${channelId}
    `
    )
    .then(res => camelize(res.rows[0]?.dynamic))
    .catch(error => {
      console.log(error)
    })
}

export async function checkIfVoiceChannelIsRelated(
  channelId,
  parentVoiceChannelId
) {
  return await pgPool
    .query(
      SQL`
      select 1
      from voice 
      where id = ${channelId} and
        parent_voice_channel_id = ${parentVoiceChannelId}
    `
    )
    .then(res => camelize(res.rows[0]))
    .catch(error => {
      console.log(error)
    })
}

export async function getDynamicVoiceChildrenRecords(parentVoiceChannelId) {
  return await pgPool
    .query(
      SQL`
        select *
        from voice 
        where parent_voice_channel_id = ${parentVoiceChannelId}
    `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}
