import {Migration} from '../../../../src'

export const up: Migration = ({context: {connection, sql}}) => connection.query(sql.unknown`create table migration_test_4(id int)`)
export const down: Migration = ({context: {connection, sql}}) => connection.query(sql.unknown`drop table migration_test_4`)