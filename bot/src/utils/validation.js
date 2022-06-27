export function getButtonContext(customId) {
  return customId.match(`(?<=:\\s).+`)[0]
}
