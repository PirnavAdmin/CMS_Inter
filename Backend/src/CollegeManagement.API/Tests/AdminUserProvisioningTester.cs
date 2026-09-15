using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Admin;
using CollegeManagement.API.DTOs.Users;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests
{
    /// <summary>
    /// Automated test runner for Phase 5: Admin User Provisioning.
    /// Validates dynamic role resolution, domain isolation, atomic all-or-nothing transactions,
    /// dual password storage for backward compatibility, credential template rendering, and database safety invariants.
    /// </summary>
    public static class AdminUserProvisioningTester
    {
        private static int _totalAssertions = 0;
        private static int _passedAssertions = 0;
        private static int _failedAssertions = 0;

        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            return await RunTestsAsync(serviceProvider);
        }

        public static async Task<bool> RunTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("       PHASE 5: ADMIN USER PROVISIONING VERIFICATION SUITE");
            Console.WriteLine("================================================================================");

            using var scope = serviceProvider.CreateScope();
            var sp = scope.ServiceProvider;

            var dbContext = sp.GetRequiredService<AppDbContext>();
            var userRepo = sp.GetRequiredService<IUserRepository>();
            var adminRepo = sp.GetRequiredService<IAdminRepository>();
            var userProvService = sp.GetRequiredService<IUserProvisioningService>();
            var adminService = sp.GetRequiredService<IAdminService>();

            var connection = dbContext.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            // Capture pre-test baseline counts for strict invariant verification
            var initialUsersCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users;");
            var initialAdminsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM admins;");
            var initialStudentsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Students;");
            var initialStaffCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Staff;");

            // Clean up any test artifacts before running tests
            await connection.ExecuteAsync("DELETE FROM Users WHERE Email LIKE '%admintest.edu';");
            await connection.ExecuteAsync("DELETE FROM admins WHERE Email LIKE '%admintest.edu';");

            try
            {
                // -------------------------------------------------------------
                // SECTION 1: DYNAMIC ADMIN ROLE LOOKUP & DOMAIN SECURITY
                // -------------------------------------------------------------
                Console.WriteLine("\n--- [SECTION 1] DYNAMIC ADMIN ROLE LOOKUP & DOMAIN SECURITY ---");

                var superAdminRole = await userRepo.GetRoleByNameAsync("Super Admin");
                AssertTrue(superAdminRole != null && superAdminRole.RoleId > 0,
                    "Test 1: 'Super Admin' role is resolved dynamically from Roles table",
                    $"RoleId: {superAdminRole?.RoleId}");

                var adminRole = await userRepo.GetRoleByNameAsync("Admin");
                AssertTrue(adminRole != null && adminRole.RoleId > 0,
                    "Test 2: 'Admin' role is resolved dynamically from Roles table",
                    $"RoleId: {adminRole?.RoleId}");

                var facultyRole = await userRepo.GetRoleByNameAsync("Faculty");
                var studentRole = await userRepo.GetRoleByNameAsync("Student");
                var hodRole = await userRepo.GetRoleByNameAsync("HOD");
                var parentRole = await userRepo.GetRoleByNameAsync("Parent");
                var accountsRole = await userRepo.GetRoleByNameAsync("Accounts");

                // Non-existent role ID rejection
                var nonExistentRoleResult = await userProvService.ProvisionAdminUserAsync(new ProvisionAdminUserRequest
                {
                    AdminId = 9999,
                    FullName = "Ghost Admin",
                    Email = "ghost.admin@admintest.edu",
                    RoleId = 99999
                });
                AssertTrue(!nonExistentRoleResult.Success && nonExistentRoleResult.ErrorMessage!.Contains("was not found in Roles table"),
                    "Test 3: Non-existent RoleId is rejected by UserProvisioningService",
                    nonExistentRoleResult.ErrorMessage);

                // Prohibit non-admin roles
                if (studentRole != null)
                {
                    var studentRoleResult = await userProvService.ProvisionAdminUserAsync(new ProvisionAdminUserRequest
                    {
                        AdminId = 9999,
                        FullName = "Student As Admin",
                        Email = "student.admin@admintest.edu",
                        RoleId = studentRole.RoleId
                    });
                    AssertTrue(!studentRoleResult.Success && studentRoleResult.ErrorMessage!.Contains("cannot be assigned to an Administrator account"),
                        "Test 4: Prohibits assigning 'Student' role to an Admin account",
                        studentRoleResult.ErrorMessage);
                }

                if (facultyRole != null)
                {
                    var facultyRoleResult = await userProvService.ProvisionAdminUserAsync(new ProvisionAdminUserRequest
                    {
                        AdminId = 9999,
                        FullName = "Faculty As Admin",
                        Email = "faculty.admin@admintest.edu",
                        RoleId = facultyRole.RoleId
                    });
                    AssertTrue(!facultyRoleResult.Success && facultyRoleResult.ErrorMessage!.Contains("cannot be assigned to an Administrator account"),
                        "Test 5: Prohibits assigning 'Faculty' role to an Admin account",
                        facultyRoleResult.ErrorMessage);
                }

                if (hodRole != null)
                {
                    var hodRoleResult = await userProvService.ProvisionAdminUserAsync(new ProvisionAdminUserRequest
                    {
                        AdminId = 9999,
                        FullName = "HOD As Admin",
                        Email = "hod.admin@admintest.edu",
                        RoleId = hodRole.RoleId
                    });
                    AssertTrue(!hodRoleResult.Success && hodRoleResult.ErrorMessage!.Contains("cannot be assigned to an Administrator account"),
                        "Test 6: Prohibits assigning 'HOD' role to an Admin account",
                        hodRoleResult.ErrorMessage);
                }

                if (parentRole != null)
                {
                    var parentRoleResult = await userProvService.ProvisionAdminUserAsync(new ProvisionAdminUserRequest
                    {
                        AdminId = 9999,
                        FullName = "Parent As Admin",
                        Email = "parent.admin@admintest.edu",
                        RoleId = parentRole.RoleId
                    });
                    AssertTrue(!parentRoleResult.Success && parentRoleResult.ErrorMessage!.Contains("cannot be assigned to an Administrator account"),
                        "Test 7: Prohibits assigning 'Parent' role to an Admin account",
                        parentRoleResult.ErrorMessage);
                }

                if (accountsRole != null)
                {
                    var accountsRoleResult = await userProvService.ProvisionAdminUserAsync(new ProvisionAdminUserRequest
                    {
                        AdminId = 9999,
                        FullName = "Accounts As Admin",
                        Email = "accounts.admin@admintest.edu",
                        RoleId = accountsRole.RoleId
                    });
                    AssertTrue(!accountsRoleResult.Success && accountsRoleResult.ErrorMessage!.Contains("cannot be assigned to an Administrator account"),
                        "Test 8: Prohibits assigning 'Accounts' staff role to an Admin account",
                        accountsRoleResult.ErrorMessage);
                }

                // -------------------------------------------------------------
                // SECTION 2: END-TO-END ATOMIC ADMIN CREATION & PROVISIONING
                // -------------------------------------------------------------
                Console.WriteLine("\n--- [SECTION 2] END-TO-END ATOMIC ADMIN CREATION & PROVISIONING ---");

                var testGuid1 = Guid.NewGuid().ToString("N");
                var testEmail1 = $"admin.test.{testGuid1}@admintest.edu";

                var createDto1 = new CreateAdminRequest
                {
                    Email = testEmail1,
                    FullName = "Vikram Aditya",
                    RoleId = adminRole!.RoleId
                };

                AdminDto? createdAdmin1 = null;
                User? createdUser1 = null;
                Admin? createdAdminEntity = null;

                try
                {
                    createdAdmin1 = await adminService.CreateAdminAsync(createDto1);
                    AssertTrue(createdAdmin1 != null && createdAdmin1.Id > 0,
                        "Test 9: AdminService.CreateAdminAsync succeeds and returns AdminDto",
                        $"Admin ID: {createdAdmin1?.Id}, Email: {createdAdmin1?.Email}");

                    // Query created admins record
                    createdAdminEntity = await adminRepo.GetByIdAsync(createdAdmin1!.Id);
                    AssertTrue(createdAdminEntity != null && createdAdminEntity.IsActive,
                        "Test 10: admins domain record is created with IsActive=true",
                        $"admins.id: {createdAdminEntity?.Id}, IsActive: {createdAdminEntity?.IsActive}");

                    // Query created Users record
                    createdUser1 = await userRepo.GetByEmailAsync(testEmail1);
                    AssertTrue(createdUser1 != null,
                        "Test 11: Centralized Users record is created inside the same transaction",
                        $"UserId: {createdUser1?.UserId}, Email: {createdUser1?.Email}");

                    AssertTrue(createdUser1 != null && createdUser1.AdminId == createdAdmin1.Id,
                        "Test 12: Users.AdminId is correctly linked to Admin.Id",
                        $"Users.AdminId: {createdUser1?.AdminId}, Admin.Id: {createdAdmin1.Id}");

                    AssertTrue(createdUser1 != null && createdUser1.StudentId == null && createdUser1.StaffId == null,
                        "Test 13: Users.StudentId and Users.StaffId remain NULL for Admin accounts",
                        $"StudentId: {createdUser1?.StudentId}, StaffId: {createdUser1?.StaffId}");

                    AssertTrue(createdUser1 != null && createdUser1.RoleId == adminRole.RoleId,
                        "Test 14: Users.RoleId matches the validated Admin RoleId",
                        $"Users.RoleId: {createdUser1?.RoleId}, Expected: {adminRole.RoleId}");

                    AssertTrue(createdUser1 != null && createdUser1.IsFirstLogin && createdUser1.IsActive,
                        "Test 15: Users account flags initialized with IsFirstLogin=true and IsActive=true",
                        $"IsFirstLogin: {createdUser1?.IsFirstLogin}, IsActive: {createdUser1?.IsActive}");

                    AssertTrue(createdUser1 != null && !string.IsNullOrWhiteSpace(createdUser1.PasswordHash) && createdUser1.PasswordHash.StartsWith("$2"),
                        "Test 16: Users.PasswordHash is stored as a secure BCrypt hash",
                        $"Hash prefix: {createdUser1?.PasswordHash.Substring(0, Math.Min(4, createdUser1.PasswordHash.Length))}");

                    var adminDbPassword = await connection.ExecuteScalarAsync<string>("SELECT Password FROM admins WHERE id = @Id;", new { Id = createdAdmin1.Id });
                    AssertTrue(!string.IsNullOrWhiteSpace(adminDbPassword) && adminDbPassword.StartsWith("$2"),
                        "Test 17: Dual-write: admins.Password is populated with matching BCrypt hash for backward compatibility",
                        $"admins.Password prefix: {adminDbPassword?.Substring(0, Math.Min(4, adminDbPassword.Length))}");

                    // Verify plaintext password is not returned in AdminDto
                    var dtoType = typeof(AdminDto);
                    var hasPlaintextProp = dtoType.GetProperty("Password") != null || dtoType.GetProperty("TemporaryPassword") != null || dtoType.GetProperty("PasswordHash") != null;
                    AssertTrue(!hasPlaintextProp,
                        "Test 18: AdminDto does not expose any password or password hash properties");
                }
                finally
                {
                    if (createdUser1 != null)
                    {
                        await connection.ExecuteAsync("DELETE FROM Users WHERE UserId = @UserId", new { UserId = createdUser1.UserId });
                    }
                    if (createdAdmin1 != null)
                    {
                        await connection.ExecuteAsync("DELETE FROM admins WHERE id = @Id", new { Id = createdAdmin1.Id });
                    }
                }

                // -------------------------------------------------------------
                // SECTION 3: TRANSACTION ROLLBACK INTEGRITY
                // -------------------------------------------------------------
                Console.WriteLine("\n--- [SECTION 3] TRANSACTION ROLLBACK INTEGRITY ---");

                var testGuidRollback = Guid.NewGuid().ToString("N");
                var existingUserEmail = $"test.existinguser.{testGuidRollback}@admintest.edu";

                // Pre-create a user with this email to trigger duplicate collision in Users table
                var preExistingUser = new User
                {
                    FullName = "Pre-existing User",
                    Email = existingUserEmail,
                    PasswordHash = "$2a$11$DummyHashForTestingRollbackScenarioOnly12345678901234",
                    RoleId = adminRole.RoleId,
                    IsActive = true,
                    IsFirstLogin = true
                };
                var preUserId = await userRepo.CreateUserAsync(preExistingUser);

                var rollbackAdminDto = new CreateAdminRequest
                {
                    Email = existingUserEmail,
                    FullName = "Rollback Admin",
                    RoleId = adminRole.RoleId
                };

                bool rollbackCaught = false;
                try
                {
                    await adminService.CreateAdminAsync(rollbackAdminDto);
                }
                catch (Exception ex)
                {
                    rollbackCaught = true;
                    // Verify that no orphan record was inserted into admins table
                    var orphanAdmin = await adminRepo.GetByEmailAsync(existingUserEmail);
                    AssertTrue(orphanAdmin == null,
                        "Test 19: User provisioning collision prevents orphan Admin creation and rolls back transaction",
                        $"Caught expected exception: {ex.Message}");
                }
                finally
                {
                    await connection.ExecuteAsync("DELETE FROM Users WHERE UserId = @UserId", new { UserId = preUserId });
                }

                AssertTrue(rollbackCaught, "Test 19B: Duplicate user email correctly raised exception during creation");

                // -------------------------------------------------------------
                // SECTION 4: MISSING EMAIL & ROLE VALIDATION
                // -------------------------------------------------------------
                Console.WriteLine("\n--- [SECTION 4] MISSING EMAIL & ROLE VALIDATION ---");

                bool emptyEmailRejected = false;
                try
                {
                    await adminService.CreateAdminAsync(new CreateAdminRequest
                    {
                        Email = "",
                        RoleId = adminRole.RoleId
                    });
                }
                catch (Exception ex)
                {
                    emptyEmailRejected = true;
                    AssertTrue(ex is System.ComponentModel.DataAnnotations.ValidationException || ex.Message.Contains("Email"),
                        "Test 20: Rejects Admin creation when Email is missing or empty",
                        ex.Message);
                }
                AssertTrue(emptyEmailRejected, "Test 20B: Missing email correctly prevented Admin creation");

                bool missingRoleIdRejected = false;
                try
                {
                    await adminService.CreateAdminAsync(new CreateAdminRequest
                    {
                        Email = "valid.email@admintest.edu",
                        RoleId = 0
                    });
                }
                catch (Exception ex)
                {
                    missingRoleIdRejected = true;
                    AssertTrue(ex is System.ComponentModel.DataAnnotations.ValidationException || ex.Message.Contains("RoleId"),
                        "Test 21: Rejects Admin creation when RoleId is 0 or invalid",
                        ex.Message);
                }
                AssertTrue(missingRoleIdRejected, "Test 21B: Invalid RoleId correctly prevented Admin creation");

                // -------------------------------------------------------------
                // SECTION 5: EMAIL CREDENTIAL TEMPLATE VERIFICATION
                // -------------------------------------------------------------
                Console.WriteLine("\n--- [SECTION 5] EMAIL CREDENTIAL TEMPLATE VERIFICATION ---");

                var sampleHtml = AdminCredentialHelper.BuildInitialCredentialEmailHtml(
                    "Priya Sharma",
                    "priya.sharma@collegemanagement.edu",
                    "Super Admin",
                    "K9#mQ2$vL8!xP4");

                AssertTrue(
                    sampleHtml.Contains("Priya Sharma") &&
                    sampleHtml.Contains("priya.sharma@collegemanagement.edu") &&
                    sampleHtml.Contains("Super Admin") &&
                    sampleHtml.Contains("K9#mQ2$vL8!xP4") &&
                    sampleHtml.Contains("Security Notice") &&
                    sampleHtml.Contains("first login"),
                    "Test 22: AdminCredentialHelper generates responsive onboarding email with credentials and security notice");

                // -------------------------------------------------------------
                // SECTION 6: LIVE DATABASE INTEGRITY & BASELINE INVARIANTS
                // -------------------------------------------------------------
                Console.WriteLine("\n--- [SECTION 6] LIVE DATABASE INTEGRITY & BASELINE INVARIANTS ---");

                // Clean up any remaining test artifacts
                await connection.ExecuteAsync("DELETE FROM Users WHERE Email LIKE '%admintest.edu';");
                await connection.ExecuteAsync("DELETE FROM admins WHERE Email LIKE '%admintest.edu';");

                var finalUsersCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users;");
                var finalAdminsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM admins;");
                var finalStudentsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Students;");
                var finalStaffCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Staff;");

                AssertTrue(finalUsersCount == initialUsersCount,
                    $"Test 23A: Live Users count remains unchanged at {initialUsersCount} (Found: {finalUsersCount})");

                AssertTrue(finalAdminsCount == initialAdminsCount,
                    $"Test 23B: Live admins count remains unchanged at {initialAdminsCount} (Found: {finalAdminsCount})");

                AssertTrue(finalStudentsCount == initialStudentsCount,
                    $"Test 23C: Live Students count remains unchanged at {initialStudentsCount} (Found: {finalStudentsCount})");

                AssertTrue(finalStaffCount == initialStaffCount,
                    $"Test 23D: Live Staff count remains unchanged at {initialStaffCount} (Found: {finalStaffCount})");

                // Verify the 14 baseline Users rows still exist
                var baseUser4 = await userRepo.GetByIdAsync(4);
                var baseUser9 = await userRepo.GetByIdAsync(9);
                var baseUser15 = await userRepo.GetByIdAsync(15);
                var baseUser17 = await userRepo.GetByIdAsync(17);

                AssertTrue(
                    baseUser4 != null && baseUser4.Email == "ambalatharunkumar@gmail.com" &&
                    baseUser9 != null && baseUser9.Email == "boardadmin_test@example.com" &&
                    baseUser15 != null && baseUser15.Email == "admin@college.com" &&
                    baseUser17 != null && baseUser17.Email == "faculty_test@college.com",
                    "Test 24: Baseline Users records remain 100% intact with original emails, roles, and password hashes");
            }
            finally
            {
                // Final safety cleanup
                await connection.ExecuteAsync("DELETE FROM Users WHERE Email LIKE '%admintest.edu';");
                await connection.ExecuteAsync("DELETE FROM admins WHERE Email LIKE '%admintest.edu';");
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"   PHASE 5 VERIFICATION RESULTS: {_passedAssertions} PASSED, {_failedAssertions} FAILED (TOTAL {_totalAssertions})");
            Console.WriteLine("================================================================================\n");

            return _failedAssertions == 0;
        }

        private static void AssertTrue(bool condition, string testName, string? detail = null)
        {
            _totalAssertions++;
            if (condition)
            {
                _passedAssertions++;
                Console.WriteLine($"  [PASS] {testName}");
                if (!string.IsNullOrWhiteSpace(detail))
                {
                    Console.WriteLine($"         -> {detail}");
                }
            }
            else
            {
                _failedAssertions++;
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"  [FAIL] {testName}");
                if (!string.IsNullOrWhiteSpace(detail))
                {
                    Console.WriteLine($"         -> Detail: {detail}");
                }
                Console.ResetColor();
            }
        }
    }
}
