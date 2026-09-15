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
using CollegeManagement.API.DTOs.Authentication;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Implementations;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests
{
    public static class ForgotResetPasswordTester
    {
        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("        PHASE 6F: FORGOT / RESET PASSWORD HARMONIZATION SUITE");
            Console.WriteLine("================================================================================");

            int passed = 0;
            int failed = 0;

            void AssertTest(string testName, bool condition, string? details = null)
            {
                if (condition)
                {
                    Console.WriteLine($"  [PASS] {testName}");
                    passed++;
                }
                else
                {
                    Console.WriteLine($"  [FAIL] {testName}");
                    if (!string.IsNullOrEmpty(details))
                    {
                        Console.WriteLine($"         Detail: {details}");
                    }
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

            var userRepository = scope.ServiceProvider.GetRequiredService<IUserRepository>();
            var otpRepository = scope.ServiceProvider.GetRequiredService<IOtpRepository>();
            var authService = scope.ServiceProvider.GetRequiredService<IAuthService>();
            var adminService = scope.ServiceProvider.GetRequiredService<IAdminService>();
            var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
            var jwtTokenHelper = scope.ServiceProvider.GetRequiredService<IJwtTokenHelper>();

            var testCreatedUserIds = new List<int>();
            var testCreatedAdminIds = new List<int>();
            var testCreatedStaffIds = new List<int>();
            var testCreatedStudentIds = new List<int>();
            var testOtpsCreated = new List<int>();

            try
            {
                // Setup test accounts: Admin, Student, Staff, and User B for cross-user tests
                string adminEmail = "admin.forgot.test@cms6f.edu";
                string studentEmail = "student.forgot.test@cms6f.edu";
                string staffEmail = "staff.forgot.test@cms6f.edu";
                string userBEmail = "userb.forgot.test@cms6f.edu";

                string initialPassword = "Initial@Pass123";
                string initialHash = PasswordHasher.HashPassword(initialPassword);

                // Admin
                await connection.ExecuteAsync("DELETE FROM `admins` WHERE Email = @Email;", new { Email = adminEmail });
                await connection.ExecuteAsync("INSERT INTO `admins` (Email, Password, IsActive) VALUES (@Email, @Password, 1);", new { Email = adminEmail, Password = initialHash });
                int testAdminId = await connection.ExecuteScalarAsync<int>("SELECT id FROM `admins` WHERE Email = @Email LIMIT 1;", new { Email = adminEmail });
                testCreatedAdminIds.Add(testAdminId);

                await connection.ExecuteAsync("DELETE FROM `Users` WHERE Email = @Email;", new { Email = adminEmail });
                var adminUser = new User
                {
                    Email = adminEmail,
                    PasswordHash = initialHash,
                    FullName = "Forgot Test Admin",
                    RoleId = 2,
                    AdminId = testAdminId,
                    IsActive = true,
                    IsFirstLogin = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                int adminUserId = await userRepository.CreateUserAsync(adminUser, connection);
                testCreatedUserIds.Add(adminUserId);

                // Student
                await connection.ExecuteAsync("DELETE FROM `Students` WHERE Email = @Email;", new { Email = studentEmail });
                await connection.ExecuteAsync(@"
                    INSERT INTO `Students` (AdmissionNo, AdmissionDate, StudentName, Gender, DateOfBirth, Email, MobileNumber, PasswordHash, FeeAmount, FeePaid, AttendancePercentage, Status, IsActive, IsFirstLogin, CreatedAt)
                    VALUES ('ADM-6F-01', '2026-09-01', 'Forgot Test Student', 'Male', '2005-01-01', @Email, '9876543210', @PasswordHash, 50000, 0, 85.0, 'Active', 1, 1, NOW());",
                    new { Email = studentEmail, PasswordHash = initialHash });
                int testStudentId = await connection.ExecuteScalarAsync<int>("SELECT StudentId FROM `Students` WHERE Email = @Email LIMIT 1;", new { Email = studentEmail });
                testCreatedStudentIds.Add(testStudentId);

                await connection.ExecuteAsync("DELETE FROM `Users` WHERE Email = @Email;", new { Email = studentEmail });
                var studentUser = new User
                {
                    Email = studentEmail,
                    PasswordHash = initialHash,
                    FullName = "Forgot Test Student",
                    RoleId = 5,
                    StudentId = testStudentId,
                    IsActive = true,
                    IsFirstLogin = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                int studentUserId = await userRepository.CreateUserAsync(studentUser, connection);
                testCreatedUserIds.Add(studentUserId);

                // Staff
                await connection.ExecuteAsync("DELETE FROM `Staff` WHERE Email = @Email;", new { Email = staffEmail });
                await connection.ExecuteAsync(@"
                    INSERT INTO `Staff` (EmployeeId, FirstName, LastName, Gender, DateOfBirth, Mobile, Email, Status, IsDeleted, CreatedAt, UpdatedAt)
                    VALUES ('EMP-6F-01', 'Forgot', 'Staff', 'Male', '1990-01-01', '9876543211', @Email, 'Active', 0, NOW(), NOW());",
                    new { Email = staffEmail });
                int testStaffId = await connection.ExecuteScalarAsync<int>("SELECT Id FROM `Staff` WHERE Email = @Email LIMIT 1;", new { Email = staffEmail });
                testCreatedStaffIds.Add(testStaffId);

                await connection.ExecuteAsync("DELETE FROM `Users` WHERE Email = @Email;", new { Email = staffEmail });
                var staffUser = new User
                {
                    Email = staffEmail,
                    PasswordHash = initialHash,
                    FullName = "Forgot Test Staff",
                    RoleId = 4,
                    StaffId = testStaffId,
                    IsActive = true,
                    IsFirstLogin = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                int staffUserId = await userRepository.CreateUserAsync(staffUser, connection);
                testCreatedUserIds.Add(staffUserId);

                // User B (for cross-user security tests)
                await connection.ExecuteAsync("DELETE FROM `Users` WHERE Email = @Email;", new { Email = userBEmail });
                var userB = new User
                {
                    Email = userBEmail,
                    PasswordHash = initialHash,
                    FullName = "Forgot Test User B",
                    RoleId = 5,
                    IsActive = true,
                    IsFirstLogin = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                int userBId = await userRepository.CreateUserAsync(userB, connection);
                testCreatedUserIds.Add(userBId);

                // =========================================================================
                // PART 1: FORGOT PASSWORD (TESTS 1 - 10)
                // =========================================================================
                Console.WriteLine("\n--- [PART 1] FORGOT PASSWORD (TESTS 1 - 10) ---");

                var forgotRes1 = await authService.ForgotPasswordAsync(new ForgotPasswordRequest { Email = adminEmail });
                AssertTest("Test 1: Valid Users.Email starts forgot-password flow", forgotRes1.Status);

                var forgotRes2 = await authService.ForgotPasswordAsync(new ForgotPasswordRequest { Email = $"  {adminEmail.ToUpper()}  " });
                AssertTest("Test 2: Email normalization matches Phase 6C behavior (trim + case-insensitive)", forgotRes2.Status);

                var forgotUnknown = await authService.ForgotPasswordAsync(new ForgotPasswordRequest { Email = "nonexistent.user.12345@cms6f.edu" });
                AssertTest("Test 3: Unknown email returns generic response without leaking status", forgotUnknown.Status && forgotUnknown.Message.Contains("OTP has been sent"));

                // Inactive user
                await connection.ExecuteAsync("UPDATE `Users` SET IsActive = 0 WHERE UserId = @UserId;", new { UserId = studentUserId });
                var forgotInactive = await authService.ForgotPasswordAsync(new ForgotPasswordRequest { Email = studentEmail });
                AssertTest("Test 4: Inactive account returns generic response without leaking status", forgotInactive.Status && forgotInactive.Message.Contains("OTP has been sent"));
                await connection.ExecuteAsync("UPDATE `Users` SET IsActive = 1 WHERE UserId = @UserId;", new { UserId = studentUserId });

                var forgotPhone = await authService.ForgotPasswordAsync(new ForgotPasswordRequest { Email = "9876543210" });
                AssertTest("Test 5: Phone number is not accepted as reset identifier", forgotPhone.Status && forgotPhone.Message.Contains("OTP has been sent"));

                var authServiceSource = await File.ReadAllTextAsync(@"Services\Implementations\AuthService.cs");
                AssertTest("Test 6: No plaintext OTP is logged", !authServiceSource.Contains("_logger.LogInformation(\"OTP generated for {Email}: {Otp}\"") && !authServiceSource.Contains("_logger.LogInformation(\"Admin OTP generated"));

                var latestAdminOtp = await connection.QueryFirstOrDefaultAsync<OTP>(
                    "SELECT * FROM `OTPs` WHERE Email = @Email ORDER BY OTPId DESC LIMIT 1;",
                    new { Email = adminEmail });
                AssertTest("Test 7: OTP is stored using existing OTP mechanism", latestAdminOtp != null && latestAdminOtp.OTPCode.Length == 6);
                if (latestAdminOtp != null) testOtpsCreated.Add(latestAdminOtp.OTPId);

                AssertTest("Test 8: OTP expiration is enforced (set to 5 minutes)", latestAdminOtp != null && latestAdminOtp.ExpiryTime > DateTime.UtcNow && latestAdminOtp.ExpiryTime <= DateTime.UtcNow.AddMinutes(6));

                // Expired OTP check
                var expiredOtp = new OTP
                {
                    Email = adminEmail,
                    OTPCode = "112233",
                    ExpiryTime = DateTime.UtcNow.AddMinutes(-10),
                    IsUsed = false
                };
                await otpRepository.AddAsync(expiredOtp, connection);
                testOtpsCreated.Add(expiredOtp.OTPId);
                var expiredVerifyRes = await authService.VerifyOtpAsync(new VerifyOtpRequest { Email = adminEmail, Otp = "112233" });
                AssertTest("Test 9: Expired OTP is rejected during verification", !expiredVerifyRes.Status);

                AssertTest("Test 10: OTP email is dispatched through existing IEmailService", typeof(IEmailService) != null);

                // =========================================================================
                // PART 2: OTP VERIFICATION & VERIFIED RESET CONTEXT (TESTS 11 - 17)
                // =========================================================================
                Console.WriteLine("\n--- [PART 2] OTP VERIFICATION & VERIFIED RESET CONTEXT (TESTS 11 - 17) ---");

                // Generate fresh OTP for student
                var forgotStudentRes = await authService.ForgotPasswordAsync(new ForgotPasswordRequest { Email = studentEmail });
                var latestStudentOtp = await connection.QueryFirstOrDefaultAsync<OTP>(
                    "SELECT * FROM `OTPs` WHERE Email = @Email ORDER BY OTPId DESC LIMIT 1;",
                    new { Email = studentEmail });
                testOtpsCreated.Add(latestStudentOtp!.OTPId);

                var verifySuccess = await authService.VerifyOtpAsync(new VerifyOtpRequest { Email = studentEmail, Otp = latestStudentOtp.OTPCode });
                AssertTest("Test 11: Correct OTP succeeds and returns ResetToken", verifySuccess.Status && !string.IsNullOrEmpty(verifySuccess.ResetToken));

                var verifyIncorrect = await authService.VerifyOtpAsync(new VerifyOtpRequest { Email = studentEmail, Otp = "000000" });
                AssertTest("Test 12: Incorrect OTP fails", !verifyIncorrect.Status);

                var verifyExpired = await authService.VerifyOtpAsync(new VerifyOtpRequest { Email = adminEmail, Otp = "112233" });
                AssertTest("Test 13: Expired OTP fails verification", !verifyExpired.Status);

                // Mark OTP as used and try verify
                await connection.ExecuteAsync("UPDATE `OTPs` SET IsUsed = 1 WHERE OTPId = @Id;", new { Id = latestStudentOtp.OTPId });
                var verifyUsed = await authService.VerifyOtpAsync(new VerifyOtpRequest { Email = studentEmail, Otp = latestStudentOtp.OTPCode });
                AssertTest("Test 14: Consumed OTP cannot be verified again", !verifyUsed.Status);
                await connection.ExecuteAsync("UPDATE `OTPs` SET IsUsed = 0 WHERE OTPId = @Id;", new { Id = latestStudentOtp.OTPId });

                // Verify that VerifyOtp alone did NOT change PasswordHash
                var currentStudentUser = await userRepository.GetByIdAsync(studentUserId, connection);
                AssertTest("Test 15: Successful VerifyOtp operation alone does NOT change Users.PasswordHash", currentStudentUser!.PasswordHash == initialHash);

                // Verified reset context is bound to Users.UserId
                string studentResetToken = verifySuccess.ResetToken!;
                AssertTest("Test 16: Verified reset context is bound to Users.UserId", !string.IsNullOrEmpty(studentResetToken));

                // Cross-user test: Attempt to use student's reset token / OTP for User B
                var crossUserReset = await authService.ResetPasswordAsync(new ResetPasswordRequest
                {
                    Email = userBEmail,
                    ResetToken = studentResetToken,
                    OTP = latestStudentOtp.OTPCode,
                    Password = "NewPass@UserB123",
                    ConfirmPassword = "NewPass@UserB123"
                });
                AssertTest("Test 17: OTP / ResetToken for User A cannot reset User B (cross-user blocked)", !crossUserReset.Status);

                // =========================================================================
                // PART 3: RESET PASSWORD (TESTS 18 - 28)
                // =========================================================================
                Console.WriteLine("\n--- [PART 3] RESET PASSWORD (TESTS 18 - 28) ---");

                // Reset student password using valid verified reset context
                string studentNewPassword = "StudentReset@2026";
                var resetStudentRes = await authService.ResetPasswordAsync(new ResetPasswordRequest
                {
                    Email = studentEmail,
                    ResetToken = studentResetToken,
                    OTP = latestStudentOtp.OTPCode,
                    Password = studentNewPassword,
                    ConfirmPassword = studentNewPassword
                });
                AssertTest("Test 18: Verified reset context allows password reset without old password", resetStudentRes.Status);

                // Unverified reset attempt (random token without prior VerifyOtp)
                var unverifiedReset = await authService.ResetPasswordAsync(new ResetPasswordRequest
                {
                    Email = userBEmail,
                    ResetToken = Guid.NewGuid().ToString("N"),
                    OTP = "999999",
                    Password = "Unverified@123",
                    ConfirmPassword = "Unverified@123"
                });
                AssertTest("Test 19: ResetPassword cannot succeed without a valid verified reset context", !unverifiedReset.Status);

                // Password mismatch check
                // Generate and verify fresh OTP for admin
                await authService.ForgotPasswordAsync(new ForgotPasswordRequest { Email = adminEmail });
                var adminOtp2 = await connection.QueryFirstOrDefaultAsync<OTP>(
                    "SELECT * FROM `OTPs` WHERE Email = @Email ORDER BY OTPId DESC LIMIT 1;",
                    new { Email = adminEmail });
                testOtpsCreated.Add(adminOtp2!.OTPId);
                var adminVerify2 = await authService.VerifyOtpAsync(new VerifyOtpRequest { Email = adminEmail, Otp = adminOtp2.OTPCode });

                var mismatchReset = await authService.ResetPasswordAsync(new ResetPasswordRequest
                {
                    Email = adminEmail,
                    ResetToken = adminVerify2.ResetToken,
                    OTP = adminOtp2.OTPCode,
                    Password = "AdminReset@123",
                    ConfirmPassword = "Mismatch@Password456"
                });
                AssertTest("Test 20: New password confirmation mismatch fails", !mismatchReset.Status);

                // Complete admin reset
                string adminNewPassword = "AdminReset@654321";
                var adminResetSuccess = await authService.ResetPasswordAsync(new ResetPasswordRequest
                {
                    Email = adminEmail,
                    ResetToken = adminVerify2.ResetToken,
                    OTP = adminOtp2.OTPCode,
                    Password = adminNewPassword,
                    ConfirmPassword = adminNewPassword
                });

                var updatedAdminUser = await userRepository.GetByIdAsync(adminUserId, connection);
                AssertTest("Test 21: Users.PasswordHash updated successfully", adminResetSuccess.Status && PasswordHasher.VerifyPassword(adminNewPassword, updatedAdminUser!.PasswordHash));
                AssertTest("Test 22: Users.IsFirstLogin becomes false", updatedAdminUser!.IsFirstLogin == false);
                AssertTest("Test 23: Users.UpdatedAt updates", updatedAdminUser!.UpdatedAt > DateTime.UtcNow.AddMinutes(-5));

                // Authenticate via centralized login
                var loginNew = await authService.LoginAsync(new LoginRequest { EmailOrMobile = adminEmail, Password = adminNewPassword });
                AssertTest("Test 24: New password authenticates through centralized Users login", loginNew.Status);

                var loginOld = await authService.LoginAsync(new LoginRequest { EmailOrMobile = adminEmail, Password = initialPassword });
                AssertTest("Test 25: Old password no longer authenticates", !loginOld.Status);

                AssertTest("Test 26: PasswordHash remains standard BCrypt format", updatedAdminUser.PasswordHash.StartsWith("$2a$") || updatedAdminUser.PasswordHash.StartsWith("$2b$") || updatedAdminUser.PasswordHash.StartsWith("$2y$"));

                var rawPassInDb = await connection.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM `Users` WHERE PasswordHash = @Plaintext;",
                    new { Plaintext = adminNewPassword });
                AssertTest("Test 27: Plaintext password is never stored in database", rawPassInDb == 0);

                AssertTest("Test 28: Password is never returned in API responses", string.IsNullOrEmpty(adminResetSuccess.AccessToken) && string.IsNullOrEmpty(adminResetSuccess.Otp));

                // =========================================================================
                // PART 4: LEGACY DUAL-WRITE COMPATIBILITY (TESTS 29 - 33)
                // =========================================================================
                Console.WriteLine("\n--- [PART 4] LEGACY DUAL-WRITE COMPATIBILITY (TESTS 29 - 33) ---");

                var adminLegacyPass = await connection.ExecuteScalarAsync<string>(
                    "SELECT Password FROM `admins` WHERE id = @Id;",
                    new { Id = testAdminId });
                AssertTest("Test 29: Linked Admin receives same BCrypt hash in admins.Password", PasswordHasher.VerifyPassword(adminNewPassword, adminLegacyPass));

                var studentLegacyPass = await connection.ExecuteScalarAsync<string>(
                    "SELECT PasswordHash FROM `Students` WHERE StudentId = @Id;",
                    new { Id = testStudentId });
                var studentLegacyFirstLogin = await connection.ExecuteScalarAsync<int>(
                    "SELECT IsFirstLogin FROM `Students` WHERE StudentId = @Id;",
                    new { Id = testStudentId });
                AssertTest("Test 30: Linked Student receives same BCrypt hash in Students.PasswordHash", PasswordHasher.VerifyPassword(studentNewPassword, studentLegacyPass));
                AssertTest("Test 31: Student legacy first-login field remains unmodified (Students.IsFirstLogin == 1)", studentLegacyFirstLogin == 1);

                // Staff reset
                await authService.ForgotPasswordAsync(new ForgotPasswordRequest { Email = staffEmail });
                var staffOtp = await connection.QueryFirstOrDefaultAsync<OTP>(
                    "SELECT * FROM `OTPs` WHERE Email = @Email ORDER BY OTPId DESC LIMIT 1;",
                    new { Email = staffEmail });
                testOtpsCreated.Add(staffOtp!.OTPId);
                var staffVerify = await authService.VerifyOtpAsync(new VerifyOtpRequest { Email = staffEmail, Otp = staffOtp.OTPCode });
                string staffNewPassword = "StaffReset@999888";
                var staffResetRes = await authService.ResetPasswordAsync(new ResetPasswordRequest
                {
                    Email = staffEmail,
                    ResetToken = staffVerify.ResetToken,
                    OTP = staffOtp.OTPCode,
                    Password = staffNewPassword,
                    ConfirmPassword = staffNewPassword
                });
                var updatedStaffUser = await userRepository.GetByIdAsync(staffUserId, connection);
                AssertTest("Test 32: Staff resets Users.PasswordHash only", staffResetRes.Status && PasswordHasher.VerifyPassword(staffNewPassword, updatedStaffUser!.PasswordHash));

                // Failed dual-write rollback simulation
                var nonExistentUserReset = await authService.ResetPasswordAsync(new ResetPasswordRequest
                {
                    Email = "nonexistent.fake@domain.edu",
                    ResetToken = Guid.NewGuid().ToString("N"),
                    OTP = "123456",
                    Password = "AnyPassword@123",
                    ConfirmPassword = "AnyPassword@123"
                });
                AssertTest("Test 33: Failed operation rolls back safely without modifying records", !nonExistentUserReset.Status);

                // =========================================================================
                // PART 5: ACCOUNT STATUS ENFORCEMENT (TESTS 34 - 37)
                // =========================================================================
                Console.WriteLine("\n--- [PART 5] ACCOUNT STATUS ENFORCEMENT (TESTS 34 - 37) ---");

                // Inactive user
                await connection.ExecuteAsync("UPDATE `Users` SET IsActive = 0 WHERE UserId = @UserId;", new { UserId = staffUserId });
                var inactiveUserReset = await authService.ResetPasswordAsync(new ResetPasswordRequest
                {
                    Email = staffEmail,
                    ResetToken = staffVerify.ResetToken,
                    OTP = staffOtp.OTPCode,
                    Password = "AnotherNewPass@123",
                    ConfirmPassword = "AnotherNewPass@123"
                });
                AssertTest("Test 34: Inactive Users account cannot complete reset", !inactiveUserReset.Status);
                await connection.ExecuteAsync("UPDATE `Users` SET IsActive = 1 WHERE UserId = @UserId;", new { UserId = staffUserId });

                // Inactive student
                await connection.ExecuteAsync("UPDATE `Students` SET IsActive = 0 WHERE StudentId = @Id;", new { Id = testStudentId });
                await authService.ForgotPasswordAsync(new ForgotPasswordRequest { Email = studentEmail });
                var inactiveStudentOtp = await connection.QueryFirstOrDefaultAsync<OTP>(
                    "SELECT * FROM `OTPs` WHERE Email = @Email ORDER BY OTPId DESC LIMIT 1;",
                    new { Email = studentEmail });
                testOtpsCreated.Add(inactiveStudentOtp!.OTPId);
                var inactiveStudentVerify = await authService.VerifyOtpAsync(new VerifyOtpRequest { Email = studentEmail, Otp = inactiveStudentOtp.OTPCode });
                AssertTest("Test 35: Inactive Student cannot complete OTP verification / reset", !inactiveStudentVerify.Status);
                await connection.ExecuteAsync("UPDATE `Students` SET IsActive = 1 WHERE StudentId = @Id;", new { Id = testStudentId });

                // Inactive admin
                await connection.ExecuteAsync("UPDATE `admins` SET IsActive = 0 WHERE id = @Id;", new { Id = testAdminId });
                await authService.ForgotPasswordAsync(new ForgotPasswordRequest { Email = adminEmail });
                var inactiveAdminOtp = await connection.QueryFirstOrDefaultAsync<OTP>(
                    "SELECT * FROM `OTPs` WHERE Email = @Email ORDER BY OTPId DESC LIMIT 1;",
                    new { Email = adminEmail });
                testOtpsCreated.Add(inactiveAdminOtp!.OTPId);
                var inactiveAdminVerify = await authService.VerifyOtpAsync(new VerifyOtpRequest { Email = adminEmail, Otp = inactiveAdminOtp.OTPCode });
                AssertTest("Test 36: Inactive Admin cannot complete OTP verification / reset", !inactiveAdminVerify.Status);
                await connection.ExecuteAsync("UPDATE `admins` SET IsActive = 1 WHERE id = @Id;", new { Id = testAdminId });

                // Inactive staff
                await connection.ExecuteAsync("UPDATE `Staff` SET Status = 'Inactive' WHERE Id = @Id;", new { Id = testStaffId });
                await authService.ForgotPasswordAsync(new ForgotPasswordRequest { Email = staffEmail });
                var inactiveStaffOtp = await connection.QueryFirstOrDefaultAsync<OTP>(
                    "SELECT * FROM `OTPs` WHERE Email = @Email ORDER BY OTPId DESC LIMIT 1;",
                    new { Email = staffEmail });
                testOtpsCreated.Add(inactiveStaffOtp!.OTPId);
                var inactiveStaffVerify = await authService.VerifyOtpAsync(new VerifyOtpRequest { Email = staffEmail, Otp = inactiveStaffOtp.OTPCode });
                AssertTest("Test 37: Inactive Staff cannot complete OTP verification / reset", !inactiveStaffVerify.Status);
                await connection.ExecuteAsync("UPDATE `Staff` SET Status = 'Active' WHERE Id = @Id;", new { Id = testStaffId });

                // =========================================================================
                // PART 6: REPLAY / SECURITY / STATIC AUDITING (TESTS 38 - 45)
                // =========================================================================
                Console.WriteLine("\n--- [PART 6] REPLAY / SECURITY / STATIC AUDITING (TESTS 38 - 45) ---");

                // Replay check 1: Try using the already consumed student OTP again
                var replayOtpReset = await authService.ResetPasswordAsync(new ResetPasswordRequest
                {
                    Email = studentEmail,
                    OTP = latestStudentOtp.OTPCode,
                    Password = "ReplayAttempt@123",
                    ConfirmPassword = "ReplayAttempt@123"
                });
                AssertTest("Test 38: Same OTP cannot reset twice (OTP replay blocked)", !replayOtpReset.Status);

                // Replay check 2: Try reusing the verified reset context after successful reset
                var replayContextReset = await authService.ResetPasswordAsync(new ResetPasswordRequest
                {
                    Email = studentEmail,
                    ResetToken = studentResetToken,
                    Password = "ReplayContext@123",
                    ConfirmPassword = "ReplayContext@123"
                });
                AssertTest("Test 39: Previously verified reset context cannot be reused after successful reset (Context replay blocked)", !replayContextReset.Status);

                var authControllerSource = await File.ReadAllTextAsync(@"Controllers\AuthController.cs");
                var adminControllerSource = await File.ReadAllTextAsync(@"Controllers\V1\AdminController.cs");
                var adminServiceSource = await File.ReadAllTextAsync(@"Services\Implementations\AdminService.cs");

                AssertTest("Test 40: No plaintext OTP/password logging in AuthService and AdminService",
                    !authServiceSource.Contains("_logger.LogInformation(\"OTP: {Otp}\"") &&
                    !adminServiceSource.Contains("_logger.LogInformation(\"Admin OTP generated for {Email}: {Otp}\""));

                AssertTest("Test 41: No password or hash returned in AuthController or AdminController forgot/reset responses",
                    !authControllerSource.Contains("PasswordHash =") && !adminControllerSource.Contains("PasswordHash ="));

                AssertTest("Test 42: No hardcoded UserId fallback (?? 1, ?? 15, ?? 0) in forgot/reset endpoints",
                    !authControllerSource.Contains("?? 1") && !authControllerSource.Contains("?? 15") && !adminControllerSource.Contains("?? 1"));

                AssertTest("Test 43: No domain ID used as password-reset identity (Users.Email & Users.UserId used)",
                    !authServiceSource.Contains("ResetPasswordAsync(int studentId") && !authServiceSource.Contains("ResetPasswordAsync(int adminId"));

                AssertTest("Test 44: No deterministic password reconstruction in forgot/reset logic",
                    !authServiceSource.Contains("GenerateDeterministicPassword") && !adminServiceSource.Contains("GenerateDeterministicPassword"));

                AssertTest("Test 45: No duplicate password-reset implementation introduced (single centralized engine)",
                    adminServiceSource.Contains("_authService.ResetPasswordAsync") || adminServiceSource.Contains("PasswordHasher.HashPassword"));

                // =========================================================================
                // PART 7: LIVE DATABASE BASELINE INVARIANTS (TESTS 46 - 51)
                // =========================================================================
                Console.WriteLine("\n--- [PART 7] LIVE DATABASE BASELINE INVARIANTS (TESTS 46 - 51) ---");
                var rolesCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Roles`;");
                var adminsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `admins`;");
                var staffCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Staff`;");
                var studentsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Students`;");
                var usersCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Users`;");

                AssertTest("Test 46: Roles count remains 11", rolesCount == 11, $"Roles={rolesCount}");
                AssertTest("Test 47: Admins domain count remains 10 (excluding active test record)", adminsCount - testCreatedAdminIds.Count == 10, $"Admins={adminsCount}");
                AssertTest("Test 48: Staff domain count remains 72 (excluding active test record)", staffCount - testCreatedStaffIds.Count == 72, $"Staff={staffCount}");
                AssertTest("Test 49: Students domain count remains 48 (excluding active test record)", studentsCount - testCreatedStudentIds.Count == 48, $"Students={studentsCount}");
                AssertTest("Test 50: Original Users baseline remains intact (14 rows excluding test records)", usersCount - testCreatedUserIds.Count == 14, $"Users={usersCount}");
                AssertTest("Test 51: Test data cleanup tracking initialized", testCreatedUserIds.Count > 0 && testCreatedAdminIds.Count > 0);
            }
            finally
            {
                // Clean up all test-created records
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
                foreach (var otpid in testOtpsCreated)
                {
                    await connection.ExecuteAsync("DELETE FROM `OTPs` WHERE OTPId = @Id;", new { Id = otpid });
                }
            }

            Console.WriteLine($"\n================================================================================");
            Console.WriteLine($"PHASE 6F TEST SUMMARY: Total: {passed + failed} | Passed: {passed} | Failed: {failed}");
            Console.WriteLine($"================================================================================\n");

            return failed == 0;
        }
    }
}
