using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class UpdateGroupStoredProcedures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
        DROP PROCEDURE IF EXISTS sp_GetAllGroups;
    """);

            migrationBuilder.Sql("""
        CREATE PROCEDURE sp_GetAllGroups()
        BEGIN
            SELECT
                g.GroupId,
                g.Board,
                g.AcademicYearId,
                ay.AcademicYearName,
                g.AcademicLevel,
                g.GroupName,
                g.GroupCode,
                g.Description,
                0 AS TotalSubjects,
                g.IsActive,
                CASE
                    WHEN g.IsActive = 1 THEN 'Active'
                    ELSE 'Inactive'
                END AS Status,
                g.CreatedAt,
                g.UpdatedAt
            FROM `Groups` g
            LEFT JOIN AcademicYears ay
                ON ay.AcademicYearId = g.AcademicYearId
            ORDER BY g.GroupId DESC;
        END;
    """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
        DROP PROCEDURE IF EXISTS sp_GetAllGroups;
    """);
        }
    }
}