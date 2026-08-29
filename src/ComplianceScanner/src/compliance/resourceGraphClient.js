const { DefaultAzureCredential } = require("@azure/identity");
const { ResourceGraphClient } = require("@azure/arm-resourcegraph");

class ResourceGraphService {
  constructor() {
    // DefaultAzureCredential automatically supports:
    // - Managed Identity when running in Azure
    // - Azure CLI credential when running locally after `az login`
    this._credential = new DefaultAzureCredential();

    this._client = new ResourceGraphClient(this._credential);
  }

  /**
   * @param {string} kql
   * @param {string[]} subscriptionIds
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async query(kql, subscriptionIds) {
    try {
      const response = await this._client.resources({
        query: kql,
        subscriptions: subscriptionIds,
      });

      const data = response.data;

      if (!Array.isArray(data)) {
        return [];
      }

      return data.map((row) =>
        row && typeof row === "object" ? row : {}
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);

      throw new Error(
        `Resource Graph query failed: ${message}`
      );
    }
  }
}

module.exports = { ResourceGraphService };