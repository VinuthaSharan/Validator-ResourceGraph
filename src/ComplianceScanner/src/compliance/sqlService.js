const { sql, config } = require("../config/database");

function hasSqlConnection() {
    return Boolean(config && String(config).trim().length > 0);
}

// Get Compliance Rules
async function getComplianceRules(resourceType) {

    const pool = await sql.connect(config);

    const result = await pool.request()
        .input("resourceType", sql.NVarChar, resourceType)
        .query(`
            SELECT *
            FROM ComplianceRules
            WHERE LOWER(ResourceType) = LOWER(@resourceType)
            ORDER BY PropertyName
        `);

    return result.recordset;
}

async function getLatestCompliance(resourceId, propertyName) {

    if (!hasSqlConnection()) {
        return null;
    }

    const pool = await sql.connect(config);

    const result = await pool.request()
        .input("resourceId", sql.NVarChar, resourceId)
        .input("propertyName", sql.NVarChar, propertyName)
        .query(`
            SELECT TOP 1 *
            FROM ComplianceSummary
            WHERE ResourceId = @resourceId
            AND PropertyName = @propertyName
        `);

    return result.recordset[0];

}

// Save Compliance History
async function saveComplianceHistory(history) {

    if (!hasSqlConnection()) {
        return;
    }

    const pool = await sql.connect(config);

    await pool.request()
        .input("resourceId", sql.NVarChar, history.resourceId)
        .input("resourceName", sql.NVarChar, history.resourceName)
        .input("resourceType", sql.NVarChar, history.resourceType)
        .input("propertyName", sql.NVarChar, history.propertyName)
        .input("previous", sql.NVarChar, history.previous == null ? null : String(history.previous))
        .input("current", sql.NVarChar, history.current == null ? null : String(history.current))
        .input("expected", sql.NVarChar, history.expected == null ? null : String(history.expected))
        .input("status", sql.NVarChar, history.status)
        .input("operationName", sql.NVarChar, history.operationName ?? "SCAN")
        .input("eventTime", sql.DateTime2, history.eventTime)
        .query(`
INSERT INTO ComplianceHistory
(
    ResourceId,
    ResourceName,
    ResourceType,
    PropertyName,
    PreviousValue,
    CurrentValue,
    ExpectedValue,
    ComplianceStatus,
    OperationName,
    EventTime,
    ProcessedTime
)
VALUES
(
    @resourceId,
    @resourceName,
    @resourceType,
    @propertyName,
    @previous,
    @current,
    @expected,
    @status,
    @operationName,
    @eventTime,
    NULL
)
`);
}

async function upsertComplianceSummary(item) {

    if (!hasSqlConnection()) {
        return;
    }

    const pool = await sql.connect(config);

    await pool.request()

        .input("resourceId", sql.NVarChar, item.resourceId)
        .input("propertyName", sql.NVarChar, item.propertyName)
        .input("currentValue", sql.NVarChar, item.current == null ? null : String(item.current))
        .input("status", sql.NVarChar, item.status)

        .query(`
MERGE ComplianceSummary AS target

USING (

SELECT

@ResourceId AS ResourceId,

@propertyName AS PropertyName

) AS source

ON target.ResourceId = source.ResourceId

AND target.PropertyName = source.PropertyName

WHEN MATCHED THEN

UPDATE SET

CurrentValue=@currentValue,

ComplianceStatus=@status,

LastUpdated=GETDATE()

WHEN NOT MATCHED THEN

INSERT

(

ResourceId,

PropertyName,

CurrentValue,

ComplianceStatus,

LastUpdated

)

VALUES

(

@ResourceId,

@propertyName,

@currentValue,

@status,

GETDATE()

);

`);

}

module.exports = {

    getComplianceRules,

    saveComplianceHistory,

    getLatestCompliance,

    upsertComplianceSummary

};