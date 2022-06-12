export async function toggleListButtons(newPage, totalPages, components) {
  if (totalPages === 1) {
    components[0].components[0].setDisabled(true)
    components[0].components[1].setDisabled(true)
    components[0].components[3].setDisabled(true)
    components[0].components[4].setDisabled(true)
  } else if (newPage === totalPages) {
    components[0].components[0].setDisabled(false)
    components[0].components[1].setDisabled(false)
    components[0].components[3].setDisabled(true)
    components[0].components[4].setDisabled(true)
  } else if (newPage === 1) {
    components[0].components[0].setDisabled(true)
    components[0].components[1].setDisabled(true)
    components[0].components[3].setDisabled(false)
    components[0].components[4].setDisabled(false)
  } else {
    components[0].components[0].setDisabled(false)
    components[0].components[1].setDisabled(false)
    components[0].components[3].setDisabled(false)
    components[0].components[4].setDisabled(false)
  }

  return components
}
