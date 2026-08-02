const path = require("path");

function resolvePath(baseDir, value) {
  if (path.isAbsolute(value)) {
    return value;
  }
  return path.resolve(baseDir, value);
}

function loadSettings() {
  const baseDir = path.resolve(__dirname, "..", "..");

  return {
    subscriptionId: process.env.AZURE_SUBSCRIPTION_ID?.trim() ?? "",
    rulesSource: (process.env.RULES_SOURCE ?? "json").toLowerCase(),
    rulesJsonPath: resolvePath(
      baseDir,
      process.env.RULES_JSON_PATH ?? "../../rules/compliance-rules.json"
    ),
    auditStorage: (process.env.AUDIT_STORAGE ?? "jsonfile").toLowerCase(),
    auditJsonPath: resolvePath(
      baseDir,
      process.env.AUDIT_JSON_PATH ?? "../../output/latest-scan.json"
    ),
    sqlConnectionString: (process.env.SQL_CONNECTION_STRING ?? "").trim(),
    logicAppWebhookUrl: (process.env.LOGIC_APP_WEBHOOK_URL ?? "").trim(),
  };
}

module.exports = { loadSettings };
