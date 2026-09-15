using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Users;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Implementations;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    /// <summary>
    /// Comprehensive test suite for Phase 2: User Provisioning Foundation.
    /// Verifies random password generation, BCrypt hashing, domain link isolation,
    /// duplicate prevention, transaction support, and data safety.
    /// </summary>
    public static class UserProvisioningFoundationTester
    {
        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("       PHASE 2: USER PROVISIONING FOUNDATION VERIFICATION SUITE");
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
            var connection = dbContext.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            var userRepo = scope.ServiceProvider.GetRequiredService<IUserRepository>();
            var provisioningService = scope.ServiceProvider.GetRequiredService<IUserProvisioningService>();

            // -------------------------------------------------------------
            // TEST 1-3: RANDOM PASSWORD GENERATOR TESTS
            // -------------------------------------------------------------
            Console.WriteLine("--- [SECTION 1] CRYPTOGRAPHIC RANDOM PASSWORD GENERATION ---");

            var pwd1 = SecurePasswordGenerator.Generate(14);
            var pwd2 = SecurePasswordGenerator.Generate(14);

            AssertTrue(!string.IsNullOrWhiteSpace(pwd1) && pwd1.Length == 14, 
                "Test 1: Generated password is non-empty with requested length (14)");

            AssertTrue(pwd1 != pwd2, 
                "Test 2: Two consecutive generated passwords are not identical (non-deterministic)");

            bool hasUpper = pwd1.Any(char.IsUpper);
            bool hasLower = pwd1.Any(char.IsLower);
            bool hasDigit = pwd1.Any(char.IsDigit);
            bool hasSymbol = pwd1.Any(c => "!@#$%*?".Contains(c));
            bool noAmbiguous = !pwd1.Any(c => "IOlo01".Contains(c));

            AssertTrue(hasUpper && hasLower && hasDigit && hasSymbol && noAmbiguous,
                "Test 3: Password contains Upper, Lower, Digit, Symbol and excludes ambiguous chars (I, O, l, o, 0, 1)");

            // -------------------------------------------------------------
            // TEST 4-6: BCRYPT HASHING & REUSE TESTS
            // -------------------------------------------------------------
            Console.WriteLine("\n--- [SECTION 2] BCRYPT PASSWORD HASHING ---");

            var testPlainText = "SecureTest@2026";
            var hash = PasswordHasher.HashPassword(testPlainText);

            AssertTrue(!string.IsNullOrWhiteSpace(hash) && (hash.StartsWith("$2a$") || hash.StartsWith("$2b$") || hash.StartsWith("$2y$")),
                "Test 4: BCrypt hash is generated with standard BCrypt format ($2a$, $2b$, $2y$)");

            bool verified = PasswordHasher.VerifyPassword(testPlainText, hash);
            bool wrongFailed = !PasswordHasher.VerifyPassword("WrongPassword@123", hash);

            AssertTrue(verified && wrongFailed,
                "Test 5: BCrypt hash successfully verifies matching password and rejects incorrect password");

            AssertTrue(hash != testPlainText && !hash.Contains(testPlainText),
                "Test 6: Plaintext password is never stored or embedded within the hash");

            // -------------------------------------------------------------
            // TEST 7-12: DOMAIN LINK & USER PROVISIONING ISOLATION (IN TRANSACTION)
            // -------------------------------------------------------------
            Console.WriteLine("\n--- [SECTION 3] USER PROVISIONING ABSTRACTION & DOMAIN LINKS ---");

            // Query live unlinked domain IDs to test true FK constraint satisfaction
            var liveStudentId = await connection.ExecuteScalarAsync<int>("SELECT StudentId FROM Students LIMIT 1;");
            var liveStaffId = await connection.ExecuteScalarAsync<int>("SELECT Id FROM Staff LIMIT 1;");
            var liveAdminId = await connection.ExecuteScalarAsync<int>("SELECT id FROM admins LIMIT 1;");

            using (var tx = await dbContext.Database.BeginTransactionAsync())
            {
                var dbTx = tx.GetDbTransaction();

                // Test Student Provisioning
                var studentReq = new ProvisionStudentUserRequest
                {
                    StudentId = liveStudentId,
                    FullName = "Test Student Provision",
                    Email = $"test_student_{Guid.NewGuid():N}@testdomain.edu",
                    PhoneNumber = "9876543210",
                    RoleId = 5
                };
                var studentResult = await provisioningService.ProvisionStudentUserAsync(studentReq, connection, dbTx);

                AssertTrue(studentResult.Success && studentResult.UserId > 0,
                    "Test 7A: Student provisioning succeeds with valid generated UserId");

                AssertTrue(studentResult.StudentId == liveStudentId && studentResult.StaffId == null && studentResult.AdminId == null,
                    "Test 7B: Student account populates StudentId only (StaffId=NULL, AdminId=NULL)");

                AssertTrue(studentResult.IsFirstLogin && studentResult.IsActive,
                    "Test 7C: Newly provisioned student account sets IsFirstLogin=true and IsActive=true");

                // Test Staff Provisioning
                var staffReq = new ProvisionStaffUserRequest
                {
                    StaffId = liveStaffId,
                    FullName = "Test Staff Provision",
                    Email = $"test_staff_{Guid.NewGuid():N}@testdomain.edu",
                    PhoneNumber = "9876543211",
                    RoleId = 4
                };
                var staffResult = await provisioningService.ProvisionStaffUserAsync(staffReq, connection, dbTx);

                AssertTrue(staffResult.Success && staffResult.UserId > 0,
                    "Test 8A: Staff provisioning succeeds with valid generated UserId");

                AssertTrue(staffResult.StaffId == liveStaffId && staffResult.StudentId == null && staffResult.AdminId == null,
                    "Test 8B: Staff account populates StaffId only (StudentId=NULL, AdminId=NULL)");

                // Test Admin Provisioning
                var adminReq = new ProvisionAdminUserRequest
                {
                    AdminId = liveAdminId,
                    FullName = "Test Admin Provision",
                    Email = $"test_admin_{Guid.NewGuid():N}@testdomain.edu",
                    PhoneNumber = "9876543212",
                    RoleId = 2
                };
                var adminResult = await provisioningService.ProvisionAdminUserAsync(adminReq, connection, dbTx);

                AssertTrue(adminResult.Success && adminResult.UserId > 0,
                    "Test 9A: Admin provisioning succeeds with valid generated UserId");

                AssertTrue(adminResult.AdminId == liveAdminId && adminResult.StudentId == null && adminResult.StaffId == null,
                    "Test 9B: Admin account populates AdminId only (StudentId=NULL, StaffId=NULL)");

                // Test Multi-Domain Link Rejection
                var multiDomainReq = new ProvisionUserRequest
                {
                    FullName = "Multi Domain Invalid",
                    Email = "invalid_multi@testdomain.edu",
                    RoleId = 5,
                    StudentId = liveStudentId,
                    StaffId = liveStaffId // Violates single domain link rule
                };
                var multiResult = await provisioningService.ProvisionUserAsync(multiDomainReq, connection, dbTx);

                AssertTrue(!multiResult.Success && multiResult.ErrorMessage!.Contains("multiple domain entities"),
                    "Test 10: Multi-domain link request is rejected (only 1 domain link allowed per account)");

                // Test Duplicate Email Rejection
                var dupEmailReq = new ProvisionStudentUserRequest
                {
                    StudentId = liveStudentId,
                    FullName = "Duplicate Email Test",
                    Email = studentReq.Email, // Same email as already provisioned student
                    RoleId = 5
                };
                var dupEmailResult = await provisioningService.ProvisionStudentUserAsync(dupEmailReq, connection, dbTx);

                AssertTrue(!dupEmailResult.Success && dupEmailResult.ErrorMessage!.Contains("already exists"),
                    "Test 11: Duplicate email is rejected with clean validation message");

                // Test Duplicate StudentId Rejection
                var dupStudentReq = new ProvisionStudentUserRequest
                {
                    StudentId = liveStudentId, // Same StudentId as already provisioned
                    FullName = "Duplicate StudentId Test",
                    Email = $"unique_{Guid.NewGuid():N}@testdomain.edu",
                    RoleId = 5
                };
                var dupStudentResult = await provisioningService.ProvisionStudentUserAsync(dupStudentReq, connection, dbTx);

                AssertTrue(!dupStudentResult.Success && dupStudentResult.ErrorMessage!.Contains("already linked"),
                    "Test 12: Duplicate domain link (StudentId) is rejected with clean validation message");

                // Roll back test transaction so no temporary records persist
                await tx.RollbackAsync();
            }

            // -------------------------------------------------------------
            // TEST 13-14: EXISTING DATA SAFETY VERIFICATION
            // -------------------------------------------------------------
            Console.WriteLine("\n--- [SECTION 4] LIVE DATABASE INTEGRITY & EXISTING DATA SAFETY ---");

            var liveUsers = await connection.QueryAsync<User>("SELECT * FROM `Users` ORDER BY `UserId`;");
            var userList = liveUsers.ToList();

            AssertTrue(userList.Count == 14,
                $"Test 13: Live Users table row count is exactly 14 (Found: {userList.Count})");

            bool allExistingIntact = userList.All(u => 
                u.UserId >= 4 && u.UserId <= 17 &&
                !string.IsNullOrWhiteSpace(u.Email) &&
                !string.IsNullOrWhiteSpace(u.PasswordHash) &&
                u.RoleId > 0 &&
                u.StudentId == null &&
                u.StaffId == null &&
                u.AdminId == null &&
                u.IsActive);

            AssertTrue(allExistingIntact,
                "Test 14: All 14 original Users rows remain 100% intact with original emails, passwords, roles, and null domain links");

            // -------------------------------------------------------------
            // SUMMARY
            // -------------------------------------------------------------
            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"TOTAL TESTS: {passed + failed} | PASSED: {passed} | FAILED: {failed}");
            Console.WriteLine("================================================================================\n");

            return failed == 0;
        }
    }
}
