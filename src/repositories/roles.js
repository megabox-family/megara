const pgPool = require('../pg-pool')
const camelize = require('camelize')

const getIdForColorRole = async role => {
  return await pgPool
    .query(`select id from roles where name = $1 AND role_type = 'color';`, [
      role,
    ])
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
}

const getIdForRole = async role => {
  return await pgPool
    .query(`select id from roles where name = $1 AND role_type = 'other';`, [
      role,
    ])
    .then(res => (res.rows[0] ? res.rows[0].id : undefined))
}

const getColorRoleIds = async () => {
  return await pgPool
    .query(`select id from roles where role_type = 'color';`)
    .then(res => camelize(res.rows).map(x => x.id))
}

module.exports = {
  getIdForRole,
  getIdForColorRole,
  getColorRoleIds,
}
