using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddGroupStoredProcedures : Migration
    {
        /// <inheritdoc />

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_GetAllGroups;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
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
""",
            suppressTransaction: true);
            migrationBuilder.Sql(
"""
DROP PROCEDURE IF EXISTS sp_GetGroupById;
""",
suppressTransaction: true);

            migrationBuilder.Sql(
            """
CREATE PROCEDURE sp_GetGroupById(
    IN p_GroupId INT
)
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
    WHERE g.GroupId = p_GroupId
    LIMIT 1;
END;
""",
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
DROP PROCEDURE IF EXISTS sp_GetGroupsByBoard;
""",
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
CREATE PROCEDURE sp_GetGroupsByBoard(
    IN p_Board VARCHAR(100)
)
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
    WHERE g.Board = p_Board
    ORDER BY g.GroupName ASC;
END;
""",
            suppressTransaction: true);
            migrationBuilder.Sql(
"""
DROP PROCEDURE IF EXISTS sp_CreateGroup;
""",
suppressTransaction: true);

            migrationBuilder.Sql(
            """
CREATE PROCEDURE sp_CreateGroup(
    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupName VARCHAR(100),
    IN p_GroupCode VARCHAR(30),
    IN p_Description VARCHAR(500),
    IN p_IsActive BOOLEAN
)
BEGIN
    DECLARE v_GroupId INT;

    IF p_Board IS NULL OR TRIM(p_Board) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Board is required';
    END IF;

    IF p_AcademicYearId IS NULL OR p_AcademicYearId <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Valid AcademicYearId is required';
    END IF;

    IF p_AcademicLevel IS NULL OR TRIM(p_AcademicLevel) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Academic level is required';
    END IF;

    IF p_GroupName IS NULL OR TRIM(p_GroupName) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Group name is required';
    END IF;

    IF p_GroupCode IS NULL OR TRIM(p_GroupCode) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Group code is required';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM `Groups`
        WHERE GroupCode = TRIM(p_GroupCode)
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Group code already exists';
    END IF;

    INSERT INTO `Groups`
    (
        Board,
        AcademicYearId,
        AcademicLevel,
        GroupName,
        GroupCode,
        Description,
        IsActive,
        CreatedAt,
        UpdatedAt
    )
    VALUES
    (
        TRIM(p_Board),
        p_AcademicYearId,
        TRIM(p_AcademicLevel),
        TRIM(p_GroupName),
        TRIM(p_GroupCode),
        NULLIF(TRIM(p_Description), ''),
        IFNULL(p_IsActive, 1),
        UTC_TIMESTAMP(),
        NULL
    );

    SET v_GroupId = LAST_INSERT_ID();

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
    WHERE g.GroupId = v_GroupId;
END;
""",
            suppressTransaction: true);
            migrationBuilder.Sql(
"""
DROP PROCEDURE IF EXISTS sp_UpdateGroup;
""",
suppressTransaction: true);

            migrationBuilder.Sql(
            """
CREATE PROCEDURE sp_UpdateGroup(
    IN p_GroupId INT,
    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupName VARCHAR(100),
    IN p_GroupCode VARCHAR(30),
    IN p_Description VARCHAR(500),
    IN p_IsActive BOOLEAN
)
BEGIN
    IF NOT EXISTS
    (
        SELECT 1
        FROM `Groups`
        WHERE GroupId = p_GroupId
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Group not found';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM `Groups`
        WHERE GroupCode = TRIM(p_GroupCode)
          AND GroupId <> p_GroupId
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Group code already exists';
    END IF;

    UPDATE `Groups`
    SET
        Board = TRIM(p_Board),
        AcademicYearId = p_AcademicYearId,
        AcademicLevel = TRIM(p_AcademicLevel),
        GroupName = TRIM(p_GroupName),
        GroupCode = TRIM(p_GroupCode),
        Description = NULLIF(TRIM(p_Description), ''),
        IsActive = p_IsActive,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE GroupId = p_GroupId;

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
    WHERE g.GroupId = p_GroupId;
END;
""",
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
DROP PROCEDURE IF EXISTS sp_DeleteGroup;
""",
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
CREATE PROCEDURE sp_DeleteGroup(
    IN p_GroupId INT
)
BEGIN
    DELETE FROM `Groups`
    WHERE GroupId = p_GroupId;

    SELECT
        IF(ROW_COUNT() > 0, 1, 0) AS Deleted;
END;
""",
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
DROP PROCEDURE IF EXISTS sp_ValidateGroupCode;
""",
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
CREATE PROCEDURE sp_ValidateGroupCode(
    IN p_GroupCode VARCHAR(30),
    IN p_ExcludeGroupId INT
)
BEGIN
    SELECT
        EXISTS
        (
            SELECT 1
            FROM `Groups`
            WHERE GroupCode = TRIM(p_GroupCode)
              AND
              (
                  p_ExcludeGroupId IS NULL
                  OR GroupId <> p_ExcludeGroupId
              )
        ) AS `Exists`;
END;
""",
            suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_ValidateGroupCode;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_DeleteGroup;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_UpdateGroup;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_CreateGroup;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_GetGroupsByBoard;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_GetGroupById;
    """,
            suppressTransaction: true);

            migrationBuilder.Sql(
            """
    DROP PROCEDURE IF EXISTS sp_GetAllGroups;
    """,
            suppressTransaction: true);
        }
    }
}