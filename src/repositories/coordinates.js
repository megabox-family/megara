const pgPool = require('../pg-pool')
const camelize = require('camelize')
const { v4: uuid } = require('uuid')

const getAllCoordinates = async () => {
  return await pgPool
    .query(`select * from coordinates order by name;`)
    .then(res => camelize(res.rows))
}

const getCoordinatesByOwner = async owner => {
  return await pgPool
    .query(`select * from coordinates where owner = $1 order by name;`, [owner])
    .then(res => camelize(res.rows))
}

const setCoordinates = async coordinates => {
  return await pgPool
    .query(
      `insert into coordinates(id, name, owner, x, y, z) values($1, $2, $3, $4, $5, $6) returning *;`,
      [uuid(), ...coordinates]
    )
    .then(res => camelize(res.rows))
}

const coordinateExistsByName = async name => {
  return await pgPool
    .query(`select name from coordinates where name = $1;`, [name])
    .then(res => !!res.rows.length)
}

const getCoordinatesByName = async name => {
  return await pgPool
    .query(`select * from coordinates where name = $1;`, [name])
    .then(res => camelize(res.rows[0]))
}

const deleteCoordinatesByName = async name => {
  return await pgPool
    .query(`delete from coordinates where name = $1 returning *;`, [name])
    .then(res => camelize(res.rows))
}

module.exports = {
  getAllCoordinates,
  getCoordinatesByOwner,
  coordinateExistsByName,
  setCoordinates,
  getCoordinatesByName,
  deleteCoordinatesByName,
}
