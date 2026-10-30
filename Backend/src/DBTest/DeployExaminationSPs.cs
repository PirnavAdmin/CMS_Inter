using System;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Dapper;
using MySqlConnector;

public static class DeployExaminationSPs
{
    public static void Run(string connStr)
    {
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("   EXAMINATION MODULE - SP DEPLOYMENT & VERIFICATION");
        Console.WriteLine("================================================================================");

        using var conn = new MySqlConnection(connStr);
        try
        {
            conn.Open();
            Console.WriteLine("[SUCCESS] Connected to database: " + conn.Database);
        }
        catch (Exception ex)
        {
            Console.WriteLine("[ERROR] Failed to connect: " + ex.Message);
            return;
        }

        // 1. Inspect Sections & Subjects schema
        Console.WriteLine("\n[1/5] Inspecting Sections & Subjects schema...");
        try
        {
            var secCols = conn.Query<(string TableName, string ColumnName, string DataType)>(@"
                SELECT table_name, column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = DATABASE() AND table_name IN ('Sections', 'Subjects', 'ExamSchedules', 'InvigilatorAssignments', 'HallTickets')
                ORDER BY table_name, ordinal_position;");
            foreach (var c in secCols)
            {
                Console.WriteLine($"  {c.TableName}.{c.ColumnName} ({c.DataType})");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("  [ERROR] Schema inspection failed: " + ex.Message);
        }

        // 2. Deploy updated sp_GetAvailableInvigilators
        Console.WriteLine("\n[2/5] Deploying sp_GetAvailableInvigilators, sp_CheckInvigilatorTeachingSubject, and sp_GenerateHallTickets...");
        string spInvigilators = @"
DROP PROCEDURE IF EXISTS `sp_GetAvailableInvigilators`;
CREATE PROCEDURE `sp_GetAvailableInvigilators`(
    IN p_ExamDate DATE,
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_ExcludeScheduleId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        s.Id,
        s.EmployeeId,
        s.FirstName,
        s.LastName,
        s.Email,
        COALESCE(s.Mobile, '') AS Phone,
        s.DesignationId,
        COALESCE(d.Name, s.Designation, '') AS DesignationName,
        s.DepartmentId,
        COALESCE(dept.DepartmentName, '') AS DepartmentName
    FROM Staffs s
    LEFT JOIN Designations d ON s.DesignationId = d.Id
    LEFT JOIN Departments dept ON s.DepartmentId = dept.DepartmentId
    WHERE (s.Status = 'Active' OR s.Status IS NULL) AND (s.IsDeleted = 0 OR s.IsDeleted IS NULL)
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR s.CampusId = p_CampusId)
      AND s.Id NOT IN (
          -- Direct assignments in ExamSchedules
          SELECT es.InvigilatorId
          FROM ExamSchedules es
          INNER JOIN Examinations e ON es.ExamId = e.ExamId
          WHERE es.IsActive = 1
            AND e.IsActive = 1
            AND e.Status NOT IN ('CANCELLED', 'DELETED')
            AND DATE(es.ExamDate) = p_ExamDate
            AND (p_ExcludeScheduleId IS NULL OR p_ExcludeScheduleId = 0 OR es.ScheduleId != p_ExcludeScheduleId)
            AND NOT (p_EndTime <= es.StartTime OR p_StartTime >= es.EndTime)
            AND es.InvigilatorId IS NOT NULL

          UNION

          -- Assignments in InvigilatorAssignments table
          SELECT ia.InvigilatorId
          FROM InvigilatorAssignments ia
          INNER JOIN ExamSchedules es ON ia.ExamScheduleId = es.ScheduleId
          INNER JOIN Examinations e ON es.ExamId = e.ExamId
          WHERE es.IsActive = 1
            AND e.IsActive = 1
            AND e.Status NOT IN ('CANCELLED', 'DELETED')
            AND DATE(es.ExamDate) = p_ExamDate
            AND (p_ExcludeScheduleId IS NULL OR p_ExcludeScheduleId = 0 OR es.ScheduleId != p_ExcludeScheduleId)
            AND NOT (p_EndTime <= es.StartTime OR p_StartTime >= es.EndTime)
      )
    ORDER BY s.FirstName ASC, s.LastName ASC;
END;
";

        string spCheckTeaching = @"
DROP PROCEDURE IF EXISTS `sp_CheckInvigilatorTeachingSubject`;
CREATE PROCEDURE `sp_CheckInvigilatorTeachingSubject`(
    IN p_StaffId INT,
    IN p_SubjectId INT)
BEGIN
    SELECT COUNT(*) 
    FROM FacultySubjectAllocations 
    WHERE StaffId = p_StaffId AND SubjectId = p_SubjectId;
END;
";

        string spGenHallTickets = @"
DROP PROCEDURE IF EXISTS `sp_GenerateHallTickets`;
CREATE PROCEDURE `sp_GenerateHallTickets`(
    IN p_ExaminationId INT,
    IN p_BatchId INT,
    IN p_CampusId INT)
BEGIN
    INSERT INTO HallTickets (ExamId, StudentId, BatchId, IssueDate, Status)
    SELECT 
        e.ExamId,
        s.StudentId,
        COALESCE(NULLIF(p_BatchId, 0), s.SectionId, 0),
        UTC_TIMESTAMP(),
        'ISSUED'
    FROM Students s
    CROSS JOIN Examinations e
    WHERE e.ExamId = p_ExaminationId
      AND s.IsActive = 1
      AND (e.GroupId = 0 OR s.GroupId = e.GroupId)
      AND (e.BoardId = 0 OR s.BoardId = e.BoardId)
      AND (e.AcademicYearId = 0 OR s.AcademicYearId = e.AcademicYearId)
      AND (e.AcademicLevelId = 0 OR s.AcademicLevelId = e.AcademicLevelId)
      AND (e.ProgramId IS NULL OR e.ProgramId = 0 OR s.ProgramId = e.ProgramId)
      AND (p_BatchId IS NULL OR p_BatchId = 0 OR s.SectionId = p_BatchId)
      AND s.StudentId NOT IN (
          SELECT ht.StudentId 
          FROM HallTickets ht 
          WHERE ht.ExamId = p_ExaminationId
      );

    SELECT 
        ht.HallTicketId,
        ht.ExamId AS ExaminationId,
        ht.StudentId,
        ht.BatchId,
        ht.IssueDate AS GeneratedAt,
        COALESCE(s.StudentName, '') AS StudentName,
        COALESCE(s.RollNo, s.AdmissionNo, CAST(s.StudentId AS CHAR)) AS RollNumber
    FROM HallTickets ht
    INNER JOIN Students s ON ht.StudentId = s.StudentId
    WHERE ht.ExamId = p_ExaminationId
      AND (p_BatchId IS NULL OR p_BatchId = 0 OR ht.BatchId = p_BatchId)
    ORDER BY s.StudentName ASC;
END;
";

        try
        {
            conn.Execute("DROP PROCEDURE IF EXISTS `sp_GetAvailableInvigilators`;");
            conn.Execute(spInvigilators.Substring(spInvigilators.IndexOf("CREATE PROCEDURE")));
            Console.WriteLine("  [DEPLOYED] Stored Procedure: `sp_GetAvailableInvigilators`");

            conn.Execute("DROP PROCEDURE IF EXISTS `sp_CheckInvigilatorTeachingSubject`;");
            conn.Execute(spCheckTeaching.Substring(spCheckTeaching.IndexOf("CREATE PROCEDURE")));
            Console.WriteLine("  [DEPLOYED] Stored Procedure: `sp_CheckInvigilatorTeachingSubject`");

            conn.Execute("DROP PROCEDURE IF EXISTS `sp_GenerateHallTickets`;");
            conn.Execute(spGenHallTickets.Substring(spGenHallTickets.IndexOf("CREATE PROCEDURE")));
            Console.WriteLine("  [DEPLOYED] Stored Procedure: `sp_GenerateHallTickets`");
        }
        catch (Exception ex)
        {
            Console.WriteLine("  [ERROR] Failed to deploy SPs: " + ex.Message);
        }

        // 3. Test sp_GetAvailableInvigilators
        Console.WriteLine("\n[3/5] Testing sp_GetAvailableInvigilators Execution...");
        try
        {
            var invigilators = conn.Query<dynamic>("sp_GetAvailableInvigilators", new
            {
                p_ExamDate = DateTime.Today,
                p_StartTime = TimeSpan.FromHours(9),
                p_EndTime = TimeSpan.FromHours(12),
                p_ExcludeScheduleId = 0,
                p_CampusId = 0
            }, commandType: CommandType.StoredProcedure).ToList();

            Console.WriteLine($"  [PASS] sp_GetAvailableInvigilators returned {invigilators.Count} available staff.");
            if (invigilators.Any())
            {
                var first = invigilators.First();
                Console.WriteLine($"  Sample Invigilator: Id={first.Id}, Name={first.FirstName} {first.LastName}, Phone={first.Phone}, Dept={first.DepartmentName}, Desig={first.DesignationName}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("  [FAIL] sp_GetAvailableInvigilators error: " + ex.Message);
        }

        // 4. Test sp_CheckInvigilatorTeachingSubject
        Console.WriteLine("\n[4/5] Testing sp_CheckInvigilatorTeachingSubject Execution...");
        try
        {
            var teachingCount = conn.ExecuteScalar<int>("sp_CheckInvigilatorTeachingSubject", new
            {
                p_StaffId = 1,
                p_SubjectId = 1
            }, commandType: CommandType.StoredProcedure);
            Console.WriteLine($"  [PASS] sp_CheckInvigilatorTeachingSubject executed successfully. Count: {teachingCount}");
        }
        catch (Exception ex)
        {
            Console.WriteLine("  [FAIL] sp_CheckInvigilatorTeachingSubject error: " + ex.Message);
        }

        // 5. Test AutoSchedule context for Exam 184
        Console.WriteLine("\n[5/5] Testing Exam 184 auto-schedule pre-requisites...");
        try
        {
            var exam = conn.QueryFirstOrDefault<dynamic>("SELECT ExamId, ExamName, ExamCode, CampusId, GroupId, AcademicYearId, AcademicLevelId, TotalMarks, PassPercentage, Status FROM Examinations WHERE ExamId = 184;");
            if (exam != null)
            {
                Console.WriteLine($"  Exam 184: Name='{exam.ExamName}', Code='{exam.ExamCode}', CampusId={exam.CampusId}, GroupId={exam.GroupId}, Status='{exam.Status}'");
            }

            var secContext = conn.Query<dynamic>("sp_GetSchedulingContext", new { p_ExaminationId = 184 }, commandType: CommandType.StoredProcedure).ToList();
            Console.WriteLine($"  sp_GetSchedulingContext for Exam 184 returned {secContext.Count} sections.");
            foreach (var s in secContext)
            {
                Console.WriteLine($"    Section: {s.SectionName} (Id={s.SectionId}), EligibleCount={s.EligibleStudentCount}");
            }

            var subjs = conn.Query<dynamic>("sp_GetEligibleSubjectsForExam", new { p_ExaminationId = 184, p_CampusId = 1 }, commandType: CommandType.StoredProcedure).ToList();
            Console.WriteLine($"  sp_GetEligibleSubjectsForExam for Exam 184 returned {subjs.Count} subjects.");
            foreach (var sj in subjs)
            {
                Console.WriteLine($"    Subject: {sj.SubjectName} ({sj.SubjectCode}, Id={sj.SubjectId})");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("  [FAIL] Examination 184 test error: " + ex.Message);
        }
    }
}
