-- Compliance rules database (reference architecture: Compliance Rules DB)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ComplianceRules')
BEGIN
    CREATE TABLE dbo.ComplianceRules (
        RuleId          NVARCHAR(64)  NOT NULL PRIMARY KEY,
        Name            NVARCHAR(256) NOT NULL,
        Description     NVARCHAR(1024) NULL,
        Severity        NVARCHAR(32)  NOT NULL DEFAULT 'Medium',
        ResourceType    NVARCHAR(256) NULL,
        KqlQuery        NVARCHAR(MAX) NOT NULL,
        ChecksJson      NVARCHAR(MAX) NOT NULL,
        IsEnabled       BIT           NOT NULL DEFAULT 1,
        CreatedUtc      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedUtc      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
    );
END
GO
