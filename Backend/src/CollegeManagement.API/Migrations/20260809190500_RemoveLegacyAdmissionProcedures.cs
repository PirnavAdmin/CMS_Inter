using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations;

[Migration("20260809190500_RemoveLegacyAdmissionProcedures")]
public partial class RemoveLegacyAdmissionProcedures : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CreateAdmission;", suppressTransaction: true);
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_UpdateAdmission;", suppressTransaction: true);
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAllAdmissions;", suppressTransaction: true);
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAdmissionById;", suppressTransaction: true);
        migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_ApproveAdmission;", suppressTransaction: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Legacy procedures intentionally remain removed. Current application code uses the V2 procedures.
    }
}
