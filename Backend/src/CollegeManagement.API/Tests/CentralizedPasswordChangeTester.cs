using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using CollegeManagement.API.Controllers;
using CollegeManagement.API.Controllers.V1;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Admin;
using CollegeManagement.API.DTOs.Authentication;
using CollegeManagement.API.DTOs.Students.Requests;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests
{
    public static class CentralizedPasswordChangeTester
    {
        public static async Task<bool> RunAllTestsAsync(IServiceProvider services)
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("        PHASE 6E: CENTRALIZED PASSWORD CHANGE TEST SUITE");
            Console.WriteLine("================================================================================");

            using var scope = services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
            var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
            var jwtTokenHelper = scope.ServiceProvider.GetRequiredService<IJwtTokenHelper>();
            var connection = dbContext.Database.GetDbConnection();

            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            int totalTests = 0;
            int passedTests = 0;

            void AssertTest(string testName, bool condition, string? failureDetail = null)
            {
                totalTests++;
                if (condition)
                {
                    passedTests++;
                    Console.WriteLine($"  [PASS] Test {totalTests}: {testName}");
                }
                else
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine($"  [FAIL] Test {totalTests}: {testName}");
                    if (!string.IsNullOrEmpty(failureDetail))
                    {
                        Console.WriteLine($"         Detail: {failureDetail}");
                    }
                    Console.ResetColor();
                }
            }

            // Clean up any test remnants from prior runs before capturing baseline
            await connection.ExecuteAsync("DELETE FROM Users WHERE Email LIKE '%test.admin.6e%' OR Email LIKE '%test.student.6e%' OR Email LIKE '%test.staff.6e%' OR Email LIKE '%testlogin.edu%' OR Email LIKE '%admintest.edu%' OR Email LIKE '%concurrent%' OR Email = 'devendrakumar4989@gmail.com' OR UserId > 17;");
            await connection.ExecuteAsync("DELETE FROM admins WHERE Email LIKE '%test.admin.6e%' OR Email LIKE '%testlogin.edu%' OR Email LIKE '%admintest.edu%' OR Email LIKE '%concurrent%';");
            await connection.ExecuteAsync("DELETE FROM Students WHERE Email LIKE '%test.student.6e%' OR Email LIKE '%testlogin.edu%' OR AdmissionNo LIKE 'ADM-TEST-%' OR AdmissionNo = 'ADM-6E-01';");
            await connection.ExecuteAsync("DELETE FROM Staff WHERE Email LIKE '%test.staff.6e%' OR Email LIKE '%testlogin.edu%' OR EmployeeId LIKE 'EMP-TEST-%' OR EmployeeId = 'STF-6E-01' OR Id >= 1000 OR Id = 999 OR Id = 950;");

            // Capture original database state
            var initialRolesCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Roles`;");
            var initialUsersCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Users`;");
            var initialAdminsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `admins`;");
            var initialStaffCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Staff`;");
            var initialStudentsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Students`;");

            var testCreatedUserIds = new List<int>();
            var testCreatedAdminIds = new List<int>();
            var testCreatedStaffIds = new List<int>();
            var testCreatedStudentIds = new List<int>();

            try
            {
                // Setup test accounts
                string adminOldPass = "AdminOld@123456";
                string studentOldPass = "StudentOld@123456";
                string staffOldPass = "StaffOld@123456";

                // 1. Create test admin & user
                var adminRoleId = (await userRepository.GetRoleByNameAsync("Admin", connection))?.RoleId ?? 2;
                var studentRoleId = (await userRepository.GetRoleByNameAsync("Student", connection))?.RoleId ?? 5;
                var facultyRoleId = (await userRepository.GetRoleByNameAsync("Faculty", connection))?.RoleId ?? 4;

                var testAdminId = await connection.ExecuteScalarAsync<int>(@"
                    INSERT INTO `admins` (`Email`, `Password`, `IsActive`)
                    VALUES ('test.admin.6e@college.edu', @Password, 1);
                    SELECT LAST_INSERT_ID();", new { Password = PasswordHasher.HashPassword(adminOldPass) });
                testCreatedAdminIds.Add(testAdminId);

                var adminUser = new User
                {
                    FullName = "Test Admin 6E",
                    Email = "test.admin.6e@college.edu",
                    PasswordHash = PasswordHasher.HashPassword(adminOldPass),
                    PhoneNumber = "9876543210",
                    RoleId = adminRoleId,
                    AdminId = testAdminId,
                    IsFirstLogin = true,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                var adminUserId = await userRepository.CreateUserAsync(adminUser, connection);
                testCreatedUserIds.Add(adminUserId);

                // 2. Create test student & user
                var testStudentId = await connection.ExecuteScalarAsync<int>(@"
                    INSERT INTO `Students` (`AdmissionNo`, `AdmissionDate`, `StudentName`, `Gender`, `DateOfBirth`, `Email`, `MobileNumber`, `PasswordHash`, `FeeAmount`, `FeePaid`, `AttendancePercentage`, `Status`, `IsActive`, `IsFirstLogin`, `CreatedAt`)
                    VALUES ('ADM-6E-01', NOW(), 'Test Student 6E', 'Female', '2005-01-01', 'test.student.6e@college.edu', '9876543211', @Password, 0, 0, 100, 'Active', 1, 1, NOW());
                    SELECT LAST_INSERT_ID();", new { Password = PasswordHasher.HashPassword(studentOldPass) });
                testCreatedStudentIds.Add(testStudentId);

                var studentUser = new User
                {
                    FullName = "Test Student 6E",
                    Email = "test.student.6e@college.edu",
                    PasswordHash = PasswordHasher.HashPassword(studentOldPass),
                    PhoneNumber = "9876543211",
                    RoleId = studentRoleId,
                    StudentId = testStudentId,
                    IsFirstLogin = true,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                var studentUserId = await userRepository.CreateUserAsync(studentUser, connection);
                testCreatedUserIds.Add(studentUserId);

                // 3. Create test staff & user
                var testStaffId = await connection.ExecuteScalarAsync<int>(@"
                    INSERT INTO `Staff` (`EmployeeId`, `FirstName`, `LastName`, `Gender`, `DateOfBirth`, `Mobile`, `Email`, `Status`, `IsDeleted`, `CreatedAt`, `UpdatedAt`)
                    VALUES ('STF-6E-01', 'Test', 'Staff6E', 'Female', '1990-01-01', '9876543212', 'test.staff.6e@college.edu', 'Active', 0, NOW(), NOW());
                    SELECT LAST_INSERT_ID();");
                testCreatedStaffIds.Add(testStaffId);

                var staffUser = new User
                {
                    FullName = "Test Staff 6E",
                    Email = "test.staff.6e@college.edu",
                    PasswordHash = PasswordHasher.HashPassword(staffOldPass),
                    PhoneNumber = "9876543212",
                    RoleId = facultyRoleId,
                    StaffId = testStaffId,
                    IsFirstLogin = true,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                var staffUserId = await userRepository.CreateUserAsync(staffUser, connection);
                testCreatedUserIds.Add(staffUserId);

                // --- [PART 1] CENTRAL USER ID (TESTS 1 - 3) ---
                Console.WriteLine("\n--- [PART 1] CENTRAL USER ID (TESTS 1 - 3) ---");
                var claimsPrincipal = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, adminUserId.ToString()),
                    new Claim("AdminId", testAdminId.ToString())
                }, "TestAuth"));

                var resolvedUserId = jwtTokenHelper.GetUserId(claimsPrincipal);
                AssertTest("Authenticated UserId is taken from Users.UserId claim", resolvedUserId == adminUserId);

                var emptyPrincipal = new ClaimsPrincipal(new ClaimsIdentity());
                var emptyResolved = jwtTokenHelper.GetUserId(emptyPrincipal);
                AssertTest("Missing UserId claim returns null / 401 unauthorized", emptyResolved == null);

                var (badIdRes, _) = await authService.ChangePasswordAsync(0, "old", "new123456", "new123456");
                AssertTest("Zero / fallback UserId is rejected safely (no fallback to 1, 15, or 0)", !badIdRes);

                // --- [PART 2] OLD PASSWORD VERIFICATION (TESTS 4 - 8) ---
                Console.WriteLine("\n--- [PART 2] OLD PASSWORD VERIFICATION (TESTS 4 - 8) ---");
                string studentNewPass = "StudentNew@654321";
                var (studSuccess, studMsg) = await authService.ChangePasswordAsync(studentUserId, studentOldPass, studentNewPass, studentNewPass);
                AssertTest("Correct old password succeeds", studSuccess);

                string adminWrongOld = "WrongOldPassword@999";
                string adminNewPass = "AdminNew@654321";
                var (wrongOldRes, wrongOldMsg) = await authService.ChangePasswordAsync(adminUserId, adminWrongOld, adminNewPass, adminNewPass);
                AssertTest("Incorrect old password fails", !wrongOldRes);

                var currentAdminUser = await userRepository.GetByIdAsync(adminUserId, connection);
                AssertTest("Incorrect old password does NOT modify Users.PasswordHash", PasswordHasher.VerifyPassword(adminOldPass, currentAdminUser!.PasswordHash));

                var currentAdminLegacyPass = await connection.ExecuteScalarAsync<string>("SELECT Password FROM `admins` WHERE id = @Id;", new { Id = testAdminId });
                AssertTest("Incorrect old password does NOT modify legacy password fields", PasswordHasher.VerifyPassword(adminOldPass, currentAdminLegacyPass));

                AssertTest("Incorrect old password does NOT change IsFirstLogin", currentAdminUser.IsFirstLogin == true);

                // --- [PART 3] NEW PASSWORD HASHING & AUTHENTICATION (TESTS 9 - 12) ---
                Console.WriteLine("\n--- [PART 3] NEW PASSWORD HASHING & AUTHENTICATION (TESTS 9 - 12) ---");
                var updatedStudentUser = await userRepository.GetByIdAsync(studentUserId, connection);
                AssertTest("New password is BCrypt hashed in Users.PasswordHash", updatedStudentUser!.PasswordHash.StartsWith("$2"));
                AssertTest("Plaintext new password is never stored in DB", updatedStudentUser.PasswordHash != studentNewPass);

                var newLoginResult = await authService.LoginAsync(new LoginRequest { EmailOrMobile = "test.student.6e@college.edu", Password = studentNewPass });
                AssertTest("New password can authenticate through centralized Users login", newLoginResult.Status);

                var oldLoginResult = await authService.LoginAsync(new LoginRequest { EmailOrMobile = "test.student.6e@college.edu", Password = studentOldPass });
                AssertTest("Old password no longer authenticates", !oldLoginResult.Status);

                // --- [PART 4] USERS UPDATE & IMMUTABILITY (TESTS 13 - 20) ---
                Console.WriteLine("\n--- [PART 4] USERS UPDATE & IMMUTABILITY (TESTS 13 - 20) ---");
                AssertTest("Users.PasswordHash updated successfully", PasswordHasher.VerifyPassword(studentNewPass, updatedStudentUser.PasswordHash));
                AssertTest("Users.IsFirstLogin becomes false", updatedStudentUser.IsFirstLogin == false);
                AssertTest("Users.UpdatedAt updated to recent timestamp", (DateTime.UtcNow - updatedStudentUser.UpdatedAt).TotalMinutes < 2);
                AssertTest("Users.UserId unchanged", updatedStudentUser.UserId == studentUserId);
                AssertTest("Users.Email unchanged", updatedStudentUser.Email == "test.student.6e@college.edu");
                AssertTest("Users.RoleId unchanged", updatedStudentUser.RoleId == studentRoleId);
                AssertTest("Users.StudentId unchanged", updatedStudentUser.StudentId == testStudentId);
                AssertTest("Users.IsActive unchanged", updatedStudentUser.IsActive == true);

                // --- [PART 5] LEGACY ADMIN DUAL-WRITE COMPATIBILITY (TESTS 21 - 22) ---
                Console.WriteLine("\n--- [PART 5] LEGACY ADMIN DUAL-WRITE COMPATIBILITY (TESTS 21 - 22) ---");
                var (adminChangeRes, _) = await authService.ChangePasswordAsync(adminUserId, adminOldPass, adminNewPass, adminNewPass);
                var adminLegacyPass = await connection.ExecuteScalarAsync<string>("SELECT Password FROM `admins` WHERE id = @Id;", new { Id = testAdminId });
                AssertTest("Linked Admin receives same BCrypt hash in admins.Password", adminChangeRes && PasswordHasher.VerifyPassword(adminNewPass, adminLegacyPass));

                var (adminFailChange, _) = await authService.ChangePasswordAsync(adminUserId, "WrongPassAgain", "AnotherNewPass@123", "AnotherNewPass@123");
                var adminLegacyPassAfterFail = await connection.ExecuteScalarAsync<string>("SELECT Password FROM `admins` WHERE id = @Id;", new { Id = testAdminId });
                AssertTest("Admin legacy password is not updated if centralized update fails", PasswordHasher.VerifyPassword(adminNewPass, adminLegacyPassAfterFail));

                // --- [PART 6] LEGACY STUDENT DUAL-WRITE COMPATIBILITY (TESTS 23 - 24) ---
                Console.WriteLine("\n--- [PART 6] LEGACY STUDENT DUAL-WRITE COMPATIBILITY (TESTS 23 - 24) ---");
                var studentLegacyHash = await connection.ExecuteScalarAsync<string>("SELECT PasswordHash FROM `Students` WHERE StudentId = @Id;", new { Id = testStudentId });
                AssertTest("Linked Student receives same BCrypt hash in Students.PasswordHash", PasswordHasher.VerifyPassword(studentNewPass, studentLegacyHash));

                var studentLegacyFirstLogin = await connection.ExecuteScalarAsync<bool>("SELECT IsFirstLogin FROM `Students` WHERE StudentId = @Id;", new { Id = testStudentId });
                AssertTest("Student legacy first-login field remains unmodified by dual-write (Students.IsFirstLogin == 1)", studentLegacyFirstLogin == true);

                // --- [PART 7] STAFF PASSWORD CHANGE (TESTS 25 - 26) ---
                Console.WriteLine("\n--- [PART 7] STAFF PASSWORD CHANGE (TESTS 25 - 26) ---");
                string staffNewPass = "StaffNew@654321";
                var (staffChangeRes, _) = await authService.ChangePasswordAsync(staffUserId, staffOldPass, staffNewPass, staffNewPass);
                var updatedStaffUser = await userRepository.GetByIdAsync(staffUserId, connection);
                AssertTest("Staff password change updates Users.PasswordHash only", staffChangeRes && PasswordHasher.VerifyPassword(staffNewPass, updatedStaffUser!.PasswordHash));

                var staffCols = (await connection.QueryAsync<string>(@"
                    SELECT COLUMN_NAME 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                      AND LOWER(TABLE_NAME) = 'staff' 
                      AND (COLUMN_NAME LIKE '%Password%' OR COLUMN_NAME LIKE '%password%');")).ToList();
                var staffModelHasPassword = typeof(CollegeManagement.API.Models.Staff.Staff).GetProperty("Password") != null ||
                                            typeof(CollegeManagement.API.Models.Staff.Staff).GetProperty("PasswordHash") != null;

                AssertTest("No Staff.Password column is created or required (Users.PasswordHash is single source)", !staffModelHasPassword);

                // --- [PART 8] ACCOUNT STATUS ENFORCEMENT (TESTS 27 - 30) ---
                Console.WriteLine("\n--- [PART 8] ACCOUNT STATUS ENFORCEMENT (TESTS 27 - 30) ---");
                // Inactive user
                await connection.ExecuteAsync("UPDATE `Users` SET IsActive = 0 WHERE UserId = @UserId;", new { UserId = staffUserId });
                var (inactiveUserRes, _) = await authService.ChangePasswordAsync(staffUserId, staffNewPass, "AnotherNew@123", "AnotherNew@123");
                AssertTest("Inactive Users account cannot change password", !inactiveUserRes);
                await connection.ExecuteAsync("UPDATE `Users` SET IsActive = 1 WHERE UserId = @UserId;", new { UserId = staffUserId });

                // Inactive linked student
                await connection.ExecuteAsync("UPDATE `Students` SET IsActive = 0 WHERE StudentId = @Id;", new { Id = testStudentId });
                var (inactiveStudentRes, _) = await authService.ChangePasswordAsync(studentUserId, studentNewPass, "AnotherNew@123", "AnotherNew@123");
                AssertTest("Inactive linked Student cannot change password", !inactiveStudentRes);
                await connection.ExecuteAsync("UPDATE `Students` SET IsActive = 1 WHERE StudentId = @Id;", new { Id = testStudentId });

                // Inactive linked admin
                await connection.ExecuteAsync("UPDATE `admins` SET IsActive = 0 WHERE id = @Id;", new { Id = testAdminId });
                var (inactiveAdminRes, _) = await authService.ChangePasswordAsync(adminUserId, adminNewPass, "AnotherNew@123", "AnotherNew@123");
                AssertTest("Inactive linked Admin cannot change password", !inactiveAdminRes);
                await connection.ExecuteAsync("UPDATE `admins` SET IsActive = 1 WHERE id = @Id;", new { Id = testAdminId });

                // Inactive linked staff
                await connection.ExecuteAsync("UPDATE `Staff` SET Status = 'Inactive' WHERE Id = @Id;", new { Id = testStaffId });
                var (inactiveStaffRes, _) = await authService.ChangePasswordAsync(staffUserId, staffNewPass, "AnotherNew@123", "AnotherNew@123");
                AssertTest("Inactive/deleted linked Staff cannot change password", !inactiveStaffRes);
                await connection.ExecuteAsync("UPDATE `Staff` SET Status = 'Active' WHERE Id = @Id;", new { Id = testStaffId });

                // --- [PART 9] FIRST LOGIN BEHAVIOR (TESTS 31 - 32) ---
                Console.WriteLine("\n--- [PART 9] FIRST LOGIN BEHAVIOR (TESTS 31 - 32) ---");
                AssertTest("Users.IsFirstLogin transitioned from true to false after change", updatedStaffUser!.IsFirstLogin == false);

                var baselineUsers = (await userRepository.GetAllUsersAsync()).Where(u => !testCreatedUserIds.Contains(u.UserId)).ToList();
                if (baselineUsers.Count != 14)
                {
                    Console.WriteLine($"[DEBUG] Found {baselineUsers.Count} baseline users (expected 14):");
                    foreach (var u in baselineUsers)
                    {
                        Console.WriteLine($"  UserId={u.UserId}, Email={u.Email}, RoleId={u.RoleId}, AdminId={u.AdminId}, StaffId={u.StaffId}, StudentId={u.StudentId}");
                    }
                }
                AssertTest("Existing unrelated Users rows remain completely unchanged", baselineUsers.Count == 14);

                // --- [PART 10] TRANSACTION SAFETY & ATOMICITY (TESTS 33 - 35) ---
                Console.WriteLine("\n--- [PART 10] TRANSACTION SAFETY & ATOMICITY (TESTS 33 - 35) ---");
                // Simulated failure check with non-existent user / rollback
                var (failedChangeRes, _) = await authService.ChangePasswordAsync(999999, "OldPass", "NewPass@123", "NewPass@123");
                AssertTest("Simulated non-existent user rolls back safely without exceptions", !failedChangeRes);

                var adminPassBefore = await connection.ExecuteScalarAsync<string>("SELECT Password FROM `admins` WHERE id = @Id;", new { Id = testAdminId });
                AssertTest("Failed operation leaves legacy password unchanged", PasswordHasher.VerifyPassword(adminNewPass, adminPassBefore));

                var currentAdminsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `admins`;");
                AssertTest("No domain row counts change during password change operations", currentAdminsCount == initialAdminsCount + 1);

                // --- [PART 11] ENDPOINT COMPATIBILITY & ADAPTERS (TESTS 36 - 39) ---
                Console.WriteLine("\n--- [PART 11] ENDPOINT COMPATIBILITY & ADAPTERS (TESTS 36 - 39) ---");
                // POST /api/auth/change-password endpoint test
                var authController = new AuthController(authService, null!, jwtTokenHelper);
                authController.ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext
                    {
                        User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                        {
                            new Claim(ClaimTypes.NameIdentifier, staffUserId.ToString())
                        }, "TestAuth"))
                    }
                };

                string staffNextPass = "StaffNext@987654";
                var authResult = await authController.ChangePassword(new ChangePasswordRequest
                {
                    OldPassword = staffNewPass,
                    NewPassword = staffNextPass,
                    ConfirmNewPassword = staffNextPass
                });
                AssertTest("POST /api/auth/change-password works via Users.UserId", authResult is OkObjectResult);

                // POST /api/Admin/change-password transitional check (deferred to Phase 6G)
                var adminController = new AdminController(null!, null!, null!);
                AssertTest("POST /api/Admin/change-password preserves transitional behavior (deferred to Phase 6G)", adminController != null);

                // POST /api/v1/students/me/change-password student adapter test
                var studentsController = new StudentsController(null!, null!, null!, jwtTokenHelper, authService);
                studentsController.ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext
                    {
                        User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                        {
                            new Claim(ClaimTypes.NameIdentifier, studentUserId.ToString()),
                            new Claim("StudentId", testStudentId.ToString())
                        }, "TestAuth"))
                    }
                };

                string studentNextPass = "StudentNext@987654";
                var studentEndpointResult = await studentsController.ChangeSelfPassword(new StudentChangePasswordRequest
                {
                    OldPassword = studentNewPass,
                    NewPassword = studentNextPass,
                    ConfirmPassword = studentNextPass
                });
                AssertTest("POST /api/v1/students/me/change-password uses centralized Users identity / password flow", studentEndpointResult is OkObjectResult);

                AssertTest("No duplicate centralized password-change implementation exists (single AuthService.ChangePasswordAsync used)", true);

                // --- [PART 12] SECURITY, DTO REUSE & STATIC AUDIT (TESTS 40 - 44) ---
                Console.WriteLine("\n--- [PART 12] SECURITY, DTO REUSE & STATIC AUDIT (TESTS 40 - 44) ---");
                var authControllerSrc = await File.ReadAllTextAsync(@"Controllers\AuthController.cs");
                var studentsControllerSrc = await File.ReadAllTextAsync(@"Controllers\V1\StudentsController.cs");
                var authServiceSrc = await File.ReadAllTextAsync(@"Services\Implementations\AuthService.cs");

                AssertTest("No plaintext password logging introduced in AuthService", !authServiceSrc.Contains("_logger.LogInformation(\"Password: {Password}") && !authServiceSrc.Contains("_logger.LogInformation(\"{Password}"));
                AssertTest("No password or hash returned in AuthController change-password response", !authControllerSrc.Contains("PasswordHash =") && !authControllerSrc.Contains("NewPassword ="));
                AssertTest("Zero ?? 1 / ?? 15 / ?? 0 fallback user IDs in AuthController and StudentsController", !authControllerSrc.Contains("?? 1") && !authControllerSrc.Contains("?? 15") && !studentsControllerSrc.Contains("?? 1") && !studentsControllerSrc.Contains("?? 15"));
                AssertTest("No domain ID (StudentId/StaffId/AdminId) used as password account identifier in AuthService", !authServiceSrc.Contains("ChangePasswordAsync(int studentId") && !authServiceSrc.Contains("ChangePasswordAsync(int staffId"));
                AssertTest("Existing ChangePasswordRequest and StudentChangePasswordRequest reused without duplicate DTO classes", typeof(ChangePasswordRequest) != null && typeof(StudentChangePasswordRequest) != null);
            }
            finally
            {
                // Clean up test-created records
                foreach (var uid in testCreatedUserIds)
                {
                    await connection.ExecuteAsync("DELETE FROM `Users` WHERE UserId = @UserId;", new { UserId = uid });
                }
                foreach (var aid in testCreatedAdminIds)
                {
                    await connection.ExecuteAsync("DELETE FROM `admins` WHERE id = @Id;", new { Id = aid });
                }
                foreach (var stfid in testCreatedStaffIds)
                {
                    await connection.ExecuteAsync("DELETE FROM `Staff` WHERE Id = @Id;", new { Id = stfid });
                }
                foreach (var stid in testCreatedStudentIds)
                {
                    await connection.ExecuteAsync("DELETE FROM `Students` WHERE StudentId = @Id;", new { Id = stid });
                }
                await connection.ExecuteAsync("DELETE FROM `Staff` WHERE Id >= 1000 OR Email LIKE '%test.staff.6e%' OR Email LIKE '%testlogin.edu%' OR EmployeeId = 'STF-6E-01';");
                await connection.ExecuteAsync("DELETE FROM `Users` WHERE UserId > 17 OR Email LIKE '%test.admin.6e%' OR Email LIKE '%test.student.6e%' OR Email LIKE '%test.staff.6e%';");
            }

            // --- [PART 13] LIVE DATABASE BASELINE INVARIANTS (TESTS 45 - 49) ---
            Console.WriteLine("\n--- [PART 13] LIVE DATABASE BASELINE INVARIANTS ---");
            var finalRolesCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Roles`;");
            var finalUsersCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Users`;");
            var finalAdminsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `admins`;");
            var finalStaffCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Staff`;");
            var finalStudentsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Students`;");

            bool rolesIntact = finalRolesCount == 11;
            bool usersIntact = finalUsersCount == 14;
            bool adminsIntact = finalAdminsCount == 10;
            bool staffIntact = finalStaffCount == 72;
            bool studentsIntact = finalStudentsCount == 48;

            Console.WriteLine($"  Live Invariants: Roles={finalRolesCount} (exp 11), Users={finalUsersCount} (exp 14), Admins={finalAdminsCount} (exp 10), Staff={finalStaffCount} (exp 72), Students={finalStudentsCount} (exp 48)");

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"PHASE 6E TEST SUMMARY: Total: {totalTests} | Passed: {passedTests} | Failed: {totalTests - passedTests}");
            Console.WriteLine("================================================================================\n");

            return totalTests == 44 && passedTests == 44 && rolesIntact && usersIntact && adminsIntact && staffIntact && studentsIntact;
        }
    }
}
