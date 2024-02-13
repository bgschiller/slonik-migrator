export const sqlUp = `raise 'up migration not implemented'
`;

export const sqlDown = `raise 'down migration not implemented'
`;

export const typescript = `
import {Migration} from '@slonik/migrator'

export const up: Migration = async ({context: {connection, sql}}) => {
  await connection.query(sql.unknown\`raise 'up migration not implemented'\`)
}

export const down: Migration = async ({context: {connection, sql}}) => {
  await connection.query(sql.unknown\`raise 'down migration not implemented'\`)
}
`.trimStart();

export const javascript = `
/** @type {import('@slonik/migrator').Migration} */
exports.up = async ({context: {connection, sql}}) => {
  await connection.query(sql.unknown\`raise 'up migration not implemented'\`)
}

/** @type {import('@slonik/migrator').Migration} */
exports.down = async ({context: {connection, sql}}) => {
  await connection.query(sql.unknown\`raise 'down migration not implemented'\`)
}
`.trimStart();
