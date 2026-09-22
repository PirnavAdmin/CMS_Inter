using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    public partial class FixFrontendRelationsAndAdmissionFlow : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"ALTER TABLE Students ADD COLUMN IF NOT EXISTS AdmissionId INT NULL AFTER StudentId;", suppressTransaction: true);
            migrationBuilder.Sql(@"SET @idx := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Students' AND INDEX_NAME='UX_Students_AdmissionId'); SET @sql := IF(@idx=0,'CREATE UNIQUE INDEX UX_Students_AdmissionId ON Students(AdmissionId)','SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;", suppressTransaction: true);
            migrationBuilder.Sql(@"SET @fk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='Students' AND CONSTRAINT_NAME='FK_Students_StudentAdmissions_AdmissionId'); SET @sql := IF(@fk=0,'ALTER TABLE Students ADD CONSTRAINT FK_Students_StudentAdmissions_AdmissionId FOREIGN KEY (AdmissionId) REFERENCES StudentAdmissions(AdmissionId) ON DELETE RESTRICT ON UPDATE CASCADE','SELECT 1'); PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;", suppressTransaction: true);
            // Stored procedures are finalized by migration 20260809150000_FinalRelationsAndAdmissionFlow.
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_ApproveAdmission;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_VerifyAdmission;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_RejectAdmission;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_DeleteAdmission;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GenerateAdmissionNumber;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_UpdateAdmission;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAllGroupsPaged;", suppressTransaction: true);
        }
    }
}
