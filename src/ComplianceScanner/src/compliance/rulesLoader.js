const fs = require("fs/promises");
const sql = require("mssql");

/**
 * @typedef {object} ComplianceRule
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} severity
 * @property {string | null} resourceType
 * @property {string} kql
 * @property {object[]} checks
 */

/**
 * @param {string} filePath
 * @returns {Promise<ComplianceRule[]>}
 */
async function loadRulesFromJson(filePath) {
  const raw = JSON.parse(await fs.readFile(filePath, "utf8"));
  return (raw.rules ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description ?? "",
    severity: item.severity ?? "Medium",
    resourceType: item.resourceType ?? null,
    kql: item.kql,
    checks: item.checks ?? [],
  }));
}

/**
 * @param {string} connectionString
 * @returns {Promise<ComplianceRule[]>}
 */
async function loadRulesFromSql(connectionString) {
  const pool = await sql.connect(connectionString);
  try {
    const result = await pool
      .request()
      .query(`
        SELECT RuleId, Name, Description, Severity, ResourceType, KqlQuery, ChecksJson
        FROM dbo.ComplianceRules
        WHERE IsEnabled = 1
      `);
    return result.recordset.map((row) => ({
      id: row.RuleId,
      name: row.Name,
      description: row.Description ?? "",
      severity: row.Severity,
      resourceType: row.ResourceType ?? null,
      kql: row.KqlQuery,
      checks: JSON.parse(row.ChecksJson),
    }));
  } finally {
    await pool.close();
  }
}

/**
 * @param {string} source
 * @param {string} jsonPath
 * @param {string} sqlConnection
 * @returns {Promise<ComplianceRule[]>}
 */
async function loadRules(source, jsonPath, sqlConnection) {
  if (source === "sql") {
    if (!sqlConnection) {
      throw new Error("SQL_CONNECTION_STRING is required when RULES_SOURCE=sql");
    }
    return loadRulesFromSql(sqlConnection);
  }
  try {
    await fs.access(jsonPath);
  } catch {
    throw new Error(`Rules file not found: ${jsonPath}`);
  }
  return loadRulesFromJson(jsonPath);
}

module.exports = { loadRules };
