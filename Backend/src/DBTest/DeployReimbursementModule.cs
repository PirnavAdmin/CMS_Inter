using System;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Dapper;
using MySqlConnector;

public static class DeployReimbursementModule
{
    public static void Run(string connStr)
    {
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("   REIMBURSEMENT MODULE - SP DEPLOYMENT & VERIFICATION RUNNER");
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
            "CollegeManagement.API", "Database", "Scripts", "StoredProcedures", "ReimbursementModule", "01_ReimbursementManagement_Complete_Schema_And_SPs.sql");
        if (!File.Exists(scriptPath))
        {
            scriptPath = Path.GetFullPath("Backend/src/CollegeManagement.API/Database/Scripts/StoredProcedures/ReimbursementModule/01_ReimbursementManagement_Complete_Schema_And_SPs.sql");
        }

        if (!File.Exists(scriptPath))
        {
            Console.WriteLine("[ERROR] Could not find 01_ReimbursementManagement_Complete_Schema_And_SPs.sql at: " + scriptPath);
            return;
        }

        Console.WriteLine("\n[1/3] Deploying Stored Procedures from: " + scriptPath);
        string sqlContent = File.ReadAllText(scriptPath);

        // Regex to parse DROP PROCEDURE and CREATE PROCEDURE blocks
        var dropRegex = new Regex(@"DROP\s+PROCEDURE\s+IF\s+EXISTS\s+`?([a-zA-Z0-9_]+)`?;?", RegexOptions.IgnoreCase);
        var createRegex = new Regex(@"(CREATE\s+PROCEDURE\s+`?([a-zA-Z0-9_]+)`?[\s\S]*?\bEND)\s*//", RegexOptions.IgnoreCase);

        var dropMatches = dropRegex.Matches(sqlContent);
        foreach (Match match in dropMatches)
        {
            string spName = match.Groups[1].Value;
            try
            {
                conn.Execute($"DROP PROCEDURE IF EXISTS `{spName}`;");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [WARN] Failed to drop {spName}: {ex.Message}");
            }
        }

        var createMatches = createRegex.Matches(sqlContent);
        Console.WriteLine($"Found {createMatches.Count} stored procedures in reimbursement script.");

        int deployedCount = 0;
        foreach (Match match in createMatches)
        {
            string spSql = match.Groups[1].Value;
            string spName = match.Groups[2].Value;

            try
            {
                conn.Execute(spSql);
                Console.WriteLine($"  [DEPLOYED] Stored Procedure: `{spName}`");
                deployedCount++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Failed to deploy `{spName}`: {ex.Message}");
            }
        }

        Console.WriteLine($"[Summary] Deployed {deployedCount} of {createMatches.Count} procedures successfully.");

        // 2. Integration Tests
        Console.WriteLine("\n[2/3] Running Automated Integration Tests...");
        int passed = 0;
        int failed = 0;

        // Test 1: sp_Reimbursement_GetSummary
        try
        {
            var summary = conn.QueryFirstOrDefault("sp_Reimbursement_GetSummary", new { p_CampusId = 1 }, commandType: CommandType.StoredProcedure);
            if (summary != null)
            {
                Console.WriteLine("  [PASS] sp_Reimbursement_GetSummary executed successfully.");
                passed++;
            }
            else
            {
                Console.WriteLine("  [FAIL] sp_Reimbursement_GetSummary returned null.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_Reimbursement_GetSummary error: {ex.Message}");
            failed++;
        }

        // Test 2: sp_Reimbursement_GetAll
        try
        {
            var claims = conn.Query("sp_Reimbursement_GetAll", new {
                p_CampusId = 1,
                p_Status = (string)null,
                p_Category = (string)null,
                p_Search = (string)null
            }, commandType: CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_Reimbursement_GetAll executed. Count: {claims.Count()}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_Reimbursement_GetAll error: {ex.Message}");
            failed++;
        }

        // Test 3: sp_Reimbursement_GetMyClaims
        try
        {
            var myClaims = conn.Query("sp_Reimbursement_GetMyClaims", new {
                p_StaffId = 10,
                p_CampusId = 1
            }, commandType: CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_Reimbursement_GetMyClaims (Staff 10) executed. Count: {myClaims.Count()}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_Reimbursement_GetMyClaims error: {ex.Message}");
            failed++;
        }

        // Test 4: sp_Reimbursement_GetAccountEntries
        try
        {
            var entries = conn.Query("sp_Reimbursement_GetAccountEntries", new {
                p_CampusId = 1
            }, commandType: CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_Reimbursement_GetAccountEntries executed. Count: {entries.Count()}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_Reimbursement_GetAccountEntries error: {ex.Message}");
            failed++;
        }

        // Test 5: sp_Reimbursement_GetById
        try
        {
            var claim = conn.QueryFirstOrDefault("sp_Reimbursement_GetById", new { p_Id = 1 }, commandType: CommandType.StoredProcedure);
            Console.WriteLine($"  [PASS] sp_Reimbursement_GetById (Id 1) executed successfully.");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_Reimbursement_GetById error: {ex.Message}");
            failed++;
        }

        // Test 6: sp_Reimbursement_Create (Atomic generation test)
        try
        {
            var created = conn.QueryFirstOrDefault<dynamic>("sp_Reimbursement_Create", new {
                p_StaffId = 10,
                p_CampusId = 1,
                p_AcademicYear = "2026-2027",
                p_ExpenseCategory = "Office Supplies",
                p_ExpenseDate = DateTime.Today,
                p_Amount = 450.00m,
                p_PreferredPaymentMethod = "Bank Transfer",
                p_Purpose = "Integration Test Expense - Safe Cleanup",
                p_AdditionalNotes = "Test notes verify preservation",
                p_ReceiptUrl = "/Uploads/Reimbursements/test.pdf"
            }, commandType: CommandType.StoredProcedure);

            if (created != null && created.Id != null)
            {
                int newId = (int)created.Id;
                string claimNum = (string)created.ClaimNumber;
                Console.WriteLine($"  [PASS] sp_Reimbursement_Create executed successfully! Generated ID: {newId}, ClaimNumber: {claimNum}");
                passed++;

                // Clean up test claim
                conn.Execute("DELETE FROM `reimbursement_claims` WHERE `Id` = @Id;", new { Id = newId });
            }
            else
            {
                Console.WriteLine("  [FAIL] sp_Reimbursement_Create did not return created row.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_Reimbursement_Create error: {ex.Message}");
            failed++;
        }

        Console.WriteLine($"\n[3/3] REIMBURSEMENT VERIFICATION RESULTS: Passed: {passed} | Failed: {failed}");
        Console.WriteLine("================================================================================\n");
    }
}
