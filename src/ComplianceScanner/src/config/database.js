const sql = require("mssql");

const config = process.env.SQL_CONNECTION_STRING || "";

module.exports = { sql, config };
