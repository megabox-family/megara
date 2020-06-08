const pg = require('pg')
const config = require('../config')
const pgPool = new pg.Pool(config.pg)

const fs = require('fs')
const sql = fs.readFileSync(__dirname + '/reset-schema.sql').toString()

pgPool.query(sql).then(rows => console.log(rows)).catch(err => console.log(err))