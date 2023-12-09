import { jest } from '@jest/globals'

// import { emptyChannelSortingQueue } from './channels.js'
import * as channel from './channels.js'
// import { Collection } from 'discord.js'
// jest.useFakeTimers()
// import * as channel from './channels.js'

// describe('channel sorting queue', () => {
//   // Mock the Discord.js Collection
//   const mockCollection = {
//     size: jest.fn(),
//     first: jest.fn(),
//     delete: jest.fn(),
//   }
//   jest.mock('discord.js', () => {
//     return {
//       Collection: mockCollection,
//     }
//   })

//   const mockSortChannels = jest.fn()

//   jest.mock('./channels.js', () => {
//     return {
//       sortChannels: mockSortChannels,
//     }
//   })

//   test('emptyChannelSortingQueue does not call sort channels', async () => {
//     Collection.prototype.size.mockReturnValue(0)
//     await channel.emptyChannelSortingQueue()
//     expect(sortChannels.not.toHaveBeenCalled())
//     expect(channelSortingQueue.size.toBe(0))
//   })

//   test('emptyChannelSortingQueue sorts and empties channels', async () => {
//     const mockContext = { guildId: 1, bypassComparison: true }
//     const mockFirst = { first: jest.fn(() => mockContext) }
//     Collection.prototype.size.mockReturnValue(1)
//     Collection.prototype.first.mockReturnValue(mockFirst)
//     await channel.emptyChannelSortingQueue(channelSortingQueue)
//     expect(mockSortChannels.toHaveBeenCalledWith(mockContext))
//     expect(channelSortingQueue).toEqual({})
//   })
// })



// async function emptyChannelSortingQueue() {
//   if (channelSortingQueue.size === 0) return

//   const context = channelSortingQueue.first(),
//     { guildId } = context

//   await sortChannels(context)

//   channelSortingQueue.delete(guildId)

//   emptyChannelSortingQueue()
// }


// this is the correct way to spyOn a function:
// const empty = jest.spyOn(channel, 'emptyChannelSortingQueue')

// I think the problem is emptyChannelSortingQueue is returning a promise
// test('1+1', async () => {
//   // expect(1+1).toEqual(2)
//   empty.emptyChannelSortingQueue()
//   expect(empty).toHaveBeenCalled()
// })


// this doesn't work
// it('gets called', async () => {
//   const empty = jest.fn(() => {
//     return Promise.resolve({})
//   })
//   const emptytest= { empty }
//   const response = await channel.emptyChannelSortingQueue(emptytest)
//   // expect(empty).toHaveBeenCalled()
//   expect(response).toEqual({})
// })


// this also doesn't work
  // it('should empty', () => {
  //     channel.emptyChannelSortingQueue().then((response) => {
  //         // expect(response).toEqual({});
  //         expect(channel.channelSortingQueue).toEqual({})
  //     });
  // });


  const mockChannelSortingQueue = {
    size: jest.fn().mockReturnValue(1),
    first: jest.fn().mockReturnValue({ guildId: 1, bypassComparison: true }),
    delete: jest.fn(),
  }

  // jest.mock(channel, () => {
  //   return {
  //     channelSortingQueue: mockChannelSortingQueue,
  //   }
  // })

  // this appears to work!
  jest.mock('./channels.js', () => {
    const originalModule = jest.requireActual('./channels.js');
    return {
      __esModule: true,
      ...originalModule,
      channelSortingQueue: jest.fn(() => mockChannelSortingQueue),
    };
  });

  const sort = jest.spyOn(channel, 'sortChannels')
  sort.mockReturnValue({ guildId: 1, bypassComparison: true })

  // const channel = 


test('1+1', () => {

  expect(1+1).toEqual(2)
})