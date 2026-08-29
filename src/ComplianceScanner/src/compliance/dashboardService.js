const sql = require("mssql");
const { sql: sqlLib, config } = require("../config/database");

async function getDashboardData() {
  if (!config || !String(config).trim()) {
    return {
      summary: [],
      history: [],
    };
  }

  const pool = await sqlLib.connect(config);
  try {
    const summaryResult = await pool.request().query(`
      SELECT TOP 100 *
      FROM dbo.ComplianceSummary
      ORDER BY LastUpdated DESC
    `);

    const historyResult = await pool.request().query(`
      SELECT TOP 100 *
      FROM dbo.ComplianceHistory
      ORDER BY EventTime DESC
    `);

    return {
      summary: summaryResult.recordset,
      history: historyResult.recordset,
    };
  } finally {
    await pool.close();
  }
}

module.exports = { getDashboardData };
