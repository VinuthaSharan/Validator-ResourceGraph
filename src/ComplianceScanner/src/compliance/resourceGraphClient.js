const { DefaultAzureCredential } = require("@azure/identity");
const { ResourceGraphClient } = require("@azure/arm-resourcegraph");

class ResourceGraphService {
  constructor() {
    this._credential = new DefaultAzureCredential();
    this._client = new ResourceGraphClient(this._credential);
  }

  /**
   * @param {string} kql
   * @param {string[]} subscriptionIds
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async query(kql, subscriptionIds) {
    const response = await this._client.resources({
      query: kql,
      subscriptions: subscriptionIds,
    });
    const data = response.data;
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map((row) => (row && typeof row === "object" ? row : {}));
  }
}

module.exports = { ResourceGraphService };
