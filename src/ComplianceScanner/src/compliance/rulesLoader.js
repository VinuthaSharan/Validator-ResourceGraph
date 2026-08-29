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
 * Load rules from JSON.
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
 * Convert SQL ExpectedValue into an appropriate JS value.
 */
function parseExpectedValue(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();

  if (text.toLowerCase() === "true") {
    return true;
  }

  if (text.toLowerCase() === "false") {
    return false;
  }

  if (text.toLowerCase() === "null") {
    return null;
  }

  // Numeric values
  if (text !== "" && !Number.isNaN(Number(text))) {
    return Number(text);
  }

  return text;
}


/**
 * Load compliance rules from Azure SQL.
 *
 * Actual database schema:
 *
 * Id
 * ResourceType
 * PropertyName
 * ExpectedValue
 * RuleDescription
 * IsActive
 * CreatedOn
 */
async function loadRulesFromSql(connectionString) {

  const pool = await sql.connect(connectionString);

  try {

    const result = await pool
      .request()
      .query(`
        SELECT
          Id,
          ResourceType,
          PropertyName,
          ExpectedValue,
          RuleDescription,
          IsActive,
          CreatedOn
        FROM dbo.ComplianceRules
        WHERE IsActive = 1
        ORDER BY Id
      `);

    return result.recordset.map((row) => {

      const resourceType = row.ResourceType
        ? String(row.ResourceType).trim()
        : null;

      const propertyName = row.PropertyName
        ? String(row.PropertyName).trim()
        : "";

      const expectedValue = parseExpectedValue(
        row.ExpectedValue
      );

      /*
       * Resource Graph query.
       *
       * scanner.js replaces:
       *
       * {subscriptionId}
       *
       * with the actual subscription ID.
       */
      let kql = `
        Resources
        | where subscriptionId == "{subscriptionId}"
      `;

      if (resourceType) {
        kql += `
        | where type =~ "${resourceType}"
        `;
      }

      /*
       * Keep properties in the result because
       * validator.js evaluates paths such as:
       *
       * properties.supportsHttpsTrafficOnly
       * properties.minimumTlsVersion
       */
      kql += `
      | project id, name, resourceGroup, type, properties, tags
      `;


      /*
       * SQL PropertyName:
       *
       * supportsHttpsTrafficOnly
       *
       * becomes:
       *
       * properties.supportsHttpsTrafficOnly
       */
      const checkPath =
      propertyName.startsWith("properties.") ||
      propertyName.startsWith("tags.")
        ? propertyName
        : `properties.${propertyName}`;


      return {
        id: String(row.Id),

        name: `Rule-${row.Id}`,

        description: row.RuleDescription ?? "",

        severity: "Medium",

        resourceType,

        kql,

        checks: propertyName
          ? [
              {
                path: checkPath,
                operator: "equals",
                expected: expectedValue,
              },
            ]
          : [],
      };
    });

  } finally {

    await pool.close();

  }
}


/**
 * Load compliance rules.
 *
 * RULES_SOURCE=sql
 *     -> Azure SQL ComplianceRules
 *
 * RULES_SOURCE=json
 *     -> compliance-rules.json
 */
async function loadRules(
  source,
  jsonPath,
  sqlConnection
) {

  if (source === "sql") {

    if (!sqlConnection) {
      throw new Error(
        "SQL_CONNECTION_STRING is required when RULES_SOURCE=sql"
      );
    }

    return loadRulesFromSql(sqlConnection);
  }


  try {

    await fs.access(jsonPath);

  } catch {

    throw new Error(
      `Rules file not found: ${jsonPath}`
    );

  }


  return loadRulesFromJson(jsonPath);
}


module.exports = {
  loadRules,
};