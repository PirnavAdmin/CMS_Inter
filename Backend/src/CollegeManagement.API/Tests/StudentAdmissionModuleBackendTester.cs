using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.StudentAdmission;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Validators.StudentAdmission;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests
{
    /// <summary>
    /// Automated Verification Suite for Student Admission Module
    /// Verifies DI registration, FluentValidation rules, and repository contracts.
    /// </summary>
    public static class StudentAdmissionModuleBackendTester
    {
        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("\n================================================================================");
            Console.WriteLine("       MODULE 10: STUDENT ADMISSION VERIFICATION SUITE");
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
            var repo = scope.ServiceProvider.GetService<IStudentAdmissionRepository>();
            AssertTrue(repo != null, "DI Registration: IStudentAdmissionRepository is registered and resolvable");

            var service = scope.ServiceProvider.GetService<IStudentAdmissionService>();
            AssertTrue(service != null, "DI Registration: IStudentAdmissionService is registered and resolvable");

            // -------------------------------------------------------------
            // TEST 2: FluentValidation - Create Request Validator
            // -------------------------------------------------------------
            var createValidator = new CreateStudentAdmissionRequestValidator();
            var invalidRequest = new CreateStudentAdmissionRequest
            {
                FirstName = "", // Invalid
                Gender = "InvalidGender", // Invalid
                DateOfBirth = DateTime.Today.AddDays(1), // Invalid (future)
                BoardId = 0, // Invalid
                AcademicYearId = 0, // Invalid
                AcademicLevelId = 0, // Invalid
                GroupId = 0, // Invalid
                ProgramId = 0, // Invalid
                StudentMobileNumber = "123", // Invalid (not 10 digits)
                AadhaarNumber = "12345", // Invalid (not 12 digits)
                Pincode = "123" // Invalid (not 6 digits)
            };

            var valResult = await createValidator.ValidateAsync(invalidRequest);
            AssertTrue(!valResult.IsValid, "Validator: Invalid CreateStudentAdmissionRequest rejected");
            AssertTrue(valResult.Errors.Any(e => e.PropertyName == nameof(CreateStudentAdmissionRequest.FirstName)), "Validator: Catches empty FirstName");
            AssertTrue(valResult.Errors.Any(e => e.PropertyName == nameof(CreateStudentAdmissionRequest.Gender)), "Validator: Catches invalid Gender");
            AssertTrue(valResult.Errors.Any(e => e.PropertyName == nameof(CreateStudentAdmissionRequest.DateOfBirth)), "Validator: Catches future DateOfBirth");
            AssertTrue(valResult.Errors.Any(e => e.PropertyName == nameof(CreateStudentAdmissionRequest.StudentMobileNumber)), "Validator: Catches invalid Mobile");
            AssertTrue(valResult.Errors.Any(e => e.PropertyName == nameof(CreateStudentAdmissionRequest.AadhaarNumber)), "Validator: Catches invalid Aadhaar");
            AssertTrue(valResult.Errors.Any(e => e.PropertyName == nameof(CreateStudentAdmissionRequest.Pincode)), "Validator: Catches invalid Pincode");

            var validRequest = new CreateStudentAdmissionRequest
            {
                AdmissionDate = DateTime.UtcNow,
                FirstName = "Aarav",
                LastName = "Sharma",
                Gender = "Male",
                DateOfBirth = new DateTime(2005, 5, 15),
                BoardId = 1,
                AcademicYearId = 1,
                AcademicLevelId = 1,
                GroupId = 1,
                ProgramId = 1,
                StudentEmail = "aarav.sharma@example.com",
                StudentMobileNumber = "9876543210",
                AadhaarNumber = "123456789012",
                Pincode = "500001",
                AnnualIncome = 450000,
                PreviousPercentage = 88.5m
            };

            var validResult = await createValidator.ValidateAsync(validRequest);
            AssertTrue(validResult.IsValid, "Validator: Valid CreateStudentAdmissionRequest passes cleanly");

            // -------------------------------------------------------------
            // TEST 3: FluentValidation - Reject Request Validator
            // -------------------------------------------------------------
            var rejectValidator = new RejectStudentAdmissionRequestValidator();
            var emptyReject = new RejectStudentAdmissionRequest { AdmissionId = 1, RejectionReason = "" };
            var rejectResult = await rejectValidator.ValidateAsync(emptyReject);
            AssertTrue(!rejectResult.IsValid, "Validator: Rejection requires non-empty reason");

            // -------------------------------------------------------------
            // TEST 4: Blood Groups Provider
            // -------------------------------------------------------------
            var bloodGroups = (await repo!.GetBloodGroupsAsync()).ToList();
            AssertTrue(bloodGroups.Count >= 8, $"BloodGroups: Returns standard blood groups ({bloodGroups.Count} available)");
            AssertTrue(bloodGroups.Contains("O+") && bloodGroups.Contains("A+"), "BloodGroups: Contains O+ and A+");

            // -------------------------------------------------------------
            // Summary
            // -------------------------------------------------------------
            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"  STUDENT ADMISSION TEST SUMMARY: {passed} PASSED, {failed} FAILED");
            Console.WriteLine("================================================================================\n");

            return failed == 0;
        }
    }
}
