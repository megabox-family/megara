import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'

export async function getDynamicVoiceRecordById(channelId) {
  return await pgPool
    .query(
      SQL`
        select 1
        from voice 
        where id = ${channelId}
      `
    )
    .then(res => camelize(res.rows[0]))
    .catch(error => {
      console.log(error)
    })
}
