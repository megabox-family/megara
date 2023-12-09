import { jest } from '@jest/globals'

// import { emptyChannelSortingQueue } from './channels.js'
import * as channel from './channels.js'
import { Collection } from 'discord.js'
// jest.useFakeTimers()
// import * as channel from './channels.js'

describe('channel sorting queue', () => {
  // Mock the Discord.js Collection
  const mockCollection = {
    size: jest.fn(),
    first: jest.fn(),
    delete: jest.fn(),
  }
  jest.mock('discord.js', () => {
    return {
      Collection: mockCollection,
    }
  })

  const mockSortChannels = jest.fn()

  jest.mock('./channels.js', () => {
    return {
      sortChannels: mockSortChannels,
    }
  })

  test('emptyChannelSortingQueue does not call sort channels', async () => {
    Collection.prototype.size.mockReturnValue(0)
    await channel.emptyChannelSortingQueue()
    expect(sortChannels.not.toHaveBeenCalled())
    expect(channelSortingQueue.size.toBe(0))
  })

  test('emptyChannelSortingQueue sorts and empties channels', async () => {
    const mockContext = { guildId: 1, bypassComparison: true }
    const mockFirst = { first: jest.fn(() => mockContext) }
    Collection.prototype.size.mockReturnValue(1)
    Collection.prototype.first.mockReturnValue(mockFirst)
    await channel.emptyChannelSortingQueue(channelSortingQueue)
    expect(mockSortChannels.toHaveBeenCalledWith(mockContext))
    expect(channelSortingQueue).toEqual({})
  })
})

// async function emptyChannelSortingQueue() {
//   if (channelSortingQueue.size === 0) return

//   const context = channelSortingQueue.first(),
//     { guildId } = context

//   await sortChannels(context)

//   channelSortingQueue.delete(guildId)

//   emptyChannelSortingQueue()
// }
