import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'

export async function createPoll(
  id,
  channelId,
  startedBy,
  startTime,
  endTime,
  question,
  candidates,
  totalChoices,
  requiredChoices,
  rankedChoiceVoting
) {
  candidates = JSON.stringify(candidates)

  return await pgPool
    .query(
      SQL`
        insert into polls (id, channel_id, started_by, start_time, end_time, question, candidates, total_choices, required_choices, ranked_choice_voting)
        values(
          ${id}, 
          ${channelId},
          ${startedBy}, 
          ${startTime}, 
          ${endTime}, 
          ${question},
          ${candidates}, 
          ${totalChoices}, 
          ${requiredChoices}, 
          ${rankedChoiceVoting}
        );
      `
    )
    .catch(error => {
      console.log(error)
    })
}
export async function getPollStartTime(pollId) {
  return await pgPool
    .query(
      SQL`
        select 
          start_time
        from polls
        where id = ${pollId} 
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].start_time : undefined))
    .catch(error => {
      console.log(error)
    })
}

export async function getPollEndTime(pollId) {
  return await pgPool
    .query(
      SQL`
        select 
          end_time
        from polls
        where id = ${pollId} 
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].end_time : undefined))
    .catch(error => {
      console.log(error)
    })
}

export async function setPollEndTime(pollId, endTime) {
  return await pgPool
    .query(
      SQL`
        update polls
        set
          end_time = ${endTime}
        where id = ${pollId}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}

export async function getPollAttributes(pollId) {
  const pollAttributes = await pgPool
    .query(
      SQL`
        select *
        from polls 
        where id = ${pollId};
      `
    )
    .then(res => (res.rows[0] ? camelize(res.rows[0]) : undefined))

  if (pollAttributes?.hasOwnProperty(`candidates`))
    pollAttributes.candidates = pollAttributes?.candidates
      ? JSON.parse(pollAttributes?.candidates)
      : null

  return pollAttributes
}

export async function getPollQuestion(pollId) {
  return await pgPool
    .query(
      SQL`
        select 
          question
        from polls
        where id = ${pollId} 
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].question : undefined))
    .catch(error => {
      console.log(error)
    })
}

export async function getPollStartedBy(pollId) {
  return await pgPool
    .query(
      SQL`
        select 
          started_by
        from polls
        where id = ${pollId}
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].started_by : undefined))
    .catch(error => {
      console.log(error)
    })
}

export async function getRunningPolls(currentTime) {
  return await pgPool
    .query(
      SQL`
        select 
          id,
          channel_id,
          end_time
        from polls 
        where end_time > ${currentTime};
      `
    )
    .then(res => (res.rows[0] ? camelize(res.rows) : undefined))
}
