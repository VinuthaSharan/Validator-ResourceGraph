const crypto = require("crypto");
const { loadSettings } = require("./config");
const { ResourceGraphService } = require("./resourceGraphClient");
const { loadRules } = require("./rulesLoader");
const { validateResource } = require("./validator");
const sqlService = require("./sqlService");
const { createAuditStore } = require("./auditStore");
const { sendComplianceAlerts } = require("./alerts");

/**
 * @typedef {object} ComplianceResultRow
 * @property {string} ruleId
 * @property {string} resourceId
 * @property {string | null} resourceName
 * @property {string | null} resourceGroup
 * @property {boolean} isCompliant
 * @property {string} message
 */

/**
 * @typedef {object} ScanSummary
 * @property {string} scanRunId
 * @property {string} startedUtc
 * @property {string | null} completedUtc
 * @property {string} subscriptionId
 * @property {number} ruleCount
 * @property {number} resourceCount
 * @property {number} passCount
 * @property {number} failCount
 * @property {string} status
 * @property {ComplianceResultRow[]} results
 */

function utcNowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * @param {import('@azure/functions').InvocationContext} [context]
 * @returns {Promise<ScanSummary>}
 */
async function runComplianceScan(context) {
  const settings = loadSettings();
  if (!settings.subscriptionId) {
    throw new Error("AZURE_SUBSCRIPTION_ID is required");
  }

  const rules = await loadRules(
    settings.rulesSource,
    settings.rulesJsonPath,
    settings.sqlConnectionString
  );
  const rg = new ResourceGraphService();
  const audit = createAuditStore(
    settings.auditStorage,
    settings.auditJsonPath,
    settings.sqlConnectionString
  );

  const scanRunId = crypto.randomUUID();
  const started = utcNowIso();
  /** @type {ComplianceResultRow[]} */
  const results = [];
  const resourceIdsSeen = new Set();

  for (const rule of rules) {
    const kql = rule.kql.replaceAll("{subscriptionId}", settings.subscriptionId);
    try {
      const rows = await rg.query(kql, [settings.subscriptionId]);
      if (rows.length === 0) {
        context?.log(`Rule ${rule.id}: no resources returned`);
        continue;
      }
      for (const row of rows) {
        const rid = row.id != null ? String(row.id) : "";
        if (rid) {
          resourceIdsSeen.add(rid);
        }
        const [compliant, messages] = validateResource(row, rule.checks);
        const currentValue = messages.join("; ");

        const previous = await sqlService.getLatestCompliance(rid, rule.id);
        const previousValue = previous ? previous.CurrentValue : null;
        const changed = previousValue !== currentValue;

        if (changed) {
          await sqlService.saveComplianceHistory({
            resourceId: rid,
            resourceName: row.name != null ? String(row.name) : null,
            resourceType: row.type != null ? String(row.type) : null,
            ruleId: rule.id,
            propertyName: rule.checks[0]?.path ?? rule.id,
            previous: previousValue,
            current: currentValue,
            expected: rule.checks[0]?.expected,
            status: compliant ? "PASS" : "FAIL",
            eventTime: new Date(),
          });
        }

        await sqlService.upsertComplianceSummary({
          resourceId: rid,
          resourceName: row.name != null ? String(row.name) : null,
          resourceType: row.type != null ? String(row.type) : null,
          propertyName: rule.id,
          current: currentValue,
          status: compliant ? "PASS" : "FAIL",
        });

        results.push({
          ruleId: rule.id,
          resourceId: rid || `unknown-${rule.id}`,
          resourceName: row.name != null ? String(row.name) : null,
          resourceGroup: row.resourceGroup != null ? String(row.resourceGroup) : null,
          isCompliant: compliant,
          message: currentValue,
        });
      }
    } catch (err) {
      context?.error(`Resource Graph query failed for rule ${rule.id}`, err);
      results.push({
        ruleId: rule.id,
        resourceId: `rule:${rule.id}`,
        resourceName: null,
        resourceGroup: null,
        isCompliant: false,
        message: `Query failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  const passCount = results.filter((r) => r.isCompliant).length;
  const failCount = results.length - passCount;

  /** @type {ScanSummary} */
  const summary = {
    scanRunId,
    startedUtc: started,
    completedUtc: utcNowIso(),
    subscriptionId: settings.subscriptionId,
    ruleCount: rules.length,
    resourceCount: resourceIdsSeen.size,
    passCount,
    failCount,
    status: "Completed",
    results,
  };

  await audit.save(summary);

  if (settings.logicAppWebhookUrl) {
    await sendComplianceAlerts(settings.logicAppWebhookUrl, {
      ResourceName: "StorageDemo",
      Rule: "HTTPS Only",
      Current: false,
      Expected: true,
      Status: "FAIL",
    });
  }

  if (failCount > 0) {
    await sendComplianceAlerts(settings.logicAppWebhookUrl, {
      scanRunId,
      subscriptionId: settings.subscriptionId,
      failCount,
      passCount,
      failures: results
        .filter((r) => !r.isCompliant)
        .slice(0, 50)
        .map((r) => ({
          ruleId: r.ruleId,
          resourceId: r.resourceId,
          resourceName: r.resourceName,
          message: r.message,
        })),
    });
  }

  context?.log(
    `Scan complete: rules=${rules.length} results=${results.length} pass=${passCount} fail=${failCount}`
  );
  return summary;
}

module.exports = { runComplianceScan };
