using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSubjectStoredProcedures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"

DROP PROCEDURE IF EXISTS sp_CreateSubject;

CREATE PROCEDURE sp_CreateSubject(

    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,

    IN p_SubjectName VARCHAR(100),
    IN p_SubjectCode VARCHAR(50),
    IN p_SubjectType VARCHAR(30),

    IN p_TheoryMarks DECIMAL(10,2),
    IN p_PracticalMarks DECIMAL(10,2),
    IN p_InternalMarks DECIMAL(10,2),
    IN p_ExternalMarks DECIMAL(10,2),
    IN p_MaximumMarks DECIMAL(10,2),
    IN p_PassingMarks DECIMAL(10,2),

    IN p_Credits INT,
    IN p_Description VARCHAR(500),

    IN p_IsActive BOOLEAN

)

BEGIN

    INSERT INTO Subjects
    (
        BoardId,
        AcademicYearId,
        AcademicLevel,
        GroupId,

        SubjectName,
        SubjectCode,
        SubjectType,

        TheoryMarks,
        PracticalMarks,
        InternalMarks,
        ExternalMarks,
        MaximumMarks,
        PassingMarks,

        Credits,
        Description,

        IsActive,
        CreatedAt
    )

    VALUES
    (
        p_BoardId,
        p_AcademicYearId,
        p_AcademicLevel,
        p_GroupId,

        p_SubjectName,
        p_SubjectCode,
        p_SubjectType,

        p_TheoryMarks,
        p_PracticalMarks,
        p_InternalMarks,
        p_ExternalMarks,
        p_MaximumMarks,
        p_PassingMarks,

        p_Credits,
        p_Description,

        p_IsActive,
        NOW()
    );

    SELECT

        s.SubjectId,

        s.BoardId,
        b.BoardName,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.SubjectName,
        s.SubjectCode,
        s.SubjectType,

        s.TheoryMarks,
        s.PracticalMarks,
        s.InternalMarks,
        s.ExternalMarks,
        s.MaximumMarks,
        s.PassingMarks,

        s.Credits,
        s.Description,

        s.IsActive,

        s.CreatedAt,
        s.UpdatedAt

    FROM Subjects s

    INNER JOIN Boards b
        ON s.BoardId = b.BoardId

    INNER JOIN AcademicYears ay
        ON s.AcademicYearId = ay.AcademicYearId

    INNER JOIN Groups g
        ON s.GroupId = g.GroupId

    WHERE s.SubjectId = LAST_INSERT_ID();

END;

");
            migrationBuilder.Sql(@"

DROP PROCEDURE IF EXISTS sp_UpdateSubject;

CREATE PROCEDURE sp_UpdateSubject(

    IN p_SubjectId INT,

    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,

    IN p_SubjectName VARCHAR(100),
    IN p_SubjectCode VARCHAR(50),
    IN p_SubjectType VARCHAR(30),

    IN p_TheoryMarks DECIMAL(10,2),
    IN p_PracticalMarks DECIMAL(10,2),
    IN p_InternalMarks DECIMAL(10,2),
    IN p_ExternalMarks DECIMAL(10,2),
    IN p_MaximumMarks DECIMAL(10,2),
    IN p_PassingMarks DECIMAL(10,2),

    IN p_Credits INT,
    IN p_Description VARCHAR(500),

    IN p_IsActive BOOLEAN

)

BEGIN

    UPDATE Subjects

    SET

        BoardId = p_BoardId,
        AcademicYearId = p_AcademicYearId,
        AcademicLevel = p_AcademicLevel,
        GroupId = p_GroupId,

        SubjectName = p_SubjectName,
        SubjectCode = p_SubjectCode,
        SubjectType = p_SubjectType,

        TheoryMarks = p_TheoryMarks,
        PracticalMarks = p_PracticalMarks,
        InternalMarks = p_InternalMarks,
        ExternalMarks = p_ExternalMarks,
        MaximumMarks = p_MaximumMarks,
        PassingMarks = p_PassingMarks,

        Credits = p_Credits,
        Description = p_Description,

        IsActive = p_IsActive,

        UpdatedAt = NOW()

    WHERE SubjectId = p_SubjectId;

    SELECT

        s.SubjectId,

        s.BoardId,
        b.BoardName,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.SubjectName,
        s.SubjectCode,
        s.SubjectType,

        s.TheoryMarks,
        s.PracticalMarks,
        s.InternalMarks,
        s.ExternalMarks,
        s.MaximumMarks,
        s.PassingMarks,

        s.Credits,
        s.Description,

        s.IsActive,

        s.CreatedAt,
        s.UpdatedAt

    FROM Subjects s

    INNER JOIN Boards b
        ON s.BoardId = b.BoardId

    INNER JOIN AcademicYears ay
        ON s.AcademicYearId = ay.AcademicYearId

    INNER JOIN Groups g
        ON s.GroupId = g.GroupId

    WHERE s.SubjectId = p_SubjectId;

END;

");
            migrationBuilder.Sql(@"

DROP PROCEDURE IF EXISTS sp_DeleteSubject;

CREATE PROCEDURE sp_DeleteSubject(

    IN p_SubjectId INT

)

BEGIN

    IF EXISTS
    (
        SELECT 1
        FROM Subjects
        WHERE SubjectId = p_SubjectId
    )
    THEN

        DELETE FROM Subjects
        WHERE SubjectId = p_SubjectId;

        SELECT
            1 AS Success,
            'Subject deleted successfully.' AS Message;

    ELSE

        SELECT
            0 AS Success,
            'Subject not found.' AS Message;

    END IF;

END;

");
            migrationBuilder.Sql(@"

DROP PROCEDURE IF EXISTS sp_GetAllSubjects;

CREATE PROCEDURE sp_GetAllSubjects()

BEGIN

    SELECT

        s.SubjectId,

        s.BoardId,
        b.BoardName,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.SubjectName,
        s.SubjectCode,
        s.SubjectType,

        s.TheoryMarks,
        s.PracticalMarks,
        s.InternalMarks,
        s.ExternalMarks,
        s.MaximumMarks,
        s.PassingMarks,

        s.Credits,
        s.Description,

        s.IsActive,

        s.CreatedAt,
        s.UpdatedAt

    FROM Subjects s

    INNER JOIN Boards b
        ON s.BoardId = b.BoardId

    INNER JOIN AcademicYears ay
        ON s.AcademicYearId = ay.AcademicYearId

    INNER JOIN Groups g
        ON s.GroupId = g.GroupId

    ORDER BY
        b.BoardName,
        ay.AcademicYearName,
        g.GroupName,
        s.SubjectName;

END;

");
            migrationBuilder.Sql(@"

DROP PROCEDURE IF EXISTS sp_GetSubjectById;

CREATE PROCEDURE sp_GetSubjectById(

    IN p_SubjectId INT

)

BEGIN

    SELECT

        s.SubjectId,

        s.BoardId,
        b.BoardName,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.SubjectName,
        s.SubjectCode,
        s.SubjectType,

        s.TheoryMarks,
        s.PracticalMarks,
        s.InternalMarks,
        s.ExternalMarks,
        s.MaximumMarks,
        s.PassingMarks,

        s.Credits,
        s.Description,

        s.IsActive,

        s.CreatedAt,
        s.UpdatedAt

    FROM Subjects s

    INNER JOIN Boards b
        ON s.BoardId = b.BoardId

    INNER JOIN AcademicYears ay
        ON s.AcademicYearId = ay.AcademicYearId

    INNER JOIN Groups g
        ON s.GroupId = g.GroupId

    WHERE s.SubjectId = p_SubjectId

    LIMIT 1;

END;

");
            migrationBuilder.Sql(@"

DROP PROCEDURE IF EXISTS sp_GetSubjectsByGroup;

CREATE PROCEDURE sp_GetSubjectsByGroup(

    IN p_GroupId INT

)

BEGIN

    SELECT

        s.SubjectId,

        s.BoardId,
        b.BoardName,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.SubjectName,
        s.SubjectCode,
        s.SubjectType,

        s.TheoryMarks,
        s.PracticalMarks,
        s.InternalMarks,
        s.ExternalMarks,
        s.MaximumMarks,
        s.PassingMarks,

        s.Credits,
        s.Description,

        s.IsActive,

        s.CreatedAt,
        s.UpdatedAt

    FROM Subjects s

    INNER JOIN Boards b
        ON s.BoardId = b.BoardId

    INNER JOIN AcademicYears ay
        ON s.AcademicYearId = ay.AcademicYearId

    INNER JOIN Groups g
        ON s.GroupId = g.GroupId

    WHERE s.GroupId = p_GroupId
      AND s.IsActive = TRUE

    ORDER BY s.SubjectName;

END;

");
            migrationBuilder.Sql(@"

DROP PROCEDURE IF EXISTS sp_ChangeSubjectStatus;

CREATE PROCEDURE sp_ChangeSubjectStatus(

    IN p_SubjectId INT,
    IN p_IsActive BOOLEAN

)

BEGIN

    UPDATE Subjects

    SET

        IsActive = p_IsActive,
        UpdatedAt = NOW()

    WHERE SubjectId = p_SubjectId;

    SELECT

        s.SubjectId,

        s.BoardId,
        b.BoardName,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.SubjectName,
        s.SubjectCode,
        s.SubjectType,

        s.TheoryMarks,
        s.PracticalMarks,
        s.InternalMarks,
        s.ExternalMarks,
        s.MaximumMarks,
        s.PassingMarks,

        s.Credits,
        s.Description,

        s.IsActive,

        s.CreatedAt,
        s.UpdatedAt

    FROM Subjects s

    INNER JOIN Boards b
        ON s.BoardId = b.BoardId

    INNER JOIN AcademicYears ay
        ON s.AcademicYearId = ay.AcademicYearId

    INNER JOIN Groups g
        ON s.GroupId = g.GroupId

    WHERE s.SubjectId = p_SubjectId

    LIMIT 1;

END;

");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"

DROP PROCEDURE IF EXISTS sp_CreateSubject;

DROP PROCEDURE IF EXISTS sp_UpdateSubject;

DROP PROCEDURE IF EXISTS sp_DeleteSubject;

DROP PROCEDURE IF EXISTS sp_GetAllSubjects;

DROP PROCEDURE IF EXISTS sp_GetSubjectById;

DROP PROCEDURE IF EXISTS sp_GetSubjectsByGroup;

DROP PROCEDURE IF EXISTS sp_ChangeSubjectStatus;

");
        }
    }
}
