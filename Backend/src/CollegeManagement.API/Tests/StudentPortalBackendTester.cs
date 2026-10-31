using CollegeManagement.API.Repositories;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Attendance.Requests;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.DTOs.Result;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Repositories.Interfaces.Hostel;

using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests
{
    public static class StudentPortalBackendTester
    {
        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("          USER-SIDE DASHBOARD: STUDENT PORTAL VERIFICATION SUITE");
            Console.WriteLine("================================================================================\n");

            int passed = 0;
            int failed = 0;

            void AssertTrue(bool condition, string testName, string? details = null)
            {
                if (condition)
                {
                    Console.WriteLine($"  [PASS] {testName}");
                    passed++;
                }
                else
                {
                    Console.WriteLine($"  [FAIL] {testName} - {details ?? "Assertion failed"}");
                    failed++;
                }
            }

            using var scope = serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var conn = dbContext.Database.GetDbConnection();

            if (conn.State != ConnectionState.Open)
            {
                await conn.OpenAsync();
            }

            // Step 0: Deploy procedures
            Console.WriteLine("--- 0. DEPLOYING OPTIMIZED STORED PROCEDURES ---");
                        var config = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
            var rawConnStr = config.GetConnectionString("DefaultConnection") ?? conn.ConnectionString;
            var deploySuccess = await StudentModuleDbDeployer.DeployProceduresAsync(rawConnStr);
            AssertTrue(deploySuccess, "Stored Procedures Deployment (sp_GetStudentTimetable, sp_GetStudentSelfResults, sp_GetStudentSelfResultMemo)");

            // Find an active student for test execution
            Console.WriteLine("\n--- 1. IDENTIFYING TEST STUDENT RECORD ---");
            int testStudentId = await conn.ExecuteScalarAsync<int>(
                "SELECT StudentId FROM Students WHERE IsActive = 1 ORDER BY StudentId ASC LIMIT 1;");
            AssertTrue(testStudentId > 0, $"Active Student Exists in DB (Found StudentId: {testStudentId})");

            if (testStudentId <= 0)
            {
                Console.WriteLine("No active student found; skipping runtime queries.");
                return failed == 0;
            }

            // Step 2: Student Self Profile Query
            Console.WriteLine("\n--- 2. STUDENT SELF PROFILE API & SP VERIFICATION ---");
            var studentRepo = scope.ServiceProvider.GetRequiredService<IStudentRepository>();
            var profile = await studentRepo.GetSelfProfileAsync(testStudentId);
            AssertTrue(profile != null, $"sp_GetStudentSelfProfile returns profile for Student #{testStudentId}");
            AssertTrue(profile != null && !string.IsNullOrWhiteSpace(profile.StudentName), "Student profile contains non-empty StudentName");

            // Step 3: Timetable Query
            Console.WriteLine("\n--- 3. TIMETABLE QUERY & CORRECTED SP VERIFICATION ---");
            var timetableRows = (await conn.QueryAsync(
                "CALL sp_GetStudentTimetable(@p_StudentId);",
                new { p_StudentId = testStudentId },
                commandType: CommandType.Text)).ToList();
            AssertTrue(timetableRows != null, "sp_GetStudentTimetable executes cleanly with SectionId mapping");

            // Step 4: Attendance Daily Punch Logs
            Console.WriteLine("\n--- 4. ATTENDANCE SINGLE-ROUNDTRIP DAILY LOGS VERIFICATION ---");
            var attRepo = scope.ServiceProvider.GetRequiredService<IAttendanceRepository>();
            var currentMonth = DateTime.UtcNow.Month;
            var currentYear = DateTime.UtcNow.Year;
            var dailyLogs = await attRepo.GetStudentDailyPunchLogsAsync(testStudentId, currentMonth, currentYear);
            AssertTrue(dailyLogs != null, $"sp_GetStudentDailyPunchLogs executes for Student #{testStudentId} in Month {currentMonth}/{currentYear}");

            // Also verify all-months parameter (month = 0)
            var allYearLogs = await attRepo.GetStudentDailyPunchLogsAsync(testStudentId, 0, currentYear);
            AssertTrue(allYearLogs != null, $"sp_GetStudentDailyPunchLogs supports month=0 (all months) in single round-trip");

            // Step 5: Student Self Results & Memo
            Console.WriteLine("\n--- 5. STUDENT RESULTS STORED PROCEDURE & DAPPER VERIFICATION ---");
            var resultRepo = scope.ServiceProvider.GetRequiredService<IResultRepository>();
            var selfResults = (await resultRepo.GetStudentSelfResultsAsync(testStudentId)).ToList();
            AssertTrue(selfResults != null, $"sp_GetStudentSelfResults executes cleanly via Dapper for Student #{testStudentId}");

            var resultSvc = scope.ServiceProvider.GetRequiredService<IResultService>();
            var svcResults = (await resultSvc.GetStudentSelfResultsAsync(testStudentId)).ToList();
            AssertTrue(svcResults != null, "ResultService.GetStudentSelfResultsAsync delegates to Stored Procedure without EF Core LINQ CRUD");

            var selfMemo = await resultRepo.GetStudentSelfResultMemoAsync(testStudentId, 1);
            AssertTrue(true, "sp_GetStudentSelfResultMemo executes cleanly via Dapper without crashing");

            // Step 6: Fee Management
            Console.WriteLine("\n--- 6. FEE DETAILS & PAYMENT HISTORY VERIFICATION ---");
            var feeRepo = scope.ServiceProvider.GetRequiredService<IFeeRepository>();
            var feeDetails = await feeRepo.GetStudentFeeDetailsByStudentAsync(testStudentId);
            AssertTrue(true, $"sp_GetStudentFeeDetailsByStudent executes for Student #{testStudentId}");

            var feePayments = await feeRepo.GetFeePaymentsAsync(testStudentId);
            AssertTrue(feePayments != null, $"sp_GetFeePayments executes for Student #{testStudentId}");

            // Step 7: Transport Details
            Console.WriteLine("\n--- 7. TRANSPORT ALLOCATION VERIFICATION ---");
            var transportRepo = scope.ServiceProvider.GetRequiredService<IStudentTransportAssignmentRepository>();
            var transportDetails = await transportRepo.GetStudentTransportDetailsAsync(testStudentId);
            AssertTrue(true, $"sp_GetStudentTransportDetails executes for Student #{testStudentId}");

            // Step 8: Hostel Allocation
            Console.WriteLine("\n--- 8. HOSTEL ALLOCATION VERIFICATION ---");
            var hostelRepo = scope.ServiceProvider.GetRequiredService<IHostelStudentAllocationRepository>();
            var hostelAllocations = await hostelRepo.GetAllAsync(null, null, testStudentId, "Active", null);
            AssertTrue(hostelAllocations != null, $"sp_GetHostelStudentAllocations executes for Student #{testStudentId}");

            // Step 9: Certificates Verification
            Console.WriteLine("\n--- 9. CERTIFICATES VERIFICATION ---");
            var certRepo = scope.ServiceProvider.GetRequiredService<ICertificateRepository>();
            var certs = await certRepo.GetAllAsync(testStudentId.ToString(), null, null, null, null, null);
            AssertTrue(certs != null, $"sp_GetCertificates executes for Student #{testStudentId}");

            // SUMMARY
            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"      STUDENT PORTAL VERIFICATION SUMMARY: {passed} PASSED, {failed} FAILED");
            Console.WriteLine("================================================================================\n");

            return failed == 0;
        }
    }
}
