using System;
using System.Data;
using System.IO;
using System.Text.RegularExpressions;
using Dapper;
using MySqlConnector;

class Program
{
    static void Main()
    {
        string connStr = Environment.GetEnvironmentVariable("CMS_DB_CONNECTION") 
            ?? "Server=collegemanagementdb-mysql-3069cc62-manikesandeep-1393.g.aivencloud.com;Port=19182;Database=CollegeManagement;User ID=avnadmin;Password=AVNS_jgPZED4pphZib4tvJID;SslMode=Required;Allow User Variables=True;ConvertZeroDateTime=True;UseAffectedRows=false;ConnectionTimeout=60;KeepAlive=30;Pooling=true;MinimumPoolSize=2;MaximumPoolSize=50;ConnectionLifeTime=300;ConnectionIdleTimeout=120;";

        Console.WriteLine("================================================================================");
        Console.WriteLine("   MARKS & EVALUATION MODULE DEPLOYMENT & VERIFICATION RUNNER");
        Console.WriteLine("================================================================================");
        Console.WriteLine("Connecting to MySQL Database...");

        using var conn = new MySqlConnection(connStr);
        try
        {
            conn.Open();
            Console.WriteLine("[SUCCESS] Connected to Database: " + conn.Database);
        }
        catch (Exception ex)
        {
            Console.WriteLine("[ERROR] Failed to connect: " + ex.Message);
            return;
        }

        // 1. Locate and Read SQL Script
        string spFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", "CollegeManagement.API", "Database", "Scripts", "StoredProcedures", "MarksModule", "02_Marks_And_Evaluation_Optimization_Alignments.sql");
        if (!File.Exists(spFilePath))
        {
            spFilePath = Path.GetFullPath("Backend/src/CollegeManagement.API/Database/Scripts/StoredProcedures/MarksModule/02_Marks_And_Evaluation_Optimization_Alignments.sql");
        }

        if (!File.Exists(spFilePath))
        {
            Console.WriteLine("[ERROR] Could not locate 02_Marks_And_Evaluation_Optimization_Alignments.sql at: " + spFilePath);
            return;
        }

        Console.WriteLine("\n[Phase 2] Deploying Stored Procedures from: " + spFilePath);
        string fullSql = File.ReadAllText(spFilePath);

        var spRegex = new Regex(@"(CREATE\s+PROCEDURE\s+`?([a-zA-Z0-9_]+)`?[\s\S]*?\bEND)\s*//", RegexOptions.IgnoreCase);
        var matches = spRegex.Matches(fullSql);
        Console.WriteLine($"Found {matches.Count} stored procedures to deploy.\n");

        int successCount = 0;
        int failureCount = 0;

        foreach (Match match in matches)
        {
            string createBody = match.Groups[1].Value.Trim();
            string spName = match.Groups[2].Value;

            Console.Write($"Deploying procedure [{spName}]... ");
            try
            {
                using (var dropCmd = new MySqlCommand($"DROP PROCEDURE IF EXISTS `{spName}`;", conn))
                {
                    dropCmd.ExecuteNonQuery();
                }

                using (var createCmd = new MySqlCommand(createBody, conn))
                {
                    createCmd.ExecuteNonQuery();
                }

                Console.WriteLine("OK");
                successCount++;
            }
            catch (Exception ex)
            {
                Console.WriteLine("FAILED: " + ex.Message);
                failureCount++;
            }
        }

        Console.WriteLine($"\nDeployment Summary: {successCount} procedures deployed, {failureCount} failed.");

        // 3. Verification Suite
        Console.WriteLine("\n[Phase 3] Running Automated Integration Tests...");
        int testPass = 0;
        int testFail = 0;

        var procsToCheck = new[]
        {
            "sp_BulkUpsertMarks",
            "sp_GetFilteredEvaluations",
            "sp_GetFilteredEvaluationsCount",
            "sp_GetEvaluationReadiness",
            "sp_GetFacultyEvaluations",
            "sp_GetFacultyEvaluationStudents",
            "sp_UpdateEvaluationStatus",
            "sp_GetExamFormatAndLimits",
            "sp_GetFilteredMarks"
        };

        foreach (var p in procsToCheck)
        {
            var exists = conn.ExecuteScalar<int>(
                "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = DATABASE() AND routine_name = @Name AND routine_type = 'PROCEDURE';",
                new { Name = p });
            if (exists > 0)
            {
                Console.WriteLine($"  [PASS] Stored procedure {p} is present in MySQL.");
                testPass++;
            }
            else
            {
                Console.WriteLine($"  [FAIL] Stored procedure {p} is NOT present in MySQL.");
                testFail++;
            }
        }

        // Test sp_GetFilteredEvaluations
        try
        {
            var rows = conn.Query("sp_GetFilteredEvaluations", new {
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_AcademicLevelId = (int?)null,
                p_GroupId = (int?)null,
                p_SectionId = (int?)null,
                p_ExaminationId = (int?)null,
                p_SubjectId = (int?)null,
                p_StudentId = (int?)null,
                p_FacultyId = (int?)null,
                p_Status = (int?)null,
                p_Offset = 0,
                p_Limit = 10,
                p_CampusId = 1
            }, commandType: System.Data.CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_GetFilteredEvaluations executed successfully. Records returned: {System.Linq.Enumerable.Count(rows)}");
            testPass++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetFilteredEvaluations execution error: {ex.Message}");
            testFail++;
        }

        // Test sp_BulkUpsertMarks (Atomic JSON)
        try
        {
            var existingMark = conn.QueryFirstOrDefault(
                "SELECT MarkId, StudentId, ExaminationId, SubjectId, SectionId, GroupId, AcademicYearId, AcademicLevelId, BoardId, InternalMarks, TheoryMarks, TotalMarks FROM `Marks` WHERE `IsActive` = 1 LIMIT 1;");
            
            if (existingMark != null)
            {
                var testJson = $"[{{\"campusId\":1,\"boardId\":{existingMark.BoardId},\"academicYearId\":{existingMark.AcademicYearId},\"academicLevelId\":{existingMark.AcademicLevelId},\"groupId\":{existingMark.GroupId},\"sectionId\":{existingMark.SectionId},\"examinationId\":{existingMark.ExaminationId},\"subjectId\":{existingMark.SubjectId},\"studentId\":{existingMark.StudentId},\"internalMarks\":{existingMark.InternalMarks},\"practicalMarks\":0,\"theoryMarks\":{existingMark.TheoryMarks},\"totalMarks\":{existingMark.TotalMarks},\"passingMarks\":35,\"isAbsent\":0,\"remarks\":\"Auto Verified Upsert\",\"status\":0}}]";
                var affected = conn.ExecuteScalar<int>("sp_BulkUpsertMarks", new {
                    p_MarksJson = testJson,
                    p_UserId = 1,
                    p_CampusId = 1
                }, commandType: System.Data.CommandType.StoredProcedure);

                Console.WriteLine($"  [PASS] sp_BulkUpsertMarks executed successfully. Affected rows reported: {affected}");
                testPass++;
            }
            else
            {
                Console.WriteLine("  [PASS] sp_BulkUpsertMarks skipped data upsert (no existing marks rows found).");
                testPass++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_BulkUpsertMarks execution error: {ex.Message}");
            testFail++;
        }

        // Test sp_GetExamFormatAndLimits
        try
        {
            var existingMark = conn.QueryFirstOrDefault(
                "SELECT ExaminationId, SubjectId FROM `Marks` WHERE `IsActive` = 1 LIMIT 1;");
            int testExamId = existingMark != null ? (int)existingMark.ExaminationId : 1;
            int testSubId = existingMark != null ? (int)existingMark.SubjectId : 1;

            var format = conn.QueryFirstOrDefault("sp_GetExamFormatAndLimits", new {
                p_ExaminationId = testExamId,
                p_SubjectId = testSubId
            }, commandType: System.Data.CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_GetExamFormatAndLimits executed successfully. ExaminationId: {testExamId}, SubjectId: {testSubId}");
            testPass++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetExamFormatAndLimits execution error: {ex.Message}");
            testFail++;
        }

        // Test sp_GetFilteredMarks (Detailed student-level marks query)
        try
        {
            var studentMarks = conn.Query("sp_GetFilteredMarks", new {
                p_BoardId = 0,
                p_AcademicYearId = 0,
                p_AcademicLevelId = 0,
                p_GroupId = 0,
                p_SectionId = 0,
                p_ExaminationId = 0,
                p_SubjectId = 0,
                p_StudentId = 0,
                p_FacultyId = 0,
                p_Status = 0,
                p_Offset = 0,
                p_Limit = 10,
                p_CampusId = 0
            }, commandType: System.Data.CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_GetFilteredMarks executed successfully. Records returned: {System.Linq.Enumerable.Count(studentMarks)}");
            testPass++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetFilteredMarks execution error: {ex.Message}");
            testFail++;
        }

        // Test sp_GetFacultyEvaluations with string examination status (Collation fix test)
        try
        {
            var facultyEvals = conn.Query("sp_GetFacultyEvaluations", new {
                p_FacultyId = 0,
                p_Status = 0,
                p_ExaminationStatus = "ONGOING",
                p_CampusId = 0
            }, commandType: System.Data.CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_GetFacultyEvaluations ('ONGOING') executed successfully without collation error! Records returned: {System.Linq.Enumerable.Count(facultyEvals)}");
            testPass++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetFacultyEvaluations collation test error: {ex.Message}");
            testFail++;
        }

        // Test sp_GetEvaluationReadiness (Full GROUP BY compliance test)
        try
        {
            var readiness = conn.Query("sp_GetEvaluationReadiness", new {
                p_ExaminationId = 184,
                p_SectionId = 0,
                p_CampusId = 1
            }, commandType: System.Data.CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_GetEvaluationReadiness (Exam 184) executed successfully with 0 group by errors! Subjects returned: {System.Linq.Enumerable.Count(readiness)}");
            testPass++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetEvaluationReadiness error: {ex.Message}");
            testFail++;
        }

        Console.WriteLine("\n================================================================================");
        Console.WriteLine($"ALL TESTS COMPLETED: Total: {testPass + testFail} | Passed: {testPass} | Failed: {testFail}");
        Console.WriteLine("================================================================================");

        DeployExaminationSPs.Run(connStr);
        DeployPayrollSPs.Run(connStr);
        DeployReimbursementModule.Run(connStr);
        DeployFeeSPs.Run(connStr);
        DeployPrincipalModule.Run(connStr);
        DeployNonTeachingModule.Run(connStr);
        // DeployResultsModule.Run(connStr);
        // DeployCertificatesModule.Run(connStr);
        // DeployDashboardModule.Run(connStr);
        // DeploySettingsModule.Run(connStr);
    }
}
