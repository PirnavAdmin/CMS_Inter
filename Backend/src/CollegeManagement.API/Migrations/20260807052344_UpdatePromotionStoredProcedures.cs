using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    public partial class UpdatePromotionStoredProcedures : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ==========================================
            // Promote Students
            // ==========================================
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_PromoteStudent;
");

            migrationBuilder.Sql(@"
CREATE PROCEDURE sp_PromoteStudent
(
    IN p_StudentId INT,
    IN p_NewAcademicYearId INT,
    IN p_NewClassId INT,
    IN p_Remarks VARCHAR(500)
)
BEGIN
 
    INSERT INTO PromotionHistories
    (
        StudentId,
        FromAcademicYearId,
        ToAcademicYearId,
        FromClassId,
        ToClassId,
        PromotionDate,
        PromotedBy,
        Remarks,
        IsRollback
    )
    SELECT
        StudentId,
        AcademicYearId,
        p_NewAcademicYearId,
        1,
        p_NewClassId,
        NOW(),
        'Admin',
        p_Remarks,
        0
    FROM Students
    WHERE StudentId = p_StudentId;
 
    UPDATE Students
    SET
        AcademicYearId = p_NewAcademicYearId
    WHERE StudentId = p_StudentId;
 
END;
");

            // ==========================================
            // Rollback Promotion
            // ==========================================
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_RollbackPromotion;
");

            migrationBuilder.Sql(@"
CREATE PROCEDURE sp_RollbackPromotion
(
    IN p_PromotionId INT
)
BEGIN
 
    UPDATE PromotionHistories
    SET
        IsRollback = 1,
        RollbackDate = NOW(),
        RollbackBy = 'Admin'
    WHERE Id = p_PromotionId;
 
END;
");

            // ==========================================
            // Promotion Report
            // ==========================================
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetPromotionReport;
");

            migrationBuilder.Sql(@"
CREATE PROCEDURE sp_GetPromotionReport()
BEGIN
 
SELECT
    (SELECT COUNT(*) FROM Students) AS TotalStudents,
 
    (
        SELECT COUNT(*)
        FROM PromotionHistories
        WHERE IsRollback = 0
    ) AS PromotedStudents,
 
    (
        SELECT COUNT(*)
        FROM PromotionHistories
        WHERE IsRollback = 1
    ) AS RollbackStudents,
 
    (
        SELECT COUNT(*)
        FROM Students
        WHERE StudentId NOT IN
        (
            SELECT StudentId
            FROM PromotionHistories
            WHERE IsRollback = 0
        )
    ) AS PendingStudents;
 
END;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP PROCEDURE IF EXISTS sp_PromoteStudent;");
            migrationBuilder.Sql(@"DROP PROCEDURE IF EXISTS sp_RollbackPromotion;");
            migrationBuilder.Sql(@"DROP PROCEDURE IF EXISTS sp_GetPromotionReport;");
        }
    }
}