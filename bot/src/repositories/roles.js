import pgPool from '../pg-pool.js'
import camelize from 'camelize'

export async function getIdForColorRole(role) {
  return await pgPool
    .query(`select id from roles where name = $1 AND role_type = 'color';`, [
      role,
    ])
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
}

export async function getIdForRole(role) {
  return await pgPool
    .query(`select id from roles where name = $1 AND role_type = 'other';`, [
      role,
    ])
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
}

export async function getColorRoleIds() {
  return await pgPool
    .query(`select id from roles where role_type = 'color';`)
    .then(res => camelize(res.rows).map(x => x.id))
}

export async function getAdminRoleIds() {
  return await pgPool
    .query(`select id from roles where role_type = 'admin';`)
    .then(res => camelize(res.rows).map(x => x.id))
}
