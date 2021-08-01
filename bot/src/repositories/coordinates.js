import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import { v4 as uuid } from 'uuid'

export async function getAllCoordinates() {
  return await pgPool
    .query(`select * from coordinates order by name;`)
    .then(res => camelize(res.rows))
}

export async function getCoordinatesByOwner(owner) {
  return await pgPool
    .query(`select * from coordinates where owner = $1 order by name;`, [owner])
    .then(res => camelize(res.rows))
}

export async function setCoordinates(coordinates) {
  return await pgPool
    .query(
      `insert into coordinates(id, name, owner, x, y, z) values($1, $2, $3, $4, $5, $6) returning *;`,
      [uuid(), ...coordinates]
    )
    .then(res => camelize(res.rows))
}

export async function coordinateExistsByName(name) {
  return await pgPool
    .query(`select name from coordinates where name = $1;`, [name])
    .then(res => !!res.rows.length)
}

export async function getCoordinatesByName(name) {
  return await pgPool
    .query(`select * from coordinates where name = $1;`, [name])
    .then(res => camelize(res.rows[0]))
}

export async function deleteCoordinatesByName(name) {
  return await pgPool
    .query(`delete from coordinates where name = $1 returning *;`, [name])
    .then(res => camelize(res.rows))
}
