import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'
import { randomUUID } from 'crypto'

export async function checkIfUserHasVoted(pollId, userId) {
  const voterId = await pgPool
    .query(
      SQL`
        select 
          voter_id
        from poll_data
        where poll_id = ${pollId} and
          voter_id = ${userId}
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].voter_id : undefined))
    .catch(error => {
      console.log(error)
    })

  const hasVoted = voterId ? true : false

  return hasVoted
}

export async function createPollData(voterId, pollId, choices) {
  return await pgPool
    .query(
      SQL`
        insert into poll_data (id, voter_id, poll_id, choices)
        values(
          ${randomUUID()}, 
          ${voterId}, 
          ${pollId},
          ${choices}
        );
      `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function deletePollData(voterId, pollId) {
  return await pgPool
    .query(
      SQL`
        delete from poll_data 
        where voter_id = ${voterId} and
          poll_id = ${pollId}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function getVoterChoices(voterId, pollId) {
  const choicesString = await pgPool
    .query(
      SQL`
        select 
          choices
        from poll_data
        where voter_id = ${voterId} and
          poll_id = ${pollId} 
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].choices : undefined))
    .catch(error => {
      console.log(error)
    })

  const choices = choicesString ? JSON.parse(choicesString) : null

  return choices
}

export async function getAllVoterChoices(pollId) {
  const voterChoices = await pgPool
    .query(
      SQL`
      select 
        choices
      from poll_data 
      where poll_id = ${pollId};
    `
    )
    .then(res => (res.rows[0] ? camelize(res.rows) : undefined))

  const choices = voterChoices?.map(record => JSON.parse(record.choices))

  return choices
}

export async function getPollData(pollId) {
  const pollData = await pgPool
    .query(
      SQL`
        select *
        from poll_data 
        where poll_id = ${pollId};
      `
    )
    .then(res => (res.rows[0] ? camelize(res.rows) : undefined))

  for (const record of pollData) {
    record.choices = JSON.parse(record.choices)
  }

  return pollData
}
