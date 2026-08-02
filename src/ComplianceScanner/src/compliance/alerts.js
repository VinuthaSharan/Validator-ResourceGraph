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

module.exports = { sendComplianceAlerts };
