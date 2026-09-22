using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    public partial class AddAttendanceTable : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                CREATE TABLE IF NOT EXISTS Attendances (
                    AttendanceId INT AUTO_INCREMENT PRIMARY KEY,
                    AttendanceDate DATETIME NOT NULL,
                    StudentId INT NOT NULL,
                    FacultyId INT NOT NULL,
                    BoardId INT NOT NULL,
                    AcademicYearId INT NOT NULL,
                    AcademicLevelId INT NOT NULL,
                    GroupId INT NOT NULL,
                    SectionId INT NOT NULL,
                    SubjectId INT NOT NULL,
                    Status TINYINT NOT NULL,
                    Remarks VARCHAR(500) NULL,
                    IsActive TINYINT(1) NOT NULL DEFAULT 1,
                    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    UpdatedAt DATETIME NULL
                );
                """,
                suppressTransaction: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
