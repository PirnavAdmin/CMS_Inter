using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPromotionStoredProcedures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ==========================
            // Get Eligible Students
            // ==========================
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetEligibleStudents;
");

            migrationBuilder.Sql(@"
CREATE PROCEDURE sp_GetEligibleStudents()
BEGIN
    SELECT
        StudentId,
        AdmissionNo AS AdmissionNumber,
        StudentName,
        AcademicYearId,
        GroupId,
        Section
    FROM Students
    WHERE AcademicYearId = 1;
END;
");

            // ==========================
            // Get Promotion History
            // ==========================
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetPromotionHistory;
");

            migrationBuilder.Sql(@"
CREATE PROCEDURE sp_GetPromotionHistory()
BEGIN
    SELECT *
    FROM PromotionHistories
    ORDER BY PromotionDate DESC;
END;
");

            // ==========================
            // Promote Student
            // ==========================
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_PromoteStudent;
");

            migrationBuilder.Sql(@"
CREATE PROCEDURE sp_PromoteStudent
(
    IN pStudentId INT,
    IN pAcademicYearId INT,
    IN pClassId INT,
    IN pRemarks VARCHAR(500)
)
BEGIN

    UPDATE Students
    SET AcademicYearId = pAcademicYearId
    WHERE StudentId = pStudentId;

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
    VALUES
    (
        pStudentId,
        1,
        pAcademicYearId,
        1,
        pClassId,
        NOW(),
        'Admin',
        pRemarks,
        0
    );

END;
");

            // ==========================
            // Rollback Promotion
            // ==========================
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_RollbackPromotion;
");

            migrationBuilder.Sql(@"
CREATE PROCEDURE sp_RollbackPromotion
(
    IN pPromotionId INT
)
BEGIN

    UPDATE PromotionHistories
    SET
        IsRollback = 1,
        RollbackDate = NOW(),
        RollbackBy = 'Admin'
    WHERE Id = pPromotionId;

END;
");

            // ==========================
            // Update Section
            // ==========================
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_UpdateSection;
");

            migrationBuilder.Sql(@"
CREATE PROCEDURE sp_UpdateSection
(
    IN pStudentId INT,
    IN pSection VARCHAR(20)
)
BEGIN

    UPDATE Students
    SET Section = pSection
    WHERE StudentId = pStudentId;

END;
");

            // ==========================
            // Update Group
            // ==========================
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_UpdateGroup;
");

            migrationBuilder.Sql(@"
CREATE PROCEDURE sp_UpdateGroup
(
    IN pStudentId INT,
    IN pGroupId INT
)
BEGIN

    UPDATE Students
    SET GroupId = pGroupId
    WHERE StudentId = pStudentId;

END;
");

            // ==========================
            // Promotion Report
            // ==========================
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetPromotionReport;
");

            migrationBuilder.Sql(@"
CREATE PROCEDURE sp_GetPromotionReport()
BEGIN

    SELECT
        COUNT(*) AS TotalStudents,

        SUM(
            CASE
                WHEN AcademicYearId = 2 THEN 1
                ELSE 0
            END
        ) AS PromotedStudents,

        SUM(
            CASE
                WHEN AcademicYearId = 1 THEN 1
                ELSE 0
            END
        ) AS PendingStudents

    FROM Students;

END;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetEligibleStudents;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetPromotionHistory;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_PromoteStudent;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_RollbackPromotion;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_UpdateSection;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_UpdateGroup;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetPromotionReport;");
        }
    }
}