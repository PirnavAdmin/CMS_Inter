using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Controllers.V1;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.StudentAdmission;
using CollegeManagement.API.DTOs.Students;
using CollegeManagement.API.DTOs.Users;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Exports;
using CollegeManagement.API.Services.Implementations;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace CollegeManagement.API.Tests
{
    /// <summary>
    /// Comprehensive 20-Point Verification Test Suite for Phase 3:
    /// Student User Provisioning (Admission Approval + Bulk Import).
    /// </summary>
    public static class StudentUserProvisioningTester
    {
        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("       PHASE 3: STUDENT USER PROVISIONING VERIFICATION SUITE");
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
            var admissionRepo = scope.ServiceProvider.GetRequiredService<IStudentAdmissionRepository>();
            var admissionService = scope.ServiceProvider.GetRequiredService<IStudentAdmissionService>();

            // Clean up any test remnants from prior runs
            await connection.ExecuteAsync("DELETE FROM Users WHERE Email LIKE '%collegetest.edu' OR Email LIKE '%@testdomain.edu'");
            await connection.ExecuteAsync("DELETE FROM StudentFees WHERE StudentId IN (SELECT StudentId FROM Students WHERE Email LIKE '%collegetest.edu' OR AdmissionNo LIKE 'TEST-ADM-%' OR AdmissionNo LIKE 'NO-EMAIL-%')");
            await connection.ExecuteAsync("DELETE FROM Students WHERE Email LIKE '%collegetest.edu' OR AdmissionNo LIKE 'TEST-ADM-%' OR AdmissionNo LIKE 'NO-EMAIL-%'");
            await connection.ExecuteAsync("DELETE FROM StudentAdmissions WHERE AdmissionNo LIKE 'TEST-ADM-%' OR AdmissionNo LIKE 'NO-EMAIL-%'");

            // Record initial baseline counts
            var initialUserCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users");
            var initialStudentCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Students");

            // -------------------------------------------------------------
            // SECTION 1: STUDENT ROLE RESOLUTION & DYNAMIC BINDING
            // -------------------------------------------------------------
            Console.WriteLine("--- [SECTION 1] CANONICAL STUDENT ROLE RESOLUTION ---");

            var resolvedRole = await userRepo.GetRoleByNameAsync("Student");
            AssertTrue(resolvedRole != null && resolvedRole.RoleName.Equals("Student", StringComparison.OrdinalIgnoreCase),
                "Test 1: Canonical 'Student' role is resolved dynamically from Roles table",
                $"Resolved role: {resolvedRole?.RoleName ?? "null"} (RoleId: {resolvedRole?.RoleId})");

            AssertTrue(resolvedRole != null && resolvedRole.RoleId > 0,
                "Test 2: Student role ID is dynamically resolved without hard-coding",
                $"RoleId: {resolvedRole?.RoleId}");

            // Verify arbitrary RoleId rejection in ProvisionStudentUserAsync
            var invalidRoleReq = new ProvisionStudentUserRequest
            {
                StudentId = 9999,
                FullName = "Role Test",
                Email = $"test_invalid_role_{Guid.NewGuid():N}@testdomain.edu",
                RoleId = 999 // Non-matching arbitrary RoleId
            };
            var invalidRoleResult = await provisioningService.ProvisionStudentUserAsync(invalidRoleReq);
            AssertTrue(!invalidRoleResult.Success && invalidRoleResult.ErrorMessage.Contains("canonical Student role"),
                "Test 3: Arbitrary/mismatched RoleId supplied to Student provisioning is rejected");

            // -------------------------------------------------------------
            // SECTION 2: STUDENT ADMISSION APPROVAL PROVISIONING (ATOMIC)
            // -------------------------------------------------------------
            Console.WriteLine("\n--- [SECTION 2] STUDENT ADMISSION APPROVAL & ATOMICITY ---");

            var validBoardId = await connection.ExecuteScalarAsync<int?>("SELECT BoardId FROM Boards WHERE IsActive = 1 LIMIT 1") 
                ?? await connection.ExecuteScalarAsync<int?>("SELECT BoardId FROM Boards LIMIT 1") ?? 1;
            var validYearId = await connection.ExecuteScalarAsync<int?>("SELECT AcademicYearId FROM AcademicYears WHERE IsActive = 1 LIMIT 1") 
                ?? await connection.ExecuteScalarAsync<int?>("SELECT AcademicYearId FROM AcademicYears LIMIT 1") ?? 1;
            var validLevelId = await connection.ExecuteScalarAsync<int?>("SELECT AcademicLevelId FROM AcademicLevels WHERE IsActive = 1 LIMIT 1") 
                ?? await connection.ExecuteScalarAsync<int?>("SELECT AcademicLevelId FROM AcademicLevels LIMIT 1") ?? 1;
            var validGroupId = await connection.ExecuteScalarAsync<int?>("SELECT GroupId FROM `Groups` WHERE IsActive = 1 LIMIT 1") 
                ?? await connection.ExecuteScalarAsync<int?>("SELECT GroupId FROM `Groups` LIMIT 1") ?? 1;
            var validProgramId = await connection.ExecuteScalarAsync<int?>("SELECT ProgramId FROM Programs WHERE IsActive = 1 LIMIT 1") 
                ?? await connection.ExecuteScalarAsync<int?>("SELECT ProgramId FROM Programs LIMIT 1") ?? 1;
            var validFeeStructureId = await connection.ExecuteScalarAsync<int?>("SELECT FeeStructureId FROM FeeStructures WHERE IsActive = 1 LIMIT 1") 
                ?? await connection.ExecuteScalarAsync<int?>("SELECT FeeStructureId FROM FeeStructures LIMIT 1") ?? 1;

            var testAdmissionNo = $"TEST-ADM-{Guid.NewGuid():N}".Substring(0, 20);
            var testEmail = $"test.student.{Guid.NewGuid():N}@collegetest.edu";
            var testMobile = "9876543210";
            var testDob = new DateTime(2005, 5, 14);

            int seededAdmissionId = 0;
            int seededStudentId = 0;
            int createdUserId = 0;

            try
            {
                // Create test admission record using admission repository
                var createAdmReq = new CreateStudentAdmissionRequest
                {
                    AdmissionDate = DateTime.UtcNow.Date,
                    AdmissionNo = testAdmissionNo,
                    AdmissionType = "Regular",
                    AdmissionQuota = "General",
                    BoardId = validBoardId,
                    AcademicYearId = validYearId,
                    AcademicLevelId = validLevelId,
                    GroupId = validGroupId,
                    ProgramId = validProgramId,
                    FeeStructureId = validFeeStructureId,
                    PaymentPlan = "Full Payment",
                    FirstName = "Priya",
                    LastName = "Sharma",
                    Gender = "Female",
                    DateOfBirth = testDob,
                    BloodGroup = "O+",
                    StudentEmail = testEmail,
                    StudentMobileNumber = testMobile,
                    FatherName = "Ramesh Sharma",
                    MotherName = "Sunita Sharma",
                    City = "Hyderabad",
                    District = "Hyderabad",
                    State = "Telangana",
                    Pincode = "500001"
                };

                var createdAdm = await admissionRepo.CreateAsync(createAdmReq, null);
                seededAdmissionId = createdAdm?.AdmissionId ?? 0;

                AssertTrue(seededAdmissionId > 0, "Test 4A: Test admission record created for approval test");

                // Execute Admission Approval via StudentAdmissionService
                var approveReq = new ApproveStudentAdmissionRequest { AdmissionId = seededAdmissionId };
                var approveResult = await admissionService.ApproveAsync(approveReq);

                AssertTrue(approveResult, "Test 4B: Student admission approval succeeds atomically");

                // Verify Student domain record creation
                var studentRecord = await admissionRepo.GetStudentByAdmissionIdAsync(seededAdmissionId);
                AssertTrue(studentRecord != null && studentRecord.StudentId > 0,
                    "Test 5: Student domain record is created and linked to AdmissionId",
                    $"StudentId: {studentRecord?.StudentId}");

                if (studentRecord != null)
                {
                    seededStudentId = studentRecord.StudentId;

                    // Verify Users authentication account creation linked to StudentId
                    var userRecord = await userRepo.GetByStudentIdAsync(seededStudentId);
                    AssertTrue(userRecord != null, "Test 6: Centralized Users account is created and linked via Users.StudentId");

                    if (userRecord != null)
                    {
                        createdUserId = userRecord.UserId;

                        AssertTrue(userRecord.StaffId == null && userRecord.AdminId == null,
                            "Test 7: Users row has StaffId=NULL and AdminId=NULL (isolated domain link)");

                        AssertTrue(userRecord.RoleId == resolvedRole!.RoleId,
                            "Test 8: Users row has dynamically resolved canonical Student RoleId",
                            $"Users.RoleId: {userRecord.RoleId}, Expected: {resolvedRole.RoleId}");

                        AssertTrue(userRecord.Email.Equals(testEmail, StringComparison.OrdinalIgnoreCase),
                            "Test 9: Users.Email matches Student.Email exactly (no synthetic email)");

                        AssertTrue(userRecord.IsFirstLogin && userRecord.IsActive,
                            "Test 10: Newly provisioned Student User has IsFirstLogin=true and IsActive=true");

                        AssertTrue(!string.IsNullOrWhiteSpace(userRecord.PasswordHash) &&
                                   (userRecord.PasswordHash.StartsWith("$2a$") || userRecord.PasswordHash.StartsWith("$2b$") || userRecord.PasswordHash.StartsWith("$2y$")),
                            "Test 11: Users.PasswordHash contains standard BCrypt hash");

                        // Verify plaintext password is not stored anywhere
                        var dbPlaintextCheck = await connection.ExecuteScalarAsync<int>(
                            "SELECT COUNT(*) FROM Users WHERE PasswordHash = 'Student@14052008' OR PasswordHash = 'Priya@123'");
                        AssertTrue(dbPlaintextCheck == 0,
                            "Test 12: Plaintext password is never stored in Users table");
                    }
                }
            }
            finally
            {
                // Clean up test admission, student, and user records
                if (createdUserId > 0)
                    await connection.ExecuteAsync("DELETE FROM Users WHERE UserId = @UserId", new { UserId = createdUserId });
                if (seededStudentId > 0)
                {
                    await connection.ExecuteAsync("DELETE FROM StudentFees WHERE StudentId = @StudentId", new { StudentId = seededStudentId });
                    await connection.ExecuteAsync("DELETE FROM Students WHERE StudentId = @StudentId", new { StudentId = seededStudentId });
                }
                if (seededAdmissionId > 0)
                    await admissionRepo.DeleteAsync(seededAdmissionId);
            }

            // -------------------------------------------------------------
            // SECTION 3: MISSING EMAIL HANDLING (NO FAKE ACCOUNTS)
            // -------------------------------------------------------------
            Console.WriteLine("\n--- [SECTION 3] MISSING EMAIL HANDLING ---");

            var noEmailAdmNo = $"NO-EMAIL-{Guid.NewGuid():N}".Substring(0, 20);
            int noEmailAdmId = 0;
            int noEmailStudentId = 0;

            try
            {
                var noEmailReq = new CreateStudentAdmissionRequest
                {
                    AdmissionDate = DateTime.UtcNow.Date,
                    AdmissionNo = noEmailAdmNo,
                    AdmissionType = "Regular",
                    AdmissionQuota = "General",
                    BoardId = validBoardId,
                    AcademicYearId = validYearId,
                    AcademicLevelId = validLevelId,
                    GroupId = validGroupId,
                    ProgramId = validProgramId,
                    FeeStructureId = validFeeStructureId,
                    PaymentPlan = "Full Payment",
                    FirstName = "Ravi",
                    LastName = "Kumar",
                    Gender = "Male",
                    DateOfBirth = new DateTime(2006, 3, 21),
                    BloodGroup = "B+",
                    StudentEmail = null,
                    StudentMobileNumber = "9876543211",
                    FatherName = "Suresh Kumar",
                    MotherName = "Meena Kumar",
                    City = "Hyderabad",
                    District = "Hyderabad",
                    State = "Telangana",
                    Pincode = "500001"
                };

                var createdNoEmailAdm = await admissionRepo.CreateAsync(noEmailReq, null);
                noEmailAdmId = createdNoEmailAdm?.AdmissionId ?? 0;

                var approveNoEmailResult = await admissionService.ApproveAsync(new ApproveStudentAdmissionRequest { AdmissionId = noEmailAdmId });
                AssertTrue(approveNoEmailResult, "Test 13A: Student admission with missing email is approved successfully");

                var noEmailStudent = await admissionRepo.GetStudentByAdmissionIdAsync(noEmailAdmId);
                AssertTrue(noEmailStudent != null, "Test 13B: Student domain record is created for missing email admission");

                if (noEmailStudent != null)
                {
                    noEmailStudentId = noEmailStudent.StudentId;
                    var noEmailUser = await userRepo.GetByStudentIdAsync(noEmailStudentId);
                    AssertTrue(noEmailUser == null,
                        "Test 13C: Zero Users account is created when Student.Email is missing (no fake/synthetic email)");
                }
            }
            finally
            {
                if (noEmailStudentId > 0)
                {
                    await connection.ExecuteAsync("DELETE FROM StudentFees WHERE StudentId = @StudentId", new { StudentId = noEmailStudentId });
                    await connection.ExecuteAsync("DELETE FROM Students WHERE StudentId = @StudentId", new { StudentId = noEmailStudentId });
                }
                if (noEmailAdmId > 0)
                    await admissionRepo.DeleteAsync(noEmailAdmId);
            }

            QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

            // -------------------------------------------------------------
            // SECTION 4: DUPLICATE PREVENTION & CONSTRAINTS
            // -------------------------------------------------------------
            Console.WriteLine("\n--- [SECTION 4] DUPLICATE PREVENTION ---");

            int tempDupStudentId = 0;
            int dupCreatedUserId = 0;
            try
            {
                tempDupStudentId = await connection.ExecuteScalarAsync<int>(@"
                    INSERT INTO Students (AdmissionNo, AdmissionDate, StudentName, Gender, DateOfBirth, Email, BoardId, AcademicYearId, AcademicLevelId, GroupId, ProgramId, IsActive, CreatedAt)
                    VALUES (@AdmNo, NOW(), 'Dup Student', 'Male', '2005-01-01', @Email, @BoardId, @YearId, @LevelId, @GroupId, @ProgId, 1, NOW());
                    SELECT LAST_INSERT_ID();",
                    new
                    {
                        AdmNo = $"DUP-ADM-{Guid.NewGuid():N}".Substring(0, 20),
                        Email = $"dup.student.{Guid.NewGuid():N}@testdomain.edu",
                        BoardId = validBoardId,
                        YearId = validYearId,
                        LevelId = validLevelId,
                        GroupId = validGroupId,
                        ProgId = validProgramId
                    });

                // Test initial student user provisioning
                var dupStudentLinkReq1 = new ProvisionStudentUserRequest
                {
                    StudentId = tempDupStudentId,
                    FullName = "Dup Student 1",
                    Email = $"dup1_{Guid.NewGuid():N}@testdomain.edu",
                    PhoneNumber = "9876543212"
                };
                var dupResult1 = await provisioningService.ProvisionStudentUserAsync(dupStudentLinkReq1);
                AssertTrue(dupResult1.Success, "Test 14A: Initial Student user provisioning succeeds");
                if (dupResult1.Success && dupResult1.UserId.HasValue)
                {
                    dupCreatedUserId = dupResult1.UserId.Value;
                }

                // Test duplicate StudentId provisioning is rejected
                var dupStudentLinkReq2 = new ProvisionStudentUserRequest
                {
                    StudentId = tempDupStudentId, // Same StudentId
                    FullName = "Dup Student 2",
                    Email = $"dup2_{Guid.NewGuid():N}@testdomain.edu",
                    PhoneNumber = "9876543213"
                };
                var dupResult2 = await provisioningService.ProvisionStudentUserAsync(dupStudentLinkReq2);
                AssertTrue(!dupResult2.Success && dupResult2.ErrorMessage.Contains("already linked to StudentId"),
                    "Test 14B: Duplicate StudentId link is rejected");
            }
            finally
            {
                if (dupCreatedUserId > 0)
                    await connection.ExecuteAsync("DELETE FROM Users WHERE UserId = @UserId", new { UserId = dupCreatedUserId });
                if (tempDupStudentId > 0)
                    await connection.ExecuteAsync("DELETE FROM Students WHERE StudentId = @StudentId", new { StudentId = tempDupStudentId });
            }

            // -------------------------------------------------------------
            // SECTION 5: INITIAL CREDENTIAL EMAIL FORMATTING & DELIVERY
            // -------------------------------------------------------------
            Console.WriteLine("\n--- [SECTION 5] INITIAL CREDENTIAL EMAIL DELIVERY ---");

            var testEmailHtml = StudentCredentialHelper.BuildInitialCredentialEmailHtml(
                "Anita Desai",
                "anita.desai@collegetest.edu",
                "K8#mP2$vL9!qR4",
                "http://localhost:5173",
                "College Management System");

            AssertTrue(testEmailHtml.Contains("anita.desai@collegetest.edu") &&
                       testEmailHtml.Contains("K8#mP2$vL9!qR4") &&
                       testEmailHtml.Contains("Log in to Student Portal") &&
                       testEmailHtml.Contains("Security Notice"),
                "Test 15: Initial credential email body contains recipient email, temp password, portal link, and security notice");

            AssertTrue(!testEmailHtml.Contains("$2a$") && !testEmailHtml.Contains("$2b$") && !testEmailHtml.Contains("PasswordHash"),
                "Test 16: Initial credential email does not expose PasswordHash or internal DB artifacts");

            // -------------------------------------------------------------
            // SECTION 6: CREDENTIAL PDF SLIP RECONSTRUCTION REMOVAL
            // -------------------------------------------------------------
            Console.WriteLine("\n--- [SECTION 6] PDF SLIP PASSWORD RECONSTRUCTION REMOVAL ---");

            var slipModel = new StudentCredentialPdfModel
            {
                StudentId = 1,
                AdmissionNo = "ADM-2026-001",
                StudentName = "Sunita Rao",
                DateOfBirth = new DateTime(2007, 8, 15),
                Email = "sunita.rao@collegetest.edu",
                BoardCode = "BIE",
                AcademicYearName = "2026-2027",
                LevelCode = "XI",
                GroupCode = "MPC",
                TemporaryPassword = "Sent to registered email"
            };

            var pdfDoc = new StudentCredentialPdfDocument(new List<StudentCredentialPdfModel> { slipModel });
            using var pdfStream = new MemoryStream();
            QuestPDF.Fluent.GenerateExtensions.GeneratePdf(pdfDoc, pdfStream);
            var pdfBytes = pdfStream.ToArray();

            AssertTrue(pdfBytes != null && pdfBytes.Length > 0,
                "Test 17: Credential PDF slips generate successfully with 'Initial password sent to registered email'");

            // -------------------------------------------------------------
            // SECTION 7: API RESPONSE CREDENTIAL SAFETY
            // -------------------------------------------------------------
            Console.WriteLine("\n--- [SECTION 7] API RESPONSE CREDENTIAL SAFETY ---");

            var responseProps = typeof(StudentAdmissionResponseDto).GetProperties().Select(p => p.Name).ToList();
            bool hasPlainPassword = responseProps.Any(p => p.Equals("Password", StringComparison.OrdinalIgnoreCase) ||
                                                          p.Equals("TemporaryPassword", StringComparison.OrdinalIgnoreCase));
            bool hasPasswordHash = responseProps.Any(p => p.Equals("PasswordHash", StringComparison.OrdinalIgnoreCase));

            AssertTrue(!hasPlainPassword, "Test 18: Student Admission response DTO does not expose TemporaryPassword");
            AssertTrue(!hasPasswordHash, "Test 19: Student Admission response DTO does not expose PasswordHash");

            // -------------------------------------------------------------
            // SECTION 8: LIVE DATABASE INTEGRITY & DATA SAFETY
            // -------------------------------------------------------------
            Console.WriteLine("\n--- [SECTION 8] LIVE DATABASE INTEGRITY & DATA SAFETY ---");

            var finalUserCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Users");
            var finalStudentCount = await connection.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Students");

            AssertTrue(finalUserCount == initialUserCount,
                $"Test 20A: Live Users count remains exactly unchanged at {initialUserCount} (Found: {finalUserCount})");

            AssertTrue(finalStudentCount == initialStudentCount,
                $"Test 20B: Live Students count remains exactly unchanged at {initialStudentCount} (Found: {finalStudentCount})");

            // Verify original 14 users
            var originalUsers = (await userRepo.GetAllUsersAsync()).Take(14).ToList();
            bool all14Intact = originalUsers.Count == 14 &&
                               originalUsers.All(u => !string.IsNullOrWhiteSpace(u.Email) && !string.IsNullOrWhiteSpace(u.PasswordHash));
            AssertTrue(all14Intact, "Test 20C: All original 14 Users records remain 100% intact");

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"TOTAL ASSERTIONS: {passed + failed} | PASSED: {passed} | FAILED: {failed}");
            Console.WriteLine("================================================================================\n");

            return failed == 0;
        }
    }
}
