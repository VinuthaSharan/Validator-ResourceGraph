const { app } = require("@azure/functions");
const { readFileSync } = require("fs");
const path = require("path");

const { runComplianceScan } = require("./compliance/scanner");
const { getLatestScan } = require("./compliance/auditStore");
const { getDashboardData } = require("./compliance/dashboardService");

const schedule = process.env.COMPLIANCE_SCAN_SCHEDULE ?? "0 0 2 * * *";


// ========================================
// TIMER - Compliance Scan
// ========================================

app.timer("complianceScanTimer", {
  schedule,
  handler: async (_timer, context) => {
    await runComplianceScan(context);
  },
});


// ========================================
// HTTP - Run Compliance Scan
// ========================================

app.http("complianceScanHttp", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "scan",

  handler: async (_request, context) => {
  try {
    context.log("Starting compliance scan...");

    const summary = await runComplianceScan(context);

    context.log("Compliance scan completed successfully.");

    return {
      status: 200,
      jsonBody: summary
    };

  } catch (err) {

    context.error("COMPLIANCE SCAN FAILED");
    context.error(err);

    return {
      status: 500,
      jsonBody: {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      }
    };
  }
  },
});


// ========================================
// HTTP - Latest Report
// ========================================

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
          message:
            "No scan has been run in this instance yet. Call GET/POST /api/scan.",
        },
      };
    }

    return {
      jsonBody: summary
    };
  },
});


// ========================================
// HTTP - Dashboard API
// ========================================

app.http("complianceDashboard", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "dashboard",

  handler: async () => {

    const dashboard = await getDashboardData();

    return {
      jsonBody: dashboard
    };
  },
});


// ========================================
// HTTP - Dashboard Data API
// ========================================

app.http("complianceDashboardData", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "dashboard-data",

  handler: async () => {

    const dashboard = await getDashboardData();

    return {
      jsonBody: dashboard
    };
  },
});


// ========================================
// Dashboard HTML
// ========================================

app.http("complianceDashboardHtml", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "dashboard-page",

  handler: async () => {

    const filePath = path.join(
      __dirname,
      "..",
      "dashboard.html"
    );

    const html = readFileSync(filePath, "utf8");

    return {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      },
      body: html
    };
  }
});


// ========================================
// Dashboard CSS
// ========================================

app.http("complianceDashboardCss", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "dashboard.css",

  handler: async () => {

    const filePath = path.join(
      __dirname,
      "..",
      "dashboard.css"
    );

    const css = readFileSync(filePath, "utf8");

    return {
      status: 200,
      headers: {
        "Content-Type": "text/css; charset=utf-8"
      },
      body: css
    };
  }
});


// ========================================
// Dashboard JavaScript
// ========================================

app.http("complianceDashboardJs", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "dashboard.js",

  handler: async () => {

    const filePath = path.join(
      __dirname,
      "..",
      "dashboard.js"
    );

    const js = readFileSync(filePath, "utf8");

    return {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8"
      },
      body: js
    };
  }
});
