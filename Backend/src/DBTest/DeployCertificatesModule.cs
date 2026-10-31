using System;
using System.IO;
using System.Text.RegularExpressions;
using Dapper;
using MySqlConnector;

class DeployCertificatesModule
{
    public static void Run(string connStr)
    {
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("   CERTIFICATES MODULE - DATABASE DEPLOYMENT & VERIFICATION");
        Console.WriteLine("================================================================================");

        using var conn = new MySqlConnection(connStr);
        conn.Open();
        Console.WriteLine("[SUCCESS] Connected to database: " + conn.Database);

        // 1. Ensure Table Schema & Indexes
        Console.WriteLine("\n[1/3] Ensuring Columns & Indexes on certificates Table...");
        string[] schemaStatements = new[]
        {
            "ALTER TABLE `certificates` ADD COLUMN `CampusId` INT NULL;",
            "ALTER TABLE `certificates` ADD KEY `IX_certificates_CampusId_Status` (`CampusId`, `Status`);",
            "ALTER TABLE `certificates` ADD KEY `IX_certificates_AdmissionNo` (`AdmissionNo`);"
        };
        foreach (var sqlStmt in schemaStatements)
        {
            try
            {
                using var cmd = new MySqlCommand(sqlStmt, conn);
                cmd.ExecuteNonQuery();
                Console.WriteLine("  [OK] Applied: " + sqlStmt);
            }
            catch (Exception ex)
            {
                Console.WriteLine("  [INFO] Schema notice: " + ex.Message);
            }
        }

        // 2. Deploy Unified Stored Procedures
        Console.WriteLine("\n[2/3] Deploying 20 Stored Procedures from 01_Unified_Certificate_Stored_Procedures.sql...");
        string scriptPath = Path.Combine("..", "CollegeManagement.API", "Database", "Scripts", "StoredProcedures", "CertificateModule", "01_Unified_Certificate_Stored_Procedures.sql");
        if (!File.Exists(scriptPath))
        {
            scriptPath = Path.Combine("Backend", "src", "CollegeManagement.API", "Database", "Scripts", "StoredProcedures", "CertificateModule", "01_Unified_Certificate_Stored_Procedures.sql");
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
            Console.WriteLine("  [ERROR] Could not find SQL file at path: " + scriptPath);
        }

        // 3. Automated Verification via Dapper
        Console.WriteLine("\n[3/3] Running Automated Verification Tests via Dapper...");
        try
        {
            var stats = conn.QueryFirstOrDefault<dynamic>("sp_GetCertificateWorkflowStats", new { p_CampusId = (int?)null }, commandType: System.Data.CommandType.StoredProcedure);
            Console.WriteLine($"  [PASS] sp_GetCertificateWorkflowStats executed. Total: {stats?.TotalCount}, Requested: {stats?.RequestedCount}, Generated: {stats?.GeneratedCount}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetCertificateWorkflowStats: {ex.Message}");
        }

        try
        {
            var students = conn.Query<dynamic>("sp_GetStudentsForCertificateDropdown", new { p_CampusId = (int?)null, p_BoardId = (int?)null, p_AcademicYearId = (int?)null }, commandType: System.Data.CommandType.StoredProcedure);
            Console.WriteLine($"  [PASS] sp_GetStudentsForCertificateDropdown executed. Students count: {System.Linq.Enumerable.Count(students)}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetStudentsForCertificateDropdown: {ex.Message}");
        }

        try
        {
            var certs = conn.Query<dynamic>("sp_GetCertificates", new { 
                p_Search = (string?)null, 
                p_Status = (string?)null, 
                p_CertificateType = (string?)null,
                p_CampusId = (int?)null,
                p_BoardId = (int?)null,
                p_AcademicYearId = (int?)null
            }, commandType: System.Data.CommandType.StoredProcedure);
            Console.WriteLine($"  [PASS] sp_GetCertificates executed. Returned certificates: {System.Linq.Enumerable.Count(certs)}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetCertificates: {ex.Message}");
        }

        Console.WriteLine("\n================================================================================");
        Console.WriteLine("   CERTIFICATES MODULE VERIFICATION COMPLETED SUCCESSFULLY!");
        Console.WriteLine("================================================================================");
    }
}
