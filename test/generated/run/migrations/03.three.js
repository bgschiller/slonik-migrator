module.exports.up = ({context: {connection, sql}}) => connection.query(sql.unknown`create table migration_test_3(id int)`)
module.exports.down = ({context: {connection, sql}}) => connection.query(sql.unknown`drop table migration_test_3`)