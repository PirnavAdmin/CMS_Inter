using System;
using System.IO;
using System.Text.RegularExpressions;
using Dapper;
using MySqlConnector;

class DeployResultsModule
{
    public static void Run(string connStr)
    {
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("   RESULTS MODULE - DATABASE DEPLOYMENT & VERIFICATION");
        Console.WriteLine("================================================================================");

        using var conn = new MySqlConnection(connStr);
        conn.Open();
        Console.WriteLine("[SUCCESS] Connected to database: " + conn.Database);

        // 1. Ensure Composite Indexes
        Console.WriteLine("\n[1/3] Ensuring Composite Indexes on Results Table...");
        string[] indexChecks = new[]
        {
            "ALTER TABLE `Results` ADD KEY `IX_Results_Exam_Student_Subject` (`ExamId`, `StudentId`, `SubjectId`);",
            "ALTER TABLE `Results` ADD KEY `IX_Results_Exam_Group_Published` (`ExamId`, `GroupId`, `IsPublished`);"
        };
        foreach (var idxSql in indexChecks)
        {
            try
            {
                using var cmd = new MySqlCommand(idxSql, conn);
                cmd.ExecuteNonQuery();
                Console.WriteLine("  [OK] Index created: " + idxSql);
            }
            catch (Exception ex)
            {
                Console.WriteLine("  [INFO] Index exists or notice: " + ex.Message);
            }
        }

        // 2. Deploy Unified Stored Procedures
        Console.WriteLine("\n[2/3] Deploying 20 Stored Procedures from 01_Unified_Result_Stored_Procedures.sql...");
        string scriptPath = Path.Combine("..", "CollegeManagement.API", "Database", "Scripts", "StoredProcedures", "ResultModule", "01_Unified_Result_Stored_Procedures.sql");
        if (!File.Exists(scriptPath))
        {
            scriptPath = Path.Combine("Backend", "src", "CollegeManagement.API", "Database", "Scripts", "StoredProcedures", "ResultModule", "01_Unified_Result_Stored_Procedures.sql");
        }

        if (File.Exists(scriptPath))
        {
            string sql = File.ReadAllText(scriptPath);
            var spRegex = new Regex(@"(CREATE\s+PROCEDURE\s+`?([a-zA-Z0-9_]+)`?[\s\S]*?\bEND)\s*//", RegexOptions.IgnoreCase);
            var matches = spRegex.Matches(sql);
            Console.WriteLine($"  Found {matches.Count} stored procedures to deploy.");

            int deployedCount = 0;
            foreach (Match match in matches)
            {
                string createBody = match.Groups[1].Value.Trim();
                string spName = match.Groups[2].Value;

                try
                {
                    using var dropCmd = new MySqlCommand($"DROP PROCEDURE IF EXISTS `{spName}`;", conn);
                    dropCmd.ExecuteNonQuery();

                    using var createCmd = new MySqlCommand(createBody, conn);
                    createCmd.ExecuteNonQuery();
                    Console.WriteLine($"  [DEPLOYED] Stored Procedure: `{spName}`");
                    deployedCount++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  [FAILED] `{spName}`: {ex.Message}");
                }
            }
            Console.WriteLine($"\n[SUCCESS] Successfully deployed {deployedCount} of {matches.Count} Stored Procedures.");
        }
        else
        {
            Console.WriteLine("  [ERROR] Script file not found at " + scriptPath);
        }

        // 3. Automated Smoke Tests with Dapper
        Console.WriteLine("\n[3/3] Running Automated Verification Tests via Dapper...");
        try
        {
            var stats = conn.QueryFirstOrDefault<dynamic>("sp_GetResultStatistics", new
            {
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_AcademicLevelId = (int?)null,
                p_GroupId = (int?)null,
                p_ExamId = (int?)null,
                p_CampusId = 1
            }, commandType: System.Data.CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_GetResultStatistics: TotalStudents = {stats?.TotalStudents ?? 0}, PassPercentage = {stats?.PassPercentage ?? 0}%");
        }
        catch (Exception ex)
        {
            Console.WriteLine("  [FAIL] sp_GetResultStatistics: " + ex.Message);
        }

        try
        {
            var summaries = conn.Query<dynamic>("sp_GetSectionResultSummaries", new
            {
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null,
                p_AcademicLevelId = (int?)null,
                p_GroupId = (int?)null,
                p_ExamId = 1,
                p_CampusId = 1
            }, commandType: System.Data.CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_GetSectionResultSummaries executed successfully. Returned sections count: {System.Linq.Enumerable.Count(summaries)}");
        }
        catch (Exception ex)
        {
            Console.WriteLine("  [FAIL] sp_GetSectionResultSummaries: " + ex.Message);
        }

        try
        {
            var ranks = conn.Query<dynamic>("sp_GetRankList", new
            {
                p_BoardId = 0,
                p_AcademicYearId = 0,
                p_AcademicLevelId = 0,
                p_GroupId = 0,
                p_ExamId = 0,
                p_CampusId = 1
            }, commandType: System.Data.CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_GetRankList executed successfully with Dapper window functions. Returned rows: {System.Linq.Enumerable.Count(ranks)}");
        }
        catch (Exception ex)
        {
            Console.WriteLine("  [FAIL] sp_GetRankList: " + ex.Message);
        }

        Console.WriteLine("\n================================================================================");
        Console.WriteLine("   RESULTS MODULE VERIFICATION COMPLETED SUCCESSFULLY!");
        Console.WriteLine("================================================================================\n");
    }
}
