using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Repositories.Implementations;
using Dapper;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace CollegeManagement.API.Tests;

public class FeeModuleBackendTester
{
    private readonly string _connectionString;

    public FeeModuleBackendTester(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<bool> RunAllTestsAsync()
    {
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("   FEE MANAGEMENT MODULE BACKEND REPOSITORY INTEGRATION TEST SUITE");
        Console.WriteLine("================================================================================");

        int passed = 0;
        int failed = 0;

        // Build EF AppDbContext options for connection provision only
        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
        var appDbContext = new AppDbContext(optionsBuilder.Options);

        var feeRepo = new FeeRepository(appDbContext, null!);
        var fineRuleRepo = new FineRuleRepository(appDbContext);

        // 1. Test Database Connectivity
        Console.WriteLine("\n[1/8] Testing Database Connection...");
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();
            var db = await conn.ExecuteScalarAsync<string>("SELECT DATABASE();");
            Console.WriteLine($"  [PASS] Successfully connected to Database: {db}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Connection Error: {ex.Message}");
            failed++;
        }

        // 2. Test Fee Types
        Console.WriteLine("\n[2/8] Testing Fee Types Repository (Dapper + SP)...");
        try
        {
            var types = await feeRepo.GetFeeTypesAsync();
            Console.WriteLine($"  [PASS] GetFeeTypesAsync returned {types.Count()} active fee types.");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] GetFeeTypesAsync Error: {ex.Message}");
            failed++;
        }

        // 3. Test Fee Structures
        Console.WriteLine("\n[3/8] Testing Fee Structures Repository (Dapper + SP)...");
        try
        {
            var structures = await feeRepo.GetFeeStructuresAsync();
            Console.WriteLine($"  [PASS] GetFeeStructuresAsync returned {structures.Count()} configured structures with components.");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] GetFeeStructuresAsync Error: {ex.Message}");
            failed++;
        }

        // 4. Test Student Fee Ledger
        Console.WriteLine("\n[4/8] Testing Student Fee Ledger (Dapper + SP)...");
        try
        {
            var ledger = await feeRepo.GetStudentFeeLedgerAsync();
            Console.WriteLine($"  [PASS] GetStudentFeeLedgerAsync returned {ledger.Count()} student accounts.");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] GetStudentFeeLedgerAsync Error: {ex.Message}");
            failed++;
        }

        // 5. Test Fee Collections & Dues
        Console.WriteLine("\n[5/8] Testing Collections & Dues (Dapper + SP)...");
        try
        {
            var collections = await feeRepo.GetFeeCollectionAsync();
            var dues = await feeRepo.GetDueAsync();
            Console.WriteLine($"  [PASS] Collections: {collections.Count()} accounts, Dues: {dues.Count()} overdue installments.");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Collections/Dues Error: {ex.Message}");
            failed++;
        }

        // 6. Test Fee Dashboard Aggregates
        Console.WriteLine("\n[6/8] Testing Fee Dashboard Aggregates (Dapper + SP)...");
        try
        {
            var dashboard = await feeRepo.GetDashboardAsync();
            Console.WriteLine($"  [PASS] Fee Dashboard: TotalStudents={dashboard.TotalStudents}, Expected=₹{dashboard.TotalExpected}, Collected=₹{dashboard.TotalCollected}, Rate={dashboard.CollectionPercentage}%");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] GetDashboardAsync Error: {ex.Message}");
            failed++;
        }

        // 7. Test Daily & Monthly Reports
        Console.WriteLine("\n[7/8] Testing Daily & Monthly Reports (Dapper + SP)...");
        try
        {
            var daily = await feeRepo.GetDailyReportAsync();
            var monthly = await feeRepo.GetMonthlyReportAsync();
            Console.WriteLine($"  [PASS] Daily Report (Txs: {daily.TransactionCount}), Monthly Report (Txs: {monthly.TransactionCount}) executed cleanly.");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Reports Error: {ex.Message}");
            failed++;
        }

        // 8. Test Fine Rules Repository
        Console.WriteLine("\n[8/8] Testing Fine Rules Repository (Dapper + SP)...");
        try
        {
            var rules = await fineRuleRepo.GetAllAsync();
            Console.WriteLine($"  [PASS] FineRuleRepository.GetAllAsync returned {rules.Count()} rules.");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] FineRuleRepository Error: {ex.Message}");
            failed++;
        }

        Console.WriteLine("\n================================================================================");
        Console.WriteLine($"   FEE MODULE REPOSITORY RESULTS: Passed: {passed} | Failed: {failed}");
        Console.WriteLine("================================================================================\n");

        return failed == 0;
    }
}
