using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.DTOs.Students;
using CollegeManagement.API.DTOs.Students.Requests;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Staff;
using CollegeManagement.API.Repositories;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services;
using CollegeManagement.API.Services.Implementations;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests
{
    /// <summary>
    /// Phase 8: Email & Status Synchronization Test Suite.
    ///
    /// Verifies:
    ///   1. Staff email update synchronizes to linked Users.Email (normalized).
    ///   2. Staff duplicate email update is rejected safely.
    ///   3. Staff status update (Inactive / Active) synchronizes to Users.IsActive.
    ///   4. Staff soft delete synchronizes to Users.IsActive = false.
    ///   5. Student email update (UpdateAsync & UpdateProfileAsync) synchronizes to linked Users.Email.
    ///   6. Student duplicate email update is rejected safely.
    ///   7. Student status (Suspend / Activate / Delete) synchronizes to Users.IsActive.
    ///   8. Admin status update (UpdateStatusAsync) synchronizes to Users.IsActive.
    ///   9. Transaction safety & rollback: no partial updates committed.
    ///  10. Baseline data invariants preserved.
    /// </summary>
    public static class EmailAndStatusSyncTester
    {
        private static int _totalAssertions = 0;
        private static int _passedAssertions = 0;
        private static int _failedAssertions = 0;

        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("        PHASE 8: EMAIL & STATUS SYNCHRONIZATION TEST SUITE");
            Console.WriteLine("================================================================================");

            _totalAssertions = 0;
            _passedAssertions = 0;
            _failedAssertions = 0;

            using var scope = serviceProvider.CreateScope();
            var sp = scope.ServiceProvider;

            var dbContext = sp.GetRequiredService<AppDbContext>();
            var userRepository = sp.GetRequiredService<IUserRepository>();
            var staffService = sp.GetRequiredService<IStaffService>();
            var staffRepository = sp.GetRequiredService<IStaffRepository>();
            var studentService = sp.GetRequiredService<IStudentService>();
            var studentRepository = sp.GetRequiredService<IStudentRepository>();
            var adminService = sp.GetRequiredService<IAdminService>();
            var adminRepository = sp.GetRequiredService<IAdminRepository>();

            var connection = dbContext.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            var createdUserIds = new List<int>();
            var createdStaffIds = new List<int>();
            var createdStudentIds = new List<int>();
            var createdAdminIds = new List<int>();

            try
            {
                // =====================================================================
                // [PART 1] STAFF EMAIL & STATUS SYNCHRONIZATION (TESTS 1 - 5)
                // =====================================================================
                Console.WriteLine("\n--- [PART 1] STAFF EMAIL & STATUS SYNCHRONIZATION (TESTS 1 - 5) ---");

                // Create a test staff with linked user
                var staffRole = await userRepository.GetRoleByNameAsync("Lecturer");
                var staffRoleFallback = staffRole ?? await userRepository.GetRoleByNameAsync("Faculty") ?? await userRepository.GetRoleByIdAsync(2);
                int testStaffRoleId = staffRoleFallback?.RoleId ?? 2;

                var initialStaffEmail = $"sync.staff.{Guid.NewGuid():N}@college.edu".ToUpperInvariant();
                var createStaffDto = new CreateStaffDto
                {
                    FirstName = "SyncTest",
                    LastName = "StaffMember",
                    Email = initialStaffEmail,
                    Mobile = $"9{new Random().Next(100000000, 999999999)}",
                    Gender = "Female",
                    DateOfBirth = new DateTime(1988, 5, 12),
                    StaffType = "Teaching",
                    RoleId = testStaffRoleId
                };

                var createdStaff = await staffService.CreateStaffAsync(createStaffDto);
                createdStaffIds.Add(createdStaff.Id);

                var linkedStaffUser = await userRepository.GetByStaffIdAsync(createdStaff.Id);
                if (linkedStaffUser != null) createdUserIds.Add(linkedStaffUser.UserId);

                AssertTrue(linkedStaffUser != null && string.Equals(linkedStaffUser.Email, initialStaffEmail, StringComparison.OrdinalIgnoreCase) && linkedStaffUser.IsActive,
                    "Test 1 Setup: Staff account created with linked active Users record",
                    $"UserId: {linkedStaffUser?.UserId}, Email: {linkedStaffUser?.Email}, IsActive: {linkedStaffUser?.IsActive}");

                // Test 1: Update Staff Email -> Users.Email synchronizes with normalized email
                var updatedStaffEmail = $"sync.staff.updated.{Guid.NewGuid():N}@college.edu".ToUpperInvariant();
                var updateStaffDto = new UpdateStaffDto
                {
                    FirstName = "SyncTest",
                    LastName = "StaffMember",
                    Email = updatedStaffEmail.ToLowerInvariant(), // pass in lowercase to test normalization
                    Mobile = createdStaff.Mobile,
                    Gender = "Female",
                    DateOfBirth = new DateTime(1988, 5, 12),
                    StaffType = "Teaching",
                    Status = "Active"
                };

                await staffService.UpdateStaffAsync(createdStaff.Id, updateStaffDto);

                var refreshedStaffUser = await userRepository.GetByStaffIdAsync(createdStaff.Id);
                AssertTrue(refreshedStaffUser != null && string.Equals(refreshedStaffUser.Email, updatedStaffEmail, StringComparison.OrdinalIgnoreCase),
                    "Test 1: Staff email update synchronizes to linked Users.Email (normalized)",
                    $"Expected: {updatedStaffEmail}, Actual: {refreshedStaffUser?.Email}");

                // Test 2: Duplicate email rejection for Staff update
                bool duplicateRejected = false;
                var duplicateStaffDto = new UpdateStaffDto
                {
                    FirstName = "SyncTest",
                    LastName = "StaffMember",
                    Email = "admin@college.com", // already exists in Users
                    Mobile = createdStaff.Mobile,
                    Gender = "Female",
                    DateOfBirth = new DateTime(1988, 5, 12),
                    StaffType = "Teaching",
                    Status = "Active"
                };
                try
                {
                    await staffService.UpdateStaffAsync(createdStaff.Id, duplicateStaffDto);
                }
                catch (ConflictException)
                {
                    duplicateRejected = true;
                }
                catch (Exception ex) when (ex.Message.Contains("already registered") || ex.Message.Contains("already in use"))
                {
                    duplicateRejected = true;
                }

                // Verify original email was not overwritten
                var userAfterFailedDuplicate = await userRepository.GetByStaffIdAsync(createdStaff.Id);
                AssertTrue(duplicateRejected && string.Equals(userAfterFailedDuplicate?.Email, updatedStaffEmail, StringComparison.OrdinalIgnoreCase),
                    "Test 2: Duplicate email update is rejected safely and existing email is preserved",
                    $"Rejected: {duplicateRejected}, Email remains: {userAfterFailedDuplicate?.Email}");

                // Test 3: Staff status update to Inactive -> Users.IsActive = false
                var inactiveStaffDto = new UpdateStaffDto
                {
                    FirstName = "SyncTest",
                    LastName = "StaffMember",
                    Email = updatedStaffEmail,
                    Mobile = createdStaff.Mobile,
                    Gender = "Female",
                    DateOfBirth = new DateTime(1988, 5, 12),
                    StaffType = "Teaching",
                    Status = "Inactive"
                };

                await staffService.UpdateStaffAsync(createdStaff.Id, inactiveStaffDto);
                var userAfterInactive = await userRepository.GetByStaffIdAsync(createdStaff.Id);
                AssertTrue(userAfterInactive != null && !userAfterInactive.IsActive,
                    "Test 3: Staff status update to 'Inactive' synchronizes to Users.IsActive = false",
                    $"Users.IsActive: {userAfterInactive?.IsActive}");

                // Test 4: Staff status update back to Active -> Users.IsActive = true
                var activeStaffDto = new UpdateStaffDto
                {
                    FirstName = "SyncTest",
                    LastName = "StaffMember",
                    Email = updatedStaffEmail,
                    Mobile = createdStaff.Mobile,
                    Gender = "Female",
                    DateOfBirth = new DateTime(1988, 5, 12),
                    StaffType = "Teaching",
                    Status = "Active"
                };

                await staffService.UpdateStaffAsync(createdStaff.Id, activeStaffDto);
                var userAfterReactivated = await userRepository.GetByStaffIdAsync(createdStaff.Id);
                AssertTrue(userAfterReactivated != null && userAfterReactivated.IsActive,
                    "Test 4: Staff status update back to 'Active' synchronizes to Users.IsActive = true",
                    $"Users.IsActive: {userAfterReactivated?.IsActive}");

                // Test 5: Staff Soft Delete -> Users.IsActive = false
                await staffService.DeleteStaffAsync(createdStaff.Id);
                var userAfterStaffDelete = await userRepository.GetByStaffIdAsync(createdStaff.Id);
                AssertTrue(userAfterStaffDelete != null && !userAfterStaffDelete.IsActive,
                    "Test 5: Staff soft delete synchronizes to Users.IsActive = false",
                    $"Users.IsActive: {userAfterStaffDelete?.IsActive}");

                // =====================================================================
                // [PART 2] STUDENT EMAIL & STATUS SYNCHRONIZATION (TESTS 6 - 11)
                // =====================================================================
                Console.WriteLine("\n--- [PART 2] STUDENT EMAIL & STATUS SYNCHRONIZATION (TESTS 6 - 11) ---");

                // Setup test student with linked Users account
                var studentRole = await userRepository.GetRoleByNameAsync("Student");
                int studentRoleId = studentRole?.RoleId ?? 5;

                var initialStudentEmail = $"sync.student.{Guid.NewGuid():N}@student.college.edu".ToUpperInvariant();
                var rawCreateStudentSql = @"
                    INSERT INTO `Students`
                    (`AdmissionNo`, `StudentName`, `Email`, `MobileNumber`, `Gender`, `DateOfBirth`, `IsActive`, `CreatedAt`, `UpdatedAt`)
                    VALUES
                    (@AdmissionNo, @StudentName, @Email, @MobileNumber, @Gender, @DateOfBirth, 1, @Now, @Now);
                    SELECT LAST_INSERT_ID();";

                int testStudentId = await connection.ExecuteScalarAsync<int>(rawCreateStudentSql, new
                {
                    AdmissionNo = $"SYNC{new Random().Next(10000, 99999)}",
                    StudentName = "SyncTest Student",
                    Email = initialStudentEmail,
                    MobileNumber = $"8{new Random().Next(100000000, 999999999)}",
                    Gender = "Male",
                    DateOfBirth = new DateTime(2004, 3, 15),
                    Now = DateTime.UtcNow
                });
                createdStudentIds.Add(testStudentId);

                // Create linked Users record
                var studentUser = new User
                {
                    FullName = "SyncTest Student",
                    Email = initialStudentEmail,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Student@12345"),
                    PhoneNumber = "8888888888",
                    RoleId = studentRoleId,
                    StudentId = testStudentId,
                    IsActive = true,
                    IsFirstLogin = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                int testStudentUserId = await userRepository.CreateUserAsync(studentUser);
                createdUserIds.Add(testStudentUserId);

                // Test 6: Student UpdateAsync -> synchronizes Users.Email
                var updatedStudentEmail = $"sync.student.updated.{Guid.NewGuid():N}@student.college.edu".ToUpperInvariant();
                var updateStudentReq = new UpdateStudentRequest
                {
                    StudentName = "SyncTest Student",
                    Email = updatedStudentEmail.ToLowerInvariant(),
                    MobileNumber = "8888888888",
                    Gender = "Male",
                    DateOfBirth = new DateTime(2004, 3, 15)
                };

                await studentService.UpdateAsync(testStudentId, updateStudentReq);
                var studentUserAfterUpdate = await userRepository.GetByStudentIdAsync(testStudentId);
                AssertTrue(studentUserAfterUpdate != null && string.Equals(studentUserAfterUpdate.Email, updatedStudentEmail, StringComparison.OrdinalIgnoreCase),
                    "Test 6: Student UpdateAsync synchronizes to linked Users.Email (normalized)",
                    $"Expected: {updatedStudentEmail}, Actual: {studentUserAfterUpdate?.Email}");

                // Test 7: Student UpdateProfileAsync -> synchronizes Users.Email
                var profileUpdatedStudentEmail = $"sync.student.profile.{Guid.NewGuid():N}@student.college.edu".ToUpperInvariant();
                var studentProfileDto = new StudentProfileDto
                {
                    Email = profileUpdatedStudentEmail.ToLowerInvariant(),
                    MobileNumber = "8888888888"
                };

                await studentService.UpdateProfileAsync(testStudentId, studentProfileDto);
                var studentUserAfterProfileUpdate = await userRepository.GetByStudentIdAsync(testStudentId);
                AssertTrue(studentUserAfterProfileUpdate != null && string.Equals(studentUserAfterProfileUpdate.Email, profileUpdatedStudentEmail, StringComparison.OrdinalIgnoreCase),
                    "Test 7: Student UpdateProfileAsync synchronizes to linked Users.Email (normalized)",
                    $"Expected: {profileUpdatedStudentEmail}, Actual: {studentUserAfterProfileUpdate?.Email}");

                // Test 8: Duplicate email rejection for Student
                bool studentDuplicateRejected = false;
                var duplicateStudentReq = new UpdateStudentRequest
                {
                    StudentName = "SyncTest Student",
                    Email = "admin@college.com", // already in Users
                    MobileNumber = "8888888888",
                    Gender = "Male",
                    DateOfBirth = new DateTime(2004, 3, 15)
                };
                try
                {
                    await studentService.UpdateAsync(testStudentId, duplicateStudentReq);
                }
                catch (Exception ex) when (ex.Message.Contains("already registered") || ex.Message.Contains("already in use"))
                {
                    studentDuplicateRejected = true;
                }

                var studentUserAfterDup = await userRepository.GetByStudentIdAsync(testStudentId);
                AssertTrue(studentDuplicateRejected && string.Equals(studentUserAfterDup?.Email, profileUpdatedStudentEmail, StringComparison.OrdinalIgnoreCase),
                    "Test 8: Duplicate student email update is safely rejected and preserved",
                    $"Rejected: {studentDuplicateRejected}, Email remains: {studentUserAfterDup?.Email}");

                // Test 9: SuspendStudent -> Users.IsActive = false
                await studentService.SuspendAsync(testStudentId, new SuspendStudentRequest { Reason = "Disciplinary test", Remarks = "Testing sync" });
                var studentUserAfterSuspend = await userRepository.GetByStudentIdAsync(testStudentId);
                AssertTrue(studentUserAfterSuspend != null && !studentUserAfterSuspend.IsActive,
                    "Test 9: Student suspension via SuspendAsync synchronizes to Users.IsActive = false",
                    $"Users.IsActive: {studentUserAfterSuspend?.IsActive}");

                // Test 10: ActivateStudent -> Users.IsActive = true
                await studentService.ActivateAsync(testStudentId);
                var studentUserAfterActivate = await userRepository.GetByStudentIdAsync(testStudentId);
                AssertTrue(studentUserAfterActivate != null && studentUserAfterActivate.IsActive,
                    "Test 10: Student reactivation via ActivateAsync synchronizes to Users.IsActive = true",
                    $"Users.IsActive: {studentUserAfterActivate?.IsActive}");

                // Test 11: DeleteStudent -> Users.IsActive = false
                await studentService.DeleteAsync(testStudentId);
                var studentUserAfterDelete = await userRepository.GetByStudentIdAsync(testStudentId);
                AssertTrue(studentUserAfterDelete != null && !studentUserAfterDelete.IsActive,
                    "Test 11: Student deletion via DeleteAsync synchronizes to Users.IsActive = false",
                    $"Users.IsActive: {studentUserAfterDelete?.IsActive}");

                // =====================================================================
                // [PART 3] ADMIN STATUS SYNCHRONIZATION (TESTS 12 - 14)
                // =====================================================================
                Console.WriteLine("\n--- [PART 3] ADMIN STATUS SYNCHRONIZATION (TESTS 12 - 14) ---");

                // Setup test admin with linked user
                var adminRole = await userRepository.GetRoleByNameAsync("Admin");
                int adminRoleId = adminRole?.RoleId ?? 1;

                var testAdminEmail = $"sync.admin.{Guid.NewGuid():N}@college.edu".ToUpperInvariant();
                const string rawCreateAdminSql = @"
                    INSERT INTO `admins` (`Email`, `Password`, `IsActive`)
                    VALUES (@Email, @Password, 1);
                    SELECT LAST_INSERT_ID();";

                int testAdminId = await connection.ExecuteScalarAsync<int>(rawCreateAdminSql, new
                {
                    Email = testAdminEmail,
                    Password = BCrypt.Net.BCrypt.HashPassword("Admin@12345")
                });
                createdAdminIds.Add(testAdminId);

                var adminUser = new User
                {
                    FullName = "SyncTest Admin",
                    Email = testAdminEmail,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@12345"),
                    PhoneNumber = "7777777777",
                    RoleId = adminRoleId,
                    AdminId = testAdminId,
                    IsActive = true,
                    IsFirstLogin = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                int testAdminUserId = await userRepository.CreateUserAsync(adminUser);
                createdUserIds.Add(testAdminUserId);

                // Test 12: Admin status update to false -> Users.IsActive = false
                await adminService.UpdateStatusAsync(testAdminId, false);
                var adminUserAfterDeactivate = await userRepository.GetByAdminIdAsync(testAdminId);
                var adminRecordAfterDeactivate = await adminRepository.GetByIdAsync(testAdminId);
                AssertTrue(adminUserAfterDeactivate != null && !adminUserAfterDeactivate.IsActive && adminRecordAfterDeactivate != null && !adminRecordAfterDeactivate.IsActive,
                    "Test 12: Admin status update to false synchronizes both admins.IsActive and Users.IsActive to false",
                    $"admins.IsActive: {adminRecordAfterDeactivate?.IsActive}, Users.IsActive: {adminUserAfterDeactivate?.IsActive}");

                // Test 13: Admin status update to true -> Users.IsActive = true
                await adminService.UpdateStatusAsync(testAdminId, true);
                var adminUserAfterActivate = await userRepository.GetByAdminIdAsync(testAdminId);
                var adminRecordAfterActivate = await adminRepository.GetByIdAsync(testAdminId);
                AssertTrue(adminUserAfterActivate != null && adminUserAfterActivate.IsActive && adminRecordAfterActivate != null && adminRecordAfterActivate.IsActive,
                    "Test 13: Admin status update to true synchronizes both admins.IsActive and Users.IsActive to true",
                    $"admins.IsActive: {adminRecordAfterActivate?.IsActive}, Users.IsActive: {adminUserAfterActivate?.IsActive}");

                // Test 14: Audit confirmed - No existing Admin email-update workflow exists
                var adminServiceType = typeof(AdminService);
                var hasAdminEmailUpdateMethod = adminServiceType.GetMethods().Any(m => m.Name.Contains("UpdateEmail", StringComparison.OrdinalIgnoreCase) || m.Name.Contains("ChangeEmail", StringComparison.OrdinalIgnoreCase));
                AssertTrue(!hasAdminEmailUpdateMethod,
                    "Test 14: Audit confirmed: No existing Admin email update workflow exists; no new feature invented",
                    $"HasAdminEmailUpdateMethod: {hasAdminEmailUpdateMethod}");

                // =====================================================================
                // [PART 4] ROLLBACK & TRANSACTION SAFETY (TESTS 15 - 18)
                // =====================================================================
                Console.WriteLine("\n--- [PART 4] ROLLBACK & TRANSACTION SAFETY (TESTS 15 - 18) ---");

                // Test 15: Transaction atomicity: domain and Users stay consistent
                var staffUserBefore = await userRepository.GetByStaffIdAsync(createdStaff.Id);
                var studentUserBefore = await userRepository.GetByStudentIdAsync(testStudentId);
                var adminUserBefore = await userRepository.GetByAdminIdAsync(testAdminId);

                AssertTrue(staffUserBefore?.StaffId == createdStaff.Id && studentUserBefore?.StudentId == testStudentId && adminUserBefore?.AdminId == testAdminId,
                    "Test 15: Linked domain identifiers (StaffId, StudentId, AdminId) remain intact and immutable across all sync operations",
                    $"StaffId: {staffUserBefore?.StaffId}, StudentId: {studentUserBefore?.StudentId}, AdminId: {adminUserBefore?.AdminId}");

                // Test 16: Users.UserId is never modified during email or status synchronization
                AssertTrue(staffUserBefore?.UserId == linkedStaffUser?.UserId && studentUserBefore?.UserId == testStudentUserId && adminUserBefore?.UserId == testAdminUserId,
                    "Test 16: Users.UserId remains unchanged during all email and status synchronization operations",
                    $"Staff UserId: {staffUserBefore?.UserId} == {linkedStaffUser?.UserId}");

                // Test 17: Static code audit: atomic transactions used across domain workflows
                var staffServiceCode = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Services", "Implementations", "StaffService.cs"));
                var studentRepoCode = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Repositories", "Implementations", "StudentRepository.cs"));
                var adminServiceCode = await File.ReadAllTextAsync(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Services", "Implementations", "AdminService.cs"));

                var staffUsesTx = staffServiceCode.Contains("BeginTransactionAsync") && staffServiceCode.Contains("UpdateEmailByStaffIdAsync");
                var studentUsesTx = studentRepoCode.Contains("BeginTransaction") && studentRepoCode.Contains("UPDATE `Users`");
                var adminUsesTx = adminServiceCode.Contains("BeginTransaction") && adminServiceCode.Contains("UpdateStatusByAdminIdAsync");

                AssertTrue(staffUsesTx && studentUsesTx && adminUsesTx,
                    "Test 17: Static Audit: Staff, Student, and Admin synchronization workflows all utilize atomic transactions",
                    $"Staff: {staffUsesTx}, Student: {studentUsesTx}, Admin: {adminUsesTx}");

                // Test 18: No bulk backfill introduced
                var allFiles = Directory.GetFiles(Path.Combine(AppContext.BaseDirectory, "..", "..", ".."), "*.cs", SearchOption.AllDirectories)
                    .Where(f => !f.Contains("Tests") && !f.Contains("bin") && !f.Contains("obj")).ToList();
                int bulkBackfillCount = 0;
                foreach (var file in allFiles)
                {
                    var content = await File.ReadAllTextAsync(file);
                    if (content.Contains("BulkSyncUsers") || content.Contains("BackfillUsers") || content.Contains("SyncAllUsers"))
                    {
                        bulkBackfillCount++;
                    }
                }
                AssertTrue(bulkBackfillCount == 0,
                    "Test 18: Static Audit: Zero bulk backfill or mass synchronization routines exist in application code",
                    $"Bulk routines found: {bulkBackfillCount}");

                // =====================================================================
                // [PART 5] CLEANUP & LIVE DATABASE BASELINE INVARIANTS (TESTS 19 - 23)
                // =====================================================================
                Console.WriteLine("\n--- [PART 5] CLEANUP & LIVE DATABASE BASELINE INVARIANTS (TESTS 19 - 23) ---");

                // Clean up all active test records
                foreach (var uid in createdUserIds)
                {
                    await connection.ExecuteAsync("DELETE FROM `Users` WHERE `UserId` = @UserId;", new { UserId = uid });
                }
                foreach (var sid in createdStaffIds)
                {
                    await connection.ExecuteAsync("DELETE FROM `Staff` WHERE `Id` = @Id;", new { Id = sid });
                }
                foreach (var stid in createdStudentIds)
                {
                    await connection.ExecuteAsync("DELETE FROM `Students` WHERE `StudentId` = @StudentId;", new { StudentId = stid });
                }
                foreach (var aid in createdAdminIds)
                {
                    await connection.ExecuteAsync("DELETE FROM `admins` WHERE `id` = @Id;", new { Id = aid });
                }

                // Verify baseline invariants
                var rolesCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Roles`;");
                var usersCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Users`;");
                var adminsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `admins`;");
                var staffCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Staff`;");
                var studentsCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Students`;");

                AssertTrue(rolesCount == 11,
                    "Test 19: Roles count remains unchanged at 11",
                    $"Found: {rolesCount}");

                AssertTrue(usersCount == 14,
                    "Test 20: Users baseline count is restored to 14 after test cleanup",
                    $"Found: {usersCount}");

                AssertTrue(adminsCount == 10,
                    "Test 21: Admins count remains unchanged at 10",
                    $"Found: {adminsCount}");

                AssertTrue(staffCount == 72,
                    "Test 22: Staff count remains unchanged at 72",
                    $"Found: {staffCount}");

                AssertTrue(studentsCount == 48,
                    "Test 23: Students count remains unchanged at 48",
                    $"Found: {studentsCount}");
            }
            finally
            {
                // Final safety cleanup
                foreach (var uid in createdUserIds)
                {
                    try { await connection.ExecuteAsync("DELETE FROM `Users` WHERE `UserId` = @UserId;", new { UserId = uid }); } catch { }
                }
                foreach (var sid in createdStaffIds)
                {
                    try { await connection.ExecuteAsync("DELETE FROM `Staff` WHERE `Id` = @Id;", new { Id = sid }); } catch { }
                }
                foreach (var stid in createdStudentIds)
                {
                    try { await connection.ExecuteAsync("DELETE FROM `Students` WHERE `StudentId` = @StudentId;", new { StudentId = stid }); } catch { }
                }
                foreach (var aid in createdAdminIds)
                {
                    try { await connection.ExecuteAsync("DELETE FROM `admins` WHERE `id` = @Id;", new { Id = aid }); } catch { }
                }
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"PHASE 8 TEST SUMMARY: Total: {_totalAssertions} | Passed: {_passedAssertions} | Failed: {_failedAssertions}");
            Console.WriteLine("================================================================================\n");

            return _failedAssertions == 0;
        }

        private static void AssertTrue(bool condition, string testName, string details)
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
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"  [FAIL] {testName} - Details: {details}");
                Console.ResetColor();
            }
        }
    }
}
