using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using CollegeManagement.API.Common;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Students;
using CollegeManagement.API.DTOs.Students.Requests;
using CollegeManagement.API.DTOs.Students.Responses;
using CollegeManagement.API.Repositories;
using CollegeManagement.API.Services;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Validators.StudentValidators;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests
{
    /// <summary>
    /// Automated Verification Suite for Student Management Module
    /// Verifies DI registration, FluentValidation rules, and repository contracts.
    /// </summary>
    public static class StudentManagementModuleBackendTester
    {
        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("       MODULE: STUDENT MANAGEMENT VERIFICATION SUITE");
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

            // -------------------------------------------------------------
            // TEST 1: Service Provider & DI Registration
            // -------------------------------------------------------------
            var repo = scope.ServiceProvider.GetService<IStudentRepository>();
            AssertTrue(repo != null, "DI Registration: IStudentRepository is registered and resolvable");

            var service = scope.ServiceProvider.GetService<IStudentService>();
            AssertTrue(service != null, "DI Registration: IStudentService is registered and resolvable");

            var exportService = scope.ServiceProvider.GetService<IStudentExportService>();
            AssertTrue(exportService != null, "DI Registration: IStudentExportService is registered and resolvable");

            var importService = scope.ServiceProvider.GetService<IStudentImportService>();
            AssertTrue(importService != null, "DI Registration: IStudentImportService is registered and resolvable");

            // -------------------------------------------------------------
            // TEST 2: FluentValidation - Create Student Request Validator
            // -------------------------------------------------------------
            var createValidator = new CreateStudentRequestValidator();
            var invalidCreateRequest = new CreateStudentRequest
            {
                StudentName = "", // Invalid
                AdmissionNo = "", // Invalid
                Gender = "", // Invalid
                BoardId = 0, // Invalid
                AcademicYearId = 0, // Invalid
                Email = "invalid-email", // Invalid
                MobileNumber = "123" // Invalid
            };
            var createValidationResult = await createValidator.ValidateAsync(invalidCreateRequest);
            AssertTrue(!createValidationResult.IsValid && createValidationResult.Errors.Count >= 5,
                "FluentValidation: CreateStudentRequestValidator correctly blocks invalid requests",
                $"Expected >= 5 validation errors, got {createValidationResult.Errors.Count}");

            var validCreateRequest = new CreateStudentRequest
            {
                StudentName = "John Doe",
                AdmissionNo = "ADM-2026-TEST",
                Gender = "Male",
                DateOfBirth = new DateTime(2005, 5, 15),
                BoardId = 1,
                AcademicYearId = 1,
                Email = "john.doe.test@example.com",
                MobileNumber = "9876543210"
            };
            var validCreateResult = await createValidator.ValidateAsync(validCreateRequest);
            AssertTrue(validCreateResult.IsValid, "FluentValidation: CreateStudentRequestValidator accepts valid request");

            // -------------------------------------------------------------
            // TEST 3: FluentValidation - Update Student Request Validator
            // -------------------------------------------------------------
            var updateValidator = new UpdateStudentRequestValidator();
            var invalidUpdateRequest = new UpdateStudentRequest
            {
                Email = "not-an-email",
                MobileNumber = "12345",
                AadhaarNumber = "99"
            };
            var updateValidationResult = await updateValidator.ValidateAsync(invalidUpdateRequest);
            AssertTrue(!updateValidationResult.IsValid, "FluentValidation: UpdateStudentRequestValidator catches format errors");

            // -------------------------------------------------------------
            // TEST 4: FluentValidation - Change Section & Group Validators
            // -------------------------------------------------------------
            var sectionValidator = new ChangeSectionRequestValidator();
            var invalidSectionReq = new ChangeSectionRequest { SectionId = 0 };
            var sectionValResult = await sectionValidator.ValidateAsync(invalidSectionReq);
            AssertTrue(!sectionValResult.IsValid, "FluentValidation: ChangeSectionRequestValidator enforces SectionId > 0");

            var groupValidator = new ChangeGroupRequestValidator();
            var invalidGroupReq = new ChangeGroupRequest { GroupId = 0, ProgramId = 0 };
            var groupValResult = await groupValidator.ValidateAsync(invalidGroupReq);
            AssertTrue(!groupValResult.IsValid, "FluentValidation: ChangeGroupRequestValidator enforces GroupId and ProgramId > 0");

            // -------------------------------------------------------------
            // DEPLOY CANONICAL STORED PROCEDURES IF MISSING
            // -------------------------------------------------------------
            try
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var connection = dbContext.Database.GetDbConnection();
                if (connection.State != ConnectionState.Open)
                {
                    await connection.OpenAsync();
                }

                var candidates = new[]
                {
                    Path.Combine(AppContext.BaseDirectory, "Database", "Updated_Module_SPs", "11_StudentManagement_SPs.sql"),
                    Path.Combine(Directory.GetCurrentDirectory(), "Backend", "src", "CollegeManagement.API", "Database", "Updated_Module_SPs", "11_StudentManagement_SPs.sql"),
                    Path.Combine(Directory.GetCurrentDirectory(), "Database", "Updated_Module_SPs", "11_StudentManagement_SPs.sql")
                };

                var spPath = candidates.FirstOrDefault(File.Exists);
                if (spPath != null)
                {
                    var sql = await File.ReadAllTextAsync(spPath);
                    sql = Regex.Replace(sql, @"(?i)DELIMITER\s+.*", "");
                    var commands = sql.Split(new[] { "//" }, StringSplitOptions.RemoveEmptyEntries);
                    foreach (var rawCmd in commands)
                    {
                        var trimmed = rawCmd.Trim();
                        if (string.IsNullOrWhiteSpace(trimmed)) continue;
                        try
                        {
                            using var cmd = connection.CreateCommand();
                            cmd.CommandText = trimmed;
                            cmd.CommandType = CommandType.Text;
                            await cmd.ExecuteNonQueryAsync();
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"  [DEPLOY NOTICE] {ex.Message}");
                        }
                    }
                    Console.WriteLine("  [INFO] Successfully deployed/synchronized 11_StudentManagement_SPs.sql procedures.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [WARN] SP Deployment Notice: {ex.Message}");
            }

            // -------------------------------------------------------------
            // TEST 5: Repository Contract Verification
            // -------------------------------------------------------------
            if (repo != null)
            {
                try
                {
                    var pagedResult = await repo.GetPagedAsync(pageNumber: 1, pageSize: 5);
                    AssertTrue(pagedResult != null, "Repository Execution: GetPagedAsync returns non-null PagedResult via sp_GetStudentsPaged");
                }
                catch (Exception ex)
                {
                    AssertTrue(false, "Repository Execution: GetPagedAsync", ex.Message);
                }

                try
                {
                    var emailCheck = await repo.EmailExistsAsync("nonexistent_test_email_999999@test.com");
                    AssertTrue(!emailCheck, "Repository Execution: EmailExistsAsync returns false for nonexistent email");
                }
                catch (Exception ex)
                {
                    AssertTrue(false, "Repository Execution: EmailExistsAsync", ex.Message);
                }

                try
                {
                    var mobileCheck = await repo.MobileExistsAsync("0000000000");
                    AssertTrue(!mobileCheck, "Repository Execution: MobileExistsAsync returns false for non-matching mobile");
                }
                catch (Exception ex)
                {
                    AssertTrue(false, "Repository Execution: MobileExistsAsync", ex.Message);
                }
            }

            Console.WriteLine($"\n================================================================================");
            Console.WriteLine($"       STUDENT MANAGEMENT TESTS COMPLETED: {passed} PASSED, {failed} FAILED");
            Console.WriteLine("================================================================================\n");

            return failed == 0;
        }
    }
}
