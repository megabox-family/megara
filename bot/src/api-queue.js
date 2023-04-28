import { Collection } from 'discord.js'
import { randomUUID } from 'crypto'

const pauseDurations = {
    default: 100,
  },
  apiQueue = {},
  completed = new Map(),
  batchObjects = [],
  test = []

function getBatchApiCall(collectionType, apiCall) {}

async function emptyApiQueue(relevantQueue) {
  const context = relevantQueue.first(),
    { id, apiCall, djsObject, parameters, multipleParameters } = context

  const collectionType = djsObject?.constructor?.name,
    batchApiCall = getBatchApiCall(collectionType, apiCall),
    ids = []

  let _djsObject = djsObject,
    _apiCall = apiCall,
    _parameters = parameters,
    pauseDuration = pauseDurations?.[apiCall]

  pauseDuration = pauseDuration ? pauseDuration : pauseDurations.default

  if (batchApiCall) {
  } else {
    ids.push(id)
  }

  let response

  if (multipleParameters) {
    response = await _djsObject?.[_apiCall](..._parameters)
  } else if (_parameters) {
    response = await _djsObject?.[_apiCall](_parameters)
  } else {
    response = await _djsObject?.[_apiCall]()
  }

  for (const id of ids) {
    relevantQueue.delete(id)
    completed.set(id, response)
  }

  const size = relevantQueue.size

  if (relevantQueue.size === 0) return

  await new Promise(resolution => setTimeout(resolution, pauseDuration))

  emptyApiQueue(relevantQueue)
}

export async function queueApiCall(context) {
  const { apiCall } = context

  let relevantQueue

  if (apiQueue?.[apiCall]) {
    relevantQueue = apiQueue?.[apiCall]
  } else {
    relevantQueue = apiQueue[apiCall] = new Collection()

    console.log(`${apiCall} queue created.`)
  }

  const id = randomUUID()

  context.id = id

  relevantQueue?.set(id, context)

  if (relevantQueue?.size === 1) await emptyApiQueue(relevantQueue)

  while (!completed?.has(id)) {
    await new Promise(resolution => setTimeout(resolution, 100))
  }

  const response = completed.get(id)

  completed.delete(id)

  return response
}
