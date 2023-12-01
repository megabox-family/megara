const sum = function (x, y) {
  return x + y
}

test('adds 1 + 2 to equal 3', () => {
  expect(sum(1, 2)).toBe(3)
})

test('adds two numbers together', () => {
  const numOne = 3
  const numTwo = 5
  console.log('numone is', numOne)
  expect(sum(numOne, numTwo)).toBe(8)
})
