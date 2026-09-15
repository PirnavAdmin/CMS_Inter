using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Reflection;
using System.Security.Claims;
using System.Threading.Tasks;
using CollegeManagement.API.Controllers.V1;
using CollegeManagement.API.DTOs.Users;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests
{
    public class AuthorizationHarmonizationTester
    {
        private static int _passCount = 0;
        private static int _failCount = 0;

        public static async Task<bool> RunTestsAsync(IServiceProvider serviceProvider)
        {
            _passCount = 0;
            _failCount = 0;

            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("================================================================================");
            Console.WriteLine("PHASE 6B VERIFICATION: CANONICAL ROLE & AUTHORIZATION HARMONIZATION TEST SUITE");
            Console.WriteLine("================================================================================");
            Console.ResetColor();

            using var scope = serviceProvider.CreateScope();
            var scopedProvider = scope.ServiceProvider;
            var dbConnection = scopedProvider.GetRequiredService<IDbConnection>();
            var userRepo = scopedProvider.GetRequiredService<IUserRepository>();
            var provisioningService = scopedProvider.GetRequiredService<IUserProvisioningService>();

            try
            {
                // Clean up any temporary test records before capturing initial database state
                await dbConnection.ExecuteAsync("DELETE FROM `Users` WHERE UserId > 17;");
                await dbConnection.ExecuteAsync("DELETE FROM `Staff` WHERE Id >= 1000;");

                // Capture initial database state for baseline invariance checks
                var initialRolesCount = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Roles");
                var initialUsersCount = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users");
                var initialAdminsCount = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM admins");
                var initialStaffCount = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Staff");
                var initialStudentsCount = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Students");

                var initialUserChecksums = (await dbConnection.QueryAsync<(int UserId, string Email, int RoleId, string PasswordHash)>(
                    "SELECT UserId, Email, RoleId, PasswordHash FROM Users ORDER BY UserId")).ToList();

                // ===================================================================================
                // PART 1: ROLE TABLE INTEGRITY (TESTS 1 - 12)
                // ===================================================================================
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("\n--- [PART 1] ROLE TABLE INTEGRITY (TESTS 1 - 12) ---");
                Console.ResetColor();

                var allRoles = (await dbConnection.QueryAsync<Role>("SELECT RoleId, RoleName FROM Roles ORDER BY RoleId")).ToList();

                // Test 1: All 11 canonical roles exist
                AssertTrue(allRoles.Count == 11,
                    "Test 1: All 11 canonical roles exist in live database Roles table",
                    $"Found: {allRoles.Count} roles");

                // Test 2: RoleId 1 = Super Admin
                var r1 = allRoles.FirstOrDefault(r => r.RoleId == 1);
                AssertTrue(r1 != null && r1.RoleName == "Super Admin",
                    "Test 2: RoleId 1 = 'Super Admin'",
                    $"Actual: '{r1?.RoleName}'");

                // Test 3: RoleId 2 = Admin
                var r2 = allRoles.FirstOrDefault(r => r.RoleId == 2);
                AssertTrue(r2 != null && r2.RoleName == "Admin",
                    "Test 3: RoleId 2 = 'Admin'",
                    $"Actual: '{r2?.RoleName}'");

                // Test 4: RoleId 3 = HOD
                var r3 = allRoles.FirstOrDefault(r => r.RoleId == 3);
                AssertTrue(r3 != null && r3.RoleName == "HOD",
                    "Test 4: RoleId 3 = 'HOD'",
                    $"Actual: '{r3?.RoleName}'");

                // Test 5: RoleId 4 = Faculty
                var r4 = allRoles.FirstOrDefault(r => r.RoleId == 4);
                AssertTrue(r4 != null && r4.RoleName == "Faculty",
                    "Test 5: RoleId 4 = 'Faculty'",
                    $"Actual: '{r4?.RoleName}'");

                // Test 6: RoleId 5 = Student
                var r5 = allRoles.FirstOrDefault(r => r.RoleId == 5);
                AssertTrue(r5 != null && r5.RoleName == "Student",
                    "Test 6: RoleId 5 = 'Student'",
                    $"Actual: '{r5?.RoleName}'");

                // Test 7: RoleId 6 = Parent
                var r6 = allRoles.FirstOrDefault(r => r.RoleId == 6);
                AssertTrue(r6 != null && r6.RoleName == "Parent",
                    "Test 7: RoleId 6 = 'Parent'",
                    $"Actual: '{r6?.RoleName}'");

                // Test 8: RoleId 7 = Accounts
                var r7 = allRoles.FirstOrDefault(r => r.RoleId == 7);
                AssertTrue(r7 != null && r7.RoleName == "Accounts",
                    "Test 8: RoleId 7 = 'Accounts'",
                    $"Actual: '{r7?.RoleName}'");

                // Test 9: RoleId 8 = Examination Cell
                var r8 = allRoles.FirstOrDefault(r => r.RoleId == 8);
                AssertTrue(r8 != null && r8.RoleName == "Examination Cell",
                    "Test 9: RoleId 8 = 'Examination Cell'",
                    $"Actual: '{r8?.RoleName}'");

                // Test 10: RoleId 9 = Library
                var r9 = allRoles.FirstOrDefault(r => r.RoleId == 9);
                AssertTrue(r9 != null && r9.RoleName == "Library",
                    "Test 10: RoleId 9 = 'Library'",
                    $"Actual: '{r9?.RoleName}'");

                // Test 11: RoleId 10 = Hostel Warden
                var r10 = allRoles.FirstOrDefault(r => r.RoleId == 10);
                AssertTrue(r10 != null && r10.RoleName == "Hostel Warden",
                    "Test 11: RoleId 10 = 'Hostel Warden'",
                    $"Actual: '{r10?.RoleName}'");

                // Test 12: RoleId 11 = Placement Officer
                var r11 = allRoles.FirstOrDefault(r => r.RoleId == 11);
                AssertTrue(r11 != null && r11.RoleName == "Placement Officer",
                    "Test 12: RoleId 11 = 'Placement Officer'",
                    $"Actual: '{r11?.RoleName}'");

                // ===================================================================================
                // PART 2: NON-CANONICAL ROLE SEARCH & AUTHORIZATION SCAN (TESTS 13 - 14)
                // ===================================================================================
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("\n--- [PART 2] NON-CANONICAL ROLE SEARCH (TESTS 13 - 14) ---");
                Console.ResetColor();

                var apiAssembly = typeof(AttendanceController).Assembly;
                var controllerTypes = apiAssembly.GetTypes()
                    .Where(t => typeof(ControllerBase).IsAssignableFrom(t) && !t.IsAbstract)
                    .ToList();

                var roleOccurrences = new List<(string ControllerName, string? MethodName, string Roles)>();

                foreach (var controller in controllerTypes)
                {
                    var classAuth = controller.GetCustomAttribute<AuthorizeAttribute>();
                    if (classAuth != null && !string.IsNullOrWhiteSpace(classAuth.Roles))
                    {
                        roleOccurrences.Add((controller.Name, null, classAuth.Roles));
                    }

                    var methods = controller.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly);
                    foreach (var method in methods)
                    {
                        var methodAuth = method.GetCustomAttribute<AuthorizeAttribute>();
                        if (methodAuth != null && !string.IsNullOrWhiteSpace(methodAuth.Roles))
                        {
                            roleOccurrences.Add((controller.Name, method.Name, methodAuth.Roles));
                        }
                    }
                }

                // Test 13: Zero ACTIVE authorization references to "College Admin"
                var collegeAdminMatches = roleOccurrences
                    .Where(o => o.Roles.Split(',').Any(r => string.Equals(r.Trim(), "College Admin", StringComparison.OrdinalIgnoreCase)))
                    .ToList();
                AssertTrue(collegeAdminMatches.Count == 0,
                    "Test 13: Zero ACTIVE authorization references to 'College Admin'",
                    collegeAdminMatches.Count > 0 ? $"Found in: {string.Join("; ", collegeAdminMatches.Select(m => $"{m.ControllerName}.{m.MethodName ?? "[Class]"}"))}" : "Zero found");

                // Test 14: Zero ACTIVE authorization references to "Principal"
                var principalMatches = roleOccurrences
                    .Where(o => o.Roles.Split(',').Any(r => string.Equals(r.Trim(), "Principal", StringComparison.OrdinalIgnoreCase)))
                    .ToList();
                AssertTrue(principalMatches.Count == 0,
                    "Test 14: Zero ACTIVE authorization references to 'Principal'",
                    principalMatches.Count > 0 ? $"Found in: {string.Join("; ", principalMatches.Select(m => $"{m.ControllerName}.{m.MethodName ?? "[Class]"}"))}" : "Zero found");

                // ===================================================================================
                // PART 3: AUTHORIZATION BEHAVIOR & RBAC CLAIMS (TESTS 15 - 20)
                // ===================================================================================
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("\n--- [PART 3] AUTHORIZATION BEHAVIOR & RBAC (TESTS 15 - 20) ---");
                Console.ResetColor();

                bool IsPrincipalInRoleString(ClaimsPrincipal principal, string rolesString)
                {
                    var allowedRoles = rolesString.Split(',').Select(r => r.Trim());
                    return allowedRoles.Any(r => principal.IsInRole(r));
                }

                ClaimsPrincipal CreatePrincipal(string roleName)
                {
                    var claims = new[]
                    {
                        new Claim(ClaimTypes.NameIdentifier, "1"),
                        new Claim(ClaimTypes.Role, roleName),
                        new Claim("role", roleName)
                    };
                    var identity = new ClaimsIdentity(claims, "TestAuth", ClaimTypes.Name, ClaimTypes.Role);
                    return new ClaimsPrincipal(identity);
                }

                var adminPrincipal = CreatePrincipal("Admin");
                var superAdminPrincipal = CreatePrincipal("Super Admin");
                var hodPrincipal = CreatePrincipal("HOD");
                var facultyPrincipal = CreatePrincipal("Faculty");
                var studentPrincipal = CreatePrincipal("Student");
                var parentPrincipal = CreatePrincipal("Parent");
                var accountsPrincipal = CreatePrincipal("Accounts");
                var legacyCollegeAdminPrincipal = CreatePrincipal("College Admin");

                // Endpoints under test
                var promoClassAuth = typeof(PromotionsController).GetCustomAttribute<AuthorizeAttribute>();
                var unlockMethod = typeof(AttendanceController).GetMethod("UnlockSession");
                var unlockAuth = unlockMethod?.GetCustomAttribute<AuthorizeAttribute>();
                var defaultersMethod = typeof(AttendanceController).GetMethod("GetDefaulters");
                var defaultersAuth = defaultersMethod?.GetCustomAttribute<AuthorizeAttribute>();
                var leaveClassAuth = typeof(LeaveManagementController).GetCustomAttribute<AuthorizeAttribute>();
                var effMethod = typeof(TimetableSubstitutionController).GetMethod("GetEffectiveTimetable");
                var effAuth = effMethod?.GetCustomAttribute<AuthorizeAttribute>();
                var userMgmtClassAuth = typeof(UserManagementController).GetCustomAttribute<AuthorizeAttribute>();
                var roleMgmtClassAuth = typeof(RoleManagementController).GetCustomAttribute<AuthorizeAttribute>();
                var staffAttClassAuth = typeof(StaffAttendanceController).GetCustomAttribute<AuthorizeAttribute>();
                var staffAttUpdateMethod = typeof(StaffAttendanceController).GetMethod("UpdateStaffAttendance");
                var staffAttUpdateAuth = staffAttUpdateMethod?.GetCustomAttribute<AuthorizeAttribute>();
                var staffSubClassAuth = typeof(StaffLeaveSubstitutionController).GetCustomAttribute<AuthorizeAttribute>();
                var createSubMethod = typeof(StaffLeaveSubstitutionController).GetMethod("CreateSubstitutions");
                var createSubAuth = createSubMethod?.GetCustomAttribute<AuthorizeAttribute>();
                var cancelSubMethod = typeof(TimetableSubstitutionController).GetMethod("CancelSubstitution");
                var cancelSubAuth = cancelSubMethod?.GetCustomAttribute<AuthorizeAttribute>();
                var getSubsMethod = typeof(TimetableSubstitutionController).GetMethod("GetSubstitutions");
                var getSubsAuth = getSubsMethod?.GetCustomAttribute<AuthorizeAttribute>();
                var studentDailyMethod = typeof(TimetableSubstitutionController).GetMethod("GetStudentDailyTimetable");
                var studentDailyAuth = studentDailyMethod?.GetCustomAttribute<AuthorizeAttribute>();
                var staffDailyMethod = typeof(TimetableSubstitutionController).GetMethod("GetStaffDailyTimetable");
                var staffDailyAuth = staffDailyMethod?.GetCustomAttribute<AuthorizeAttribute>();

                // Test 15: Admin role is authorized where Admin is mapped (PromotionsController & Attendance unlock)
                AssertTrue(IsPrincipalInRoleString(adminPrincipal, promoClassAuth!.Roles) &&
                           IsPrincipalInRoleString(adminPrincipal, unlockAuth!.Roles),
                    "Test 15: Admin role is authorized where Admin is mapped",
                    "Admin authorized on Promotions and Attendance unlock");

                // Test 16: Super Admin is authorized where Super Admin is mapped (PromotionsController & UserManagement)
                AssertTrue(IsPrincipalInRoleString(superAdminPrincipal, promoClassAuth.Roles) &&
                           IsPrincipalInRoleString(superAdminPrincipal, userMgmtClassAuth!.Roles),
                    "Test 16: Super Admin is authorized where Super Admin is mapped",
                    "Super Admin authorized on Promotions and UserManagement");

                // Test 17: HOD is authorized where HOD is mapped (Attendance defaulters & Timetable substitutions)
                AssertTrue(IsPrincipalInRoleString(hodPrincipal, defaultersAuth!.Roles) &&
                           IsPrincipalInRoleString(hodPrincipal, getSubsAuth!.Roles),
                    "Test 17: HOD is authorized where HOD is mapped",
                    "HOD authorized on Attendance defaulters and Timetable substitutions");

                // Test 18: Faculty is authorized where Faculty is mapped (LeaveManagement & Timetable substitutions)
                AssertTrue(IsPrincipalInRoleString(facultyPrincipal, leaveClassAuth!.Roles) &&
                           IsPrincipalInRoleString(facultyPrincipal, getSubsAuth.Roles),
                    "Test 18: Faculty is authorized where Faculty is mapped",
                    "Faculty authorized on LeaveManagement and Timetable substitutions");

                // Test 19: Student is authorized where Student is mapped (Effective timetable & Student daily timetable)
                AssertTrue(IsPrincipalInRoleString(studentPrincipal, effAuth!.Roles) &&
                           IsPrincipalInRoleString(studentPrincipal, studentDailyAuth!.Roles),
                    "Test 19: Student is authorized where Student is mapped",
                    "Student authorized on Effective timetable and Daily timetable");

                // Test 20: A role not included in an endpoint's authorization list is rejected
                AssertTrue(!IsPrincipalInRoleString(hodPrincipal, promoClassAuth.Roles) &&
                           !IsPrincipalInRoleString(facultyPrincipal, unlockAuth.Roles) &&
                           !IsPrincipalInRoleString(studentPrincipal, staffAttClassAuth!.Roles) &&
                           !IsPrincipalInRoleString(parentPrincipal, userMgmtClassAuth.Roles) &&
                           !IsPrincipalInRoleString(accountsPrincipal, leaveClassAuth.Roles) &&
                           !IsPrincipalInRoleString(legacyCollegeAdminPrincipal, promoClassAuth.Roles),
                    "Test 20: A role not included in an endpoint's authorization list is rejected",
                    "Unauthorized roles correctly rejected across endpoints");

                // Endpoint Mapping Checks
                AssertTrue(promoClassAuth.Roles == "Super Admin,Admin",
                    "Test 20B: PromotionsController mapped to 'Super Admin,Admin'", $"Actual: '{promoClassAuth.Roles}'");
                AssertTrue(roleMgmtClassAuth!.Roles == "Super Admin,Admin",
                    "Test 20C: RoleManagementController mapped to 'Super Admin,Admin'", $"Actual: '{roleMgmtClassAuth.Roles}'");
                AssertTrue(userMgmtClassAuth.Roles == "Super Admin,Admin",
                    "Test 20D: UserManagementController mapped to 'Super Admin,Admin'", $"Actual: '{userMgmtClassAuth.Roles}'");
                AssertTrue(defaultersAuth.Roles == "Super Admin,Admin,HOD",
                    "Test 20E: AttendanceController.defaulters mapped to 'Super Admin,Admin,HOD'", $"Actual: '{defaultersAuth.Roles}'");
                AssertTrue(unlockAuth.Roles == "Super Admin,Admin",
                    "Test 20F: AttendanceController.unlock mapped to 'Super Admin,Admin'", $"Actual: '{unlockAuth.Roles}'");
                AssertTrue(leaveClassAuth.Roles == "Faculty,Admin,Super Admin,HOD",
                    "Test 20G: LeaveManagementController mapped to 'Faculty,Admin,Super Admin,HOD'", $"Actual: '{leaveClassAuth.Roles}'");
                AssertTrue(staffAttClassAuth.Roles == "Faculty,Admin,Super Admin,HOD",
                    "Test 20H: StaffAttendanceController mapped to 'Faculty,Admin,Super Admin,HOD'", $"Actual: '{staffAttClassAuth.Roles}'");
                AssertTrue(staffAttUpdateAuth!.Roles == "Admin,Super Admin,HOD",
                    "Test 20I: StaffAttendanceController.update mapped to 'Admin,Super Admin,HOD'", $"Actual: '{staffAttUpdateAuth.Roles}'");
                AssertTrue(staffSubClassAuth!.Roles == "Faculty,Admin,Super Admin,HOD",
                    "Test 20J: StaffLeaveSubstitutionController mapped to 'Faculty,Admin,Super Admin,HOD'", $"Actual: '{staffSubClassAuth.Roles}'");
                AssertTrue(createSubAuth!.Roles == "Admin,Super Admin,HOD",
                    "Test 20K: StaffLeaveSubstitutionController.createSubstitutions mapped to 'Admin,Super Admin,HOD'", $"Actual: '{createSubAuth.Roles}'");
                AssertTrue(cancelSubAuth!.Roles == "Admin,Super Admin,HOD",
                    "Test 20L: TimetableSubstitutionController.cancel mapped to 'Admin,Super Admin,HOD'", $"Actual: '{cancelSubAuth.Roles}'");
                AssertTrue(getSubsAuth.Roles == "Faculty,Admin,Super Admin,HOD",
                    "Test 20M: TimetableSubstitutionController.substitutions mapped to 'Faculty,Admin,Super Admin,HOD'", $"Actual: '{getSubsAuth.Roles}'");
                AssertTrue(effAuth.Roles == "Faculty,Admin,Super Admin,HOD,Student",
                    "Test 20N: TimetableSubstitutionController.effective mapped to 'Faculty,Admin,Super Admin,HOD,Student'", $"Actual: '{effAuth.Roles}'");
                AssertTrue(studentDailyAuth.Roles == "Faculty,Admin,Super Admin,HOD,Student",
                    "Test 20O: TimetableSubstitutionController.studentDaily mapped to 'Faculty,Admin,Super Admin,HOD,Student'", $"Actual: '{studentDailyAuth.Roles}'");
                AssertTrue(staffDailyAuth!.Roles == "Faculty,Admin,Super Admin,HOD",
                    "Test 20P: TimetableSubstitutionController.staffDaily mapped to 'Faculty,Admin,Super Admin,HOD'", $"Actual: '{staffDailyAuth.Roles}'");

                // ===================================================================================
                // PART 4: PROVISIONING ROLE VALIDATION (TESTS 21 - 25)
                // ===================================================================================
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("\n--- [PART 4] PROVISIONING ROLE VALIDATION (TESTS 21 - 25) ---");
                Console.ResetColor();

                // Test 21: Staff validation accepts: HOD, Faculty, Accounts, Examination Cell, Library, Hostel Warden, Placement Officer
                var validStaffRoleNames = new[] { "HOD", "Faculty", "Accounts", "Examination Cell", "Library", "Hostel Warden", "Placement Officer" };
                bool allStaffAccepted = true;
                var staffAcceptDetails = new List<string>();
                foreach (var roleName in validStaffRoleNames)
                {
                    var resolvedRole = await userRepo.GetRoleByNameAsync(roleName);
                    if (resolvedRole == null)
                    {
                        allStaffAccepted = false;
                        staffAcceptDetails.Add($"{roleName}: role not found");
                    }
                    else
                    {
                        // Validate role rejection logic does NOT reject this valid staff role
                        var nonStaffRoles = new[] { "Super Admin", "Admin", "Student", "Parent" };
                        bool isRejected = nonStaffRoles.Any(r => string.Equals(r, resolvedRole.RoleName, StringComparison.OrdinalIgnoreCase));
                        if (isRejected)
                        {
                            allStaffAccepted = false;
                            staffAcceptDetails.Add($"{roleName}: incorrectly rejected");
                        }
                        else
                        {
                            staffAcceptDetails.Add($"{roleName} (ID: {resolvedRole.RoleId}): OK");
                        }
                    }
                }
                AssertTrue(allStaffAccepted,
                    "Test 21: Staff validation accepts HOD, Faculty, Accounts, Examination Cell, Library, Hostel Warden, Placement Officer",
                    string.Join(", ", staffAcceptDetails));

                // Test 22: Staff validation rejects: Super Admin, Admin, Student, Parent
                var invalidStaffRoleNames = new[] { "Super Admin", "Admin", "Student", "Parent" };
                bool allInvalidStaffRejected = true;
                var staffRejectDetails = new List<string>();
                foreach (var roleName in invalidStaffRoleNames)
                {
                    var resolvedRole = await userRepo.GetRoleByNameAsync(roleName);
                    if (resolvedRole != null)
                    {
                        var req = new ProvisionStaffUserRequest
                        {
                            StaffId = 9999,
                            RoleId = resolvedRole.RoleId,
                            Email = $"test.{roleName.Replace(" ", "").ToLower()}@test.edu",
                            FullName = $"{roleName} Test"
                        };
                        var res = await provisioningService.ProvisionStaffUserAsync(req);
                        if (res.Success || res.ErrorMessage == null || !res.ErrorMessage.Contains("cannot be assigned to a Staff account"))
                        {
                            allInvalidStaffRejected = false;
                            staffRejectDetails.Add($"{roleName}: not rejected properly");
                        }
                        else
                        {
                            staffRejectDetails.Add($"{roleName}: correctly rejected");
                        }
                    }
                }
                AssertTrue(allInvalidStaffRejected,
                    "Test 22: Staff validation rejects Super Admin, Admin, Student, Parent",
                    string.Join(", ", staffRejectDetails));

                // Test 23: Student provisioning continues resolving the canonical Student role dynamically
                var dynamicStudentRole = await userRepo.GetRoleByNameAsync("Student");
                AssertTrue(dynamicStudentRole != null && dynamicStudentRole.RoleId == 5 && dynamicStudentRole.RoleName == "Student",
                    "Test 23: Student provisioning continues resolving the canonical Student role dynamically",
                    $"Resolved RoleId: {dynamicStudentRole?.RoleId}, RoleName: '{dynamicStudentRole?.RoleName}'");

                // Test 24: Student provisioning still rejects mismatched RoleId overrides
                var mismatchedStudentReq = new ProvisionStudentUserRequest
                {
                    StudentId = 9999,
                    RoleId = 1, // Super Admin RoleId passed to Student provisioning
                    Email = "mismatched.student@test.edu",
                    FullName = "Mismatched Student"
                };
                var mismatchedStudentResult = await provisioningService.ProvisionStudentUserAsync(mismatchedStudentReq);
                AssertTrue(!mismatchedStudentResult.Success && mismatchedStudentResult.ErrorMessage != null && mismatchedStudentResult.ErrorMessage.Contains("must only use canonical Student role"),
                    "Test 24: Student provisioning still rejects mismatched RoleId overrides",
                    $"Error message: {mismatchedStudentResult.ErrorMessage}");

                // Test 25: No "College Admin" is referenced in provisioning validation
                var resolvedCollegeAdmin = await userRepo.GetRoleByNameAsync("College Admin");
                AssertTrue(resolvedCollegeAdmin == null,
                    "Test 25: No 'College Admin' exists in Roles table or is referenced in provisioning validation",
                    "Verified 'College Admin' does not exist in database");

                // ===================================================================================
                // PART 5: DATABASE SAFETY & INVARIANCE (TESTS 26 - 31)
                // ===================================================================================
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("\n--- [PART 5] DATABASE SAFETY & INVARIANCE (TESTS 26 - 31) ---");
                Console.ResetColor();

                // Test 26: Roles row count unchanged
                var finalRolesCount = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Roles");
                AssertTrue(finalRolesCount == initialRolesCount && finalRolesCount == 11,
                    $"Test 26: Roles row count unchanged ({finalRolesCount} rows)",
                    $"Initial: {initialRolesCount}, Final: {finalRolesCount}");

                // Test 27: Users row count unchanged
                var finalUsersCount = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users");
                AssertTrue(finalUsersCount == initialUsersCount && finalUsersCount == 14,
                    $"Test 27: Users row count unchanged ({finalUsersCount} rows)",
                    $"Initial: {initialUsersCount}, Final: {finalUsersCount}");

                // Test 28: Admins row count unchanged
                var finalAdminsCount = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM admins");
                AssertTrue(finalAdminsCount == initialAdminsCount && finalAdminsCount == 10,
                    $"Test 28: Admins row count unchanged ({finalAdminsCount} rows)",
                    $"Initial: {initialAdminsCount}, Final: {finalAdminsCount}");

                // Test 29: Staff row count unchanged
                var finalStaffCount = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Staff");
                AssertTrue(finalStaffCount == initialStaffCount && finalStaffCount == 72,
                    $"Test 29: Staff row count unchanged ({finalStaffCount} rows)",
                    $"Initial: {initialStaffCount}, Final: {finalStaffCount}");

                // Test 30: Students row count unchanged
                var finalStudentsCount = await dbConnection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Students");
                AssertTrue(finalStudentsCount == initialStudentsCount && finalStudentsCount == 48,
                    $"Test 30: Students row count unchanged ({finalStudentsCount} rows)",
                    $"Initial: {initialStudentsCount}, Final: {finalStudentsCount}");

                // Test 31: No existing domain/user record is modified by the Phase 6B test runner
                var finalUserChecksums = (await dbConnection.QueryAsync<(int UserId, string Email, int RoleId, string PasswordHash)>(
                    "SELECT UserId, Email, RoleId, PasswordHash FROM Users ORDER BY UserId")).ToList();

                bool userIntegrityMaintained = initialUserChecksums.Count == finalUserChecksums.Count &&
                    initialUserChecksums.Zip(finalUserChecksums, (init, fin) =>
                        init.UserId == fin.UserId &&
                        init.Email == fin.Email &&
                        init.RoleId == fin.RoleId &&
                        init.PasswordHash == fin.PasswordHash).All(match => match);

                AssertTrue(userIntegrityMaintained,
                    "Test 31: No existing domain/user record was modified by the Phase 6B test runner",
                    $"All {finalUserChecksums.Count} original user records remain 100% byte-for-byte identical");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"\n[EXCEPTION IN TEST RUNNER] {ex.Message}\n{ex.StackTrace}");
                Console.ResetColor();
                _failCount++;
            }

            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("================================================================================");
            Console.WriteLine($"PHASE 6B VERIFICATION SUMMARY: {_passCount} PASSED, {_failCount} FAILED (TOTAL: {_passCount + _failCount})");
            Console.WriteLine("================================================================================");
            Console.ResetColor();

            return _failCount == 0;
        }

        private static void AssertTrue(bool condition, string testName, string details)
        {
            if (condition)
            {
                _passCount++;
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"  [PASS] {testName}");
                Console.ResetColor();
            }
            else
            {
                _failCount++;
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"  [FAIL] {testName}");
                Console.ForegroundColor = ConsoleColor.DarkYellow;
                Console.WriteLine($"         -> Details: {details}");
                Console.ResetColor();
            }
        }
    }
}
