import { Collection } from 'discord.js'
import { randomUUID } from 'crypto'

const apiCallInfo = {
  deferReply: {
    pauseDuration: 100,
  },
  editReply: {
    pauseDuration: 100,
  },
}

const apiQueue = {
    deferReply: new Collection(),
    editReply: new Collection(),
  },
  completed = new Map()

async function emptyApiQueue(relevantQueue) {
  if (relevantQueue?.size === 0) return

  const context = relevantQueue.first(),
    { id, apiCall, collection, parameters } = context,
    { pauseDuration, batchCommand } = apiCallInfo?.[apiCall],
    ids = []

  let _collection = collection,
    _apiCall = apiCall,
    _parameters = parameters

  if (batchCommand) {
  } else {
    ids.push(id)
  }

  const response = _parameters
    ? await _collection?.[_apiCall](_parameters)
    : await _collection?.[_apiCall]()

  ids.forEach(id => {
    relevantQueue?.delete(id)
    completed.set(id, response)
  })

  await new Promise(resolution => setTimeout(resolution, pauseDuration))

  emptyApiQueue(relevantQueue)
}

export async function queueApiCall(context) {
  const { apiCall } = context,
    relevantQueue = apiQueue?.[apiCall]

  if (!relevantQueue) return

  const id = randomUUID()

  context.id = id

  relevantQueue?.set(id, context)

  if (relevantQueue?.size === 1) emptyApiQueue(relevantQueue)

  while (!completed?.has(id)) {
    await new Promise(resolution => setTimeout(resolution, 50))
  }

  const response = completed.get(id)

  completed.delete(id)

  return response
}
