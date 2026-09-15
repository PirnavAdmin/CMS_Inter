using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    /// <summary>
    /// Phase 6A Automated Verification Suite.
    /// Validates the centralized JWT claims foundation and token helper contracts.
    /// Invariants:
    /// 1. sub ALWAYS equals Users.UserId
    /// 2. ClaimTypes.NameIdentifier ALWAYS equals Users.UserId
    /// 3. ClaimTypes.Role is dynamically resolved from canonical Roles data
    /// 4. StudentId, StaffId, and AdminId are emitted strictly into dedicated domain claims only when present
    /// 5. Domain IDs are NEVER used as sub/NameIdentifier
    /// 6. No plaintext passwords or password hashes are leaked into tokens
    /// </summary>
    public static class JwtClaimsFoundationTester
    {
        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("PHASE 6A: CENTRALIZED JWT CLAIMS FOUNDATION & TOKEN HELPER VERIFICATION SUITE");
            Console.WriteLine("================================================================================");

            using var scope = serviceProvider.CreateScope();
            var jwtHelper = scope.ServiceProvider.GetRequiredService<IJwtTokenHelper>();
            var userRepo = scope.ServiceProvider.GetRequiredService<IUserRepository>();
            var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            var connStr = configuration.GetConnectionString("DefaultConnection")!;

            int passed = 0;
            int failed = 0;

            void Assert(bool condition, string testName, string details = "")
            {
                if (condition)
                {
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.Write("[PASS] ");
                    Console.ResetColor();
                    Console.WriteLine(testName);
                    passed++;
                }
                else
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.Write("[FAIL] ");
                    Console.ResetColor();
                    Console.WriteLine($"{testName} - {details}");
                    failed++;
                }
            }

            try
            {
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

                // -------------------------------------------------------------
                // TEST 1: Standalone Super Admin User (No domain links)
                // -------------------------------------------------------------
                Console.WriteLine("\n--- 1. Standalone Super Admin User (No Domain Links) ---");
                var superAdminUser = new User
                {
                    UserId = 101,
                    FullName = "System SuperAdmin",
                    Email = "superadmin@college.edu",
                    RoleId = 1,
                    Role = new Role { RoleId = 1, RoleName = "Super Admin" },
                    StudentId = null,
                    StaffId = null,
                    AdminId = null,
                    PasswordHash = "$2a$11$SomeHashedSecretPasswordNotLeaked"
                };

                var saTokenStr = await jwtHelper.GenerateTokenAsync(superAdminUser);
                var saPrincipal = tokenHandler.ValidateToken(saTokenStr, validationParameters, out var saValidatedToken);
                var saJwt = (JwtSecurityToken)saValidatedToken;

                Assert(saJwt.Subject == "101", "1.1. SuperAdmin JWT sub equals Users.UserId ('101')", $"Actual: {saJwt.Subject}");
                Assert(saPrincipal.FindFirst(ClaimTypes.NameIdentifier)?.Value == "101", "1.2. SuperAdmin ClaimTypes.NameIdentifier equals '101'");
                Assert(saPrincipal.FindFirst(ClaimTypes.Role)?.Value == "Super Admin", "1.3. SuperAdmin ClaimTypes.Role equals 'Super Admin'");
                Assert(saPrincipal.FindFirst("StudentId") == null, "1.4. SuperAdmin StudentId claim is absent");
                Assert(saPrincipal.FindFirst("StaffId") == null, "1.5. SuperAdmin StaffId claim is absent");
                Assert(saPrincipal.FindFirst("AdminId") == null, "1.6. SuperAdmin AdminId claim is absent");
                Assert(!saTokenStr.Contains("SomeHashedSecretPasswordNotLeaked"), "1.7. SuperAdmin PasswordHash is not present in token");

                // -------------------------------------------------------------
                // TEST 2: Linked Student User (UserId = 205, StudentId = 583)
                // -------------------------------------------------------------
                Console.WriteLine("\n--- 2. Linked Student User (UserId != StudentId) ---");
                var studentUser = new User
                {
                    UserId = 205,
                    FullName = "Rahul Sharma",
                    Email = "rahul.sharma@college.edu",
                    RoleId = 5,
                    Role = new Role { RoleId = 5, RoleName = "Student" },
                    StudentId = 583,
                    StaffId = null,
                    AdminId = null,
                    PasswordHash = "$2a$11$SecretHashedPassword"
                };

                var stTokenStr = await jwtHelper.GenerateTokenAsync(studentUser);
                var stPrincipal = tokenHandler.ValidateToken(stTokenStr, validationParameters, out var stValidatedToken);
                var stJwt = (JwtSecurityToken)stValidatedToken;

                Assert(stJwt.Subject == "205", "2.1. Student JWT sub equals Users.UserId ('205')");
                Assert(stJwt.Subject != "583", "2.2. Student JWT sub is NEVER the StudentId ('583')");
                Assert(stPrincipal.FindFirst(ClaimTypes.NameIdentifier)?.Value == "205", "2.3. Student NameIdentifier equals '205'");
                Assert(stPrincipal.FindFirst(ClaimTypes.Role)?.Value == "Student", "2.4. Student Role claim equals canonical 'Student'");
                Assert(stPrincipal.FindFirst("StudentId")?.Value == "583", "2.5. Dedicated StudentId claim equals '583'");
                Assert(stPrincipal.FindFirst("StaffId") == null, "2.6. StaffId claim is absent for student");
                Assert(stPrincipal.FindFirst("AdminId") == null, "2.7. AdminId claim is absent for student");
                Assert(jwtHelper.GetUserId(stPrincipal) == 205, "2.8. Helper.GetUserId extracts 205");
                Assert(jwtHelper.GetStudentId(stPrincipal) == 583, "2.9. Helper.GetStudentId extracts 583");

                // -------------------------------------------------------------
                // TEST 3: Linked Staff User (UserId = 310, StaffId = 42, Faculty)
                // -------------------------------------------------------------
                Console.WriteLine("\n--- 3. Linked Staff User (UserId != StaffId) ---");
                var staffUser = new User
                {
                    UserId = 310,
                    FullName = "Dr. Priya Patel",
                    Email = "priya.patel@college.edu",
                    RoleId = 4,
                    Role = new Role { RoleId = 4, RoleName = "Faculty" },
                    StudentId = null,
                    StaffId = 42,
                    AdminId = null,
                    PasswordHash = "$2a$11$FacultyPasswordHash"
                };

                var sfTokenStr = await jwtHelper.GenerateTokenAsync(staffUser);
                var sfPrincipal = tokenHandler.ValidateToken(sfTokenStr, validationParameters, out var sfValidatedToken);
                var sfJwt = (JwtSecurityToken)sfValidatedToken;

                Assert(sfJwt.Subject == "310", "3.1. Staff JWT sub equals Users.UserId ('310')");
                Assert(sfJwt.Subject != "42", "3.2. Staff JWT sub is NEVER the StaffId ('42')");
                Assert(sfPrincipal.FindFirst(ClaimTypes.NameIdentifier)?.Value == "310", "3.3. Staff NameIdentifier equals '310'");
                Assert(sfPrincipal.FindFirst(ClaimTypes.Role)?.Value == "Faculty", "3.4. Staff Role claim equals 'Faculty'");
                Assert(sfPrincipal.FindFirst("StaffId")?.Value == "42", "3.5. Dedicated StaffId claim equals '42'");
                Assert(sfPrincipal.FindFirst("StudentId") == null, "3.6. StudentId claim is absent for staff");
                Assert(sfPrincipal.FindFirst("AdminId") == null, "3.7. AdminId claim is absent for staff");
                Assert(jwtHelper.GetStaffId(sfPrincipal) == 42, "3.8. Helper.GetStaffId extracts 42");

                // -------------------------------------------------------------
                // TEST 4: Linked Admin User (UserId = 405, AdminId = 9, Admin)
                // -------------------------------------------------------------
                Console.WriteLine("\n--- 4. Linked Admin User (UserId != AdminId) ---");
                var adminUser = new User
                {
                    UserId = 405,
                    FullName = "Admin Officer",
                    Email = "admin.officer@college.edu",
                    RoleId = 2,
                    Role = new Role { RoleId = 2, RoleName = "Admin" },
                    StudentId = null,
                    StaffId = null,
                    AdminId = 9,
                    PasswordHash = "$2a$11$AdminPasswordHash"
                };

                var adTokenStr = await jwtHelper.GenerateTokenAsync(adminUser);
                var adPrincipal = tokenHandler.ValidateToken(adTokenStr, validationParameters, out var adValidatedToken);
                var adJwt = (JwtSecurityToken)adValidatedToken;

                Assert(adJwt.Subject == "405", "4.1. Admin JWT sub equals Users.UserId ('405')");
                Assert(adJwt.Subject != "9", "4.2. Admin JWT sub is NEVER the AdminId ('9')");
                Assert(adPrincipal.FindFirst(ClaimTypes.NameIdentifier)?.Value == "405", "4.3. Admin NameIdentifier equals '405'");
                Assert(adPrincipal.FindFirst(ClaimTypes.Role)?.Value == "Admin", "4.4. Admin Role claim equals 'Admin'");
                Assert(adPrincipal.FindFirst("AdminId")?.Value == "9", "4.5. Dedicated AdminId claim equals '9'");
                Assert(adPrincipal.FindFirst("StudentId") == null, "4.6. StudentId claim is absent for admin");
                Assert(adPrincipal.FindFirst("StaffId") == null, "4.7. StaffId claim is absent for admin");
                Assert(jwtHelper.GetAdminId(adPrincipal) == 9, "4.8. Helper.GetAdminId extracts 9");

                // -------------------------------------------------------------
                // TEST 5: Dynamic Canonical Role Resolution for all 11 Live Roles
                // -------------------------------------------------------------
                Console.WriteLine("\n--- 5. Dynamic Role Resolution from Live Roles Table ---");
                using (var conn = new MySqlConnection(connStr))
                {
                    var liveRoles = (await conn.QueryAsync<Role>("SELECT RoleId, RoleName FROM Roles ORDER BY RoleId ASC;")).ToList();
                    Assert(liveRoles.Count >= 11, $"5.1. Live Roles table contains {liveRoles.Count} canonical roles (>= 11)");

                    foreach (var liveRole in liveRoles)
                    {
                        var userWithNullRole = new User
                        {
                            UserId = 500 + liveRole.RoleId,
                            FullName = $"Test User {liveRole.RoleName}",
                            Email = $"user{liveRole.RoleId}@college.edu",
                            RoleId = liveRole.RoleId,
                            Role = null!, // Role entity is null, forces dynamic DB resolution via GetRoleByIdAsync
                            StudentId = liveRole.RoleId == 5 ? 901 : null,
                            StaffId = (liveRole.RoleId >= 3 && liveRole.RoleId != 5 && liveRole.RoleId != 6 && liveRole.RoleId <= 11) ? 902 : null,
                            AdminId = (liveRole.RoleId == 1 || liveRole.RoleId == 2) ? 903 : null
                        };

                        var token = await jwtHelper.GenerateTokenAsync(userWithNullRole);
                        var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
                        var emittedRole = principal.FindFirst(ClaimTypes.Role)?.Value;

                        Assert(emittedRole == liveRole.RoleName, $"5.2. RoleId {liveRole.RoleId} resolved dynamically to '{liveRole.RoleName}'", $"Expected: {liveRole.RoleName}, Actual: {emittedRole}");
                    }
                }

                // -------------------------------------------------------------
                // TEST 6: Defensive Validation & Error Handling
                // -------------------------------------------------------------
                Console.WriteLine("\n--- 6. Defensive Validation & Error Handling ---");
                bool nullThrows = false;
                try
                {
                    await jwtHelper.GenerateTokenAsync(null!);
                }
                catch (ArgumentNullException)
                {
                    nullThrows = true;
                }
                Assert(nullThrows, "6.1. GenerateTokenAsync throws ArgumentNullException for null User");

                bool unsavedUserThrows = false;
                try
                {
                    await jwtHelper.GenerateTokenAsync(new User { UserId = 0, RoleId = 1, Email = "test@college.edu" });
                }
                catch (InvalidOperationException)
                {
                    unsavedUserThrows = true;
                }
                Assert(unsavedUserThrows, "6.2. GenerateTokenAsync throws InvalidOperationException for UserId = 0");

                bool invalidRoleThrows = false;
                try
                {
                    await jwtHelper.GenerateTokenAsync(new User { UserId = 999, RoleId = 99999, Email = "test@college.edu" });
                }
                catch (InvalidOperationException)
                {
                    invalidRoleThrows = true;
                }
                Assert(invalidRoleThrows, "6.3. GenerateTokenAsync throws InvalidOperationException for non-existent RoleId");

                // -------------------------------------------------------------
                // TEST 7: Database Invariant & Baseline Counts Check
                // -------------------------------------------------------------
                Console.WriteLine("\n--- 7. Database Invariance & Baseline Verification ---");
                using (var conn = new MySqlConnection(connStr))
                {
                    await conn.ExecuteAsync("DELETE FROM `Users` WHERE UserId > 17;");
                    await conn.ExecuteAsync("DELETE FROM `Staff` WHERE Id >= 1000;");

                    var usersCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users WHERE UserId <= 17;");
                    var adminsCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM admins;");
                    var staffCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Staff WHERE Id < 1000;");
                    var studentsCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Students;");

                    Assert(usersCount == 14, $"7.1. Users baseline count preserved (14 rows, actual: {usersCount})");
                    Assert(adminsCount == 10, $"7.2. admins baseline count preserved (10 rows, actual: {adminsCount})");
                    Assert(staffCount == 72, $"7.3. Staff baseline count preserved (72 rows, actual: {staffCount})");
                    Assert(studentsCount == 48, $"7.4. Students baseline count preserved (48 rows, actual: {studentsCount})");
                }
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"\n[EXCEPTION during test execution]: {ex}");
                Console.ResetColor();
                failed++;
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"PHASE 6A TEST SUMMARY: Total: {passed + failed} | Passed: {passed} | Failed: {failed}");
            Console.WriteLine("================================================================================");

            return failed == 0;
        }
    }
}
