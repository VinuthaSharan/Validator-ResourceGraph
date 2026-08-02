const { app } = require("@azure/functions");
const { runComplianceScan } = require("./compliance/scanner");
const { getLatestScan } = require("./compliance/auditStore");

const schedule = process.env.COMPLIANCE_SCAN_SCHEDULE ?? "0 0 2 * * *";

app.timer("complianceScanTimer", {
  schedule,
  handler: async (_timer, context) => {
    await runComplianceScan(context);
  },
});

app.http("complianceScanHttp", {
  methods: ["GET", "POST"],
  authLevel: "function",
  route: "scan",
  handler: async (_request, context) => {
    const summary = await runComplianceScan(context);
    return { jsonBody: summary };
  },
});

app.http("complianceReportLatest", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "report/latest",
  handler: async () => {
    const summary = getLatestScan();
    if (!summary) {
      return {
        status: 404,
        jsonBody: {
          message: "No scan has been run in this instance yet. Call GET/POST /api/scan.",
        },
      };
    }
    return { jsonBody: summary };
  },
});
