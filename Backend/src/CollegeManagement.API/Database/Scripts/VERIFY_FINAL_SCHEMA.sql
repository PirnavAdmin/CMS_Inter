-- Final verification after Update-Database

SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'StudentAdmissions'
  AND COLUMN_NAME IN ('Email','MobileNumber','StudentEmail','StudentMobileNumber','PreviousHallTicketNumber');

SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'Students'
  AND COLUMN_NAME IN ('Email','MobileNumber','PreviousHallTicketNumber');

-- Expected:
-- StudentAdmissions: Email, MobileNumber only (no StudentEmail/StudentMobileNumber/PreviousHallTicketNumber)
-- Students: Email, MobileNumber only (no PreviousHallTicketNumber)

SHOW CREATE PROCEDURE sp_CreateAdmissionV2;
SHOW CREATE PROCEDURE sp_GetAdmissionByIdV2;
SHOW CREATE PROCEDURE sp_ApproveAdmissionV2;
SHOW CREATE PROCEDURE sp_GetStudentById;
