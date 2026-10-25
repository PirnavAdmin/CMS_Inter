-- =========================================================================
-- Migration: Advanced Audit Logs Schema Upgrade
-- Target: Aiven Cloud MySQL / Local CMS Database
-- Description: Adds correlation, network provenance, device,
--              and HTTP request context columns and query indexes to AuditLogs.
-- Safeguards: Preserves all existing data, never drops tables or procedures.
-- =========================================================================

ALTER TABLE `AuditLogs` 
  ADD COLUMN `EventId` VARCHAR(64) NULL AFTER `AuditLogId`,
  ADD COLUMN `CorrelationId` VARCHAR(64) NULL AFTER `EventId`,
  ADD COLUMN `RequestId` VARCHAR(64) NULL AFTER `CorrelationId`,
  ADD COLUMN `ActorType` VARCHAR(30) NOT NULL DEFAULT 'User' AFTER `StaffId`,
  ADD COLUMN `RemoteIpAddress` VARCHAR(50) NULL AFTER `IpAddress`,
  ADD COLUMN `ForwardedClientIp` VARCHAR(50) NULL AFTER `RemoteIpAddress`,
  ADD COLUMN `IpSource` VARCHAR(30) NOT NULL DEFAULT 'Unknown' AFTER `ForwardedClientIp`,
  ADD COLUMN `IpConfidence` VARCHAR(30) NOT NULL DEFAULT 'Unknown' AFTER `IpSource`,
  ADD COLUMN `DeviceId` VARCHAR(100) NULL AFTER `UserAgent`,
  ADD COLUMN `SessionId` VARCHAR(100) NULL AFTER `DeviceId`,
  ADD COLUMN `RequestMethod` VARCHAR(10) NULL AFTER `SessionId`,
  ADD COLUMN `RouteTemplate` VARCHAR(255) NULL AFTER `RequestMethod`,
  ADD COLUMN `HttpStatusCode` INT NULL AFTER `RouteTemplate`,
  ADD COLUMN `DurationMs` DOUBLE NULL AFTER `HttpStatusCode`,
  ADD INDEX `IX_AuditLogs_Module` (`Module`),
  ADD INDEX `IX_AuditLogs_Severity` (`Severity`),
  ADD INDEX `IX_AuditLogs_UserId` (`UserId`),
  ADD INDEX `IX_AuditLogs_CorrelationId` (`CorrelationId`);
