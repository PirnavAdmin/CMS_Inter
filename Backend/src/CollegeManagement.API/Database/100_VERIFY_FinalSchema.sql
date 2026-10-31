USE `u819242402_CLM_System`;

-- 1. Required module tables
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('Certificates','AuditLogs','Students','StudentAdmissions');

-- 2. Certificate table columns
DESCRIBE `Certificates`;

-- 3. Admission link / legacy field check
SELECT COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE()
  AND TABLE_NAME='Students'
  AND COLUMN_NAME IN ('AdmissionId','PreviousHallTicketNumber');

-- 4. Required report/certificate stored procedures
SELECT ROUTINE_NAME
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA=DATABASE()
  AND ROUTINE_TYPE='PROCEDURE'
  AND (
      ROUTINE_NAME LIKE 'sp_Report_%'
      OR ROUTINE_NAME LIKE 'sp_%Certificate%'
  )
ORDER BY ROUTINE_NAME;

-- 5. Count the required procedures
SELECT COUNT(*) AS RequiredProcedureCount
FROM information_schema.ROUTINES
WHERE ROUTINE_SCHEMA=DATABASE()
  AND ROUTINE_TYPE='PROCEDURE'
  AND (
      ROUTINE_NAME LIKE 'sp_Report_%'
      OR ROUTINE_NAME LIKE 'sp_%Certificate%'
  );
