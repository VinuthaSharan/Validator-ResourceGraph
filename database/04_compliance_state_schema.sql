IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ComplianceSummary')
BEGIN
    CREATE TABLE dbo.ComplianceSummary (
        Id              BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ResourceId      NVARCHAR(512)        NOT NULL,
        PropertyName    NVARCHAR(128)        NOT NULL,
        CurrentValue    NVARCHAR(1024)       NULL,
        ComplianceStatus NVARCHAR(32)         NOT NULL,
        LastUpdated     DATETIME2            NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_ComplianceSummary UNIQUE (ResourceId, PropertyName)
    );
END
GO

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ComplianceHistory')
BEGIN
    CREATE TABLE dbo.ComplianceHistory (
        Id              BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        ResourceId      NVARCHAR(512)        NOT NULL,
        ResourceName    NVARCHAR(256)        NULL,
        ResourceType    NVARCHAR(256)        NULL,
        PropertyName    NVARCHAR(128)        NOT NULL,
        PreviousValue   NVARCHAR(1024)       NULL,
        CurrentValue    NVARCHAR(1024)       NULL,
        ExpectedValue   NVARCHAR(1024)       NULL,
        ComplianceStatus NVARCHAR(32)         NOT NULL,
        OperationName   NVARCHAR(128)        NULL,
        EventTime       DATETIME2            NOT NULL DEFAULT SYSUTCDATETIME(),
        ProcessedTime   DATETIME2            NULL
    );

    CREATE INDEX IX_ComplianceHistory_Resource ON dbo.ComplianceHistory(ResourceId, PropertyName, EventTime);
    CREATE INDEX IX_ComplianceHistory_Status ON dbo.ComplianceHistory(ComplianceStatus, EventTime);
END
GO
