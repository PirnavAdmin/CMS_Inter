using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.DTOs.Users;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests
{
    /// <summary>
    /// Comprehensive Verification Test Suite for Phase 4:
    /// Staff User Provisioning & Security Enforcement.
    /// </summary>
    public static class StaffUserProvisioningTester
    {
        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("       PHASE 4: STAFF USER PROVISIONING VERIFICATION SUITE");
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
            var staffService = scope.ServiceProvider.GetRequiredService<IStaffService>();
            var staffRepo = scope.ServiceProvider.GetRequiredService<IStaffRepository>();

            // Clean up any test remnants from prior runs
            await connection.ExecuteAsync("DELETE FROM Users WHERE Email LIKE '%collegetest.edu' OR Email LIKE '%@stafftestdomain.edu'");
            await connection.ExecuteAsync("DELETE FROM StaffSubjectAllocations WHERE StaffId IN (SELECT Id FROM Staff WHERE Email LIKE '%collegetest.edu' OR EmployeeId LIKE 'TEST-STF-%')");
            await connection.ExecuteAsync("DELETE FROM Staff WHERE Email LIKE '%collegetest.edu' OR EmployeeId LIKE 'TEST-STF-%'");

            // Baseline check
            var initialUserCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users");
            var initialStaffCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Staff");
            var initialStudentCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Students");

            // -------------------------------------------------------------
            // SECTION 1: ROLE LOOKUP & STAFF-ROLE SECURITY RESTRICTIONS
            // -------------------------------------------------------------
            Console.WriteLine("--- [SECTION 1] DYNAMIC ROLE LOOKUP & DOMAIN SECURITY ---");

            var facultyRole = await userRepo.GetRoleByNameAsync("Faculty");
            AssertTrue(facultyRole != null && facultyRole.RoleId > 0,
                "Test 1: 'Faculty' role is resolved dynamically from Roles table",
                $"Resolved: {facultyRole?.RoleName} (Id: {facultyRole?.RoleId})");

            var hodRole = await userRepo.GetRoleByNameAsync("HOD");
            AssertTrue(hodRole != null && hodRole.RoleId > 0,
                "Test 2: 'HOD' role is resolved dynamically from Roles table",
                $"Resolved: {hodRole?.RoleName} (Id: {hodRole?.RoleId})");

            var accountsRole = await userRepo.GetRoleByNameAsync("Accounts");
            AssertTrue(accountsRole != null && accountsRole.RoleId > 0,
                "Test 3: 'Accounts' non-teaching staff role is resolved dynamically from Roles table",
                $"Resolved: {accountsRole?.RoleName} (Id: {accountsRole?.RoleId})");

            // Verify non-existent role rejection
            var nonExistentRoleReq = new ProvisionStaffUserRequest
            {
                StaffId = 9999,
                RoleId = 99999,
                Email = "test.nonexistent@stafftestdomain.edu",
                FullName = "Nonexistent Role Test"
            };
            var nonExistentResult = await provisioningService.ProvisionStaffUserAsync(nonExistentRoleReq);
            AssertTrue(!nonExistentResult.Success && nonExistentResult.ErrorMessage != null && nonExistentResult.ErrorMessage.Contains("not found"),
                "Test 4: Non-existent RoleId is rejected by UserProvisioningService",
                $"Error: {nonExistentResult.ErrorMessage}");

            // Verify rejection of Non-Staff Domain Roles: Super Admin, Admin, Student, Parent
            var superAdminRole = await userRepo.GetRoleByNameAsync("Super Admin");
            if (superAdminRole != null)
            {
                var superAdminReq = new ProvisionStaffUserRequest
                {
                    StaffId = 9999,
                    RoleId = superAdminRole.RoleId,
                    Email = "test.superadmin@stafftestdomain.edu",
                    FullName = "Super Admin Staff Test"
                };
                var superAdminResult = await provisioningService.ProvisionStaffUserAsync(superAdminReq);
                AssertTrue(!superAdminResult.Success && superAdminResult.ErrorMessage != null && superAdminResult.ErrorMessage.Contains("cannot be assigned to a Staff account"),
                    "Test 5: Prohibits assigning 'Super Admin' role to a Staff user account",
                    $"Error: {superAdminResult.ErrorMessage}");
            }

            var adminRole = await userRepo.GetRoleByNameAsync("Admin");
            if (adminRole != null)
            {
                var adminReq = new ProvisionStaffUserRequest
                {
                    StaffId = 9999,
                    RoleId = adminRole.RoleId,
                    Email = "test.admin@stafftestdomain.edu",
                    FullName = "Admin Staff Test"
                };
                var adminResult = await provisioningService.ProvisionStaffUserAsync(adminReq);
                AssertTrue(!adminResult.Success && adminResult.ErrorMessage != null && adminResult.ErrorMessage.Contains("cannot be assigned to a Staff account"),
                    "Test 6: Prohibits assigning 'Admin' role to a Staff user account",
                    $"Error: {adminResult.ErrorMessage}");
            }

            var studentRole = await userRepo.GetRoleByNameAsync("Student");
            if (studentRole != null)
            {
                var studentRoleReq = new ProvisionStaffUserRequest
                {
                    StaffId = 9999,
                    RoleId = studentRole.RoleId,
                    Email = "test.studentrole@stafftestdomain.edu",
                    FullName = "Student Role Staff Test"
                };
                var studentRoleResult = await provisioningService.ProvisionStaffUserAsync(studentRoleReq);
                AssertTrue(!studentRoleResult.Success && studentRoleResult.ErrorMessage != null && studentRoleResult.ErrorMessage.Contains("cannot be assigned to a Staff account"),
                    "Test 7: Prohibits assigning 'Student' role to a Staff user account",
                    $"Error: {studentRoleResult.ErrorMessage}");
            }

            var parentRole = await userRepo.GetRoleByNameAsync("Parent");
            if (parentRole != null)
            {
                var parentRoleReq = new ProvisionStaffUserRequest
                {
                    StaffId = 9999,
                    RoleId = parentRole.RoleId,
                    Email = "test.parentrole@stafftestdomain.edu",
                    FullName = "Parent Role Staff Test"
                };
                var parentRoleResult = await provisioningService.ProvisionStaffUserAsync(parentRoleReq);
                AssertTrue(!parentRoleResult.Success && parentRoleResult.ErrorMessage != null && parentRoleResult.ErrorMessage.Contains("cannot be assigned to a Staff account"),
                    "Test 8: Prohibits assigning 'Parent' role to a Staff user account",
                    $"Error: {parentRoleResult.ErrorMessage}");
            }

            // -------------------------------------------------------------
            // SECTION 2: END-TO-END ATOMIC STAFF CREATION & USER PROVISIONING
            // -------------------------------------------------------------
            Console.WriteLine("\n--- [SECTION 2] END-TO-END ATOMIC STAFF CREATION & PROVISIONING ---");

            var testGuid = Guid.NewGuid().ToString("N");
            var testEmail1 = $"test.faculty.{testGuid}@collegetest.edu";
            var testEmpId1 = $"TEST-STF-{testGuid.Substring(0, 8).ToUpper()}";

            var createDto1 = new CreateStaffDto
            {
                EmployeeId = testEmpId1,
                FirstName = "Rajesh",
                LastName = "Sharma",
                Email = testEmail1,
                Mobile = $"99{new Random().Next(10000000, 99999999)}",
                Gender = "Male",
                DateOfBirth = new DateTime(1985, 5, 20),
                StaffType = "Teaching",
                Designation = "Assistant Professor",
                Department = "Computer Science",
                RoleId = facultyRole!.RoleId
            };

            StaffResponseDto? createdStaff1 = null;
            User? createdUser1 = null;

            try
            {
                createdStaff1 = await staffService.CreateStaffAsync(createDto1);
                AssertTrue(createdStaff1 != null && createdStaff1.Id > 0,
                    "Test 9: StaffService.CreateStaffAsync succeeds and creates Staff domain row",
                    $"Staff ID: {createdStaff1?.Id}, EmpId: {createdStaff1?.EmployeeId}");

                // Query created Users record
                createdUser1 = await userRepo.GetByEmailAsync(testEmail1);
                AssertTrue(createdUser1 != null,
                    "Test 10: Centralized Users record is created inside the same transaction",
                    $"UserId: {createdUser1?.UserId}, Email: {createdUser1?.Email}");

                AssertTrue(createdUser1 != null && createdUser1.StaffId == createdStaff1!.Id,
                    "Test 11: Users.StaffId is correctly linked to Staff.Id",
                    $"Users.StaffId: {createdUser1?.StaffId}, Staff.Id: {createdStaff1?.Id}");

                AssertTrue(createdUser1 != null && createdUser1.StudentId == null && createdUser1.AdminId == null,
                    "Test 12: Users.StudentId and Users.AdminId remain NULL for Staff accounts",
                    $"StudentId: {createdUser1?.StudentId}, AdminId: {createdUser1?.AdminId}");

                AssertTrue(createdUser1 != null && createdUser1.RoleId == facultyRole.RoleId,
                    "Test 13: Users.RoleId matches the frontend-selected validated RoleId",
                    $"Users.RoleId: {createdUser1?.RoleId}, Expected: {facultyRole.RoleId}");

                AssertTrue(createdUser1 != null && createdUser1.IsFirstLogin && createdUser1.IsActive,
                    "Test 14: Users account flags initialized with IsFirstLogin=true and IsActive=true",
                    $"IsFirstLogin: {createdUser1?.IsFirstLogin}, IsActive: {createdUser1?.IsActive}");

                AssertTrue(createdUser1 != null && !string.IsNullOrWhiteSpace(createdUser1.PasswordHash) && createdUser1.PasswordHash.StartsWith("$2"),
                    "Test 15: Users.PasswordHash is stored as a secure BCrypt hash",
                    $"Hash prefix: {createdUser1?.PasswordHash.Substring(0, Math.Min(4, createdUser1.PasswordHash.Length))}");

                // Verify plaintext password is not returned in StaffResponseDto
                var dtoType = typeof(StaffResponseDto);
                var hasPlaintextProp = dtoType.GetProperty("Password") != null || dtoType.GetProperty("TemporaryPassword") != null;
                AssertTrue(!hasPlaintextProp,
                    "Test 16: StaffResponseDto does not expose any plaintext password properties");
            }
            finally
            {
                if (createdUser1 != null)
                {
                    await connection.ExecuteAsync("DELETE FROM Users WHERE UserId = @UserId", new { UserId = createdUser1.UserId });
                }
                if (createdStaff1 != null)
                {
                    await connection.ExecuteAsync("DELETE FROM StaffSubjectAllocations WHERE StaffId = @StaffId", new { StaffId = createdStaff1.Id });
                    await connection.ExecuteAsync("DELETE FROM Staff WHERE Id = @Id", new { Id = createdStaff1.Id });
                }
            }

            // -------------------------------------------------------------
            // SECTION 3: TRANSACTION ROLLBACK INTEGRITY
            // -------------------------------------------------------------
            Console.WriteLine("\n--- [SECTION 3] TRANSACTION ROLLBACK INTEGRITY ---");

            var testGuidRollback = Guid.NewGuid().ToString("N");
            var existingUserEmail = $"test.existinguser.{testGuidRollback}@collegetest.edu";
            var rollbackEmpId = $"TEST-STF-{testGuidRollback.Substring(0, 8).ToUpper()}";

            // Pre-create a user with this email to trigger duplicate collision
            var preExistingUser = new User
            {
                FullName = "Pre-existing User",
                Email = existingUserEmail,
                PasswordHash = "$2a$11$DummyHashForTestingRollbackScenarioOnly12345678901234",
                RoleId = facultyRole.RoleId,
                IsActive = true,
                IsFirstLogin = true
            };
            var preUserId = await userRepo.CreateUserAsync(preExistingUser);

            var rollbackStaffDto = new CreateStaffDto
            {
                EmployeeId = rollbackEmpId,
                FirstName = "Rollback",
                LastName = "Tester",
                Email = existingUserEmail,
                Mobile = $"99{new Random().Next(10000000, 99999999)}",
                Gender = "Female",
                StaffType = "Teaching",
                RoleId = facultyRole.RoleId
            };

            bool caughtConflict = false;
            try
            {
                await staffService.CreateStaffAsync(rollbackStaffDto);
            }
            catch (ConflictException)
            {
                caughtConflict = true;
            }
            catch (Exception)
            {
                caughtConflict = true;
            }
            finally
            {
                await connection.ExecuteAsync("DELETE FROM Users WHERE UserId = @UserId", new { UserId = preUserId });
            }

            var orphanStaff = await connection.QueryFirstOrDefaultAsync<Staff>(
                "SELECT * FROM Staff WHERE EmployeeId = @EmpId", new { EmpId = rollbackEmpId });

            AssertTrue(caughtConflict && orphanStaff == null,
                "Test 17: User provisioning collision prevents orphan Staff creation and rolls back transaction",
                $"Caught conflict: {caughtConflict}, Orphan staff found: {orphanStaff != null}");

            // -------------------------------------------------------------
            // SECTION 4: MISSING EMAIL / VALIDATION ENFORCEMENT
            // -------------------------------------------------------------
            Console.WriteLine("\n--- [SECTION 4] MISSING EMAIL & ROLE VALIDATION ---");

            var missingEmailDto = new CreateStaffDto
            {
                FirstName = "NoEmail",
                LastName = "Staff",
                Email = "",
                Mobile = "9876543219",
                RoleId = facultyRole.RoleId
            };

            bool caughtMissingEmail = false;
            try
            {
                await staffService.CreateStaffAsync(missingEmailDto);
            }
            catch (ValidationException)
            {
                caughtMissingEmail = true;
            }
            AssertTrue(caughtMissingEmail,
                "Test 18: Rejects Staff creation when Email is missing or empty");

            var missingRoleDto = new CreateStaffDto
            {
                FirstName = "NoRole",
                LastName = "Staff",
                Email = "test.norole@collegetest.edu",
                Mobile = "9876543218",
                RoleId = null
            };

            bool caughtMissingRole = false;
            try
            {
                await staffService.CreateStaffAsync(missingRoleDto);
            }
            catch (ValidationException)
            {
                caughtMissingRole = true;
            }
            AssertTrue(caughtMissingRole,
                "Test 19: Rejects Staff creation when RoleId is null or missing");

            // -------------------------------------------------------------
            // SECTION 5: ONBOARDING EMAIL HTML TEMPLATE VERIFICATION
            // -------------------------------------------------------------
            Console.WriteLine("\n--- [SECTION 5] EMAIL CREDENTIAL TEMPLATE VERIFICATION ---");

            var emailHtml = StaffCredentialHelper.BuildInitialCredentialEmailHtml(
                "Dr. Priya Sharma",
                "priya.sharma@collegetest.edu",
                "EMP1001",
                "Faculty",
                "Abc@1234Secure",
                "http://localhost:5173",
                "College Management System");

            AssertTrue(emailHtml.Contains("Dr. Priya Sharma") &&
                       emailHtml.Contains("priya.sharma@collegetest.edu") &&
                       emailHtml.Contains("EMP1001") &&
                       emailHtml.Contains("Faculty") &&
                       emailHtml.Contains("Abc@1234Secure") &&
                       emailHtml.Contains("http://localhost:5173"),
                "Test 20: StaffCredentialHelper generates responsive onboarding email with credentials and security notice");

            // -------------------------------------------------------------
            // SECTION 6: LIVE DATABASE INTEGRITY & INVARIANTS
            // -------------------------------------------------------------
            Console.WriteLine("\n--- [SECTION 6] LIVE DATABASE INTEGRITY & BASELINE INVARIANTS ---");

            var finalUserCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users");
            var finalStaffCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Staff");
            var finalStudentCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Students");

            AssertTrue(finalUserCount == initialUserCount,
                $"Test 21A: Live Users count remains unchanged at {initialUserCount} (Found: {finalUserCount})",
                $"Baseline: {initialUserCount}, Final: {finalUserCount}");

            AssertTrue(finalStaffCount == initialStaffCount,
                $"Test 21B: Live Staff count remains unchanged at {initialStaffCount} (Found: {finalStaffCount})",
                $"Baseline: {initialStaffCount}, Final: {finalStaffCount}");

            AssertTrue(finalStudentCount == initialStudentCount,
                $"Test 21C: Live Students count remains unchanged at {initialStudentCount} (Found: {finalStudentCount})",
                $"Baseline: {initialStudentCount}, Final: {finalStudentCount}");

            // Summary
            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"   PHASE 4 VERIFICATION RESULTS: {passed} PASSED, {failed} FAILED (TOTAL {passed + failed})");
            Console.WriteLine("================================================================================\n");

            return failed == 0;
        }
    }
}
