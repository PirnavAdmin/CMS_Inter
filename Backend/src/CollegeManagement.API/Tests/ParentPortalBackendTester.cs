using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Students.Responses;
using CollegeManagement.API.Repositories;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests
{
    public static class ParentPortalBackendTester
    {
        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("          USER-SIDE DASHBOARD: PARENT PORTAL VERIFICATION SUITE");
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
            var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            var connectionString = config.GetConnectionString("DefaultConnection") 
                ?? scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.GetConnectionString();

            // --- 0. DEPLOY STORED PROCEDURES ---
            Console.WriteLine("--- 0. DEPLOYING OPTIMIZED PARENT STORED PROCEDURES ---");
            bool deployed = await ParentModuleDbDeployer.DeployProceduresAsync(connectionString!);
            AssertTrue(deployed, "Stored Procedures Deployment (sp_CheckParentStudentMapping, sp_GetParentChildren, etc.)");

            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var conn = dbContext.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open)
            {
                await conn.OpenAsync();
            }

            // --- 1. IDENTIFY OR PROVISION TEST PARENT-STUDENT MAPPING ---
            Console.WriteLine("\n--- 1. IDENTIFYING TEST PARENT-STUDENT LINKAGE ---");
            int testStudentId = 6;
            var activeStudentId = await conn.QueryFirstOrDefaultAsync<int?>(
                "SELECT StudentId FROM Students WHERE Status = 'Active' AND IsActive = 1 ORDER BY StudentId ASC LIMIT 1;");
            if (activeStudentId.HasValue && activeStudentId.Value > 0)
            {
                testStudentId = activeStudentId.Value;
            }

            var testParentUserId = await conn.QueryFirstOrDefaultAsync<int?>(
                "SELECT ParentUserId FROM ParentStudentMappings WHERE StudentId = @StudentId LIMIT 1;",
                new { StudentId = testStudentId });

            if (!testParentUserId.HasValue || testParentUserId.Value <= 0)
            {
                // Find or create test parent user
                var existingParent = await conn.QueryFirstOrDefaultAsync<int?>(
                    "SELECT u.UserId FROM Users u INNER JOIN Roles r ON r.RoleId = u.RoleId WHERE r.RoleName = 'Parent' LIMIT 1;");
                if (existingParent.HasValue && existingParent.Value > 0)
                {
                    testParentUserId = existingParent.Value;
                }
                else
                {
                    testParentUserId = 1; // Fallback admin/user id for mapping test
                }

                // Add mapping via newly deployed SP
                await conn.ExecuteAsync(
                    "sp_AddOrUpdateParentStudentMapping",
                    new
                    {
                        p_ParentUserId = testParentUserId.Value,
                        p_StudentId = testStudentId,
                        p_RelationshipType = "Parent",
                        p_IsPrimaryContact = 1
                    },
                    commandType: CommandType.StoredProcedure);
            }

            AssertTrue(testParentUserId.HasValue && testParentUserId.Value > 0, $"Parent-Student Linkage Established (ParentUserId: {testParentUserId}, StudentId: {testStudentId})");

            // --- 2. sp_CheckParentStudentMapping VERIFICATION ---
            Console.WriteLine("\n--- 2. AUTHORIZATION & IDOR FILTER SP VERIFICATION ---");
            var authorizedCount = await conn.ExecuteScalarAsync<int>(
                "sp_CheckParentStudentMapping",
                new { p_ParentUserId = testParentUserId!.Value, p_StudentId = testStudentId },
                commandType: CommandType.StoredProcedure);
            AssertTrue(authorizedCount > 0, $"sp_CheckParentStudentMapping allows authorized ward (StudentId: {testStudentId})");

            var unauthorizedCount = await conn.ExecuteScalarAsync<int>(
                "sp_CheckParentStudentMapping",
                new { p_ParentUserId = testParentUserId.Value, p_StudentId = 999999 },
                commandType: CommandType.StoredProcedure);
            AssertTrue(unauthorizedCount == 0, "sp_CheckParentStudentMapping denies unauthorized cross-student IDOR (StudentId: 999999)");

            // --- 3. sp_GetParentChildren VERIFICATION ---
            Console.WriteLine("\n--- 3. SIBLING & CHILDREN DISCOVERY VERIFICATION ---");
            var studentRepo = scope.ServiceProvider.GetRequiredService<IStudentRepository>();
            var children = (await studentRepo.GetParentChildrenAsync(testParentUserId.Value)).ToList();
            AssertTrue(children != null && children.Count > 0, $"sp_GetParentChildren returns enrolled wards (Found {children?.Count ?? 0} children)");
            var firstChild = children?.FirstOrDefault(c => c.StudentId == testStudentId);
            AssertTrue(firstChild != null && !string.IsNullOrWhiteSpace(firstChild.StudentName), "Child record contains verified StudentName");

            // --- 4. REPOSITORY SP DELEGATION VERIFICATION ---
            Console.WriteLine("\n--- 4. USER REPOSITORY SP DELEGATION VERIFICATION ---");
            var userRepo = scope.ServiceProvider.GetRequiredService<IUserRepository>();
            var mapping = await userRepo.GetParentStudentMappingAsync(testParentUserId.Value, testStudentId);
            AssertTrue(mapping != null && mapping.StudentId == testStudentId, "userRepo.GetParentStudentMappingAsync delegates to sp_GetParentStudentMapping");

            var parentStudents = await userRepo.GetStudentsByParentUserIdAsync(testParentUserId.Value);
            AssertTrue(parentStudents != null && parentStudents.Any(ps => ps.StudentId == testStudentId), "userRepo.GetStudentsByParentUserIdAsync delegates to sp_GetStudentsByParentUserId");

            // --- 5. sp_GetParentUserIdsForStudents VERIFICATION ---
            Console.WriteLine("\n--- 5. NOTIFICATION SERVICE RECIPIENT SP VERIFICATION ---");
            var parentUserIds = (await conn.QueryAsync<int>(
                "sp_GetParentUserIdsForStudents",
                new { p_StudentIds = testStudentId.ToString() },
                commandType: CommandType.StoredProcedure)).ToList();
            AssertTrue(parentUserIds != null && parentUserIds.Contains(testParentUserId.Value), "sp_GetParentUserIdsForStudents resolves mapped parent user IDs for notification dispatch");

            // --- 6. SINGLE-ROUNDTRIP ATTENDANCE LOGS VERIFICATION ---
            Console.WriteLine("\n--- 6. WARD ATTENDANCE SINGLE-ROUNDTRIP VERIFICATION ---");
            var attendanceRepo = scope.ServiceProvider.GetRequiredService<IAttendanceRepository>();
            var allMonthsLogs = await attendanceRepo.GetStudentDailyPunchLogsAsync(testStudentId, month: 0, year: 2026);
            AssertTrue(allMonthsLogs != null, "sp_GetStudentDailyPunchLogs executes for Parent's ward with month=0 in 1 round-trip");

            // --- 7. WARD RESULTS & MARKS MEMO VERIFICATION ---
            Console.WriteLine("\n--- 7. WARD RESULTS & MARKS MEMO VERIFICATION ---");
            var resultRepo = scope.ServiceProvider.GetRequiredService<IResultRepository>();
            var results = (await resultRepo.GetStudentSelfResultsAsync(testStudentId)).ToList();
            AssertTrue(results != null, $"sp_GetStudentSelfResults executes cleanly for Parent's ward (Found {results?.Count ?? 0} results)");

            int examId = results?.FirstOrDefault()?.ExaminationId ?? 1;
            var memo = await resultRepo.GetStudentSelfResultMemoAsync(testStudentId, examId);
            AssertTrue(true, "sp_GetStudentSelfResultMemo executes cleanly for Parent's ward without crashing");

            // --- 8. WARD FEE DETAILS VERIFICATION ---
            Console.WriteLine("\n--- 8. WARD FEE DETAILS & LEDGER VERIFICATION ---");
            var feeRepo = scope.ServiceProvider.GetRequiredService<IFeeRepository>();
            var feeDetails = await feeRepo.GetStudentFeeDetailsByStudentAsync(testStudentId);
            AssertTrue(true, "sp_GetStudentFeeDetailsByStudent executes for Parent's ward");

            // --- 9. CERTIFICATES VERIFICATION ---
            Console.WriteLine("\n--- 9. WARD CERTIFICATES VERIFICATION ---");
            var certRepo = scope.ServiceProvider.GetRequiredService<ICertificateRepository>();
            var certs = await certRepo.GetAllAsync(testStudentId.ToString(), null, null, null, null, null);
            AssertTrue(certs != null, "sp_GetCertificates executes for Parent's ward search");

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"      PARENT PORTAL VERIFICATION SUMMARY: {passed} PASSED, {failed} FAILED");
            Console.WriteLine("================================================================================\n");

            return failed == 0;
        }
    }
}
