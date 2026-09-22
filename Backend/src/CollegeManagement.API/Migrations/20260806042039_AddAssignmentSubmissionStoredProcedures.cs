using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAssignmentSubmissionStoredProcedures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
"""
DROP PROCEDURE IF EXISTS sp_SubmitAssignment;
""",
suppressTransaction: true);

            migrationBuilder.Sql(
            """
CREATE PROCEDURE sp_SubmitAssignment
(
    IN p_AssignmentId INT,
    IN p_StudentName VARCHAR(100),
    IN p_SubmissionFile VARCHAR(500)
)
BEGIN

    INSERT INTO `AssignmentSubmissions`
    (
        AssignmentId,
        StudentName,
        SubmissionFile,
        SubmittedAt
    )
    VALUES
    (
        p_AssignmentId,
        p_StudentName,
        p_SubmissionFile,
        UTC_TIMESTAMP()
    );

    SELECT *
    FROM `AssignmentSubmissions`
    WHERE AssignmentSubmissionId = LAST_INSERT_ID();

END;
""",
            suppressTransaction: true);


            migrationBuilder.Sql(
"""
DROP PROCEDURE IF EXISTS sp_GetAssignmentSubmissions;
""",
suppressTransaction: true);

            migrationBuilder.Sql(
            """
CREATE PROCEDURE sp_GetAssignmentSubmissions
(
    IN p_AssignmentId INT
)
BEGIN

    SELECT
        AssignmentSubmissionId,
        AssignmentId,
        StudentName,
        SubmissionFile,
        SubmittedAt
    FROM `AssignmentSubmissions`
    WHERE AssignmentId = p_AssignmentId
    ORDER BY SubmittedAt DESC;

END;
""",
            suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_GetAssignmentSubmissions;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_SubmitAssignment;
    """,
            suppressTransaction: true);
        }
    }
}
