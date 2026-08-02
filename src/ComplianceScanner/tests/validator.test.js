const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { validateResource } = require("../src/compliance/validator");
const sqlService = require("../src/compliance/sqlService");

process.env.SQL_CONNECTION_STRING = "";

describe("validateResource", () => {
  it("passes when storage HTTPS is enabled", () => {
    const [ok] = validateResource(
      { properties: { supportsHttpsTrafficOnly: true } },
      [{ path: "properties.supportsHttpsTrafficOnly", operator: "equals", expected: true }]
    );
    assert.equal(ok, true);
  });

  it("fails when Environment tag is missing", () => {
    const [ok, msgs] = validateResource(
      { tags: {} },
      [{ path: "tags.Environment", operator: "exists", expected: true }]
    );
    assert.equal(ok, false);
    assert.ok(msgs.some((m) => m.includes("missing")));
  });
});

describe("sqlService", () => {
  it("degrades safely when SQL is not configured", async () => {
    assert.equal(await sqlService.getLatestCompliance("rid", "rule-1"), null);

    await assert.doesNotReject(async () => {
      await sqlService.saveComplianceHistory({
        resourceId: "rid",
        resourceName: "acct",
        resourceType: "Microsoft.Storage/storageAccounts",
        ruleId: "rule-1",
        propertyName: "properties.supportsHttpsTrafficOnly",
        previous: true,
        current: false,
        expected: true,
        status: "FAIL",
        eventTime: new Date(),
      });
    });

    await assert.doesNotReject(async () => {
      await sqlService.upsertComplianceSummary({
        resourceId: "rid",
        propertyName: "rule-1",
        current: "false",
        status: "FAIL",
      });
    });
  });
});
