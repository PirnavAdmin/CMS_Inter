using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAssignmentStoredProcedures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
"""
DROP PROCEDURE IF EXISTS sp_CreateAssignment;
""",
suppressTransaction: true);

            migrationBuilder.Sql(
            """
CREATE PROCEDURE sp_CreateAssignment
(
    IN p_Title VARCHAR(200),
    IN p_Subject VARCHAR(100),
    IN p_Faculty VARCHAR(100),
    IN p_Description VARCHAR(1000),
    IN p_DueDate DATE,
    IN p_Attachment VARCHAR(500),
    IN p_MaximumMarks INT
)
BEGIN

    DECLARE v_AssignmentId INT;

    IF p_Title IS NULL OR TRIM(p_Title) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Assignment Title is required';
    END IF;

    IF p_Subject IS NULL OR TRIM(p_Subject) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Subject is required';
    END IF;

    IF p_Faculty IS NULL OR TRIM(p_Faculty) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Faculty is required';
    END IF;

    IF p_DueDate IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Due Date is required';
    END IF;

    IF p_Attachment IS NULL OR TRIM(p_Attachment) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Attachment is required';
    END IF;

    INSERT INTO Assignments
    (
        Title,
        Subject,
        Faculty,
        Description,
        DueDate,
        Attachment,
        MaximumMarks
    )

    VALUES
    (
        TRIM(p_Title),
        TRIM(p_Subject),
        TRIM(p_Faculty),
        NULLIF(TRIM(p_Description), ''),
        p_DueDate,
        TRIM(p_Attachment),
        p_MaximumMarks
    );

    SET v_AssignmentId = LAST_INSERT_ID();

    SELECT
        AssignmentId,
        Title,
        Subject,
        Faculty,
        Description,
        DueDate,
        Attachment,
        MaximumMarks
    FROM Assignments
    WHERE AssignmentId = v_AssignmentId;

END;
""",
            suppressTransaction: true);

            migrationBuilder.Sql(
"""
DROP PROCEDURE IF EXISTS sp_GetAllAssignments;
""",
suppressTransaction: true);

            migrationBuilder.Sql(
            """
CREATE PROCEDURE sp_GetAllAssignments()
BEGIN

    SELECT
        AssignmentId,
        Title,
        Subject,
        Faculty,
        Description,
        DueDate,
        Attachment,
        MaximumMarks
    FROM Assignments
    ORDER BY AssignmentId DESC;

END;
""",
            suppressTransaction: true);

            migrationBuilder.Sql(
"""
DROP PROCEDURE IF EXISTS sp_GetAssignmentById;
""",
suppressTransaction: true);

            migrationBuilder.Sql(
            """
CREATE PROCEDURE sp_GetAssignmentById
(
    IN p_AssignmentId INT
)
BEGIN

    SELECT
        AssignmentId,
        Title,
        Subject,
        Faculty,
        Description,
        DueDate,
        Attachment,
        MaximumMarks
    FROM Assignments
    WHERE AssignmentId = p_AssignmentId
    LIMIT 1;

END;
""",
            suppressTransaction: true);

            migrationBuilder.Sql(
"""
DROP PROCEDURE IF EXISTS sp_UpdateAssignment;
""",
suppressTransaction: true);

            migrationBuilder.Sql(
            """
CREATE PROCEDURE sp_UpdateAssignment
(
    IN p_AssignmentId INT,
    IN p_Title VARCHAR(200),
    IN p_Subject VARCHAR(100),
    IN p_Faculty VARCHAR(100),
    IN p_Description VARCHAR(1000),
    IN p_DueDate DATE,
    IN p_Attachment VARCHAR(500),
    IN p_MaximumMarks INT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Assignments
        WHERE AssignmentId = p_AssignmentId
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Assignment not found';
    END IF;

    UPDATE Assignments
    SET
        Title = TRIM(p_Title),
        Subject = TRIM(p_Subject),
        Faculty = TRIM(p_Faculty),
        Description = NULLIF(TRIM(p_Description), ''),
        DueDate = p_DueDate,
        Attachment = TRIM(p_Attachment),
        MaximumMarks = p_MaximumMarks
    WHERE AssignmentId = p_AssignmentId;

    SELECT
        AssignmentId,
        Title,
        Subject,
        Faculty,
        Description,
        DueDate,
        Attachment,
        MaximumMarks
    FROM Assignments
    WHERE AssignmentId = p_AssignmentId;

END;
""",
            suppressTransaction: true);

            migrationBuilder.Sql(
"""
DROP PROCEDURE IF EXISTS sp_DeleteAssignment;
""",
suppressTransaction: true);

            migrationBuilder.Sql(
            """
CREATE PROCEDURE sp_DeleteAssignment
(
    IN p_AssignmentId INT
)
BEGIN

    DELETE
    FROM Assignments
    WHERE AssignmentId = p_AssignmentId;

    SELECT
        IF(ROW_COUNT() > 0, 1, 0) AS Deleted;

END;
""",
            suppressTransaction: true);
        }

        /// <inheritdoc />
 
            protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_DeleteAssignment;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_UpdateAssignment;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_GetAssignmentById;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_GetAllAssignments;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_CreateAssignment;
    """,
            suppressTransaction: true);
        }
    }

}
