/**
 * @param {string} scanRunId
 * @param {string} subscriptionId
 * @param {Array<{ ruleId: string, resourceId: string, resourceName?: string|null, propertyName?: string, previous?: string|boolean|null, current?: string|boolean|null, status?: string }>} changes
 * @returns {{ eventType: string, scanRunId: string, subscriptionId: string, driftCount: number, changes: Array<object> }}
 */
function buildDriftAlertPayload(scanRunId, subscriptionId, changes) {
  return {
    eventType: "compliance_drift",
    scanRunId,
    subscriptionId,
    driftCount: changes.length,
    changes: changes.map((change) => ({
      ruleId: change.ruleId,
      resourceId: change.resourceId,
      resourceName: change.resourceName ?? null,
      propertyName: change.propertyName ?? null,
      previous: change.previous ?? null,
      current: change.current ?? null,
      status: change.status ?? "UNKNOWN",
    })),
  };
}

/**
 * @param {string} webhookUrl
 * @param {object} payload
 */
async function sendComplianceAlerts(webhookUrl, payload) {
  if (!webhookUrl) {
    return;
  }
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    console.warn("Failed to post Logic App webhook:", err);
  }
}

module.exports = { buildDriftAlertPayload, sendComplianceAlerts };
