using System;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Dapper;
using MySqlConnector;

public static class DeployFeeSPs
{
    public static void Run(string connStr)
    {
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("   FEE MANAGEMENT MODULE - SP DEPLOYMENT & VERIFICATION RUNNER");
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

        // 1. Locate SQL file
        string scriptPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", 
            "CollegeManagement.API", "Database", "Scripts", "StoredProcedures", "FeeModule", "01_Unified_Fee_Management_Stored_Procedures.sql");
        if (!File.Exists(scriptPath))
        {
            scriptPath = Path.GetFullPath("Backend/src/CollegeManagement.API/Database/Scripts/StoredProcedures/FeeModule/01_Unified_Fee_Management_Stored_Procedures.sql");
        }

        if (!File.Exists(scriptPath))
        {
            Console.WriteLine("[ERROR] Could not find 01_Unified_Fee_Management_Stored_Procedures.sql at: " + scriptPath);
            return;
        }

        Console.WriteLine("\n[1/3] Deploying Stored Procedures from: " + scriptPath);
        string sqlContent = File.ReadAllText(scriptPath);

        // Schema alignments: safely ensure missing columns
        void EnsureColumn(string tableName, string columnName, string columnDef)
        {
            try
            {
                int exists = conn.ExecuteScalar<int>(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tableName AND COLUMN_NAME = @columnName",
                    new { tableName, columnName });
                if (exists == 0)
                {
                    conn.Execute($"ALTER TABLE `{tableName}` ADD COLUMN `{columnName}` {columnDef};");
                    Console.WriteLine($"  [SCHEMA ALIGNED] Added column `{tableName}`.`{columnName}` ({columnDef})");
                }
                else
                {
                    Console.WriteLine($"  [SCHEMA VERIFIED] Column `{tableName}`.`{columnName}` already exists.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [SCHEMA WARN] Could not check/add `{tableName}`.`{columnName}`: {ex.Message}");
            }
        }

        EnsureColumn("FeeStructures", "YearFeeMode", "VARCHAR(50) NULL");
        EnsureColumn("FeeStructures", "IncrementType", "VARCHAR(50) NULL");
        EnsureColumn("FeeStructures", "IncrementValue", "DECIMAL(15,2) NULL");
        EnsureColumn("FeeStructures", "PairedStructureId", "INT NULL");

        // Parse and deploy stored procedures bounded by DELIMITER // ... END //
        var spRegex = new Regex(@"(CREATE\s+PROCEDURE\s+`?([a-zA-Z0-9_]+)`?[\s\S]*?\bEND)\s*//", RegexOptions.IgnoreCase);
        var matches = spRegex.Matches(sqlContent);
        Console.WriteLine($"Found {matches.Count} stored procedures in unified fee script.\n");

        int deployedCount = 0;
        int failedCount = 0;

        foreach (Match match in matches)
        {
            string spBody = match.Groups[1].Value.Trim();
            string spName = match.Groups[2].Value.Trim('`');

            // Clean out any accidental DELIMITER lines if present
            spBody = Regex.Replace(spBody, @"^\s*DELIMITER\s+.*$", "", RegexOptions.Multiline | RegexOptions.IgnoreCase).Trim();

            Console.Write($"Deploying procedure [{spName}]... ");
            try
            {
                conn.Execute($"DROP PROCEDURE IF EXISTS `{spName}`;");
                conn.Execute(spBody);
                Console.WriteLine("OK");
                deployedCount++;
            }
            catch (Exception ex)
            {
                Console.WriteLine("FAILED: " + ex.Message);
                failedCount++;
            }
        }

        Console.WriteLine($"\nDeployment Summary: {deployedCount} procedures deployed, {failedCount} failed.");

        // 2. Automated Integration Verification Suite
        Console.WriteLine("\n[2/3] Running Automated Integration Tests...");
        int passed = 0;
        int failed = 0;

        // Test 1: sp_FeeType_GetAll
        try
        {
            var feeTypes = conn.Query("sp_FeeType_GetAll", new { p_CampusId = 0, p_BoardId = 0, p_AcademicYearId = 0 }, commandType: CommandType.StoredProcedure);
            Console.WriteLine($"  [PASS] sp_FeeType_GetAll executed. Count: {feeTypes.Count()}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_FeeType_GetAll error: {ex.Message}");
            failed++;
        }

        // Test 2: sp_FeeStructure_GetAll
        try
        {
            using var multi = conn.QueryMultiple("sp_FeeStructure_GetAll", new { p_CampusId = 0 }, commandType: CommandType.StoredProcedure);
            var structures = multi.Read<dynamic>().ToList();
            var components = multi.Read<dynamic>().ToList();
            Console.WriteLine($"  [PASS] sp_FeeStructure_GetAll executed. Structures: {structures.Count}, Components: {components.Count}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_FeeStructure_GetAll error: {ex.Message}");
            failed++;
        }

        // Test 3: sp_FeeDashboard_Get
        try
        {
            using var multi = conn.QueryMultiple("sp_FeeDashboard_Get", new { p_CampusId = 0, p_BoardId = 0, p_AcademicYearId = 0 }, commandType: CommandType.StoredProcedure);
            var summary = multi.ReadFirstOrDefault();
            Console.WriteLine($"  [PASS] sp_FeeDashboard_Get executed successfully! TotalStudents reported: {summary?.TotalStudents ?? 0}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_FeeDashboard_Get error: {ex.Message}");
            failed++;
        }

        // Test 4: sp_FeeCollection_Get with 4 parameters
        try
        {
            var collection = conn.Query("sp_FeeCollection_Get", new { p_CampusId = 0, p_Search = "", p_BoardId = 0, p_AcademicYearId = 0 }, commandType: CommandType.StoredProcedure);
            Console.WriteLine($"  [PASS] sp_FeeCollection_Get executed successfully with 4 params! Accounts: {collection.Count()}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_FeeCollection_Get error: {ex.Message}");
            failed++;
        }

        // Test 5: sp_FeeDue_Get with 3 parameters
        try
        {
            var due = conn.Query("sp_FeeDue_Get", new { p_CampusId = 0, p_BoardId = 0, p_AcademicYearId = 0 }, commandType: CommandType.StoredProcedure);
            Console.WriteLine($"  [PASS] sp_FeeDue_Get executed successfully with 3 params! Due items: {due.Count()}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_FeeDue_Get error: {ex.Message}");
            failed++;
        }

        // Test 6: sp_FeeReport_Daily with 2 parameters
        try
        {
            using var multi = conn.QueryMultiple("sp_FeeReport_Daily", new { p_CampusId = 0, p_ReportDate = DateTime.Today }, commandType: CommandType.StoredProcedure);
            var repSummary = multi.ReadFirstOrDefault();
            var repTxs = multi.Read<dynamic>().ToList();
            Console.WriteLine($"  [PASS] sp_FeeReport_Daily executed successfully! Transactions: {repTxs.Count}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_FeeReport_Daily error: {ex.Message}");
            failed++;
        }

        // Test 7: sp_FineRule_GetAll
        try
        {
            var fineRules = conn.Query("sp_FineRule_GetAll", new { p_CampusId = 0, p_BoardId = 0, p_AcademicYearId = 0 }, commandType: CommandType.StoredProcedure);
            Console.WriteLine($"  [PASS] sp_FineRule_GetAll executed successfully! Count: {fineRules.Count()}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_FineRule_GetAll error: {ex.Message}");
            failed++;
        }

        // Test 8: Legacy alias tests
        try
        {
            var legacyTypes = conn.Query("sp_GetFeeTypes", new { p_CampusId = 0, p_BoardId = 0, p_AcademicYearId = 0 }, commandType: CommandType.StoredProcedure);
            Console.WriteLine($"  [PASS] sp_GetFeeTypes (legacy alias) executed! Count: {legacyTypes.Count()}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetFeeTypes (legacy alias) error: {ex.Message}");
            failed++;
        }

        try
        {
            var legacyCol = conn.Query("sp_GetFeeCollection", new { p_CampusId = 0, p_Search = "", p_BoardId = 0, p_AcademicYearId = 0 }, commandType: CommandType.StoredProcedure);
            Console.WriteLine($"  [PASS] sp_GetFeeCollection (legacy alias) executed! Count: {legacyCol.Count()}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetFeeCollection (legacy alias) error: {ex.Message}");
            failed++;
        }

        // Test 10: sp_StudentFee_GetBulkDetails
        try
        {
            using var multi = conn.QueryMultiple("sp_StudentFee_GetBulkDetails", new { p_StudentIdsJson = "[1, 2, 3]" }, commandType: CommandType.StoredProcedure);
            var summaries = multi.Read<dynamic>().ToList();
            Console.WriteLine($"  [PASS] sp_StudentFee_GetBulkDetails executed! Summaries returned: {summaries.Count}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_StudentFee_GetBulkDetails error: {ex.Message}");
            failed++;
        }

        // Test 11: sp_StudentFee_GetLedger with search & filters
        try
        {
            var ledger = conn.Query("sp_StudentFee_GetLedger", new { 
                p_CampusId = 0, p_AcademicYearId = 0, p_GroupId = 0, p_SectionId = 0, 
                p_PaymentPlan = "", p_Status = "", p_Search = "", p_BoardId = 0 
            }, commandType: CommandType.StoredProcedure);
            Console.WriteLine($"  [PASS] sp_StudentFee_GetLedger executed successfully! Accounts: {ledger.Count()}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_StudentFee_GetLedger error: {ex.Message}");
            failed++;
        }

        // Test 12: sp_FeeReport_Monthly
        try
        {
            using var multi = conn.QueryMultiple("sp_FeeReport_Monthly", new { p_CampusId = 0, p_Year = DateTime.Today.Year, p_Month = DateTime.Today.Month }, commandType: CommandType.StoredProcedure);
            var mSummary = multi.ReadFirstOrDefault();
            Console.WriteLine($"  [PASS] sp_FeeReport_Monthly executed successfully! Month: {DateTime.Today.Month}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_FeeReport_Monthly error: {ex.Message}");
            failed++;
        }

        // Test 13: sp_FeeTransition_GetMatchingStructure
        try
        {
            var match = conn.QueryFirstOrDefault("sp_FeeTransition_GetMatchingStructure", new { 
                p_CampusId = 0, p_BoardId = 0, p_AcademicYearId = 0, p_AcademicLevelId = 0, p_GroupId = 1, p_ProgramId = 0 
            }, commandType: CommandType.StoredProcedure);
            Console.WriteLine($"  [PASS] sp_FeeTransition_GetMatchingStructure executed! Match: {match?.StructureName ?? "None"}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_FeeTransition_GetMatchingStructure error: {ex.Message}");
            failed++;
        }

        Console.WriteLine("\n[3/3] FEE MODULE VERIFICATION RESULTS: Passed: " + passed + " | Failed: " + failed);
        Console.WriteLine("================================================================================\n");
    }
}
