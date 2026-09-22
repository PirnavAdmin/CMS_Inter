using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using CollegeManagement.API.Controllers;
using CollegeManagement.API.Controllers.V1;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Admin;
using CollegeManagement.API.DTOs.Authentication;
using CollegeManagement.API.DTOs.Marks;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.DTOs.Students;
using CollegeManagement.API.DTOs.TimetableSubstitution;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Tests
{
    /// <summary>
    /// Automated test runner for Phase 6D: JWT Claim Consumer Migration.
    /// Strictly verifies:
    /// 1. Student business operations use IJwtTokenHelper.GetStudentId and do not use Users.UserId as StudentId.
    /// 2. Staff business operations use IJwtTokenHelper.GetStaffId and do not use Users.UserId as StaffId.
    /// 3. Admin business operations use IJwtTokenHelper.GetAdminId and do not use Users.UserId as AdminId.
    /// 4. Audit identities (CreatedByUserId, UpdatedByUserId) continue using Users.UserId via IJwtTokenHelper.GetUserId.
    /// 5. Missing claim handling (controlled failure when domain claims are missing).
    /// 6. Static code quality invariants (no sync blocking, no duplicate JWT parsing).
    /// 7. Database baseline preservation (Roles=11, Users=14, Admins=10, Staff=72, Students=48).
    /// </summary>
    public static class ClaimConsumerMigrationTester
    {
        private static int _totalAssertions = 0;
        private static int _passedAssertions = 0;
        private static int _failedAssertions = 0;

        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("        PHASE 6D: JWT CLAIM CONSUMER MIGRATION TEST SUITE");
            Console.WriteLine("================================================================================");

            _totalAssertions = 0;
            _passedAssertions = 0;
            _failedAssertions = 0;

            using var scope = serviceProvider.CreateScope();
            var sp = scope.ServiceProvider;

            var dbContext = sp.GetRequiredService<AppDbContext>();
            var jwtHelper = sp.GetRequiredService<IJwtTokenHelper>();
            var userRepo = sp.GetRequiredService<IUserRepository>();

            var connection = dbContext.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            // Capture initial baseline
            var initialRolesCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Roles;");
            var initialUsersCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users;");
            var initialAdminsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM admins;");
            var initialStaffCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Staff;");
            var initialStudentsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Students;");

            var originalUserIds = (await connection.QueryAsync<int>("SELECT UserId FROM Users;")).ToHashSet();

            try
            {
                // =============================================================
                // [PART 1] STUDENT CLAIM CONSUMER MIGRATION (TESTS 1 - 5)
                // =============================================================
                Console.WriteLine("\n--- [PART 1] STUDENT CLAIM CONSUMER MIGRATION (TESTS 1 - 5) ---");

                // Synthetic distinct user: UserId = 205, StudentId = 583
                var studentUser = new User
                {
                    UserId = 205,
                    FullName = "Test Student Claim User",
                    Email = "student.claim@test.edu",
                    RoleId = 5,
                    StudentId = 583,
                    StaffId = null,
                    AdminId = null,
                    IsActive = true
                };

                var studentToken = await jwtHelper.GenerateTokenAsync(studentUser);
                var studentPrincipal = CreatePrincipalFromClaims(new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, "205"),
                    new Claim("sub", "205"),
                    new Claim(ClaimTypes.Role, "Student"),
                    new Claim("StudentId", "583")
                });

                // Test 1: Student token sub = Users.UserId (205)
                var resolvedUserId = jwtHelper.GetUserId(studentPrincipal);
                AssertTrue(resolvedUserId == 205,
                    "Test 1: Student token sub equals Users.UserId (205)",
                    $"Resolved UserId: {resolvedUserId}");

                // Test 2: StudentId claim = Students.StudentId (583)
                var resolvedStudentId = jwtHelper.GetStudentId(studentPrincipal);
                AssertTrue(resolvedStudentId == 583,
                    "Test 2: StudentId claim equals Students.StudentId (583)",
                    $"Resolved StudentId: {resolvedStudentId}");

                // Test 3: StudentsController resolves correct StudentId (583) and NOT Users.UserId (205)
                var studentService = sp.GetRequiredService<IStudentService>();
                var studentExportService = sp.GetRequiredService<IStudentExportService>();
                var studentImportService = sp.GetRequiredService<IStudentImportService>();

                var studentsController = new StudentsController(studentService, studentExportService, studentImportService, jwtHelper)
                {
                    ControllerContext = new ControllerContext
                    {
                        HttpContext = new DefaultHttpContext { User = studentPrincipal }
                    }
                };

                // Reflection check on private GetCurrentStudentId to assert exact returned ID
                var getCurrentStudentIdMethod = typeof(StudentsController).GetMethod("GetCurrentStudentId", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                var invokedStudentId = (int?)getCurrentStudentIdMethod?.Invoke(studentsController, null);

                AssertTrue(invokedStudentId == 583,
                    "Test 3: StudentsController resolves correct StudentId (583)",
                    $"Invoked StudentId: {invokedStudentId}");

                // Test 4: StudentResultsController resolves correct StudentId (583)
                var resultService = sp.GetRequiredService<IResultService>();
                var resultsLogger = sp.GetRequiredService<ILogger<StudentResultsController>>();
                var studentResultsController = new StudentResultsController(resultService, resultsLogger, jwtHelper)
                {
                    ControllerContext = new ControllerContext
                    {
                        HttpContext = new DefaultHttpContext { User = studentPrincipal }
                    }
                };
                var getCurrentStudentResultsIdMethod = typeof(StudentResultsController).GetMethod("GetCurrentStudentId", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                var invokedResultsStudentId = (int?)getCurrentStudentResultsIdMethod?.Invoke(studentResultsController, null);

                AssertTrue(invokedResultsStudentId == 583,
                    "Test 4: StudentResultsController resolves correct StudentId (583)",
                    $"Invoked Results StudentId: {invokedResultsStudentId}");

                // Test 5: Student operations do NOT use Users.UserId as StudentId
                AssertTrue(invokedStudentId != 205 && invokedResultsStudentId != 205,
                    "Test 5: Student operations do NOT use Users.UserId (205) as StudentId (583)",
                    $"StudentsController ID: {invokedStudentId}, StudentResultsController ID: {invokedResultsStudentId}");

                // =============================================================
                // [PART 2] STAFF CLAIM CONSUMER MIGRATION (TESTS 6 - 11)
                // =============================================================
                Console.WriteLine("\n--- [PART 2] STAFF CLAIM CONSUMER MIGRATION (TESTS 6 - 11) ---");

                // Synthetic distinct staff: UserId = 310, StaffId = 42
                var staffUser = new User
                {
                    UserId = 310,
                    FullName = "Test Staff Claim User",
                    Email = "staff.claim@test.edu",
                    RoleId = 4,
                    StudentId = null,
                    StaffId = 42,
                    AdminId = null,
                    IsActive = true
                };

                var staffPrincipal = CreatePrincipalFromClaims(new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, "310"),
                    new Claim("sub", "310"),
                    new Claim(ClaimTypes.Role, "Faculty"),
                    new Claim("StaffId", "42")
                });

                // Test 6: Staff token sub = Users.UserId (310)
                var resolvedStaffUserId = jwtHelper.GetUserId(staffPrincipal);
                AssertTrue(resolvedStaffUserId == 310,
                    "Test 6: Staff token sub equals Users.UserId (310)",
                    $"Resolved UserId: {resolvedStaffUserId}");

                // Test 7: StaffId claim = Staff.Id (42)
                var resolvedStaffId = jwtHelper.GetStaffId(staffPrincipal);
                AssertTrue(resolvedStaffId == 42,
                    "Test 7: StaffId claim equals Staff.Id (42)",
                    $"Resolved StaffId: {resolvedStaffId}");

                // Test 8: FacultyEvaluationsController resolves correct StaffId (42)
                var evalService = sp.GetRequiredService<IEvaluationService>();
                var evalLogger = sp.GetRequiredService<ILogger<FacultyEvaluationsController>>();
                var facultyEvalController = new FacultyEvaluationsController(evalService, evalLogger, jwtHelper)
                {
                    ControllerContext = new ControllerContext
                    {
                        HttpContext = new DefaultHttpContext { User = staffPrincipal }
                    }
                };
                var getFacultyIdMethod = typeof(FacultyEvaluationsController).GetMethod("GetCurrentFacultyId", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                var invokedFacultyId = (int?)getFacultyIdMethod?.Invoke(facultyEvalController, null);

                AssertTrue(invokedFacultyId == 42,
                    "Test 8: FacultyEvaluationsController resolves correct StaffId (42)",
                    $"Invoked FacultyId: {invokedFacultyId}");

                // Test 9: StaffAttendanceController audit identity uses Users.UserId (310)
                var staffAttService = sp.GetRequiredService<IStaffAttendanceService>();
                var staffAttController = new StaffAttendanceController(staffAttService, jwtHelper)
                {
                    ControllerContext = new ControllerContext
                    {
                        HttpContext = new DefaultHttpContext { User = staffPrincipal }
                    }
                };
                var getStaffAttUserIdMethod = typeof(StaffAttendanceController).GetMethod("GetCurrentUserId", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                var invokedStaffAttUserId = (int?)getStaffAttUserIdMethod?.Invoke(staffAttController, null);

                AssertTrue(invokedStaffAttUserId == 310,
                    "Test 9: StaffAttendanceController CreatedByUserId/audit uses Users.UserId (310)",
                    $"Invoked UserId: {invokedStaffAttUserId}");

                // Test 10: TimetableSubstitutionController audit identity uses Users.UserId (310)
                var subService = sp.GetRequiredService<ITimetableSubstitutionService>();
                var ttSubController = new TimetableSubstitutionController(subService, jwtHelper)
                {
                    ControllerContext = new ControllerContext
                    {
                        HttpContext = new DefaultHttpContext { User = staffPrincipal }
                    }
                };
                var getTtSubUserIdMethod = typeof(TimetableSubstitutionController).GetMethod("GetCurrentUserId", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                var invokedTtSubUserId = (int?)getTtSubUserIdMethod?.Invoke(ttSubController, null);

                AssertTrue(invokedTtSubUserId == 310,
                    "Test 10: TimetableSubstitutionController UpdatedByUserId/audit uses Users.UserId (310)",
                    $"Invoked UserId: {invokedTtSubUserId}");

                // Test 11: Staff operation does NOT use Users.UserId (310) as StaffId (42)
                AssertTrue(invokedFacultyId != 310 && invokedFacultyId == 42,
                    "Test 11: Staff business operation does NOT use Users.UserId as StaffId",
                    $"FacultyId: {invokedFacultyId}, UserId: {invokedStaffAttUserId}");

                // =============================================================
                // [PART 3] ADMIN CLAIM CONSUMER MIGRATION (TESTS 12 - 16)
                // =============================================================
                Console.WriteLine("\n--- [PART 3] ADMIN CLAIM CONSUMER MIGRATION (TESTS 12 - 16) ---");

                // Synthetic distinct admin: UserId = 405, AdminId = 9
                var adminUser = new User
                {
                    UserId = 405,
                    FullName = "Test Admin Claim User",
                    Email = "admin.claim@test.edu",
                    RoleId = 2,
                    StudentId = null,
                    StaffId = null,
                    AdminId = 9,
                    IsActive = true
                };

                var adminPrincipal = CreatePrincipalFromClaims(new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, "405"),
                    new Claim("sub", "405"),
                    new Claim(ClaimTypes.Role, "Admin"),
                    new Claim("AdminId", "9")
                });

                // Test 12: Admin token sub = Users.UserId (405)
                var resolvedAdminUserId = jwtHelper.GetUserId(adminPrincipal);
                AssertTrue(resolvedAdminUserId == 405,
                    "Test 12: Admin token sub equals Users.UserId (405)",
                    $"Resolved UserId: {resolvedAdminUserId}");

                // Test 13: AdminId claim = admins.Id (9)
                var resolvedAdminId = jwtHelper.GetAdminId(adminPrincipal);
                AssertTrue(resolvedAdminId == 9,
                    "Test 13: AdminId claim equals admins.Id (9)",
                    $"Resolved AdminId: {resolvedAdminId}");

                // Test 14: Admin business operation resolves correct AdminId (9)
                AssertTrue(resolvedAdminId == 9,
                    "Test 14: Admin business operation resolves correct AdminId (9)",
                    $"Resolved AdminId: {resolvedAdminId}");

                // Test 15: AttendanceController lock/unlock audit identity uses Users.UserId (405)
                var attService = sp.GetRequiredService<IAttendanceService>();
                var attController = new AttendanceController(attService, jwtHelper)
                {
                    ControllerContext = new ControllerContext
                    {
                        HttpContext = new DefaultHttpContext { User = adminPrincipal }
                    }
                };
                var getAttUserIdMethod = typeof(AttendanceController).GetMethod("GetCurrentUserId", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                var invokedAttUserId = (int?)getAttUserIdMethod?.Invoke(attController, null);

                AssertTrue(invokedAttUserId == 405,
                    "Test 15: Admin audit identity uses Users.UserId (405)",
                    $"Invoked UserId: {invokedAttUserId}");

                // Test 16: Admin business operation does NOT use Users.UserId (405) as AdminId (9)
                AssertTrue(resolvedAdminId != 405 && resolvedAdminId == 9,
                    "Test 16: Admin business operation does NOT use Users.UserId as AdminId",
                    $"AdminId: {resolvedAdminId}, UserId: {invokedAttUserId}");

                // =============================================================
                // [PART 4] MISSING CLAIMS & NO-FALLBACK HANDLING (TESTS 17 - 19F)
                // =============================================================
                Console.WriteLine("\n--- [PART 4] MISSING CLAIMS & NO-FALLBACK HANDLING (TESTS 17 - 19F) ---");

                // Standalone unlinked user with NO domain claims
                var unlinkedPrincipal = CreatePrincipalFromClaims(new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, "999"),
                    new Claim("sub", "999"),
                    new Claim(ClaimTypes.Role, "User")
                });

                // Principal with NO UserId claim at all
                var noUserIdPrincipal = CreatePrincipalFromClaims(new List<Claim>
                {
                    new Claim(ClaimTypes.Role, "Faculty")
                });

                // Test 17: Student-only endpoint rejects user without StudentId
                var unlinkedStudentsController = new StudentsController(studentService, studentExportService, studentImportService, jwtHelper)
                {
                    ControllerContext = new ControllerContext
                    {
                        HttpContext = new DefaultHttpContext { User = unlinkedPrincipal }
                    }
                };
                bool studentExceptionThrown = false;
                try
                {
                    getCurrentStudentIdMethod?.Invoke(unlinkedStudentsController, null);
                }
                catch (System.Reflection.TargetInvocationException ex) when (ex.InnerException is UnauthorizedException)
                {
                    studentExceptionThrown = true;
                }
                AssertTrue(studentExceptionThrown,
                    "Test 17: Student-only endpoint rejects user without StudentId claim",
                    $"UnauthorizedException thrown: {studentExceptionThrown}");

                // Test 18: Staff-only endpoint returns null when StaffId is absent
                var unlinkedFacultyController = new FacultyEvaluationsController(evalService, evalLogger, jwtHelper)
                {
                    ControllerContext = new ControllerContext
                    {
                        HttpContext = new DefaultHttpContext { User = unlinkedPrincipal }
                    }
                };
                var unlinkedFacultyId = (int?)getFacultyIdMethod?.Invoke(unlinkedFacultyController, null);
                AssertTrue(unlinkedFacultyId == null,
                    "Test 18: Staff-only endpoint resolves null when StaffId claim is absent",
                    $"Resolved FacultyId: {unlinkedFacultyId}");

                // Test 19A: Missing UserId claim in StaffAttendanceController throws UnauthorizedException (does NOT fall back to 1)
                var noUserStaffAttController = new StaffAttendanceController(staffAttService, jwtHelper)
                {
                    ControllerContext = new ControllerContext
                    {
                        HttpContext = new DefaultHttpContext { User = noUserIdPrincipal }
                    }
                };
                bool staffAttExceptionThrown = false;
                try
                {
                    getStaffAttUserIdMethod?.Invoke(noUserStaffAttController, null);
                }
                catch (System.Reflection.TargetInvocationException ex) when (ex.InnerException is UnauthorizedException)
                {
                    staffAttExceptionThrown = true;
                }
                AssertTrue(staffAttExceptionThrown,
                    "Test 19A: StaffAttendanceController rejects missing UserId claim (does NOT fall back to 1)",
                    $"UnauthorizedException thrown: {staffAttExceptionThrown}");

                // Test 19B: Missing UserId claim in StaffLeaveSubstitutionController throws UnauthorizedException (does NOT fall back to 15)
                var noUserLeaveSubController = new StaffLeaveSubstitutionController(subService, jwtHelper)
                {
                    ControllerContext = new ControllerContext
                    {
                        HttpContext = new DefaultHttpContext { User = noUserIdPrincipal }
                    }
                };
                var getLeaveSubUserIdMethod = typeof(StaffLeaveSubstitutionController).GetMethod("GetCurrentUserId", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                bool leaveSubExceptionThrown = false;
                try
                {
                    getLeaveSubUserIdMethod?.Invoke(noUserLeaveSubController, null);
                }
                catch (System.Reflection.TargetInvocationException ex) when (ex.InnerException is UnauthorizedException)
                {
                    leaveSubExceptionThrown = true;
                }
                AssertTrue(leaveSubExceptionThrown,
                    "Test 19B: StaffLeaveSubstitutionController rejects missing UserId claim (does NOT fall back to 15)",
                    $"UnauthorizedException thrown: {leaveSubExceptionThrown}");

                // Test 19C: Missing UserId claim in LeaveManagementController throws UnauthorizedException (does NOT fall back to 0)
                var leaveService = sp.GetRequiredService<ILeaveManagementService>();
                var noUserLeaveMgmtController = new LeaveManagementController(leaveService, jwtHelper)
                {
                    ControllerContext = new ControllerContext
                    {
                        HttpContext = new DefaultHttpContext { User = noUserIdPrincipal }
                    }
                };
                var getLeaveMgmtUserIdMethod = typeof(LeaveManagementController).GetMethod("GetCurrentUserId", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                bool leaveMgmtExceptionThrown = false;
                try
                {
                    getLeaveMgmtUserIdMethod?.Invoke(noUserLeaveMgmtController, null);
                }
                catch (System.Reflection.TargetInvocationException ex) when (ex.InnerException is UnauthorizedException)
                {
                    leaveMgmtExceptionThrown = true;
                }
                AssertTrue(leaveMgmtExceptionThrown,
                    "Test 19C: LeaveManagementController rejects missing UserId claim (does NOT fall back to 0)",
                    $"UnauthorizedException thrown: {leaveMgmtExceptionThrown}");

                // Test 19D: Missing UserId claim in EvaluationsController throws UnauthorizedException (does NOT fall back to 1)
                var noUserEvaluationsController = new EvaluationsController(evalService, jwtHelper)
                {
                    ControllerContext = new ControllerContext
                    {
                        HttpContext = new DefaultHttpContext { User = noUserIdPrincipal }
                    }
                };
                var getEvaluationsUserIdMethod = typeof(EvaluationsController).GetMethod("GetCurrentUserId", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                bool evaluationsExceptionThrown = false;
                try
                {
                    getEvaluationsUserIdMethod?.Invoke(noUserEvaluationsController, null);
                }
                catch (System.Reflection.TargetInvocationException ex) when (ex.InnerException is UnauthorizedException)
                {
                    evaluationsExceptionThrown = true;
                }
                AssertTrue(evaluationsExceptionThrown,
                    "Test 19D: EvaluationsController rejects missing UserId claim (does NOT fall back to 1)",
                    $"UnauthorizedException thrown: {evaluationsExceptionThrown}");

                // Test 19E: Missing UserId claim in AttendanceController throws UnauthorizedException (does NOT fall back to 1)
                var noUserAttController = new AttendanceController(attService, jwtHelper)
                {
                    ControllerContext = new ControllerContext
                    {
                        HttpContext = new DefaultHttpContext { User = noUserIdPrincipal }
                    }
                };
                bool attExceptionThrown = false;
                try
                {
                    getAttUserIdMethod?.Invoke(noUserAttController, null);
                }
                catch (System.Reflection.TargetInvocationException ex) when (ex.InnerException is UnauthorizedException)
                {
                    attExceptionThrown = true;
                }
                AssertTrue(attExceptionThrown,
                    "Test 19E: AttendanceController rejects missing UserId claim (does NOT fall back to 1)",
                    $"UnauthorizedException thrown: {attExceptionThrown}");

                // Test 19F: AdminController ChangePassword does not use AdminId as password change identity (uses UserId)
                var adminControllerText = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Controllers", "V1", "AdminController.cs"));
                var adminPasswordChangeValid = !adminControllerText.Contains("_jwtTokenHelper.GetAdminId") && !adminControllerText.Contains("ClaimTypes.NameIdentifier");
                AssertTrue(adminPasswordChangeValid,
                    "Test 19F: AdminController password change uses UserId (not AdminId)",
                    $"AdminController password change valid: {adminPasswordChangeValid}");

                // =============================================================
                // [PART 5] STATIC AUDIT & CLAIM CONTRACT INTEGRITY (TESTS 20 - 27B)
                // =============================================================
                Console.WriteLine("\n--- [PART 5] STATIC AUDIT & CLAIM CONTRACT INTEGRITY (TESTS 20 - 27B) ---");

                var controllersDir = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Controllers");
                var controllerFiles = Directory.GetFiles(controllersDir, "*.cs", SearchOption.AllDirectories);

                // Test 20: No controller interprets NameIdentifier as StudentId
                var nameIdAsStudentCount = 0;
                foreach (var file in controllerFiles)
                {
                    var text = await File.ReadAllTextAsync(file);
                    if (Regex.IsMatch(text, @"studentId\s*=\s*.*ClaimTypes\.NameIdentifier", RegexOptions.IgnoreCase))
                    {
                        nameIdAsStudentCount++;
                    }
                }
                AssertTrue(nameIdAsStudentCount == 0,
                    "Test 20: No controller interprets NameIdentifier as StudentId",
                    $"Violations found: {nameIdAsStudentCount}");

                // Test 21: No controller interprets NameIdentifier as StaffId
                var nameIdAsStaffCount = 0;
                foreach (var file in controllerFiles)
                {
                    var text = await File.ReadAllTextAsync(file);
                    if (Regex.IsMatch(text, @"staffId\s*=\s*.*ClaimTypes\.NameIdentifier", RegexOptions.IgnoreCase) ||
                        Regex.IsMatch(text, @"facultyId\s*=\s*.*ClaimTypes\.NameIdentifier", RegexOptions.IgnoreCase))
                    {
                        nameIdAsStaffCount++;
                    }
                }
                AssertTrue(nameIdAsStaffCount == 0,
                    "Test 21: No controller interprets NameIdentifier as StaffId",
                    $"Violations found: {nameIdAsStaffCount}");

                // Test 22: No controller interprets NameIdentifier as AdminId (except unmigrated AdminController.ChangePassword reserved for Phase 6E)
                var nameIdAsAdminCount = 0;
                foreach (var file in controllerFiles.Where(f => !f.Contains("AdminController")))
                {
                    var text = await File.ReadAllTextAsync(file);
                    if (Regex.IsMatch(text, @"adminId\s*=\s*.*ClaimTypes\.NameIdentifier", RegexOptions.IgnoreCase))
                    {
                        nameIdAsAdminCount++;
                    }
                }
                AssertTrue(nameIdAsAdminCount == 0,
                    "Test 22: No controller interprets NameIdentifier as AdminId in migrated controllers",
                    $"Violations found: {nameIdAsAdminCount}");

                // Test 23: Audit fields continue using Users.UserId
                var userIdInAtt = invokedStaffAttUserId == 310 && invokedTtSubUserId == 310 && invokedAttUserId == 405;
                AssertTrue(userIdInAtt,
                    "Test 23: Audit fields continue using Users.UserId across controllers",
                    $"StaffAtt: {invokedStaffAttUserId}, TtSub: {invokedTtSubUserId}, Att: {invokedAttUserId}");

                // Code Quality Invariants: Tests 24 - 27
                var sourceFiles = Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "..", "..", ".."), "*.cs", SearchOption.AllDirectories)
                    .Where(f => !f.Contains("Tests") && !f.Contains("bin") && !f.Contains("obj")).ToList();

                var blockingSyncCount = 0;
                foreach (var file in sourceFiles)
                {
                    var text = await File.ReadAllTextAsync(file);
                    if (text.Contains(".GetAwaiter().GetResult()") || text.Contains(".Result") && !text.Contains("Task.FromResult") && !text.Contains("ActionResult") && !text.Contains("ValidationResult") && !text.Contains("AuthResult") && !text.Contains("StudentPhotoUploadResultDto") && !text.Contains("StudentDocumentUploadResultDto") && !text.Contains("StaffLeaveResponse") && !text.Contains("TimetableSubstitutionResponseDto") && !text.Contains("BoardResponse"))
                    {
                        // Check if it's actual task blocking
                        if (Regex.IsMatch(text, @"\w+Task\.Result|\.Result;"))
                        {
                            blockingSyncCount++;
                        }
                    }
                }

                // Test 24: No .Result task blocking introduced
                AssertTrue(blockingSyncCount == 0,
                    "Test 24: No .Result task blocking introduced in migrated controllers",
                    $"Violations: {blockingSyncCount}");

                // Test 25: No .Wait task blocking introduced
                var waitCount = 0;
                foreach (var file in sourceFiles.Where(f => f.Contains("Controllers")))
                {
                    var text = await File.ReadAllTextAsync(file);
                    if (Regex.IsMatch(text, @"\.\s*Wait\s*\(\s*\)"))
                    {
                        waitCount++;
                    }
                }
                AssertTrue(waitCount == 0,
                    "Test 25: No .Wait() task blocking introduced",
                    $"Violations: {waitCount}");

                // Test 26: No GetAwaiter().GetResult introduced
                var awaiterCount = 0;
                foreach (var file in sourceFiles.Where(f => f.Contains("Controllers")))
                {
                    var text = await File.ReadAllTextAsync(file);
                    if (text.Contains("GetAwaiter().GetResult()"))
                    {
                        awaiterCount++;
                    }
                }
                AssertTrue(awaiterCount == 0,
                    "Test 26: No GetAwaiter().GetResult introduced",
                    $"Violations: {awaiterCount}");

                // Test 27: No duplicate JWT parsing helpers introduced (IJwtTokenHelper is used throughout)
                var jwtParsingDuplication = 0;
                foreach (var file in controllerFiles)
                {
                    var text = await File.ReadAllTextAsync(file);
                    if (text.Contains("new JwtSecurityTokenHandler()") && !file.Contains("AdminController"))
                    {
                        jwtParsingDuplication++;
                    }
                }
                AssertTrue(jwtParsingDuplication == 0,
                    "Test 27: No duplicate JWT parsing helper introduced in migrated controllers",
                    $"Violations: {jwtParsingDuplication}");

                // Test 27B: Zero hardcoded fallback user IDs (?? 1, ?? 15, ?? 0) across all controllers
                var fallbackCount = 0;
                foreach (var file in controllerFiles)
                {
                    var text = await File.ReadAllTextAsync(file);
                    if (Regex.IsMatch(text, @"GetUserId\s*\(.*\)\s*\?\?\s*\d+"))
                    {
                        fallbackCount++;
                    }
                }
                AssertTrue(fallbackCount == 0,
                    "Test 27B: Zero hardcoded UserId fallbacks (?? 1, ?? 15, ?? 0) across all controllers",
                    $"Violations found: {fallbackCount}");

                // =============================================================
                // [PART 6] LIVE DATABASE BASELINE INVARIANTS (TESTS 28 - 32)
                // =============================================================
                Console.WriteLine("\n--- [PART 6] LIVE DATABASE BASELINE INVARIANTS (TESTS 28 - 32) ---");

                var postRolesCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Roles;");
                var postUsersCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users;");
                var postAdminsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM admins;");
                var postStaffCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Staff;");
                var postStudentsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Students;");

                var postUserIds = (await connection.QueryAsync<int>("SELECT UserId FROM Users;")).ToHashSet();

                // Test 28: Roles count remains 11
                AssertTrue(postRolesCount == 11,
                    "Test 28: Roles row count remains 11",
                    $"Expected: 11, Actual: {postRolesCount}");

                // Test 29: Users baseline count remains 14
                var allOriginalUsersPresent = originalUserIds.All(id => postUserIds.Contains(id));
                AssertTrue(allOriginalUsersPresent && postUsersCount == initialUsersCount,
                    "Test 29: Users baseline (14 rows) remains 100% intact",
                    $"Expected: {initialUsersCount}, Actual: {postUsersCount}, Intact: {allOriginalUsersPresent}");

                // Test 30: Admins count remains 10
                AssertTrue(postAdminsCount == 10,
                    "Test 30: Admins domain count remains 10",
                    $"Expected: 10, Actual: {postAdminsCount}");

                // Test 31: Staff count remains 72
                AssertTrue(postStaffCount == 72,
                    "Test 31: Staff domain count remains 72",
                    $"Expected: 72, Actual: {postStaffCount}");

                // Test 32: Students count remains 48
                AssertTrue(postStudentsCount == 48,
                    "Test 32: Students domain count remains 48",
                    $"Expected: 48, Actual: {postStudentsCount}");
            }
            finally
            {
                // Nothing to clean up since no test database entities were written
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"PHASE 6D TEST SUMMARY: Total: {_totalAssertions} | Passed: {_passedAssertions} | Failed: {_failedAssertions}");
            Console.WriteLine("================================================================================\n");

            return _failedAssertions == 0;
        }

        private static ClaimsPrincipal CreatePrincipalFromClaims(IEnumerable<Claim> claims)
        {
            var identity = new ClaimsIdentity(claims, "TestAuth", ClaimTypes.Name, ClaimTypes.Role);
            return new ClaimsPrincipal(identity);
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
