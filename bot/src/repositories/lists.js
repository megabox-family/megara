import pgPool from '../pg-pool.js'
import camelize from 'camelize'
import SQL from 'sql-template-strings'

export async function createList(context) {
  const { id, title, description, pages, recordsPerPage, groupBy, filters } =
      context,
    _pages = JSON.stringify(pages),
    _filters = JSON.stringify(filters)

  return await pgPool
    .query(
      SQL`
        insert into lists (id, title, description, page_data, records_per_page, group_by, filters)
        values(
          ${id}, 
          ${title}, 
          ${description}, 
          ${_pages},
          ${recordsPerPage},
          ${groupBy},
          ${_filters}
        );
      `
    )
    .catch(error => {
      console.log(error)
    })
}

export async function getPageData(id) {
  const pages = await pgPool
    .query(
      SQL`
        select
          page_data
        from lists
        where id = ${id}
      `
    )
    .then(res => (res.rows[0] ? res.rows[0].page_data : undefined))

  return JSON.parse(pages)
}

export async function getListInfo(id) {
  const result = await pgPool
    .query(
      SQL`
      select
        title,
        description,
        records_per_page,
        group_by,
        filters
      from lists
      where id = ${id}
    `
    )
    .then(res => camelize(res.rows[0]))
    .catch(error => {
      console.log(error)
    })

  let filters = result.filters

  result.filters = filters ? JSON.parse(filters) : null

  return result
}

export async function getGroupBy(id) {
  return await pgPool
    .query(
      SQL`
      select
        group_by
      from lists
      where id = ${id}
    `
    )
    .then(res => res.rows[0].group_by)
    .catch(error => {
      console.log(error)
    })
}

export async function updateListPageData(id, pages) {
  pages = JSON.stringify(pages)

  return await pgPool
    .query(
      SQL`
        update lists
        set
          page_data = ${pages}
        where id = ${id}
        returning *;
      `
    )
    .then(res => camelize(res.rows))
    .catch(error => {
      console.log(error)
    })
}
