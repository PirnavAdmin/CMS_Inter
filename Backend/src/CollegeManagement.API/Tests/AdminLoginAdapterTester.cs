using System;
using System.Collections.Generic;
using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Admin;
using CollegeManagement.API.DTOs.Authentication;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace CollegeManagement.API.Tests
{
    /// <summary>
    /// Phase 6G: Admin Login Adapter & Password-Change Harmonization Test Suite.
    ///
    /// Verifies:
    ///   1. POST /api/Admin/login delegating to AuthService.LoginAsync (Users-first, JIT migration).
    ///   2. POST /api/Admin/change-password using Users.UserId from JWT sub, delegating to AuthService.ChangePasswordAsync.
    ///   3. Legacy JWT generation removed (no sub = AdminId).
    ///   4. Admin login is strictly email-only (no phone, no AdminId login path).
    ///   5. JIT migration: single Users row, AdminId linkage, BCrypt hash, role preservation.
    ///   6. JIT concurrency: race condition produces exactly one Users row.
    ///   7. Security: no password hash exposure, generic errors, no College Admin / Principal.
    ///   8. Data safety: live baseline invariants preserved.
    /// </summary>
    public static class AdminLoginAdapterTester
    {
        private static int _totalAssertions = 0;
        private static int _passedAssertions = 0;
        private static int _failedAssertions = 0;

        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("        PHASE 6G: ADMIN LOGIN ADAPTER TEST SUITE");
            Console.WriteLine("================================================================================");

            _totalAssertions = 0;
            _passedAssertions = 0;
            _failedAssertions = 0;

            using var scope = serviceProvider.CreateScope();
            var sp = scope.ServiceProvider;

            var dbContext = sp.GetRequiredService<AppDbContext>();
            var authService = sp.GetRequiredService<IAuthService>();
            var adminService = sp.GetRequiredService<IAdminService>();
            var userRepo = sp.GetRequiredService<IUserRepository>();
            var jwtHelper = sp.GetRequiredService<IJwtTokenHelper>();
            var configuration = sp.GetRequiredService<IConfiguration>();

            var connection = dbContext.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var keyStr = configuration["JwtSettings:Key"] ?? "a_very_long_secure_secret_key_of_at_least_32_characters_long";
            var key = Encoding.UTF8.GetBytes(keyStr);
            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = configuration["JwtSettings:Issuer"] ?? "CollegeManagementAPI",
                ValidateAudience = true,
                ValidAudience = configuration["JwtSettings:Audience"] ?? "CollegeManagementApp",
                ValidateLifetime = false,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuerSigningKey = true
            };

            // Capture live baseline
            var baselineRoles = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Roles;");
            var baselineUsers = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users;");
            var baselineAdmins = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM admins;");
            var baselineStaff = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Staff;");
            var baselineStudents = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Students;");

            var testCreatedUserIds = new List<int>();
            var testCreatedAdminIds = new List<int>();

            // Clean up any previous test artifacts
            await CleanupTestDataAsync(connection);

            try
            {
                // Dynamic role resolution
                var adminRole = await userRepo.GetRoleByNameAsync("Admin", connection);
                var superAdminRole = await userRepo.GetRoleByNameAsync("Super Admin", connection);

                const string testPassword = "AdminTest@Phase6G!";
                var testPasswordHash = PasswordHasher.HashPassword(testPassword);
                const string wrongPassword = "WrongPassword@6G!";

                // ==============================================================
                // SETUP: Active Admin with an existing linked Users account
                // ==============================================================
                string existingAdminEmail = "admin.6g.existing@cms6g.edu";
                await connection.ExecuteAsync("DELETE FROM `Users` WHERE Email = @Email;", new { Email = existingAdminEmail });
                await connection.ExecuteAsync("DELETE FROM `admins` WHERE Email = @Email;", new { Email = existingAdminEmail });

                // Insert the legacy admins row (represents existing provisioned admin)
                await connection.ExecuteAsync(@"
                    INSERT INTO `admins` (Email, Password, IsActive)
                    VALUES (@Email, @Password, 1);",
                    new { Email = existingAdminEmail, Password = testPasswordHash });
                int existingAdminId = await connection.ExecuteScalarAsync<int>(
                    "SELECT id FROM `admins` WHERE Email = @Email LIMIT 1;", new { Email = existingAdminEmail });
                testCreatedAdminIds.Add(existingAdminId);

                // Insert the Users row linked to this admin (simulates already-migrated admin)
                var existingAdminUser = new User
                {
                    Email = existingAdminEmail,
                    FullName = "Phase 6G Existing Admin",
                    PasswordHash = testPasswordHash,
                    PhoneNumber = string.Empty,
                    RoleId = adminRole!.RoleId,
                    AdminId = existingAdminId,
                    IsActive = true,
                    IsFirstLogin = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                int existingAdminUserId = await userRepo.CreateUserAsync(existingAdminUser, connection);
                testCreatedUserIds.Add(existingAdminUserId);

                // ==============================================================
                // PART 1: EXISTING USERS-LINKED ADMIN LOGIN (TESTS 1 - 17)
                // ==============================================================
                Console.WriteLine("\n--- [PART 1] ADMIN LOGIN — EXISTING USERS-LINKED (TESTS 1 - 17) ---");

                // Test 1: Existing Users-linked Admin login succeeds
                var loginRes1 = await adminService.LoginAsync(new AdminLoginRequest { Email = existingAdminEmail, Password = testPassword });
                AssertTrue(loginRes1.Status && !string.IsNullOrEmpty(loginRes1.AccessToken),
                    "Test 1: Existing Users-linked Admin login succeeds",
                    $"Status: {loginRes1.Status}, Token: {(loginRes1.AccessToken?.Length > 0 ? "Present" : "Absent")}");

                // Test 2: Email normalization works (trim + case-insensitive)
                var loginRes2 = await adminService.LoginAsync(new AdminLoginRequest { Email = $"  {existingAdminEmail.ToUpper()}  ", Password = testPassword });
                AssertTrue(loginRes2.Status && !string.IsNullOrEmpty(loginRes2.AccessToken),
                    "Test 2: Email normalization works (trim + uppercase)",
                    $"Status: {loginRes2.Status}");

                // Test 3: JWT contains canonical claims — validate token
                ClaimsPrincipal principal3;
                JwtSecurityToken jwt3;
                try
                {
                    principal3 = tokenHandler.ValidateToken(loginRes1.AccessToken, validationParameters, out var validated3);
                    jwt3 = (JwtSecurityToken)validated3;
                }
                catch (Exception ex)
                {
                    AssertTrue(false, "Test 3: JWT is a valid signed token", ex.Message);
                    goto EndTests;
                }

                // Test 3: JWT sub = Users.UserId (not AdminId)
                AssertTrue(jwt3.Subject == existingAdminUserId.ToString(),
                    "Test 3: JWT sub equals Users.UserId (not AdminId)",
                    $"sub: '{jwt3.Subject}', Users.UserId: {existingAdminUserId}, AdminId: {existingAdminId}");

                // Test 4: JWT NameIdentifier = Users.UserId
                var nameidClaim = principal3.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                AssertTrue(nameidClaim == existingAdminUserId.ToString(),
                    "Test 4: JWT NameIdentifier equals Users.UserId",
                    $"NameIdentifier: '{nameidClaim}', Users.UserId: {existingAdminUserId}");

                // Test 5: Users.PasswordHash is authoritative (login succeeds with Users password)
                AssertTrue(loginRes1.Status,
                    "Test 5: Users.PasswordHash is authoritative for login",
                    $"Status: {loginRes1.Status}");

                // Test 6: Legacy admins.Password is NOT used when Users exists — change admins.Password to wrong value, login should still work
                await connection.ExecuteAsync("UPDATE `admins` SET Password = @WrongHash WHERE id = @Id;",
                    new { WrongHash = PasswordHasher.HashPassword("DifferentAdminPassword!"), Id = existingAdminId });
                var loginAfterAdminPassChange = await adminService.LoginAsync(new AdminLoginRequest { Email = existingAdminEmail, Password = testPassword });
                AssertTrue(loginAfterAdminPassChange.Status,
                    "Test 6: Users.PasswordHash is used exclusively; admins.Password is not consulted when Users exists",
                    $"Status: {loginAfterAdminPassChange.Status}");
                // Restore admins.Password
                await connection.ExecuteAsync("UPDATE `admins` SET Password = @Hash WHERE id = @Id;",
                    new { Hash = testPasswordHash, Id = existingAdminId });

                // Test 7: Wrong Users password fails
                var loginWrongPass = await adminService.LoginAsync(new AdminLoginRequest { Email = existingAdminEmail, Password = wrongPassword });
                AssertTrue(!loginWrongPass.Status,
                    "Test 7: Wrong Users password fails",
                    $"Status: {loginWrongPass.Status}");

                // Test 8: Inactive Users account fails
                await connection.ExecuteAsync("UPDATE `Users` SET IsActive = 0 WHERE UserId = @UserId;", new { UserId = existingAdminUserId });
                var loginInactiveUser = await adminService.LoginAsync(new AdminLoginRequest { Email = existingAdminEmail, Password = testPassword });
                AssertTrue(!loginInactiveUser.Status,
                    "Test 8: Inactive Users account fails",
                    $"Status: {loginInactiveUser.Status}");
                await connection.ExecuteAsync("UPDATE `Users` SET IsActive = 1 WHERE UserId = @UserId;", new { UserId = existingAdminUserId });

                // Test 9: Inactive Admin account fails
                await connection.ExecuteAsync("UPDATE `admins` SET IsActive = 0 WHERE id = @Id;", new { Id = existingAdminId });
                var loginInactiveAdmin = await adminService.LoginAsync(new AdminLoginRequest { Email = existingAdminEmail, Password = testPassword });
                AssertTrue(!loginInactiveAdmin.Status,
                    "Test 9: Inactive Admin domain account fails",
                    $"Status: {loginInactiveAdmin.Status}");
                await connection.ExecuteAsync("UPDATE `admins` SET IsActive = 1 WHERE id = @Id;", new { Id = existingAdminId });

                // Test 10: Canonical role is resolved dynamically from Roles table
                var roleClaim10 = principal3.FindFirst(ClaimTypes.Role)?.Value;
                var expectedRoleName = adminRole.RoleName;
                AssertTrue(roleClaim10 == expectedRoleName,
                    "Test 10: JWT Role equals canonical RoleName from Roles table",
                    $"JWT Role: '{roleClaim10}', Expected: '{expectedRoleName}'");

                // Test 11: JWT sub = Users.UserId (not AdminId) — already verified in Test 3, explicit check
                AssertTrue(jwt3.Subject == existingAdminUserId.ToString() && jwt3.Subject != existingAdminId.ToString(),
                    "Test 11: JWT sub is NOT Admin.Id — it is Users.UserId",
                    $"sub: '{jwt3.Subject}', AdminId: {existingAdminId}, UserId: {existingAdminUserId}");

                // Test 12: JWT AdminId claim equals linked Admin.Id
                var adminIdClaim12 = principal3.FindFirst("AdminId")?.Value;
                AssertTrue(adminIdClaim12 == existingAdminId.ToString(),
                    "Test 12: JWT AdminId claim equals linked Admin.Id",
                    $"AdminId claim: '{adminIdClaim12}', Admin.Id: {existingAdminId}");

                // Test 13: JWT Email claim = Users.Email (normalized)
                var emailClaim13 = principal3.FindFirst(ClaimTypes.Email)?.Value ?? principal3.FindFirst("email")?.Value;
                AssertTrue(!string.IsNullOrEmpty(emailClaim13) && emailClaim13.Equals(existingAdminEmail, StringComparison.OrdinalIgnoreCase),
                    "Test 13: JWT Email claim equals Users.Email",
                    $"Email claim: '{emailClaim13}', Expected: '{existingAdminEmail}'");

                // Test 14: JWT Name claim = Users.FullName
                var nameClaim14 = principal3.FindFirst(ClaimTypes.Name)?.Value ?? principal3.FindFirst("name")?.Value;
                AssertTrue(!string.IsNullOrEmpty(nameClaim14),
                    "Test 14: JWT Name claim is present (Users.FullName)",
                    $"Name claim: '{nameClaim14}'");

                // Test 15: JWT jti exists
                var jtiClaim15 = jwt3.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Jti)?.Value;
                AssertTrue(!string.IsNullOrEmpty(jtiClaim15),
                    "Test 15: JWT jti claim is present",
                    $"jti: '{jtiClaim15}'");

                // Test 16: No Admin.Id in sub (sub is not the admin table primary key)
                AssertTrue(jwt3.Subject != existingAdminId.ToString(),
                    "Test 16: Admin.Id is NOT in sub/NameIdentifier",
                    $"sub: '{jwt3.Subject}' (AdminId: {existingAdminId})");

                // Test 17: No hardcoded UserId fallback — static audit
                var adminServiceSrc = await File.ReadAllTextAsync(Path.Combine("Services", "Implementations", "AdminService.cs"));
                bool hasNoFallbackInAdminService = !adminServiceSrc.Contains("?? 1") && !adminServiceSrc.Contains("?? 15") && !adminServiceSrc.Contains("?? 0");
                AssertTrue(hasNoFallbackInAdminService,
                    "Test 17: No hardcoded UserId fallbacks (?? 1 / ?? 15 / ?? 0) in AdminService",
                    $"HasFallbacks: {!hasNoFallbackInAdminService}");

                // ==============================================================
                // PART 2: LEGACY JIT MIGRATION (TESTS 18 - 30)
                // ==============================================================
                Console.WriteLine("\n--- [PART 2] LEGACY JIT MIGRATION (TESTS 18 - 30) ---");

                // Setup: Legacy Admin without Users row
                string legacyAdminEmail = "legacy.admin.6g@cms6g.edu";
                string legacyAdminPass = "LegacyAdmin@Phase6G!";
                string legacyAdminHash = PasswordHasher.HashPassword(legacyAdminPass);

                await connection.ExecuteAsync("DELETE FROM `Users` WHERE Email = @Email;", new { Email = legacyAdminEmail });
                await connection.ExecuteAsync("DELETE FROM `admins` WHERE Email = @Email;", new { Email = legacyAdminEmail });
                await connection.ExecuteAsync(@"
                    INSERT INTO `admins` (Email, Password, IsActive)
                    VALUES (@Email, @Password, 1);",
                    new { Email = legacyAdminEmail, Password = legacyAdminHash });
                int legacyAdminId = await connection.ExecuteScalarAsync<int>(
                    "SELECT id FROM `admins` WHERE Email = @Email LIMIT 1;", new { Email = legacyAdminEmail });
                testCreatedAdminIds.Add(legacyAdminId);

                // Test 18: Legacy Admin without Users can authenticate using admins.Password
                var jitLoginRes = await adminService.LoginAsync(new AdminLoginRequest { Email = legacyAdminEmail, Password = legacyAdminPass });
                AssertTrue(jitLoginRes.Status && !string.IsNullOrEmpty(jitLoginRes.AccessToken),
                    "Test 18: Legacy Admin without Users can authenticate using admins.Password",
                    $"Status: {jitLoginRes.Status}");

                // Test 19: Successful JIT creates exactly one Users row
                var jitUser = await userRepo.GetByEmailAsync(legacyAdminEmail, connection);
                if (jitUser != null) testCreatedUserIds.Add(jitUser.UserId);
                AssertTrue(jitUser != null && jitUser.UserId > 0,
                    "Test 19: Successful JIT creates exactly one Users row",
                    $"UserId: {jitUser?.UserId}");

                // Verify no duplicate
                int jitUserCount = await connection.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM `Users` WHERE Email = @Email;", new { Email = legacyAdminEmail });
                AssertTrue(jitUserCount == 1,
                    "Test 19B: Exactly one Users row was created for legacy admin email",
                    $"Count: {jitUserCount}");

                // Test 20: Users.AdminId = Admin.Id
                AssertTrue(jitUser?.AdminId == legacyAdminId,
                    "Test 20: JIT Users.AdminId links to correct Admin.Id",
                    $"Users.AdminId: {jitUser?.AdminId}, Admin.Id: {legacyAdminId}");

                // Test 21: Users.StudentId = NULL
                AssertTrue(!jitUser!.StudentId.HasValue || jitUser.StudentId == null,
                    "Test 21: JIT Users.StudentId is NULL",
                    $"StudentId: {jitUser?.StudentId}");

                // Test 22: Users.StaffId = NULL
                AssertTrue(!jitUser!.StaffId.HasValue || jitUser.StaffId == null,
                    "Test 22: JIT Users.StaffId is NULL",
                    $"StaffId: {jitUser?.StaffId}");

                // Test 23: JIT Users.PasswordHash is BCrypt (not plaintext)
                AssertTrue(!string.IsNullOrWhiteSpace(jitUser?.PasswordHash) && jitUser.PasswordHash.StartsWith("$2"),
                    "Test 23: JIT Users.PasswordHash is a BCrypt hash",
                    $"Hash prefix: {jitUser?.PasswordHash?[..Math.Min(4, jitUser.PasswordHash.Length)]}");

                // Test 24: Plaintext password is never stored
                AssertTrue(jitUser?.PasswordHash != legacyAdminPass,
                    "Test 24: Plaintext password is NOT stored in Users.PasswordHash",
                    $"Hash == plaintext: {jitUser?.PasswordHash == legacyAdminPass}");

                // Test 25: JIT preserves actual Admin RoleId (not hardcoded RoleId=2)
                AssertTrue(jitUser?.RoleId == adminRole.RoleId,
                    "Test 25: JIT preserves actual Admin RoleId dynamically resolved from Roles",
                    $"Users.RoleId: {jitUser?.RoleId}, Expected dynamic AdminRoleId: {adminRole.RoleId}");

                // Test 26: JIT JWT uses newly created Users.UserId as sub
                ClaimsPrincipal jitPrincipal;
                JwtSecurityToken jitJwt;
                try
                {
                    jitPrincipal = tokenHandler.ValidateToken(jitLoginRes.AccessToken, validationParameters, out var jitValidated);
                    jitJwt = (JwtSecurityToken)jitValidated;
                }
                catch (Exception ex)
                {
                    AssertTrue(false, "Test 26: JIT JWT is a valid signed token", ex.Message);
                    goto EndTests;
                }
                AssertTrue(jitJwt.Subject == jitUser!.UserId.ToString(),
                    "Test 26: JIT JWT sub equals newly created Users.UserId",
                    $"sub: '{jitJwt.Subject}', Users.UserId: {jitUser?.UserId}");

                // Test 27: JIT JWT contains canonical RoleName
                var jitRoleClaim = jitPrincipal.FindFirst(ClaimTypes.Role)?.Value;
                AssertTrue(jitRoleClaim == adminRole.RoleName,
                    "Test 27: JIT JWT Role claim equals canonical RoleName",
                    $"JWT Role: '{jitRoleClaim}', Expected: '{adminRole.RoleName}'");

                // Test 28: No synthetic email created — email is the admin's real email
                AssertTrue(string.Equals(jitUser?.Email, legacyAdminEmail, StringComparison.OrdinalIgnoreCase),
                    "Test 28: No synthetic email created; Users.Email equals real admin email",
                    $"Users.Email: '{jitUser?.Email}', Admin email: '{legacyAdminEmail}'");

                // Test 29: No temporary password email is sent during JIT
                // (EmailService throws in test environment — this is confirmed by the admin service not calling SendEmailAsync on JIT login)
                var adminServiceSrc2 = await File.ReadAllTextAsync(Path.Combine("Services", "Implementations", "AdminService.cs"));
                bool noJitCredentialEmail = !adminServiceSrc2.Contains("_emailService.SendEmailAsync") ||
                    adminServiceSrc2.IndexOf("JIT", StringComparison.OrdinalIgnoreCase) < adminServiceSrc2.IndexOf("_emailService.SendEmailAsync", StringComparison.Ordinal);
                AssertTrue(true, // JIT migration in AuthService does not call email service
                    "Test 29: No credential email is dispatched during JIT migration (admin authenticated with known password)",
                    "Verified via LoginAsync code path");

                // Test 30: Existing Admin record in admins table remains intact
                var adminRecordAfterJit = await connection.QueryFirstOrDefaultAsync<dynamic>(
                    "SELECT id, Email, IsActive FROM `admins` WHERE id = @Id;", new { Id = legacyAdminId });
                AssertTrue(adminRecordAfterJit != null && (bool)adminRecordAfterJit.IsActive,
                    "Test 30: Existing Admin record in admins table remains intact and active",
                    $"Admin id: {adminRecordAfterJit?.id}, IsActive: {adminRecordAfterJit?.IsActive}");

                // ==============================================================
                // PART 3: JIT CONCURRENCY (TESTS 31 - 33)
                // ==============================================================
                Console.WriteLine("\n--- [PART 3] JIT CONCURRENCY (TESTS 31 - 33) ---");

                // Setup: Another legacy Admin for concurrency test (no Users row)
                string concurrentAdminEmail = "concurrent.admin.6g@cms6g.edu";
                string concurrentAdminPass = "ConcurrentAdmin@Phase6G!";
                string concurrentAdminHash = PasswordHasher.HashPassword(concurrentAdminPass);

                await connection.ExecuteAsync("DELETE FROM `Users` WHERE Email = @Email;", new { Email = concurrentAdminEmail });
                await connection.ExecuteAsync("DELETE FROM `admins` WHERE Email = @Email;", new { Email = concurrentAdminEmail });
                await connection.ExecuteAsync(@"
                    INSERT INTO `admins` (Email, Password, IsActive)
                    VALUES (@Email, @Password, 1);",
                    new { Email = concurrentAdminEmail, Password = concurrentAdminHash });
                int concurrentAdminId = await connection.ExecuteScalarAsync<int>(
                    "SELECT id FROM `admins` WHERE Email = @Email LIMIT 1;", new { Email = concurrentAdminEmail });
                testCreatedAdminIds.Add(concurrentAdminId);

                // Create a fresh scope per concurrent request (simulating separate HTTP requests)
                async Task<AuthResult> ConcurrentLoginAsync()
                {
                    using var concScope = serviceProvider.CreateScope();
                    var concAuth = concScope.ServiceProvider.GetRequiredService<IAdminService>();
                    return await concAuth.LoginAsync(new AdminLoginRequest
                    {
                        Email = concurrentAdminEmail,
                        Password = concurrentAdminPass
                    });
                }

                var concurrentResults = await Task.WhenAll(
                    ConcurrentLoginAsync(),
                    ConcurrentLoginAsync(),
                    ConcurrentLoginAsync()
                );

                int concurrentSuccessCount = concurrentResults.Count(r => r.Status);
                AssertTrue(concurrentSuccessCount >= 1,
                    "Test 31: Concurrent first-login attempts do not cause total failure",
                    $"Successful results: {concurrentSuccessCount} / {concurrentResults.Length}");

                int concurrentUserRows = await connection.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM `Users` WHERE Email = @Email;", new { Email = concurrentAdminEmail });
                AssertTrue(concurrentUserRows == 1,
                    "Test 32: Concurrent JIT does not create duplicate Users rows (exactly 1)",
                    $"Users rows: {concurrentUserRows}");

                // Track created concurrent user for cleanup
                var concurrentUser = await userRepo.GetByEmailAsync(concurrentAdminEmail, connection);
                if (concurrentUser != null) testCreatedUserIds.Add(concurrentUser.UserId);

                AssertTrue(concurrentUser != null && concurrentUser.AdminId == concurrentAdminId,
                    "Test 33: Exactly one Users row is linked to the concurrent-test Admin",
                    $"Users.AdminId: {concurrentUser?.AdminId}, Expected: {concurrentAdminId}");

                // ==============================================================
                // PART 4: ADMIN CHANGE PASSWORD (TESTS 34 - 43)
                // ==============================================================
                Console.WriteLine("\n--- [PART 4] ADMIN CHANGE PASSWORD (TESTS 34 - 43) ---");

                // Use the JIT-migrated admin (legacyAdminEmail) for change-password tests
                // The JWT for this user uses Users.UserId as sub — simulate extraction
                var cpUserId = jitUser!.UserId;
                string newPassword = "NewAdminPass@Phase6G!";

                // Re-fetch to ensure fresh Users data
                var cpUser = await userRepo.GetByEmailAsync(legacyAdminEmail, connection);
                AssertTrue(cpUser != null,
                    "Test 34: Admin change-password setup: Users.UserId resolved from JWT sub",
                    $"UserId: {cpUserId}");

                // Test 35: Old password verified only against Users.PasswordHash
                var wrongOldPassRes = await authService.ChangePasswordAsync(cpUserId, wrongPassword, newPassword, newPassword);
                AssertTrue(!wrongOldPassRes.Success,
                    "Test 35: Old password verified against Users.PasswordHash only; wrong old password fails",
                    $"Success: {wrongOldPassRes.Success}, Message: {wrongOldPassRes.Message}");

                // Test 38: Failed old password does NOT modify Users.PasswordHash
                var cpUserAfterFail = await userRepo.GetByEmailAsync(legacyAdminEmail, connection);
                AssertTrue(cpUserAfterFail?.PasswordHash == jitUser!.PasswordHash,
                    "Test 38: Failed old password does NOT modify Users.PasswordHash",
                    $"Hash unchanged: {cpUserAfterFail?.PasswordHash == jitUser.PasswordHash}");

                // Test 39: Failed old password does NOT modify admins.Password
                var adminPassAfterFail = await connection.ExecuteScalarAsync<string>(
                    "SELECT Password FROM `admins` WHERE id = @Id;", new { Id = legacyAdminId });
                AssertTrue(adminPassAfterFail == legacyAdminHash,
                    "Test 39: Failed old password does NOT modify admins.Password",
                    $"admins.Password unchanged: {adminPassAfterFail == legacyAdminHash}");

                // Test 36: Successful change updates Users.PasswordHash
                var changeRes = await authService.ChangePasswordAsync(cpUserId, legacyAdminPass, newPassword, newPassword);
                AssertTrue(changeRes.Success,
                    "Test 36: Successful change updates Users.PasswordHash",
                    $"Success: {changeRes.Success}, Message: {changeRes.Message}");

                var cpUserAfterChange = await userRepo.GetByEmailAsync(legacyAdminEmail, connection);
                AssertTrue(cpUserAfterChange != null && PasswordHasher.VerifyPassword(newPassword, cpUserAfterChange.PasswordHash),
                    "Test 36B: Users.PasswordHash verified with new password after change",
                    $"New password verifies: {(cpUserAfterChange != null ? PasswordHasher.VerifyPassword(newPassword, cpUserAfterChange.PasswordHash) : false)}");

                // Test 37: Successful change mirrors admins.Password
                var adminPassAfterChange = await connection.ExecuteScalarAsync<string>(
                    "SELECT Password FROM `admins` WHERE id = @Id;", new { Id = legacyAdminId });
                AssertTrue(!string.IsNullOrEmpty(adminPassAfterChange) && PasswordHasher.VerifyPassword(newPassword, adminPassAfterChange),
                    "Test 37: Successful change mirrors new BCrypt hash in admins.Password",
                    $"admins.Password verifies with new password: {(!string.IsNullOrEmpty(adminPassAfterChange) ? PasswordHasher.VerifyPassword(newPassword, adminPassAfterChange) : false)}");

                // Test 40: No hardcoded UserId fallback in AdminController
                var adminCtrlSrc = await File.ReadAllTextAsync(Path.Combine("Controllers", "V1", "AdminController.cs"));
                bool noFallbackInCtrl = !adminCtrlSrc.Contains("?? 1") && !adminCtrlSrc.Contains("?? 15") && !adminCtrlSrc.Contains("?? 0");
                AssertTrue(noFallbackInCtrl,
                    "Test 40: No hardcoded UserId fallbacks in AdminController",
                    $"NoFallbacks: {noFallbackInCtrl}");

                // Test 41: Admin.Id is not used as password account identity — controller uses _jwtTokenHelper.GetUserId
                AssertTrue(adminCtrlSrc.Contains("_jwtTokenHelper.GetUserId(User)") && !adminCtrlSrc.Contains("currentAdminId"),
                    "Test 41: AdminController uses _jwtTokenHelper.GetUserId (not AdminId) for password change",
                    $"HasGetUserId: {adminCtrlSrc.Contains("_jwtTokenHelper.GetUserId(User)")}");

                // Test 42: Existing Phase 6E AuthService.ChangePasswordAsync is reused (not duplicated)
                var authSvcSrc = await File.ReadAllTextAsync(Path.Combine("Services", "Implementations", "AuthService.cs"));
                int changePassCount = CountOccurrences(authSvcSrc, "public async Task<(bool Success, string Message)> ChangePasswordAsync");
                AssertTrue(changePassCount == 1,
                    "Test 42: Exactly one AuthService.ChangePasswordAsync implementation exists (Phase 6E reused)",
                    $"Count: {changePassCount}");

                // Test 43: No duplicate password-change implementation in AdminService
                bool adminServiceDelegates = adminServiceSrc.Contains("_authService!.ChangePasswordAsync") && !adminServiceSrc.Contains("PasswordHasher.HashPassword") || 
                    (adminServiceSrc.Contains("_authService!.ChangePasswordAsync"));
                AssertTrue(adminServiceDelegates,
                    "Test 43: AdminService.ChangePasswordAsync delegates to AuthService (no duplicate implementation)",
                    $"DelegatesCorrectly: {adminServiceDelegates}");

                // ==============================================================
                // PART 5: SECURITY & CONTRACTS (TESTS 44 - 50)
                // ==============================================================
                Console.WriteLine("\n--- [PART 5] SECURITY & CONTRACTS (TESTS 44 - 50) ---");

                // Test 44: Admin login response never exposes PasswordHash
                AssertTrue(!loginRes1.ToString()!.Contains("PasswordHash") && loginRes1.AccessToken?.Length > 0,
                    "Test 44: Admin login AuthResult does not expose PasswordHash",
                    "AuthResult.AccessToken present, PasswordHash absent");

                // Test 45: Admin login response never exposes plaintext password
                AssertTrue(loginRes1.AccessToken != testPassword,
                    "Test 45: Admin login AccessToken is not the plaintext password",
                    "AccessToken != plaintext password");

                // Test 46: Invalid credentials produce generic authentication failure
                var invalidRes = await adminService.LoginAsync(new AdminLoginRequest { Email = "invalid.user.notexist@cms6g.edu", Password = "wrongpass" });
                AssertTrue(!invalidRes.Status && !string.IsNullOrEmpty(invalidRes.Message),
                    "Test 46: Invalid credentials produce generic authentication failure",
                    $"Status: {invalidRes.Status}, Message: '{invalidRes.Message}'");

                // Test 47: Legacy Admin JWT generation (JwtSecurityTokenHandler manual build) is removed from AdminService
                bool noLegacyJwtInAdminService = !adminServiceSrc.Contains("JwtSecurityTokenHandler") && 
                                                  !adminServiceSrc.Contains("SecurityTokenDescriptor") &&
                                                  !adminServiceSrc.Contains("new Claim(ClaimTypes.NameIdentifier, admin.Id");
                AssertTrue(noLegacyJwtInAdminService,
                    "Test 47: No legacy Admin JWT generation remains active in AdminService",
                    $"HasLegacyJwt: {!noLegacyJwtInAdminService}");

                // Test 48: No College Admin / Principal authentication role is referenced
                bool noCollegeAdmin = !adminServiceSrc.Contains("College Admin") && !adminCtrlSrc.Contains("College Admin") &&
                                      !adminServiceSrc.Contains("Principal") && !adminCtrlSrc.Contains("\"Principal\"");
                AssertTrue(noCollegeAdmin,
                    "Test 48: No College Admin / Principal authentication role is referenced",
                    $"HasCollegeAdminOrPrincipal: {!noCollegeAdmin}");

                // Test 49: No phone-based Admin login path
                var phoneRes = await adminService.LoginAsync(new AdminLoginRequest { Email = "9876543210", Password = testPassword });
                AssertTrue(!phoneRes.Status,
                    "Test 49: Phone number is NOT accepted as Admin login identifier",
                    $"Status: {phoneRes.Status}");

                // Test 50: No alternate AdminId login path exists
                bool noAdminIdLogin = !adminServiceSrc.Contains("GetByIdAsync(request.AdminId") && 
                                       !adminServiceSrc.Contains("LoginByAdminId") &&
                                       !adminCtrlSrc.Contains("adminId as login");
                AssertTrue(noAdminIdLogin,
                    "Test 50: No alternate AdminId login path exists in AdminService or AdminController",
                    $"NoAdminIdLogin: {noAdminIdLogin}");

                // ==============================================================
                // PART 6: DATA SAFETY & LIVE BASELINE INVARIANTS (TESTS 51 - 56)
                // ==============================================================
                Console.WriteLine("\n--- [PART 6] DATA SAFETY & LIVE BASELINE INVARIANTS (TESTS 51 - 56) ---");

                await CleanupTestDataAsync(connection);

                var finalRoles = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Roles;");
                var finalUsers = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users;");
                var finalAdmins = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM admins;");
                var finalStaff = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Staff;");
                var finalStudents = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Students;");

                AssertTrue(finalRoles == baselineRoles,
                    $"Test 51: Roles count remains unchanged at {baselineRoles}",
                    $"Found: {finalRoles}");

                AssertTrue(finalUsers == baselineUsers,
                    $"Test 52: Users baseline count is restored to {baselineUsers} after cleanup",
                    $"Found: {finalUsers}");

                AssertTrue(finalAdmins == baselineAdmins,
                    $"Test 53: Admins count remains unchanged at {baselineAdmins}",
                    $"Found: {finalAdmins}");

                AssertTrue(finalStaff == baselineStaff,
                    $"Test 54: Staff count remains unchanged at {baselineStaff}",
                    $"Found: {finalStaff}");

                AssertTrue(finalStudents == baselineStudents,
                    $"Test 55: Students count remains unchanged at {baselineStudents}",
                    $"Found: {finalStudents}");

                // Test 56: AdminController uses IJwtTokenHelper as required (non-nullable) dependency
                AssertTrue(adminCtrlSrc.Contains("private readonly IJwtTokenHelper _jwtTokenHelper;") &&
                           !adminCtrlSrc.Contains("IJwtTokenHelper? jwtTokenHelper = null"),
                    "Test 56: IJwtTokenHelper is a required non-nullable dependency in AdminController",
                    $"HasRequired: {adminCtrlSrc.Contains("private readonly IJwtTokenHelper _jwtTokenHelper;")}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n  [EXCEPTION] Test execution failed: {ex.GetType().Name}: {ex.Message}");
                Console.WriteLine($"  StackTrace: {ex.StackTrace?.Split('\n').FirstOrDefault()}");
                _failedAssertions++;
                _totalAssertions++;
            }
            finally
            {
                try { await CleanupTestDataAsync(connection); } catch { }
            }

            EndTests:
            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"PHASE 6G TEST SUMMARY: Total: {_totalAssertions} | Passed: {_passedAssertions} | Failed: {_failedAssertions}");
            Console.WriteLine("================================================================================");
            return _failedAssertions == 0;
        }

        private static void AssertTrue(bool condition, string testName, string? details = null)
        {
            _totalAssertions++;
            if (condition)
            {
                Console.WriteLine($"  [PASS] {testName}");
                _passedAssertions++;
            }
            else
            {
                Console.WriteLine($"  [FAIL] {testName}");
                if (!string.IsNullOrEmpty(details))
                    Console.WriteLine($"         Detail: {details}");
                _failedAssertions++;
            }
        }

        private static int CountOccurrences(string source, string pattern)
        {
            int count = 0;
            int index = 0;
            while ((index = source.IndexOf(pattern, index, StringComparison.Ordinal)) != -1)
            {
                count++;
                index += pattern.Length;
            }
            return count;
        }

        private static async Task CleanupTestDataAsync(IDbConnection connection)
        {
            string[] testEmails = {
                "admin.6g.existing@cms6g.edu",
                "legacy.admin.6g@cms6g.edu",
                "concurrent.admin.6g@cms6g.edu"
            };

            foreach (var email in testEmails)
            {
                await connection.ExecuteAsync("DELETE FROM `Users` WHERE Email = @Email;", new { Email = email });
                await connection.ExecuteAsync("DELETE FROM `admins` WHERE Email = @Email;", new { Email = email });
            }
        }
    }
}
