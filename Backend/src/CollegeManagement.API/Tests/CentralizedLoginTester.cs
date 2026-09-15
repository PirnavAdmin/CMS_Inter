using System;
using System.Collections.Generic;
using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Authentication;
using CollegeManagement.API.Helpers;
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
    /// Automated test runner for Phase 6C: Centralized Users Login & Controlled JIT Legacy Migration.
    /// Strictly verifies:
    /// 1. Centralized Users authentication (Authoritative, Active status, Linked Domain status, LastLogin update).
    /// 2. Email-only login requirement (Rejection of PhoneNumber as login identifier).
    /// 3. Legacy Admin JIT migration (Dynamic role resolution: Super Admin vs Admin, BCrypt migration, sub = Users.UserId).
    /// 4. Legacy Student JIT migration (Canonical Student role, valid email requirement, sub = Users.UserId).
    /// 5. Legacy Staff protection (No synthetic passwords or ambiguous JWTs).
    /// 6. Standalone unlinked Users handling (Normal authentication without fuzzy linking).
    /// 7. Concurrency resilience (Atomic JIT insertion, duplicate-key graceful recovery).
    /// 8. Live database baseline preservation & data safety invariants.
    /// </summary>
    public static class CentralizedLoginTester
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
            Console.WriteLine("    PHASE 6C: CENTRALIZED USERS LOGIN & CONTROLLED JIT MIGRATION TEST SUITE");
            Console.WriteLine("================================================================================");

            _totalAssertions = 0;
            _passedAssertions = 0;
            _failedAssertions = 0;

            using var scope = serviceProvider.CreateScope();
            var sp = scope.ServiceProvider;

            var dbContext = sp.GetRequiredService<AppDbContext>();
            var authService = sp.GetRequiredService<IAuthService>();
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

            // Clean up any test remnants from prior runs before capturing baseline
            await CleanUpTestDataAsync(connection);

            // Capture initial live database baseline counts
            var initialRolesCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Roles;");
            var initialUsersCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users;");
            var initialAdminsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM admins;");
            var initialStaffCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Staff;");
            var initialStudentsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Students;");

            var originalUserIds = (await connection.QueryAsync<int>("SELECT UserId FROM Users;")).ToHashSet();

            // Clean up any test artifacts from prior runs
            await CleanUpTestDataAsync(connection);

            var createdTestUserIds = new List<int>();
            var createdTestAdminIds = new List<int>();
            var createdTestStudentIds = new List<int>();
            var createdTestStaffIds = new List<int>();

            try
            {
                // Dynamic role resolution
                var superAdminRole = await userRepo.GetRoleByNameAsync("Super Admin", connection);
                var adminRole = await userRepo.GetRoleByNameAsync("Admin", connection);
                var studentRole = await userRepo.GetRoleByNameAsync("Student", connection);
                var facultyRole = await userRepo.GetRoleByNameAsync("Faculty", connection);

                const string testPassword = "SecurePassword@123!";
                var testPasswordHash = PasswordHasher.HashPassword(testPassword);

                // =============================================================
                // [PART 1] USERS AUTHENTICATION (TESTS 1 - 12)
                // =============================================================
                Console.WriteLine("\n--- [PART 1] USERS AUTHENTICATION (TESTS 1 - 12) ---");

                // Create a standalone active user
                var activeUserEmail = "test.active.user@testlogin.edu";
                var activeUser = new User
                {
                    FullName = "Active Centralized User",
                    Email = activeUserEmail,
                    PasswordHash = testPasswordHash,
                    PhoneNumber = "9876543210",
                    RoleId = adminRole!.RoleId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                var activeUserId = await userRepo.CreateUserAsync(activeUser, connection);
                createdTestUserIds.Add(activeUserId);

                // Test 1: Valid Users.Email + Users.PasswordHash returns 200 (Status = true)
                var loginRes1 = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = activeUserEmail,
                    Password = testPassword
                });
                AssertTrue(loginRes1.Status && !string.IsNullOrEmpty(loginRes1.AccessToken),
                    "Test 1: Valid Users.Email + Users.PasswordHash returns 200 (Status = true)",
                    $"Status: {loginRes1.Status}, Token length: {loginRes1.AccessToken?.Length}");

                // Validate and extract JWT claims
                var principal1 = tokenHandler.ValidateToken(loginRes1.AccessToken, validationParameters, out var validatedToken1);
                var jwt1 = (JwtSecurityToken)validatedToken1;

                // Test 2: JWT sub = Users.UserId
                var subClaim = jwt1.Subject;
                AssertTrue(subClaim == activeUserId.ToString(),
                    "Test 2: JWT sub equals Users.UserId",
                    $"Expected: {activeUserId}, Actual: {subClaim}");

                // Test 3: JWT NameIdentifier = Users.UserId
                var nameIdClaim = principal1.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                AssertTrue(nameIdClaim == activeUserId.ToString(),
                    "Test 3: JWT NameIdentifier equals Users.UserId",
                    $"Expected: {activeUserId}, Actual: {nameIdClaim}");

                // Test 4: JWT role = canonical Roles.RoleName
                var roleClaim = principal1.FindFirst(ClaimTypes.Role)?.Value;
                AssertTrue(roleClaim == "Admin",
                    "Test 4: JWT role equals canonical Roles.RoleName",
                    $"Expected: 'Admin', Actual: '{roleClaim}'");

                // Create linked active student user to verify dedicated domain claims
                var linkedStudentEmail = "test.linked.student@testlogin.edu";
                var linkedStudentUser = new User
                {
                    FullName = "Linked Student User",
                    Email = linkedStudentEmail,
                    PasswordHash = testPasswordHash,
                    PhoneNumber = "9876543211",
                    RoleId = studentRole!.RoleId,
                    StudentId = 777,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Seed matching student in Students table
                await connection.ExecuteAsync(@"
                    INSERT INTO Students (StudentId, AdmissionNo, AdmissionDate, StudentName, Gender, DateOfBirth, Email, PasswordHash, FeeAmount, FeePaid, AttendancePercentage, Status, IsActive, CreatedAt)
                    VALUES (777, 'ADM-TEST-777', NOW(), 'Linked Student', 'Male', '2005-01-01', @Email, @Hash, 0, 0, 100, 'Active', 1, NOW())
                    ON DUPLICATE KEY UPDATE IsActive = 1, Email = @Email;",
                    new { Email = linkedStudentEmail, Hash = testPasswordHash });
                createdTestStudentIds.Add(777);

                var linkedStudentUserId = await userRepo.CreateUserAsync(linkedStudentUser, connection);
                createdTestUserIds.Add(linkedStudentUserId);

                var studentLoginRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = linkedStudentEmail,
                    Password = testPassword
                });
                var studentPrincipal = tokenHandler.ValidateToken(studentLoginRes.AccessToken, validationParameters, out _);
                var studentIdClaim = studentPrincipal.FindFirst("StudentId")?.Value;

                // Test 5: Dedicated domain claim appears correctly
                AssertTrue(studentLoginRes.Status && studentIdClaim == "777",
                    "Test 5: Dedicated domain claim appears correctly (StudentId = 777)",
                    $"StudentId Claim: '{studentIdClaim}'");

                // Test 6: Invalid password returns 401 (Status = false)
                var invalidPassRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = activeUserEmail,
                    Password = "WrongPassword!999"
                });
                AssertTrue(!invalidPassRes.Status && invalidPassRes.AccessToken == null,
                    "Test 6: Invalid password returns 401 (Status = false)",
                    $"Status: {invalidPassRes.Status}, Message: '{invalidPassRes.Message}'");

                // Test 6B: Existing Users row blocks legacy Admin password fallback
                var adminWithDifferentPassEmail = "test.admin.passblock@testlogin.edu";
                var legacyAdminOldPass = "LegacyAdminOldPass@123";
                var usersAdminNewPass = "UsersAdminNewPass@456";
                await connection.ExecuteAsync(@"
                    INSERT INTO admins (id, Email, Password, IsActive)
                    VALUES (877, @Email, @LegacyPass, 1)
                    ON DUPLICATE KEY UPDATE Password = @LegacyPass, IsActive = 1;",
                    new { Email = adminWithDifferentPassEmail, LegacyPass = PasswordHasher.HashPassword(legacyAdminOldPass) });
                createdTestAdminIds.Add(877);

                var usersAdminRow = new User
                {
                    FullName = "Admin With Modern Users Pass",
                    Email = adminWithDifferentPassEmail,
                    PasswordHash = PasswordHasher.HashPassword(usersAdminNewPass),
                    RoleId = adminRole.RoleId,
                    AdminId = 877,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                var usersAdminRowId = await userRepo.CreateUserAsync(usersAdminRow, connection);
                createdTestUserIds.Add(usersAdminRowId);

                // Attempt login with OLD legacy password (must FAIL because Users.PasswordHash is authoritative)
                var legacyFallbackRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = adminWithDifferentPassEmail,
                    Password = legacyAdminOldPass
                });
                AssertTrue(!legacyFallbackRes.Status && string.IsNullOrEmpty(legacyFallbackRes.AccessToken),
                    "Test 6B: Existing Users row blocks legacy Admin password fallback",
                    $"Status: {legacyFallbackRes.Status}, Token: {legacyFallbackRes.AccessToken}");

                // Attempt login with NEW Users.PasswordHash (must SUCCEED)
                var usersAuthRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = adminWithDifferentPassEmail,
                    Password = usersAdminNewPass
                });
                AssertTrue(usersAuthRes.Status && usersAuthRes.UserId == usersAdminRowId,
                    "Test 6C: Existing Users row authenticates exclusively via Users.PasswordHash",
                    $"Status: {usersAuthRes.Status}, UserId: {usersAuthRes.UserId}");

                // Test 6D: Existing Users row blocks legacy Student password fallback
                var studentWithDifferentPassEmail = "test.student.passblock@testlogin.edu";
                var legacyStudentOldPass = "LegacyStudentOldPass@123";
                var usersStudentNewPass = "UsersStudentNewPass@456";
                await connection.ExecuteAsync(@"
                    INSERT INTO Students (StudentId, AdmissionNo, AdmissionDate, StudentName, Gender, DateOfBirth, Email, PasswordHash, FeeAmount, FeePaid, AttendancePercentage, Status, IsActive, CreatedAt)
                    VALUES (785, 'ADM-TEST-785', NOW(), 'Student Pass Block', 'Female', '2005-02-02', @Email, @LegacyHash, 0, 0, 100, 'Active', 1, NOW())
                    ON DUPLICATE KEY UPDATE Email = @Email, PasswordHash = @LegacyHash, IsActive = 1;",
                    new { Email = studentWithDifferentPassEmail, LegacyHash = PasswordHasher.HashPassword(legacyStudentOldPass) });
                createdTestStudentIds.Add(785);

                var usersStudentRow = new User
                {
                    FullName = "Student With Modern Users Pass",
                    Email = studentWithDifferentPassEmail,
                    PasswordHash = PasswordHasher.HashPassword(usersStudentNewPass),
                    RoleId = studentRole.RoleId,
                    StudentId = 785,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                var usersStudentRowId = await userRepo.CreateUserAsync(usersStudentRow, connection);
                createdTestUserIds.Add(usersStudentRowId);

                // Attempt login with OLD student password (must FAIL)
                var legacyStudentFallbackRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = studentWithDifferentPassEmail,
                    Password = legacyStudentOldPass
                });
                AssertTrue(!legacyStudentFallbackRes.Status && string.IsNullOrEmpty(legacyStudentFallbackRes.AccessToken),
                    "Test 6D: Existing Users row blocks legacy Student password fallback",
                    $"Status: {legacyStudentFallbackRes.Status}");

                // Test 7: Inactive Users.IsActive returns rejection
                var inactiveUserEmail = "test.inactive.user@testlogin.edu";
                var inactiveUser = new User
                {
                    FullName = "Inactive Centralized User",
                    Email = inactiveUserEmail,
                    PasswordHash = testPasswordHash,
                    PhoneNumber = "9876543212",
                    RoleId = adminRole.RoleId,
                    IsActive = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                var inactiveUserId = await userRepo.CreateUserAsync(inactiveUser, connection);
                createdTestUserIds.Add(inactiveUserId);

                var inactiveUserRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = inactiveUserEmail,
                    Password = testPassword
                });
                AssertTrue(!inactiveUserRes.Status && inactiveUserRes.AccessToken == null,
                    "Test 7: Inactive Users.IsActive returns rejection",
                    $"Status: {inactiveUserRes.Status}");

                // Test 8: Inactive linked Student returns rejection
                var inactStudEmail = "test.inact.stud@testlogin.edu";
                await connection.ExecuteAsync(@"
                    INSERT INTO Students (StudentId, AdmissionNo, AdmissionDate, StudentName, Gender, DateOfBirth, Email, PasswordHash, FeeAmount, FeePaid, AttendancePercentage, Status, IsActive, CreatedAt)
                    VALUES (778, 'ADM-TEST-778', NOW(), 'Inactive Student', 'Male', '2005-01-01', @Email, @Hash, 0, 0, 100, 'Inactive', 0, NOW())
                    ON DUPLICATE KEY UPDATE IsActive = 0, Email = @Email;",
                    new { Email = inactStudEmail, Hash = testPasswordHash });
                createdTestStudentIds.Add(778);

                var inactStudUser = new User
                {
                    FullName = "User Of Inactive Student",
                    Email = inactStudEmail,
                    PasswordHash = testPasswordHash,
                    RoleId = studentRole.RoleId,
                    StudentId = 778,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                var inactStudUserId = await userRepo.CreateUserAsync(inactStudUser, connection);
                createdTestUserIds.Add(inactStudUserId);

                var inactStudRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = inactStudEmail,
                    Password = testPassword
                });
                AssertTrue(!inactStudRes.Status && inactStudRes.AccessToken == null,
                    "Test 8: Inactive linked Student returns rejection",
                    $"Status: {inactStudRes.Status}");

                // Test 9: Inactive linked Admin returns rejection
                var inactAdminEmail = "test.inact.admin@testlogin.edu";
                await connection.ExecuteAsync(@"
                    INSERT INTO admins (id, Email, Password, IsActive)
                    VALUES (888, @Email, @Pass, 0)
                    ON DUPLICATE KEY UPDATE IsActive = 0;",
                    new { Email = inactAdminEmail, Pass = testPasswordHash });
                createdTestAdminIds.Add(888);

                var inactAdminUser = new User
                {
                    FullName = "User Of Inactive Admin",
                    Email = inactAdminEmail,
                    PasswordHash = testPasswordHash,
                    RoleId = adminRole.RoleId,
                    AdminId = 888,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                var inactAdminUserId = await userRepo.CreateUserAsync(inactAdminUser, connection);
                createdTestUserIds.Add(inactAdminUserId);

                var inactAdminRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = inactAdminEmail,
                    Password = testPassword
                });
                AssertTrue(!inactAdminRes.Status && inactAdminRes.AccessToken == null,
                    "Test 9: Inactive linked Admin returns rejection",
                    $"Status: {inactAdminRes.Status}");

                // Test 10: Deleted/inactive linked Staff returns rejection
                var inactStaffEmail = "test.inact.staff@testlogin.edu";
                await connection.ExecuteAsync(@"
                    INSERT INTO Staff (Id, EmployeeId, FirstName, LastName, Gender, DateOfBirth, Mobile, Email, Qualification, Designation, StaffType, JoiningDate, Experience, Status, IsDeleted, CreatedAt)
                    VALUES (999, 'EMP-TEST-999', 'Inactive', 'Staff', 'Male', '1985-01-01', '9999999999', @Email, 'M.Tech', 'Assistant Professor', 'Teaching', NOW(), 5.0, 'Inactive', 1, NOW())
                    ON DUPLICATE KEY UPDATE IsDeleted = 1, Status = 'Inactive';",
                    new { Email = inactStaffEmail });
                createdTestStaffIds.Add(999);

                var inactStaffUser = new User
                {
                    FullName = "User Of Inactive Staff",
                    Email = inactStaffEmail,
                    PasswordHash = testPasswordHash,
                    RoleId = facultyRole!.RoleId,
                    StaffId = 999,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                var inactStaffUserId = await userRepo.CreateUserAsync(inactStaffUser, connection);
                createdTestUserIds.Add(inactStaffUserId);

                var inactStaffRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = inactStaffEmail,
                    Password = testPassword
                });
                AssertTrue(!inactStaffRes.Status && inactStaffRes.AccessToken == null,
                    "Test 10: Deleted/inactive linked Staff returns rejection",
                    $"Status: {inactStaffRes.Status}");

                // Test 11: Successful login updates Users.LastLogin
                var preLoginTime = DateTime.UtcNow.AddMinutes(-5);
                await connection.ExecuteAsync("UPDATE Users SET LastLogin = @PreTime WHERE UserId = @Id",
                    new { PreTime = preLoginTime, Id = activeUserId });

                var successLogin = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = activeUserEmail,
                    Password = testPassword
                });
                var updatedLastLogin = await connection.ExecuteScalarAsync<DateTime?>("SELECT LastLogin FROM Users WHERE UserId = @Id", new { Id = activeUserId });
                AssertTrue(successLogin.Status && updatedLastLogin.HasValue && updatedLastLogin.Value > preLoginTime,
                    "Test 11: Successful login updates Users.LastLogin",
                    $"Previous: {preLoginTime}, Updated: {updatedLastLogin}");

                // Test 12: Failed login does not update LastLogin
                var fixedLastLogin = DateTime.UtcNow.AddHours(-1);
                await connection.ExecuteAsync("UPDATE Users SET LastLogin = @FixedTime WHERE UserId = @Id",
                    new { FixedTime = fixedLastLogin, Id = activeUserId });

                await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = activeUserEmail,
                    Password = "WrongPassword123"
                });
                var postFailLastLogin = await connection.ExecuteScalarAsync<DateTime?>("SELECT LastLogin FROM Users WHERE UserId = @Id", new { Id = activeUserId });
                AssertTrue(postFailLastLogin.HasValue && Math.Abs((postFailLastLogin.Value - fixedLastLogin).TotalSeconds) < 2,
                    "Test 12: Failed login does not update LastLogin",
                    $"Fixed: {fixedLastLogin}, Current: {postFailLastLogin}");

                // =============================================================
                // [PART 2] EMAIL LOGIN RULE (TESTS 13 - 14)
                // =============================================================
                Console.WriteLine("\n--- [PART 2] EMAIL LOGIN RULE (TESTS 13 - 14) ---");

                // Test 13: Valid email works
                var emailLoginRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = activeUserEmail,
                    Password = testPassword
                });
                AssertTrue(emailLoginRes.Status,
                    "Test 13: Valid email works",
                    $"Status: {emailLoginRes.Status}");

                // Test 13B: Email login handles whitespace and uppercase/mixed-case insensitivity
                var mixedCaseWithWhitespace = $"  {activeUserEmail.ToUpperInvariant()}  ";
                var mixedCaseLoginRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = mixedCaseWithWhitespace,
                    Password = testPassword
                });
                AssertTrue(mixedCaseLoginRes.Status && mixedCaseLoginRes.UserId == activeUserId,
                    "Test 13B: Email login handles whitespace and uppercase/mixed-case insensitivity",
                    $"Status: {mixedCaseLoginRes.Status}, UserId: {mixedCaseLoginRes.UserId}");

                // Test 13C: Email uniqueness prevents duplicate logical Users accounts with casing differences
                var duplicateCasingUser = new User
                {
                    FullName = "Duplicate Casing User",
                    Email = activeUserEmail.ToUpperInvariant(),
                    PasswordHash = testPasswordHash,
                    RoleId = adminRole.RoleId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                bool duplicateCaught = false;
                try
                {
                    await userRepo.CreateUserAsync(duplicateCasingUser, connection);
                }
                catch (Exception)
                {
                    duplicateCaught = true;
                }
                var matchingUserCount = await connection.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM Users WHERE LOWER(Email) = @Email",
                    new { Email = activeUserEmail.ToLowerInvariant() });

                AssertTrue(duplicateCaught && matchingUserCount == 1,
                    "Test 13C: Email uniqueness prevents duplicate logical Users accounts with casing differences",
                    $"Duplicate exception caught: {duplicateCaught}, Matching count: {matchingUserCount}");

                // Test 14: PhoneNumber is NOT accepted as login identifier
                var phoneLoginRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = "9876543210", // Phone number of activeUser
                    Password = testPassword
                });
                AssertTrue(!phoneLoginRes.Status,
                    "Test 14: PhoneNumber is NOT accepted as login identifier",
                    $"Status: {phoneLoginRes.Status}, Message: '{phoneLoginRes.Message}'");

                // =============================================================
                // [PART 3] LEGACY ADMIN JIT (TESTS 15 - 23)
                // =============================================================
                Console.WriteLine("\n--- [PART 3] LEGACY ADMIN JIT (TESTS 15 - 23) ---");

                // Seed a legacy Admin without Users row
                var legacyAdminEmail = "legacy.admin@testlogin.edu";
                var legacyAdminPassPlain = "LegacyAdmin@2026";
                var legacyAdminPassHash = PasswordHasher.HashPassword(legacyAdminPassPlain);

                await connection.ExecuteAsync(@"
                    INSERT INTO admins (id, Email, Password, IsActive)
                    VALUES (801, @Email, @Password, 1)
                    ON DUPLICATE KEY UPDATE Email = @Email, Password = @Password, IsActive = 1;",
                    new { Email = legacyAdminEmail, Password = legacyAdminPassHash });
                createdTestAdminIds.Add(801);

                // Seed a legacy Super Admin without Users row
                var legacySuperAdminEmail = "legacy.superadmin@testlogin.edu";
                var legacySuperAdminPassPlain = "LegacySuperAdmin@2026";
                var legacySuperAdminPassHash = PasswordHasher.HashPassword(legacySuperAdminPassPlain);

                await connection.ExecuteAsync(@"
                    INSERT INTO admins (id, Email, Password, IsActive)
                    VALUES (802, @Email, @Password, 1)
                    ON DUPLICATE KEY UPDATE Email = @Email, Password = @Password, IsActive = 1;",
                    new { Email = legacySuperAdminEmail, Password = legacySuperAdminPassHash });
                createdTestAdminIds.Add(802);

                // Test 15: Legacy Admin login with valid credentials creates Users row
                var adminJitLoginRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = legacyAdminEmail,
                    Password = legacyAdminPassPlain
                });
                var createdAdminUser = await userRepo.GetByEmailAsync(legacyAdminEmail, connection);
                if (createdAdminUser != null) createdTestUserIds.Add(createdAdminUser.UserId);

                AssertTrue(adminJitLoginRes.Status && createdAdminUser != null && createdAdminUser.UserId > 0,
                    "Test 15: Legacy Admin login with valid credentials creates Users row",
                    $"Status: {adminJitLoginRes.Status}, UserId: {createdAdminUser?.UserId}");

                // Test 16: Created Users.AdminId links to correct Admin
                AssertTrue(createdAdminUser?.AdminId == 801,
                    "Test 16: Created Users.AdminId links to correct Admin (AdminId = 801)",
                    $"AdminId: {createdAdminUser?.AdminId}");

                // Test 17: Legacy Super Admin remains Super Admin
                var superAdminJitLoginRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = legacySuperAdminEmail,
                    Password = legacySuperAdminPassPlain
                });
                var createdSuperAdminUser = await userRepo.GetByEmailAsync(legacySuperAdminEmail, connection);
                if (createdSuperAdminUser != null) createdTestUserIds.Add(createdSuperAdminUser.UserId);

                var superAdminPrincipal = tokenHandler.ValidateToken(superAdminJitLoginRes.AccessToken, validationParameters, out _);
                var superAdminRoleClaim = superAdminPrincipal.FindFirst(ClaimTypes.Role)?.Value;

                AssertTrue(superAdminJitLoginRes.Status && createdSuperAdminUser?.RoleId == superAdminRole!.RoleId && superAdminRoleClaim == "Super Admin",
                    "Test 17: Legacy Super Admin remains Super Admin",
                    $"RoleId: {createdSuperAdminUser?.RoleId}, Role claim: '{superAdminRoleClaim}'");

                // Test 18: Legacy Admin remains Admin
                var adminPrincipal = tokenHandler.ValidateToken(adminJitLoginRes.AccessToken, validationParameters, out var adminValidatedToken);
                var adminJwt = (JwtSecurityToken)adminValidatedToken;
                var adminRoleClaim = adminPrincipal.FindFirst(ClaimTypes.Role)?.Value;

                AssertTrue(createdAdminUser?.RoleId == adminRole.RoleId && adminRoleClaim == "Admin",
                    "Test 18: Legacy Admin remains Admin",
                    $"RoleId: {createdAdminUser?.RoleId}, Role claim: '{adminRoleClaim}'");

                // Test 19: Admin RoleId is resolved dynamically from Roles
                AssertTrue(createdAdminUser?.RoleId == adminRole.RoleId && createdSuperAdminUser?.RoleId == superAdminRole!.RoleId,
                    "Test 19: Admin RoleId is resolved dynamically from Roles",
                    $"Admin RoleId: {createdAdminUser?.RoleId} (Dynamic: {adminRole.RoleId}), Super Admin RoleId: {createdSuperAdminUser?.RoleId} (Dynamic: {superAdminRole!.RoleId})");

                // Test 20: No hard-coded RoleId = 2 used for all Admin migration
                AssertTrue(createdSuperAdminUser?.RoleId != 2 && createdSuperAdminUser?.RoleId == superAdminRole!.RoleId,
                    "Test 20: No hard-coded RoleId = 2 used for all Admin migration",
                    $"Super Admin RoleId: {createdSuperAdminUser?.RoleId}");

                // Test 21: JWT sub is newly created Users.UserId
                var adminSubClaim = adminJwt.Subject;
                AssertTrue(adminSubClaim == createdAdminUser?.UserId.ToString(),
                    "Test 21: JWT sub is newly created Users.UserId",
                    $"sub: '{adminSubClaim}', Users.UserId: {createdAdminUser?.UserId}");

                // Test 22: JWT AdminId equals legacy Admin.Id
                var adminIdClaim = adminPrincipal.FindFirst("AdminId")?.Value;
                AssertTrue(adminIdClaim == "801",
                    "Test 22: JWT AdminId equals legacy Admin.Id (801)",
                    $"AdminId claim: '{adminIdClaim}'");

                // Test 23: Legacy admins.Password is not modified by Phase 6C
                var currentAdminDbPass = await connection.ExecuteScalarAsync<string>("SELECT Password FROM admins WHERE id = 801");
                AssertTrue(currentAdminDbPass == legacyAdminPassHash,
                    "Test 23: Legacy admins.Password is not modified by Phase 6C",
                    $"Original Hash Preserved: {currentAdminDbPass == legacyAdminPassHash}");

                // =============================================================
                // [PART 4] LEGACY STUDENT JIT (TESTS 24 - 30)
                // =============================================================
                Console.WriteLine("\n--- [PART 4] LEGACY STUDENT JIT (TESTS 24 - 30) ---");

                // Seed a legacy Student with valid email and password
                var legacyStudentEmail = "legacy.student@testlogin.edu";
                var legacyStudentPassPlain = "LegacyStudent@2026";
                var legacyStudentPassHash = PasswordHasher.HashPassword(legacyStudentPassPlain);

                await connection.ExecuteAsync(@"
                    INSERT INTO Students (StudentId, AdmissionNo, AdmissionDate, StudentName, Gender, DateOfBirth, Email, MobileNumber, PasswordHash, FeeAmount, FeePaid, AttendancePercentage, Status, IsActive, CreatedAt)
                    VALUES (790, 'ADM-TEST-790', NOW(), 'Legacy Student JIT', 'Female', '2004-05-15', @Email, '9876543290', @Hash, 0, 0, 100, 'Active', 1, NOW())
                    ON DUPLICATE KEY UPDATE Email = @Email, PasswordHash = @Hash, IsActive = 1;",
                    new { Email = legacyStudentEmail, Hash = legacyStudentPassHash });
                createdTestStudentIds.Add(790);

                // Seed a legacy Student WITHOUT email
                await connection.ExecuteAsync(@"
                    INSERT INTO Students (StudentId, AdmissionNo, AdmissionDate, StudentName, Gender, DateOfBirth, Email, MobileNumber, PasswordHash, FeeAmount, FeePaid, AttendancePercentage, Status, IsActive, CreatedAt)
                    VALUES (791, 'ADM-TEST-791', NOW(), 'No Email Student', 'Male', '2004-06-20', NULL, '9876543291', @Hash, 0, 0, 100, 'Active', 1, NOW())
                    ON DUPLICATE KEY UPDATE Email = NULL, PasswordHash = @Hash, IsActive = 1;",
                    new { Hash = legacyStudentPassHash });
                createdTestStudentIds.Add(791);

                // Test 24: Legacy Student with valid email creates Users row
                var studentJitLoginRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = legacyStudentEmail,
                    Password = legacyStudentPassPlain
                });
                var createdStudentUser = await userRepo.GetByEmailAsync(legacyStudentEmail, connection);
                if (createdStudentUser != null) createdTestUserIds.Add(createdStudentUser.UserId);

                AssertTrue(studentJitLoginRes.Status && createdStudentUser != null && createdStudentUser.UserId > 0,
                    "Test 24: Legacy Student with valid email creates Users row",
                    $"Status: {studentJitLoginRes.Status}, UserId: {createdStudentUser?.UserId}");

                // Test 25: Users.StudentId links correctly
                AssertTrue(createdStudentUser?.StudentId == 790,
                    "Test 25: Users.StudentId links correctly (StudentId = 790)",
                    $"StudentId: {createdStudentUser?.StudentId}");

                // Test 26: Users role is canonical Student
                AssertTrue(createdStudentUser?.RoleId == studentRole!.RoleId,
                    "Test 26: Users role is canonical Student",
                    $"RoleId: {createdStudentUser?.RoleId}, Canonical Student RoleId: {studentRole!.RoleId}");

                // Test 27: JWT sub is Users.UserId
                var studentJitPrincipal = tokenHandler.ValidateToken(studentJitLoginRes.AccessToken, validationParameters, out var studentValidatedToken);
                var studentJitJwt = (JwtSecurityToken)studentValidatedToken;
                var studentSubClaim = studentJitJwt.Subject;

                AssertTrue(studentSubClaim == createdStudentUser?.UserId.ToString(),
                    "Test 27: JWT sub is Users.UserId",
                    $"sub: '{studentSubClaim}', Users.UserId: {createdStudentUser?.UserId}");

                // Test 28: JWT StudentId equals Student.StudentId
                var studentJwtStudentId = studentJitPrincipal.FindFirst("StudentId")?.Value;
                AssertTrue(studentJwtStudentId == "790",
                    "Test 28: JWT StudentId equals Student.StudentId (790)",
                    $"StudentId claim: '{studentJwtStudentId}'");

                // Test 29: Student without email is NOT provisioned
                var noEmailLoginRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = "noemailstudent@testlogin.edu",
                    Password = legacyStudentPassPlain
                });
                var noEmailUser = await userRepo.GetByStudentIdAsync(791, connection);
                AssertTrue(!noEmailLoginRes.Status && noEmailUser == null,
                    "Test 29: Student without email is NOT provisioned",
                    $"Status: {noEmailLoginRes.Status}, User exists: {noEmailUser != null}");

                // Test 30: Student without email receives no ambiguous JWT
                AssertTrue(!noEmailLoginRes.Status && string.IsNullOrEmpty(noEmailLoginRes.AccessToken),
                    "Test 30: Student without email receives no ambiguous JWT",
                    $"AccessToken is null/empty: {string.IsNullOrEmpty(noEmailLoginRes.AccessToken)}");

                // =============================================================
                // [PART 5] LEGACY STAFF (TESTS 31 - 33)
                // =============================================================
                Console.WriteLine("\n--- [PART 5] LEGACY STAFF (TESTS 31 - 33) ---");

                // Seed a legacy staff member without Users row
                var unlinkedStaffEmail = "unlinked.staff@testlogin.edu";
                await connection.ExecuteAsync(@"
                    INSERT INTO Staff (Id, EmployeeId, FirstName, LastName, Gender, DateOfBirth, Mobile, Email, Qualification, Designation, StaffType, JoiningDate, Experience, Status, IsDeleted, CreatedAt)
                    VALUES (950, 'EMP-TEST-950', 'Unlinked', 'Faculty', 'Female', '1988-03-10', '9876543950', @Email, 'Ph.D', 'Associate Professor', 'Teaching', NOW(), 8.0, 'Active', 0, NOW())
                    ON DUPLICATE KEY UPDATE Email = @Email, IsDeleted = 0, Status = 'Active';",
                    new { Email = unlinkedStaffEmail });
                createdTestStaffIds.Add(950);

                var staffLoginRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = unlinkedStaffEmail,
                    Password = "AnyPassword@123"
                });

                // Test 31: Staff without Users account does NOT get synthetic authentication
                AssertTrue(!staffLoginRes.Status,
                    "Test 31: Staff without Users account does NOT get synthetic authentication",
                    $"Status: {staffLoginRes.Status}");

                // Test 32: Staff without Users account does NOT receive JWT with Staff.Id as sub
                AssertTrue(string.IsNullOrEmpty(staffLoginRes.AccessToken),
                    "Test 32: Staff without Users account does NOT receive JWT with Staff.Id as sub",
                    $"AccessToken is null/empty: {string.IsNullOrEmpty(staffLoginRes.AccessToken)}");

                // Test 33: Staff onboarding response remains controlled
                AssertTrue(staffLoginRes.Message == "Invalid Email or Password",
                    "Test 33: Staff onboarding response remains controlled (Generic safe failure)",
                    $"Message: '{staffLoginRes.Message}'");

                // =============================================================
                // [PART 6] EXISTING UNLINKED USERS (TESTS 34 - 35)
                // =============================================================
                Console.WriteLine("\n--- [PART 6] EXISTING UNLINKED USERS (TESTS 34 - 35) ---");

                var unlinkedUserEmail = "standalone.user@testlogin.edu";
                var unlinkedUser = new User
                {
                    FullName = "Standalone User No Domain Links",
                    Email = unlinkedUserEmail,
                    PasswordHash = testPasswordHash,
                    PhoneNumber = "9876543299",
                    RoleId = adminRole.RoleId,
                    StudentId = null,
                    StaffId = null,
                    AdminId = null,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                var unlinkedUserId = await userRepo.CreateUserAsync(unlinkedUser, connection);
                createdTestUserIds.Add(unlinkedUserId);

                // Test 34: Existing unlinked User authenticates normally
                var unlinkedLoginRes = await authService.LoginAsync(new LoginRequest
                {
                    EmailOrMobile = unlinkedUserEmail,
                    Password = testPassword
                });
                AssertTrue(unlinkedLoginRes.Status && !string.IsNullOrEmpty(unlinkedLoginRes.AccessToken),
                    "Test 34: Existing unlinked User authenticates normally",
                    $"Status: {unlinkedLoginRes.Status}, AccessToken: {unlinkedLoginRes.AccessToken?.Length > 0}");

                // Test 35: No fuzzy domain auto-linking occurs
                var reloadedUnlinkedUser = await userRepo.GetByIdAsync(unlinkedUserId);
                var unlinkedPrincipal = tokenHandler.ValidateToken(unlinkedLoginRes.AccessToken, validationParameters, out _);
                var hasDomainClaims = unlinkedPrincipal.HasClaim(c => c.Type == "StudentId" || c.Type == "StaffId" || c.Type == "AdminId");

                AssertTrue(reloadedUnlinkedUser?.StudentId == null && reloadedUnlinkedUser?.StaffId == null && reloadedUnlinkedUser?.AdminId == null && !hasDomainClaims,
                    "Test 35: No fuzzy domain auto-linking occurs (Domain IDs and claims remain null/absent)",
                    $"StudentId: {reloadedUnlinkedUser?.StudentId}, StaffId: {reloadedUnlinkedUser?.StaffId}, AdminId: {reloadedUnlinkedUser?.AdminId}, HasDomainClaims: {hasDomainClaims}");

                // =============================================================
                // [PART 7] CONCURRENCY & RACE CONDITIONS (TESTS 36 - 39)
                // =============================================================
                Console.WriteLine("\n--- [PART 7] CONCURRENCY & RACE CONDITIONS (TESTS 36 - 39) ---");

                // Concurrent Admin JIT
                var concurrentAdminEmail = "concurrent.admin@testlogin.edu";
                var concurrentAdminPass = "ConcurrentPass@2026";
                var concurrentAdminHash = PasswordHasher.HashPassword(concurrentAdminPass);

                await connection.ExecuteAsync(@"
                    INSERT INTO admins (id, Email, Password, IsActive)
                    VALUES (850, @Email, @Pass, 1)
                    ON DUPLICATE KEY UPDATE Password = @Pass, IsActive = 1;",
                    new { Email = concurrentAdminEmail, Pass = concurrentAdminHash });
                createdTestAdminIds.Add(850);

                // Execute 5 simultaneous login requests with isolated request scopes
                var adminTasks = Enumerable.Range(1, 5).Select(async _ =>
                {
                    using var reqScope = serviceProvider.CreateScope();
                    var reqAuthService = reqScope.ServiceProvider.GetRequiredService<IAuthService>();
                    return await reqAuthService.LoginAsync(new LoginRequest
                    {
                        EmailOrMobile = concurrentAdminEmail,
                        Password = concurrentAdminPass
                    });
                }).ToArray();

                var adminResults = await Task.WhenAll(adminTasks);
                var createdConcurrentAdminUsers = (await connection.QueryAsync<int>(
                    "SELECT UserId FROM Users WHERE Email = @Email",
                    new { Email = concurrentAdminEmail })).ToList();
                createdTestUserIds.AddRange(createdConcurrentAdminUsers);

                // Test 36: Concurrent legacy Admin login creates only one Users row
                AssertTrue(adminResults.All(r => r.Status) && createdConcurrentAdminUsers.Count == 1,
                    "Test 36: Concurrent legacy Admin login creates only one Users row",
                    $"All Successful: {adminResults.All(r => r.Status)}, Rows Created: {createdConcurrentAdminUsers.Count}");

                // Concurrent Student JIT
                var concurrentStudentEmail = "concurrent.student@testlogin.edu";
                var concurrentStudentPass = "ConcurrentStudent@2026";
                var concurrentStudentHash = PasswordHasher.HashPassword(concurrentStudentPass);

                await connection.ExecuteAsync(@"
                    INSERT INTO Students (StudentId, AdmissionNo, AdmissionDate, StudentName, Gender, DateOfBirth, Email, MobileNumber, PasswordHash, FeeAmount, FeePaid, AttendancePercentage, Status, IsActive, CreatedAt)
                    VALUES (795, 'ADM-TEST-795', NOW(), 'Concurrent Student', 'Male', '2004-01-01', @Email, '9876543795', @Hash, 0, 0, 100, 'Active', 1, NOW())
                    ON DUPLICATE KEY UPDATE Email = @Email, PasswordHash = @Hash, IsActive = 1;",
                    new { Email = concurrentStudentEmail, Hash = concurrentStudentHash });
                createdTestStudentIds.Add(795);

                var studentTasks = Enumerable.Range(1, 5).Select(async _ =>
                {
                    using var reqScope = serviceProvider.CreateScope();
                    var reqAuthService = reqScope.ServiceProvider.GetRequiredService<IAuthService>();
                    return await reqAuthService.LoginAsync(new LoginRequest
                    {
                        EmailOrMobile = concurrentStudentEmail,
                        Password = concurrentStudentPass
                    });
                }).ToArray();

                var studentResults = await Task.WhenAll(studentTasks);
                var createdConcurrentStudentUsers = (await connection.QueryAsync<int>(
                    "SELECT UserId FROM Users WHERE Email = @Email",
                    new { Email = concurrentStudentEmail })).ToList();
                createdTestUserIds.AddRange(createdConcurrentStudentUsers);

                // Test 37: Concurrent legacy Student login creates only one Users row
                AssertTrue(studentResults.All(r => r.Status) && createdConcurrentStudentUsers.Count == 1,
                    "Test 37: Concurrent legacy Student login creates only one Users row",
                    $"All Successful: {studentResults.All(r => r.Status)}, Rows Created: {createdConcurrentStudentUsers.Count}");

                // Test 38: Unique constraint conflict is handled gracefully (No exceptions thrown, all returned status = true)
                AssertTrue(adminResults.All(r => r.Status) && studentResults.All(r => r.Status),
                    "Test 38: Unique constraint conflict is handled gracefully without unhandled exceptions",
                    $"Admin All Status: {adminResults.All(r => r.Status)}, Student All Status: {studentResults.All(r => r.Status)}");

                // Test 39: Second request re-reads existing Users row instead of returning 500
                var allAdminTokensMatch = adminResults.Select(r => r.UserId).Distinct().Count() == 1;
                var allStudentTokensMatch = studentResults.Select(r => r.UserId).Distinct().Count() == 1;
                AssertTrue(allAdminTokensMatch && allStudentTokensMatch,
                    "Test 39: Concurrent requests re-read existing Users row and return identical UserId",
                    $"Admin Distinct UserIds: {adminResults.Select(r => r.UserId).Distinct().Count()}, Student Distinct UserIds: {studentResults.Select(r => r.UserId).Distinct().Count()}");

                // =============================================================
                // [PART 8] DATA SAFETY & BASELINE PRESERVATION (TESTS 40 - 46)
                // =============================================================
                Console.WriteLine("\n--- [PART 8] DATA SAFETY & BASELINE PRESERVATION (TESTS 40 - 46) ---");

                // Clean up ONLY the test-created records
                await CleanUpTestDataAsync(connection);

                var postRolesCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Roles;");
                var postUsersCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users;");
                var postAdminsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM admins;");
                var postStaffCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Staff;");
                var postStudentsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Students;");

                var postUserIds = (await connection.QueryAsync<int>("SELECT UserId FROM Users;")).ToHashSet();

                // Test 40: Roles row count remains 11
                AssertTrue(postRolesCount == 11,
                    "Test 40: Roles row count remains 11",
                    $"Expected: 11, Actual: {postRolesCount}");

                // Test 41: Users baseline is preserved except explicitly expected JIT-created test users (and 14 original users intact)
                var originalUsersPreserved = originalUserIds.All(id => postUserIds.Contains(id));
                AssertTrue(originalUsersPreserved && postUsersCount == initialUsersCount,
                    "Test 41: Users original baseline (14 rows) is 100% preserved",
                    $"Initial: {initialUsersCount}, Post: {postUsersCount}, All 14 Original UserIds Present: {originalUsersPreserved}");

                // Test 42: Admins domain count remains 10
                AssertTrue(postAdminsCount == 10,
                    "Test 42: Admins domain count remains 10",
                    $"Expected: 10, Actual: {postAdminsCount}");

                // Test 43: Staff domain count remains 72
                AssertTrue(postStaffCount == 72,
                    "Test 43: Staff domain count remains 72",
                    $"Expected: 72, Actual: {postStaffCount}");

                // Test 44: Students domain count remains 48
                AssertTrue(postStudentsCount == 48,
                    "Test 44: Students domain count remains 48",
                    $"Expected: 48, Actual: {postStudentsCount}");

                // Test 45: No existing domain record is accidentally duplicated
                var distinctAdmins = await connection.ExecuteScalarAsync<int>("SELECT COUNT(DISTINCT Email) FROM admins;");
                var distinctStudents = await connection.ExecuteScalarAsync<int>("SELECT COUNT(DISTINCT StudentId) FROM Students;");
                AssertTrue(distinctAdmins == postAdminsCount && distinctStudents == postStudentsCount,
                    "Test 45: No existing domain record is accidentally duplicated",
                    $"Distinct Admins: {distinctAdmins}/{postAdminsCount}, Distinct Students: {distinctStudents}/{postStudentsCount}");

                // Test 46: No plaintext passwords exist in DB/API/logs
                var allUsers = await connection.QueryAsync<(int UserId, string Email, string PasswordHash)>("SELECT UserId, Email, PasswordHash FROM Users;");
                var plaintextUsers = allUsers.Where(u =>
                    string.IsNullOrWhiteSpace(u.PasswordHash) ||
                    (!u.PasswordHash.StartsWith("$2a$") &&
                     !u.PasswordHash.StartsWith("$2b$") &&
                     !u.PasswordHash.StartsWith("$2y$") &&
                     !u.PasswordHash.StartsWith("10000."))).ToList();

                AssertTrue(plaintextUsers.Count == 0,
                    "Test 46: No plaintext passwords exist in Users table (All cryptographic BCrypt/PBKDF2 hashes)",
                    $"Plaintext count: {plaintextUsers.Count}");
            }
            finally
            {
                await CleanUpTestDataAsync(connection);
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"PHASE 6C TEST SUMMARY: Total: {_totalAssertions} | Passed: {_passedAssertions} | Failed: {_failedAssertions}");
            Console.WriteLine("================================================================================\n");

            return _failedAssertions == 0;
        }

        private static async Task CleanUpTestDataAsync(IDbConnection connection)
        {
            try
            {
                await connection.ExecuteAsync("DELETE FROM Users WHERE Email LIKE '%testlogin.edu%' OR Email LIKE '%admintest.edu%' OR Email LIKE '%concurrent%' OR Email = 'kavitha.sharma.4113@college.edu';");
                await connection.ExecuteAsync("DELETE FROM admins WHERE Email LIKE '%testlogin.edu%' OR Email LIKE '%admintest.edu%' OR Email LIKE '%concurrent%';");
                await connection.ExecuteAsync("DELETE FROM Students WHERE Email LIKE '%testlogin.edu%' OR AdmissionNo LIKE 'ADM-TEST-%';");
                await connection.ExecuteAsync("DELETE FROM Staff WHERE Email LIKE '%testlogin.edu%' OR EmployeeId LIKE 'EMP-TEST-%' OR Id = 1030 OR Id = 999 OR Id = 950 OR Email = 'kavitha.sharma.4113@college.edu';");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WARN] Cleanup warning: {ex.Message}");
            }
        }

        private static void AssertTrue(bool condition, string testName, string? details = null)
        {
            _totalAssertions++;
            if (condition)
            {
                _passedAssertions++;
                Console.WriteLine($"  [PASS] {testName}");
            }
            else
            {
                _failedAssertions++;
                Console.WriteLine($"  [FAIL] {testName} - Details: {details}");
            }
        }
    }
}
