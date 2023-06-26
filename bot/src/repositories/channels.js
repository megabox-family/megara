import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'
import {
  getAlphaChannelType,
  pushToChannelSortingQueue,
} from '../utils/channels.js'

// ----------------------- standard shiz ----------------------- //
export async function createChannelRecord(channel) {
  const { id, name, guild } = channel,
    alphaChannelType = getAlphaChannelType(channel)

  return await pgPool
    .query(
      SQL`
        insert into channels (id, name, guild_id, alpha_type)
        values(${id}, ${name}, ${guild.id}, ${alphaChannelType});
      `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function checkIfChannelRecordExists(channelId) {
  return await pgPool
    .query(
      SQL`
        select 1
        from channels
        where id = ${channelId};
      `
    )
    .then(res => camelize(res.rows?.[0]))
}

export async function getChannelRecordById(channelId) {
  return await pgPool
    .query(
      SQL`
        select *
        from channels 
        where id = ${channelId}
      `
    )
    .then(res => camelize(res.rows[0]))
    .catch(error => {
      console.log(error)
    })
}

export async function setChannelRecordName(channel) {
  return await pgPool
    .query(
      SQL`
        update channels
        set
          name = ${channel.name}
        where id = ${channel.id}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function deleteChannelRecord(channelId) {
  return await pgPool
    .query(
      SQL`
        delete from channels 
        where id = ${channelId} 
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function getChannelsByGuild(guildId) {
  return await pgPool
    .query(
      SQL`
        select *
        from channels
        where guild_id = ${guildId};
      `
    )
    .then(res => camelize(res.rows))
}

export async function deleteAllGuildChannels(guildId) {
  return await pgPool
    .query(
      SQL`
        delete from channels 
        where guild_id = ${guildId}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

// ----------------------- position overrides ----------------------- //
export async function getPositionOverride(channelId) {
  return await pgPool
    .query(
      SQL`
        select
          position_override
        from channels
        where id = ${channelId}
      `
    )
    .then(res => res.rows[0]?.position_override)
}

export async function setPositionOverride(channelId, positionOverride) {
  const channelRecords = await getChannelAndChildrenRecords(channelId)

  channelRecords.forEach(async channelRecord => {
    await pgPool
      .query(
        SQL`
        update channels
        set 
          position_override = ${positionOverride}
        where id = ${channelRecord.id}
        returning *;
      `
      )
      .then(res => camelize(res.rows))
      .catch(error => {
        console.log(error)
      })
  })
}

export async function getPositionOverrideRecords(guildId) {
  let query = await pgPool
    .query(
      SQL`
        select 
          id,
          position_override
        from channels
        where guild_id = ${guildId} and
         position_override is not null
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })

  return query
}

export async function getChannelCustomFunction(channelId) {
  return await pgPool
    .query(
      SQL`
        select
          custom_functon
        from channels
        where id = ${channelId}
      `
    )
    .then(res => res.rows[0]?.custom_functon)
}

// ----------------------- voice ----------------------- //
export async function setCustomVoiceOptions(
  channel,
  dynamic,
  dynamicNumber,
  temporary,
  alwaysActive,
  parentTextChannelId,
  parentThreadId,
  parentVoiceChannelId
) {
  const { id, guild } = channel

  let positionOverride = null,
    channelRecord

  if (parentVoiceChannelId) {
    positionOverride = await getPositionOverride(parentVoiceChannelId)
  }

  while (!channelRecord) {
    channelRecord = await getChannelRecordById(id)

    await new Promise(resolution => setTimeout(resolution, 500))
  }

  const query = await pgPool
    .query(
      SQL`
      update channels
      set 
        custom_function = 'voice',
        dynamic = ${dynamic},
        dynamic_number = ${dynamicNumber},
        temporary = ${temporary},
        always_active = ${alwaysActive},
        parent_text_channel_id = ${parentTextChannelId},
        parent_thread_id = ${parentThreadId},
        parent_voice_channel_id = ${parentVoiceChannelId},
        position_override = ${positionOverride}
      where id = ${id}
      returning *;
    `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })

  if (positionOverride) pushToChannelSortingQueue(guild.id)
}

export async function removeCustomVoiceOptions(channelId) {
  return await pgPool
    .query(
      SQL`
      update channels
      set 
        custom_function = ${null},
        dynamic = ${null},
        dynamic_number = ${null},
        temporary = ${null},
        always_active = ${null},
        parent_text_channel_id = ${null},
        parent_thread_id = ${null},
        parent_voice_channel_id = ${null}
      where id = ${channelId}
      returning *;
    `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function removeCustomVoiceOptionsByParentId(parentVoiceChannelId) {
  return await pgPool
    .query(
      SQL`
        update channels
        set 
          custom_function = ${null},
          dynamic = ${null},
          dynamic_number = ${null},
          temporary = ${null},
          always_active = ${null},
          parent_text_channel_id = ${null},
          parent_thread_id = ${null},
          parent_voice_channel_id = ${null}
        where parent_voice_channel_id = ${parentVoiceChannelId}
        returning *;
      `
    )
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
      from channels 
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
      from channels 
      where id = ${channelId}
    `
    )
    .then(res => camelize(res.rows[0]?.dynamic))
    .catch(error => {
      console.log(error)
    })
}

export async function getDynamicVoiceChildrenRecords(parentVoiceChannelId) {
  return await pgPool
    .query(
      SQL`
        select *
        from channels 
        where parent_voice_channel_id = ${parentVoiceChannelId}
        order by name
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function getChannelAndChildrenRecords(parentVoiceChannelId) {
  return await pgPool
    .query(
      SQL`
        select *
        from channels 
        where id = ${parentVoiceChannelId} or parent_voice_channel_id = ${parentVoiceChannelId}
        order by name
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function getVoiceChannelParentId(channelId) {
  return await pgPool
    .query(
      SQL`
        select
          parent_voice_channel_id
        from channels
        where id = ${channelId}
      `
    )
    .then(res => res.rows[0]?.parent_voice_channel_id)
}
