-- Compliance audit results (reference architecture: Compliance Audit DB)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ComplianceScanRuns')
BEGIN
    CREATE TABLE dbo.ComplianceScanRuns (
        ScanRunId       UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        StartedUtc      DATETIME2        NOT NULL,
        CompletedUtc    DATETIME2        NULL,
        SubscriptionId  NVARCHAR(64)     NOT NULL,
        RuleCount       INT              NOT NULL,
        ResourceCount   INT              NOT NULL,
        PassCount       INT              NOT NULL,
        FailCount       INT              NOT NULL,
        Status          NVARCHAR(32)     NOT NULL
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ComplianceResults')
BEGIN
    CREATE TABLE dbo.ComplianceResults (
        ResultId        BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ScanRunId       UNIQUEIDENTIFIER     NOT NULL,
        RuleId          NVARCHAR(64)         NOT NULL,
        ResourceId      NVARCHAR(512)        NOT NULL,
        ResourceName    NVARCHAR(256)        NULL,
        ResourceGroup   NVARCHAR(128)        NULL,
        IsCompliant     BIT                  NOT NULL,
        Message         NVARCHAR(1024)       NULL,
        EvaluatedUtc    DATETIME2            NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ComplianceResults_ScanRun
            FOREIGN KEY (ScanRunId) REFERENCES dbo.ComplianceScanRuns(ScanRunId)
    );
    CREATE INDEX IX_ComplianceResults_ScanRun ON dbo.ComplianceResults(ScanRunId);
    CREATE INDEX IX_ComplianceResults_Rule ON dbo.ComplianceResults(RuleId, IsCompliant);
END
GO
