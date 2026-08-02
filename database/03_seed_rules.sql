MERGE dbo.ComplianceRules AS t
USING (VALUES
    (
        N'storage-https-only',
        N'Storage accounts must require HTTPS',
        N'properties.supportsHttpsTrafficOnly should be true',
        N'High',
        N'microsoft.storage/storageaccounts',
        N'Resources | where subscriptionId == ''{subscriptionId}'' | where type == ''microsoft.storage/storageaccounts'' | project id, name, resourceGroup, subscriptionId, properties',
        N'[{"path":"properties.supportsHttpsTrafficOnly","operator":"equals","expected":true}]'
    ),
    (
        N'vm-tags-required',
        N'Virtual machines should have Environment tag',
        N'Tag Environment must be present',
        N'Medium',
        N'microsoft.compute/virtualmachines',
        N'Resources | where subscriptionId == ''{subscriptionId}'' | where type == ''microsoft.compute/virtualmachines'' | project id, name, resourceGroup, subscriptionId, properties, tags',
        N'[{"path":"tags.Environment","operator":"exists","expected":true}]'
    )
) AS s (RuleId, Name, Description, Severity, ResourceType, KqlQuery, ChecksJson)
ON t.RuleId = s.RuleId
WHEN MATCHED THEN UPDATE SET
    Name = s.Name, Description = s.Description, Severity = s.Severity,
    ResourceType = s.ResourceType, KqlQuery = s.KqlQuery, ChecksJson = s.ChecksJson,
    UpdatedUtc = SYSUTCDATETIME()
WHEN NOT MATCHED THEN INSERT (RuleId, Name, Description, Severity, ResourceType, KqlQuery, ChecksJson)
    VALUES (s.RuleId, s.Name, s.Description, s.Severity, s.ResourceType, s.KqlQuery, s.ChecksJson);
GO
