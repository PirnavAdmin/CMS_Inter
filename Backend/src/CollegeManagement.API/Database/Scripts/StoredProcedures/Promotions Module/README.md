# Module 15 - Promotion Management (MySQL)

These are the MySQL 8.0+ stored procedures used by the Promotion Management APIs.

## Installation

1. Open MySQL Workbench.
2. Select the college management database.
3. Run `PromotionModule_All.sql` once.
4. Do not run EF migration for Module 15.
5. Restart the API after installing the procedures.

## Procedures

- sp_GetEligiblePromotionStudents
- sp_PromoteStudents
- sp_PromoteSingleStudent
- sp_GetPromotionHistory
- sp_RollbackPromotions
- sp_GetPromotionReport
- sp_AllocateStudentSection
- sp_AllocateStudentGroup

## Important parameter alignment

`sp_GetEligiblePromotionStudents` accepts academic year, target academic year, current academic level, group, section, and target academic level filters.

`sp_PromoteStudents` and `sp_PromoteSingleStudent` accept `p_ToSection` between target academic level and remarks.

The C# PromotionRepository has been updated to pass these parameters.

## Check installed procedures

SHOW PROCEDURE STATUS WHERE Db = DATABASE() AND Name LIKE 'sp_%Promotion%';
SHOW CREATE PROCEDURE sp_GetEligiblePromotionStudents;
SHOW CREATE PROCEDURE sp_PromoteStudents;

## Example calls

CALL sp_GetEligiblePromotionStudents(NULL, NULL, NULL, NULL, NULL, '2nd Year');

CALL sp_PromoteStudents('[1,2]', 2, '2nd Year', 'A', 'Promoted after results');

CALL sp_PromoteSingleStudent(1, 2, '2nd Year', 'A', 'Single student promotion');
