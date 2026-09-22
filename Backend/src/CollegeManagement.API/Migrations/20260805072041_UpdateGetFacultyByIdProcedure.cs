using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class UpdateGetFacultyByIdProcedure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP PROCEDURE IF EXISTS sp_GetFacultyById;
            """);
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetFacultyById(
                    IN p_Id INT
                )
                BEGIN
                    -- Result Set 1: Faculty Details
                    SELECT 
                        f.Id,
                        f.EmployeeId,
                        f.FirstName,
                        f.LastName,
                        f.Gender,
                        f.DateOfBirth,
                        f.Aadhaar,
                        f.Mobile,
                        f.Email,
                        f.BloodGroup,
                        f.Qualification,
                        f.Designation,
                        f.DepartmentId,
                        d.DepartmentName AS Department,
                        f.JoiningDate,
                        f.Experience,
                        f.Username,
                        f.Password,
                        f.Status,
                        f.PhotoPath,
                        f.CreatedAt,
                        f.UpdatedAt,
                        f.IsDeleted
                    FROM Faculties f
                    LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId
                    WHERE f.Id = p_Id AND f.IsDeleted = 0;

                    -- Result Set 2: Subject Allocations
                    SELECT 
                        fsa.Id,
                        fsa.FacultyId,
                        fsa.BoardId,
                        fsa.AcademicLevelId,
                        fsa.AcademicYearId,
                        fsa.GroupId,
                        fsa.SectionId,
                        fsa.SubjectId,
                        fsa.CreatedAt,
                        fsa.UpdatedAt
                    FROM FacultySubjectAllocations fsa
                    WHERE fsa.FacultyId = p_Id
                    ORDER BY fsa.Id DESC;
                END;
            """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetFacultyById;");
        }
    }
}
