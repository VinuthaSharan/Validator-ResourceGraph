const fs = require("fs/promises");
const path = require("path");
const sql = require("mssql");

/** @type {{ last: object | null }} */
const memoryCache = { last: null };

function summaryToPlain(summary) {
  return {
    scanRunId: summary.scanRunId,
    startedUtc: summary.startedUtc,
    completedUtc: summary.completedUtc,
    subscriptionId: summary.subscriptionId,
    ruleCount: summary.ruleCount,
    resourceCount: summary.resourceCount,
    passCount: summary.passCount,
    failCount: summary.failCount,
    status: summary.status,
    results: summary.results,
  };
}

class JsonFileAuditStore {
  /** @param {string} filePath */
  constructor(filePath) {
    this._filePath = filePath;
  }

  /** @param {import('./scanner').ScanSummary} summary */
  async save(summary) {
    await fs.mkdir(path.dirname(this._filePath), { recursive: true });
    await fs.writeFile(this._filePath, JSON.stringify(summaryToPlain(summary), null, 2), "utf8");
  }
}

class MemoryAuditStore {
  /** @param {import('./scanner').ScanSummary} summary */
  async save(summary) {
    memoryCache.last = summaryToPlain(summary);
  }
}

class SqlAuditStore {
  /** @param {string} connectionString */
  constructor(connectionString) {
    this._connectionString = connectionString;
  }

  /** @param {import('./scanner').ScanSummary} summary */
  async save(summary) {
    const pool = await sql.connect(this._connectionString);
    try {
      const request = pool.request();
      request.input("ScanRunId", sql.UniqueIdentifier, summary.scanRunId);
      request.input("StartedUtc", sql.DateTime2, new Date(summary.startedUtc));
      request.input(
        "CompletedUtc",
        sql.DateTime2,
        summary.completedUtc ? new Date(summary.completedUtc) : null
      );
      request.input("SubscriptionId", sql.NVarChar(64), summary.subscriptionId);
      request.input("RuleCount", sql.Int, summary.ruleCount);
      request.input("ResourceCount", sql.Int, summary.resourceCount);
      request.input("PassCount", sql.Int, summary.passCount);
      request.input("FailCount", sql.Int, summary.failCount);
      request.input("Status", sql.NVarChar(32), summary.status);

      await request.query(`
        INSERT INTO dbo.ComplianceScanRuns
        (ScanRunId, StartedUtc, CompletedUtc, SubscriptionId, RuleCount,
         ResourceCount, PassCount, FailCount, Status)
        VALUES (@ScanRunId, @StartedUtc, @CompletedUtc, @SubscriptionId, @RuleCount,
                @ResourceCount, @PassCount, @FailCount, @Status)
      `);

      for (const row of summary.results) {
        const r = pool.request();
        r.input("ScanRunId", sql.UniqueIdentifier, summary.scanRunId);
        r.input("RuleId", sql.NVarChar(64), row.ruleId);
        r.input("ResourceId", sql.NVarChar(512), row.resourceId);
        r.input("ResourceName", sql.NVarChar(256), row.resourceName);
        r.input("ResourceGroup", sql.NVarChar(128), row.resourceGroup);
        r.input("IsCompliant", sql.Bit, row.isCompliant ? 1 : 0);
        r.input(
          "Message",
          sql.NVarChar(1024),
          row.message ? row.message.slice(0, 1024) : null
        );
        await r.query(`
          INSERT INTO dbo.ComplianceResults
          (ScanRunId, RuleId, ResourceId, ResourceName, ResourceGroup,
           IsCompliant, Message, EvaluatedUtc)
          VALUES (@ScanRunId, @RuleId, @ResourceId, @ResourceName, @ResourceGroup,
                  @IsCompliant, @Message, SYSUTCDATETIME())
        `);
      }
    } finally {
      await pool.close();
    }
  }
}

class MirroringAuditStore {
  /** @param {{ save: (summary: import('./scanner').ScanSummary) => Promise<void> }} inner */
  constructor(inner) {
    this._inner = inner;
  }

  /** @param {import('./scanner').ScanSummary} summary */
  async save(summary) {
    await this._inner.save(summary);
    memoryCache.last = summaryToPlain(summary);
  }
}

/**
 * @param {string} storage
 * @param {string} jsonPath
 * @param {string} sqlConnection
 */
function createAuditStore(storage, jsonPath, sqlConnection) {
  if (storage === "sql") {
    if (!sqlConnection) {
      throw new Error("SQL_CONNECTION_STRING is required when AUDIT_STORAGE=sql");
    }
    return new MirroringAuditStore(new SqlAuditStore(sqlConnection));
  }
  if (storage === "jsonfile") {
    return new MirroringAuditStore(new JsonFileAuditStore(jsonPath));
  }
  return new MirroringAuditStore(new MemoryAuditStore());
}

function getLatestScan() {
  return memoryCache.last;
}

module.exports = { createAuditStore, getLatestScan };
