using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    public partial class AddAttendanceStoredProcedures : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop existing procedures if they exist
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_AttendanceExists;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_ChangeAttendanceStatus;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CreateAttendance;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CreateBulkAttendance;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAttendanceById;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAttendancePercentage;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAttendanceReport;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAttendanceSummary;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAttendances;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetStudentsForAttendance;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_UpdateAttendance;", suppressTransaction: true);

            // Recreate procedures
            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_AttendanceExists(
                    IN p_StudentId INT,
                    IN p_SubjectId INT,
                    IN p_AttendanceDate DATETIME
                )
                BEGIN
                    SELECT EXISTS (
                        SELECT 1 
                        FROM Attendances 
                        WHERE StudentId = p_StudentId 
                          AND SubjectId = p_SubjectId 
                          AND DATE(AttendanceDate) = DATE(p_AttendanceDate)
                          AND IsActive = 1
                    ) AS AttendanceExists;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_ChangeAttendanceStatus(
                    IN p_AttendanceId INT,
                    IN p_IsActive BOOLEAN
                )
                BEGIN
                    DECLARE EXIT HANDLER FOR SQLEXCEPTION
                    BEGIN
                        ROLLBACK;
                        RESIGNAL;
                    END;

                    START TRANSACTION;

                    UPDATE Attendances
                    SET IsActive = p_IsActive,
                        UpdatedAt = UTC_TIMESTAMP()
                    WHERE AttendanceId = p_AttendanceId;

                    COMMIT;

                    SELECT ROW_COUNT() AS AffectedRows;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_CreateAttendance(
                    IN p_AttendanceDate DATETIME,
                    IN p_StudentId INT,
                    IN p_FacultyId INT,
                    IN p_BoardId INT,
                    IN p_AcademicYearId INT,
                    IN p_AcademicLevelId INT,
                    IN p_GroupId INT,
                    IN p_SectionId INT,
                    IN p_SubjectId INT,
                    IN p_Status TINYINT,
                    IN p_Remarks VARCHAR(500)
                )
                BEGIN
                    DECLARE EXIT HANDLER FOR SQLEXCEPTION
                    BEGIN
                        ROLLBACK;
                        RESIGNAL;
                    END;

                    START TRANSACTION;

                    INSERT INTO Attendances (
                        AttendanceDate, 
                        StudentId, 
                        FacultyId, 
                        BoardId, 
                        AcademicYearId, 
                        AcademicLevelId, 
                        GroupId, 
                        SectionId, 
                        SubjectId, 
                        Status, 
                        Remarks,
                        IsActive,
                        CreatedAt
                    ) VALUES (
                        p_AttendanceDate, 
                        p_StudentId, 
                        p_FacultyId, 
                        p_BoardId, 
                        p_AcademicYearId, 
                        p_AcademicLevelId, 
                        p_GroupId, 
                        p_SectionId, 
                        p_SubjectId, 
                        p_Status, 
                        p_Remarks, 
                        1, 
                        UTC_TIMESTAMP()
                    );

                    COMMIT;

                    SELECT LAST_INSERT_ID() AS AttendanceId;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_CreateBulkAttendance(
                    IN p_AttendanceJson JSON
                )
                BEGIN
                    DECLARE EXIT HANDLER FOR SQLEXCEPTION
                    BEGIN
                        ROLLBACK;
                        RESIGNAL;
                    END;

                    START TRANSACTION;

                    INSERT INTO Attendances (
                        AttendanceDate, 
                        StudentId, 
                        FacultyId, 
                        BoardId, 
                        AcademicYearId, 
                        AcademicLevelId, 
                        GroupId, 
                        SectionId, 
                        SubjectId, 
                        Status, 
                        Remarks, 
                        IsActive, 
                        CreatedAt
                    )
                    SELECT 
                        jt.AttendanceDate, 
                        jt.StudentId, 
                        jt.FacultyId, 
                        jt.BoardId, 
                        jt.AcademicYearId, 
                        jt.AcademicLevelId, 
                        jt.GroupId, 
                        jt.SectionId, 
                        jt.SubjectId, 
                        jt.Status, 
                        jt.Remarks, 
                        IFNULL(jt.IsActive, 1), 
                        UTC_TIMESTAMP()
                    FROM JSON_TABLE(
                        p_AttendanceJson,
                        '$[*]' COLUMNS(
                            AttendanceDate DATETIME PATH '$.AttendanceDate',
                            StudentId INT PATH '$.StudentId',
                            FacultyId INT PATH '$.FacultyId',
                            BoardId INT PATH '$.BoardId',
                            AcademicYearId INT PATH '$.AcademicYearId',
                            AcademicLevelId INT PATH '$.AcademicLevelId',
                            GroupId INT PATH '$.GroupId',
                            SectionId INT PATH '$.SectionId',
                            SubjectId INT PATH '$.SubjectId',
                            Status TINYINT PATH '$.Status',
                            Remarks VARCHAR(500) PATH '$.Remarks',
                            IsActive BOOLEAN PATH '$.IsActive'
                        )
                    ) jt;

                    COMMIT;

                    SELECT ROW_COUNT() AS AffectedRows;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_GetAttendanceById(
                    IN p_AttendanceId INT
                )
                BEGIN
                    SELECT 
                        a.AttendanceId,
                        a.AttendanceDate,
                        a.StudentId,
                        COALESCE(s.StudentName, '') AS StudentName,
                        COALESCE(s.RollNumber, '') AS RollNumber,
                        a.FacultyId,
                        TRIM(CONCAT(COALESCE(f.FirstName, ''), ' ', COALESCE(f.LastName, ''))) AS FacultyName,
                        a.BoardId,
                        COALESCE(b.BoardName, '') AS BoardName,
                        a.AcademicYearId,
                        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
                        a.AcademicLevelId,
                        COALESCE(al.LevelName, '') AS AcademicLevelName,
                        a.GroupId,
                        COALESCE(g.GroupName, '') AS GroupName,
                        a.SectionId,
                        COALESCE(sec.SectionName, '') AS SectionName,
                        a.SubjectId,
                        COALESCE(sub.SubjectName, '') AS SubjectName,
                        a.Status,
                        a.Remarks,
                        a.CreatedAt,
                        a.UpdatedAt
                    FROM Attendances a
                    INNER JOIN Students s ON a.StudentId = s.StudentId
                    INNER JOIN Faculties f ON a.FacultyId = f.Id
                    INNER JOIN Boards b ON a.BoardId = b.BoardId
                    INNER JOIN AcademicYears ay ON a.AcademicYearId = ay.AcademicYearId
                    INNER JOIN AcademicLevels al ON a.AcademicLevelId = al.AcademicLevelId
                    INNER JOIN Groups g ON a.GroupId = g.GroupId
                    INNER JOIN Sections sec ON a.SectionId = sec.SectionId
                    INNER JOIN Subjects sub ON a.SubjectId = sub.SubjectId
                    WHERE a.AttendanceId = p_AttendanceId;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_GetAttendancePercentage(
                    IN p_BoardId INT,
                    IN p_AcademicYearId INT,
                    IN p_AcademicLevelId INT,
                    IN p_GroupId INT,
                    IN p_SectionId INT,
                    IN p_SubjectId INT,
                    IN p_FacultyId INT,
                    IN p_StudentId INT,
                    IN p_Status TINYINT,
                    IN p_FromDate DATETIME,
                    IN p_ToDate DATETIME,
                    IN p_PageNumber INT,
                    IN p_PageSize INT,
                    IN p_SearchText VARCHAR(100)
                )
                BEGIN
                    SELECT 
                        a.StudentId,
                        COALESCE(s.StudentName, '') AS StudentName,
                        COALESCE(s.RollNumber, '') AS RollNumber,
                        COUNT(a.AttendanceId) AS TotalClasses,
                        SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END) AS PresentClasses,
                        SUM(CASE WHEN a.Status = 2 THEN 1 ELSE 0 END) AS AbsentClasses,
                        SUM(CASE WHEN a.Status = 3 THEN 1 ELSE 0 END) AS LateClasses,
                        SUM(CASE WHEN a.Status = 4 THEN 1 ELSE 0 END) AS LeaveClasses,
                        ROUND(
                            IFNULL(
                                (SUM(CASE WHEN a.Status = 1 OR a.Status = 3 THEN 1 ELSE 0 END) / NULLIF(COUNT(a.AttendanceId), 0)) * 100, 
                                0.00
                            ), 
                            2
                        ) AS AttendancePercentage
                    FROM Attendances a
                    INNER JOIN Students s ON a.StudentId = s.StudentId
                    INNER JOIN Faculties f ON a.FacultyId = f.Id
                    INNER JOIN Subjects sub ON a.SubjectId = sub.SubjectId
                    WHERE a.IsActive = 1
                      AND (p_BoardId IS NULL OR p_BoardId = 0 OR a.BoardId = p_BoardId)
                      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR a.AcademicYearId = p_AcademicYearId)
                      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR a.AcademicLevelId = p_AcademicLevelId)
                      AND (p_GroupId IS NULL OR p_GroupId = 0 OR a.GroupId = p_GroupId)
                      AND (p_SectionId IS NULL OR p_SectionId = 0 OR a.SectionId = p_SectionId)
                      AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR a.SubjectId = p_SubjectId)
                      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR a.FacultyId = p_FacultyId)
                      AND (p_StudentId IS NULL OR p_StudentId = 0 OR a.StudentId = p_StudentId)
                      AND (p_Status IS NULL OR a.Status = p_Status)
                      AND (p_FromDate IS NULL OR DATE(a.AttendanceDate) >= DATE(p_FromDate))
                      AND (p_ToDate IS NULL OR DATE(a.AttendanceDate) <= DATE(p_ToDate))
                      AND (p_SearchText IS NULL OR p_SearchText = '' OR 
                           s.StudentName LIKE CONCAT('%', p_SearchText, '%') OR 
                           s.RollNumber LIKE CONCAT('%', p_SearchText, '%') OR 
                           CONCAT(f.FirstName,' ',f.LastName) LIKE CONCAT('%', p_SearchText, '%'))
                    GROUP BY a.StudentId, s.StudentName, s.RollNumber
                    ORDER BY s.RollNumber ASC, s.StudentName ASC;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_GetAttendanceReport(
                    IN p_BoardId INT,
                    IN p_AcademicYearId INT,
                    IN p_AcademicLevelId INT,
                    IN p_GroupId INT,
                    IN p_SectionId INT,
                    IN p_SubjectId INT,
                    IN p_FacultyId INT,
                    IN p_StudentId INT,
                    IN p_Status TINYINT,
                    IN p_FromDate DATETIME,
                    IN p_ToDate DATETIME,
                    IN p_PageNumber INT,
                    IN p_PageSize INT,
                    IN p_SearchText VARCHAR(100)
                )
                BEGIN
                    SELECT 
                        a.AttendanceDate,
                        COALESCE(b.BoardName, '') AS BoardName,
                        COALESCE(ay.AcademicYearName, '') AS AcademicYearName,
                        COALESCE(al.LevelName, '') AS AcademicLevelName,
                        COALESCE(g.GroupName, '') AS GroupName,
                        COALESCE(sec.SectionName, '') AS SectionName,
                        COALESCE(sub.SubjectName, '') AS SubjectName,
                        TRIM(CONCAT(COALESCE(f.FirstName, ''), ' ', COALESCE(f.LastName, ''))) AS FacultyName,
                        COALESCE(s.RollNumber, '') AS RollNumber,
                        COALESCE(s.StudentName, '') AS StudentName,
                        a.Status,
                        a.Remarks
                    FROM Attendances a
                    INNER JOIN Students s ON a.StudentId = s.StudentId
                    INNER JOIN Faculties f ON a.FacultyId = f.Id
                    INNER JOIN Boards b ON a.BoardId = b.BoardId
                    INNER JOIN AcademicYears ay ON a.AcademicYearId = ay.AcademicYearId
                    INNER JOIN AcademicLevels al ON a.AcademicLevelId = al.AcademicLevelId
                    INNER JOIN Groups g ON a.GroupId = g.GroupId
                    INNER JOIN Sections sec ON a.SectionId = sec.SectionId
                    INNER JOIN Subjects sub ON a.SubjectId = sub.SubjectId
                    WHERE a.IsActive = 1
                      AND (p_BoardId IS NULL OR p_BoardId = 0 OR a.BoardId = p_BoardId)
                      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR a.AcademicYearId = p_AcademicYearId)
                      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR a.AcademicLevelId = p_AcademicLevelId)
                      AND (p_GroupId IS NULL OR p_GroupId = 0 OR a.GroupId = p_GroupId)
                      AND (p_SectionId IS NULL OR p_SectionId = 0 OR a.SectionId = p_SectionId)
                      AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR a.SubjectId = p_SubjectId)
                      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR a.FacultyId = p_FacultyId)
                      AND (p_StudentId IS NULL OR p_StudentId = 0 OR a.StudentId = p_StudentId)
                      AND (p_Status IS NULL OR a.Status = p_Status)
                      AND (p_FromDate IS NULL OR DATE(a.AttendanceDate) >= DATE(p_FromDate))
                      AND (p_ToDate IS NULL OR DATE(a.AttendanceDate) <= DATE(p_ToDate))
                      AND (p_SearchText IS NULL OR p_SearchText = '' OR 
                           s.StudentName LIKE CONCAT('%', p_SearchText, '%') OR 
                           s.RollNumber LIKE CONCAT('%', p_SearchText, '%') OR 
                           CONCAT(f.FirstName,' ',f.LastName) LIKE CONCAT('%', p_SearchText, '%'))
                    ORDER BY a.AttendanceDate DESC, s.RollNumber ASC;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_GetAttendanceSummary(
                    IN p_BoardId INT,
                    IN p_AcademicYearId INT,
                    IN p_AcademicLevelId INT,
                    IN p_GroupId INT,
                    IN p_SectionId INT,
                    IN p_SubjectId INT,
                    IN p_FacultyId INT,
                    IN p_StudentId INT,
                    IN p_Status TINYINT,
                    IN p_FromDate DATETIME,
                    IN p_ToDate DATETIME,
                    IN p_PageNumber INT,
                    IN p_PageSize INT,
                    IN p_SearchText VARCHAR(100)
                )
                BEGIN
                    SELECT 
                        COUNT(a.AttendanceId) AS TotalStudents,
                        SUM(CASE WHEN a.Status = 1 THEN 1 ELSE 0 END) AS PresentCount,
                        SUM(CASE WHEN a.Status = 2 THEN 1 ELSE 0 END) AS AbsentCount,
                        SUM(CASE WHEN a.Status = 3 THEN 1 ELSE 0 END) AS LateCount,
                        SUM(CASE WHEN a.Status = 4 THEN 1 ELSE 0 END) AS LeaveCount,
                        ROUND(
                            IFNULL(
                                (SUM(CASE WHEN a.Status = 1 OR a.Status = 3 THEN 1 ELSE 0 END) / NULLIF(COUNT(a.AttendanceId), 0)) * 100, 
                                0.00
                            ), 
                            2
                        ) AS AttendancePercentage,
                        COALESCE(MAX(a.AttendanceDate), p_FromDate, UTC_TIMESTAMP()) AS AttendanceDate
                    FROM Attendances a
                    INNER JOIN Students s ON a.StudentId = s.StudentId
                    INNER JOIN Faculties f ON a.FacultyId = f.Id
                    INNER JOIN Subjects sub ON a.SubjectId = sub.SubjectId
                    WHERE a.IsActive = 1
                      AND (p_BoardId IS NULL OR p_BoardId = 0 OR a.BoardId = p_BoardId)
                      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR a.AcademicYearId = p_AcademicYearId)
                      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR a.AcademicLevelId = p_AcademicLevelId)
                      AND (p_GroupId IS NULL OR p_GroupId = 0 OR a.GroupId = p_GroupId)
                      AND (p_SectionId IS NULL OR p_SectionId = 0 OR a.SectionId = p_SectionId)
                      AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR a.SubjectId = p_SubjectId)
                      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR a.FacultyId = p_FacultyId)
                      AND (p_StudentId IS NULL OR p_StudentId = 0 OR a.StudentId = p_StudentId)
                      AND (p_Status IS NULL OR a.Status = p_Status)
                      AND (p_FromDate IS NULL OR DATE(a.AttendanceDate) >= DATE(p_FromDate))
                      AND (p_ToDate IS NULL OR DATE(a.AttendanceDate) <= DATE(p_ToDate))
                      AND (p_SearchText IS NULL OR p_SearchText = '' OR 
                           s.StudentName LIKE CONCAT('%', p_SearchText, '%') OR 
                           s.RollNumber LIKE CONCAT('%', p_SearchText, '%') OR 
                           CONCAT(f.FirstName,' ',f.LastName) LIKE CONCAT('%', p_SearchText, '%'));
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_GetAttendances(
                    IN p_BoardId INT,
                    IN p_AcademicYearId INT,
                    IN p_AcademicLevelId INT,
                    IN p_GroupId INT,
                    IN p_SectionId INT,
                    IN p_SubjectId INT,
                    IN p_FacultyId INT,
                    IN p_StudentId INT,
                    IN p_Status TINYINT,
                    IN p_FromDate DATETIME,
                    IN p_ToDate DATETIME,
                    IN p_PageNumber INT,
                    IN p_PageSize INT,
                    IN p_SearchText VARCHAR(100)
                )
                BEGIN
                    DECLARE v_Offset INT;
                    DECLARE v_Limit INT;

                    SET v_Limit = IFNULL(p_PageSize, 10);
                    IF v_Limit <= 0 THEN 
                        SET v_Limit = 10; 
                    END IF;

                    IF p_PageNumber IS NULL OR p_PageNumber <= 0 THEN
                        SET v_Offset = 0;
                    ELSE
                        SET v_Offset = (p_PageNumber - 1) * v_Limit;
                    END IF;

                    SELECT 
                        a.AttendanceId,
                        a.AttendanceDate,
                        a.StudentId,
                        COALESCE(s.RollNumber, '') AS RollNumber,
                        COALESCE(s.StudentName, '') AS StudentName,
                        TRIM(CONCAT(COALESCE(f.FirstName, ''), ' ', COALESCE(f.LastName, ''))) AS FacultyName,
                        COALESCE(sub.SubjectName, '') AS SubjectName,
                        a.Status
                    FROM Attendances a
                    INNER JOIN Students s ON a.StudentId = s.StudentId
                    INNER JOIN Faculties f ON a.FacultyId = f.Id
                    INNER JOIN Subjects sub ON a.SubjectId = sub.SubjectId
                    WHERE a.IsActive = 1
                      AND (p_BoardId IS NULL OR p_BoardId = 0 OR a.BoardId = p_BoardId)
                      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR a.AcademicYearId = p_AcademicYearId)
                      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR a.AcademicLevelId = p_AcademicLevelId)
                      AND (p_GroupId IS NULL OR p_GroupId = 0 OR a.GroupId = p_GroupId)
                      AND (p_SectionId IS NULL OR p_SectionId = 0 OR a.SectionId = p_SectionId)
                      AND (p_SubjectId IS NULL OR p_SubjectId = 0 OR a.SubjectId = p_SubjectId)
                      AND (p_FacultyId IS NULL OR p_FacultyId = 0 OR a.FacultyId = p_FacultyId)
                      AND (p_StudentId IS NULL OR p_StudentId = 0 OR a.StudentId = p_StudentId)
                      AND (p_Status IS NULL OR a.Status = p_Status)
                      AND (p_FromDate IS NULL OR DATE(a.AttendanceDate) >= DATE(p_FromDate))
                      AND (p_ToDate IS NULL OR DATE(a.AttendanceDate) <= DATE(p_ToDate))
                      AND (p_SearchText IS NULL OR p_SearchText = '' OR 
                           s.StudentName LIKE CONCAT('%', p_SearchText, '%') OR 
                           s.RollNumber LIKE CONCAT('%', p_SearchText, '%') OR 
                           CONCAT(f.FirstName,' ',f.LastName) LIKE CONCAT('%',p_SearchText,'%'))
                    ORDER BY a.AttendanceDate DESC, a.AttendanceId DESC
                    LIMIT v_Limit OFFSET v_Offset;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_GetStudentsForAttendance(
                    IN p_BoardId INT,
                    IN p_AcademicYearId INT,
                    IN p_AcademicLevelId INT,
                    IN p_GroupId INT,
                    IN p_SectionId INT,
                    IN p_SubjectId INT,
                    IN p_FacultyId INT,
                    IN p_StudentId INT,
                    IN p_Status TINYINT,
                    IN p_FromDate DATETIME,
                    IN p_ToDate DATETIME,
                    IN p_PageNumber INT,
                    IN p_PageSize INT,
                    IN p_SearchText VARCHAR(100)
                )
                BEGIN
                    SELECT 
                        s.StudentId,
                        COALESCE(s.AdmissionNumber, '') AS AdmissionNumber,
                        COALESCE(s.RollNumber, '') AS RollNumber,
                        COALESCE(s.StudentName, '') AS StudentName,
                        COALESCE(a.Status, 0) AS Status,
                        COALESCE(a.Remarks,'') AS Remarks,
                        (CASE WHEN a.AttendanceId IS NOT NULL THEN 1 ELSE 0 END) AS IsAttendanceMarked
                    FROM Students s
                    LEFT JOIN Attendances a ON s.StudentId = a.StudentId 
                                          AND a.SubjectId = p_SubjectId 
                                          AND DATE(a.AttendanceDate) = DATE(p_FromDate)
                                          AND a.IsActive = 1
                    WHERE s.IsActive = 1
                      AND (p_BoardId IS NULL OR p_BoardId = 0 OR s.BoardId = p_BoardId)
                      AND (p_AcademicYearId IS NULL OR p_AcademicYearId = 0 OR s.AcademicYearId = p_AcademicYearId)
                      AND (p_AcademicLevelId IS NULL OR p_AcademicLevelId = 0 OR s.AcademicLevelId = p_AcademicLevelId)
                      AND (p_GroupId IS NULL OR p_GroupId = 0 OR s.GroupId = p_GroupId)
                      AND (p_SectionId IS NULL OR p_SectionId = 0 OR s.SectionId = p_SectionId)
                      AND (p_StudentId IS NULL OR p_StudentId = 0 OR s.StudentId = p_StudentId)
                      AND (p_SearchText IS NULL OR p_SearchText = '' OR 
                           s.StudentName LIKE CONCAT('%', p_SearchText, '%') OR 
                           s.RollNumber LIKE CONCAT('%', p_SearchText, '%') OR
                           s.AdmissionNumber LIKE CONCAT('%', p_SearchText, '%'))
                    ORDER BY s.RollNumber ASC, s.StudentName ASC;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_UpdateAttendance(
                    IN p_AttendanceId INT,
                    IN p_AttendanceDate DATETIME,
                    IN p_StudentId INT,
                    IN p_FacultyId INT,
                    IN p_BoardId INT,
                    IN p_AcademicYearId INT,
                    IN p_AcademicLevelId INT,
                    IN p_GroupId INT,
                    IN p_SectionId INT,
                    IN p_SubjectId INT,
                    IN p_Status TINYINT,
                    IN p_Remarks VARCHAR(500)
                )
                BEGIN
                    DECLARE EXIT HANDLER FOR SQLEXCEPTION
                    BEGIN
                        ROLLBACK;
                        RESIGNAL;
                    END;

                    START TRANSACTION;

                    UPDATE Attendances
                    SET AttendanceDate = p_AttendanceDate,
                        StudentId = p_StudentId,
                        FacultyId = p_FacultyId,
                        BoardId = p_BoardId,
                        AcademicYearId = p_AcademicYearId,
                        AcademicLevelId = p_AcademicLevelId,
                        GroupId = p_GroupId,
                        SectionId = p_SectionId,
                        SubjectId = p_SubjectId,
                        Status = p_Status,
                        Remarks = p_Remarks,
                        UpdatedAt = UTC_TIMESTAMP()
                    WHERE AttendanceId = p_AttendanceId;

                    COMMIT;

                    SELECT ROW_COUNT() AS AffectedRows;
                END;
                """,
                suppressTransaction: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_UpdateAttendance;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetStudentsForAttendance;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAttendances;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAttendanceSummary;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAttendanceReport;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAttendancePercentage;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAttendanceById;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CreateBulkAttendance;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CreateAttendance;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_ChangeAttendanceStatus;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_AttendanceExists;", suppressTransaction: true);
        }
    }
}
