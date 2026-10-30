using System;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Dapper;
using MySqlConnector;

public static class DeployPayrollSPs
{
    public static void Run(string connStr)
    {
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("   PAYROLL MODULE - SP DEPLOYMENT & VERIFICATION RUNNER");
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
            "CollegeManagement.API", "Database", "Scripts", "StoredProcedures", "PayrollModule", "01_Unified_Payroll_Stored_Procedures.sql");
        if (!File.Exists(scriptPath))
        {
            scriptPath = Path.GetFullPath("Backend/src/CollegeManagement.API/Database/Scripts/StoredProcedures/PayrollModule/01_Unified_Payroll_Stored_Procedures.sql");
        }

        if (!File.Exists(scriptPath))
        {
            Console.WriteLine("[ERROR] Could not find 01_Unified_Payroll_Stored_Procedures.sql at: " + scriptPath);
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
        Console.WriteLine($"Found {createMatches.Count} stored procedures in unified script.");

        int deployedCount = 0;
        foreach (Match match in createMatches)
        {
            string spBody = match.Groups[1].Value;
            string spName = match.Groups[2].Value;

            try
            {
                conn.Execute(spBody);
                deployedCount++;
                Console.WriteLine($"  [DEPLOYED] Stored Procedure: `{spName}`");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Failed to deploy `{spName}`: {ex.Message}");
            }
        }
        Console.WriteLine($"[Summary] Deployed {deployedCount} of {createMatches.Count} procedures successfully.\n");

        // 2. Automated Integration Verification
        Console.WriteLine("[2/3] Running Automated Integration Tests...");
        int passed = 0;
        int failed = 0;

        // Test 1: sp_PayrollSalaryStructure_GetAll
        try
        {
            var structures = conn.Query("sp_PayrollSalaryStructure_GetAll", new {
                p_StaffType = (string?)null,
                p_Search = (string?)null
            }, commandType: CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_PayrollSalaryStructure_GetAll executed. Count: {structures.Count()}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_PayrollSalaryStructure_GetAll error: {ex.Message}");
            failed++;
        }

        // Test 2: sp_PayrollEmployee_GetAll
        try
        {
            var employees = conn.Query("sp_PayrollEmployee_GetAll", new {
                p_StaffType = (string?)null,
                p_Search = (string?)null,
                p_CampusId = 1
            }, commandType: CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_PayrollEmployee_GetAll (Campus 1) executed. Count: {employees.Count()}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_PayrollEmployee_GetAll error: {ex.Message}");
            failed++;
        }

        // Test 3: sp_PayrollStaffSalary_GetAll
        try
        {
            var staffSalaries = conn.Query("sp_PayrollStaffSalary_GetAll", new {
                p_StaffId = 0,
                p_Status = (string?)null,
                p_CampusId = 1
            }, commandType: CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_PayrollStaffSalary_GetAll executed. Count: {staffSalaries.Count()}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_PayrollStaffSalary_GetAll error: {ex.Message}");
            failed++;
        }

        // Test 4: sp_PayrollPayslip_GetHistory
        try
        {
            var payslips = conn.Query("sp_PayrollPayslip_GetHistory", new {
                p_PayrollMonth = 0,
                p_PayrollYear = 0,
                p_StaffType = (string?)null,
                p_Search = (string?)null,
                p_CampusId = 1
            }, commandType: CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_PayrollPayslip_GetHistory executed. Count: {payslips.Count()}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_PayrollPayslip_GetHistory error: {ex.Message}");
            failed++;
        }

        // Test 5: sp_PayrollPayslip_ResolveId (New architectural compliance SP)
        try
        {
            var resolved = conn.QueryFirstOrDefault<int?>("sp_PayrollPayslip_ResolveId", new {
                p_DirectId = 1,
                p_StaffId = 0,
                p_StaffCode = (string?)null,
                p_Year = 2026,
                p_Month = 9
            }, commandType: CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_PayrollPayslip_ResolveId executed successfully! Returned: {resolved}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_PayrollPayslip_ResolveId error: {ex.Message}");
            failed++;
        }

        // Test 6: sp_Payroll_GetMonthlySummary
        try
        {
            var summary = conn.QueryFirstOrDefault("sp_Payroll_GetMonthlySummary", new {
                p_PayrollMonth = 10,
                p_PayrollYear = 2026,
                p_CampusId = 1
            }, commandType: CommandType.StoredProcedure);

            Console.WriteLine($"  [PASS] sp_Payroll_GetMonthlySummary executed successfully!");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_Payroll_GetMonthlySummary error: {ex.Message}");
            failed++;
        }

        Console.WriteLine($"\n[3/3] PAYROLL VERIFICATION RESULTS: Passed: {passed} | Failed: {failed}");
        Console.WriteLine("================================================================================\n");
    }
}
