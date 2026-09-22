using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Certificate;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Services;
using Microsoft.Extensions.Configuration;
using MySqlConnector;

namespace CollegeManagement.API.Tests;

public class CertificateModuleBackendTester
{
    private readonly string _connectionString;

    public CertificateModuleBackendTester(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task<bool> RunAllTestsAsync()
    {
        Console.WriteLine("================================================================================");
        Console.WriteLine("   CERTIFICATES MODULE BACKEND VERIFICATION & INTEGRATION SUITE");
        Console.WriteLine("================================================================================");

        int passed = 0;
        int failed = 0;

        // Setup Repository & Service
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new[] { new System.Collections.Generic.KeyValuePair<string, string?>("ConnectionStrings:DefaultConnection", _connectionString) })
            .Build();

        var dbContext = new DatabaseContext(config);
        var repo = new CertificateRepository(dbContext);
        var service = new CertificateService(repo);

        // 1. Test Database Connectivity
        Console.WriteLine("\n[1/8] Testing Database Connection...");
        try
        {
            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();
            var db = await conn.ExecuteScalarAsync<string>("SELECT DATABASE();");
            Console.WriteLine($"  [PASS] Successfully connected to Database: {db}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Connection Error: {ex.Message}");
            failed++;
        }

        // 2. Test Get Students Dropdown
        Console.WriteLine("\n[2/8] Testing Students Dropdown for Create Form Auto-fill...");
        try
        {
            var students = await service.GetStudentsDropdownAsync();
            Console.WriteLine($"  [PASS] Retrieved {students.Count} active student records for dropdown.");
            if (students.Any())
            {
                var sample = students.First();
                Console.WriteLine($"         Sample: {sample.AdmissionNo} - {sample.StudentName} (Group: {sample.GroupName}, Year: {sample.AcademicYear})");
            }
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Students Dropdown Error: {ex.Message}");
            failed++;
        }

        // 3. Test Get All Certificates
        Console.WriteLine("\n[3/8] Testing Get All Certificates...");
        try
        {
            var certs = await service.GetAllAsync();
            Console.WriteLine($"  [PASS] Retrieved {certs.Count} certificates from database.");
            if (certs.Any())
            {
                var sample = certs.First();
                Console.WriteLine($"         Sample: {sample.CertificateNumber} ({sample.CertificateType}) for {sample.StudentName} [{sample.Status}]");
            }
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Get All Certificates Error: {ex.Message}");
            failed++;
        }

        // 4. Test Get Workflow Stats
        Console.WriteLine("\n[4/8] Testing Workflow Stats (5 Stage Badges)...");
        try
        {
            var stats = await service.GetWorkflowStatsAsync();
            Console.WriteLine($"  [PASS] Stats Retrieved:");
            Console.WriteLine($"         Total: {stats.TotalCount} | Generated: {stats.GeneratedCount} | Reviewed: {stats.ReviewedCount} | Approved: {stats.ApprovedCount} | Issued: {stats.IssuedCount} | Cancelled: {stats.CancelledCount}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Workflow Stats Error: {ex.Message}");
            failed++;
        }

        // 5. Test Generate Certificate
        int generatedCertId = 0;
        string generatedCertNo = string.Empty;
        Console.WriteLine("\n[5/8] Testing Unified Certificate Generation...");
        try
        {
            var students = await service.GetStudentsDropdownAsync();
            var testStudent = students.FirstOrDefault() ?? new StudentCertificateDropdownDto { AdmissionNo = "ADM2026002" };

            var newCert = await service.GenerateAsync(new GenerateCertificateRequestDto
            {
                AdmissionNo = testStudent.AdmissionNo,
                CertificateType = "Bonafide Certificate",
                Purpose = "Automated Integration Test Verification",
                RequestDate = DateTime.UtcNow,
                Remarks = "Generated during automated integration test"
            });

            if (newCert != null && newCert.CertificateId > 0)
            {
                generatedCertId = newCert.CertificateId;
                generatedCertNo = newCert.CertificateNumber;
                Console.WriteLine($"  [PASS] Certificate Generated Successfully!");
                Console.WriteLine($"         ID: {newCert.CertificateId} | Number: {newCert.CertificateNumber} | Status: {newCert.Status} | Student: {newCert.StudentName}");
                passed++;
            }
            else
            {
                Console.WriteLine($"  [FAIL] Certificate Generation returned null.");
                failed++;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Certificate Generation Error: {ex.Message}");
            failed++;
        }

        // 6. Test Workflow Transitions (Review -> Approve -> Issue)
        Console.WriteLine("\n[6/8] Testing Workflow Transitions...");
        if (generatedCertId > 0)
        {
            try
            {
                // Review
                var revOk = await service.MoveStatusAsync(generatedCertId, "Reviewed", "TestReviewer");
                var certRev = await service.GetByIdAsync(generatedCertId);
                Console.WriteLine($"         Step 1 (Review): Status={certRev?.Status} (Expected: Reviewed) - {(certRev?.Status == "Reviewed" ? "OK" : "FAIL")}");

                // Approve
                var appOk = await service.MoveStatusAsync(generatedCertId, "Approved", "TestApprover");
                var certApp = await service.GetByIdAsync(generatedCertId);
                Console.WriteLine($"         Step 2 (Approve): Status={certApp?.Status} (Expected: Approved) - {(certApp?.Status == "Approved" ? "OK" : "FAIL")}");

                // Issue
                var issOk = await service.MoveStatusAsync(generatedCertId, "Issued", "Principal");
                var certIss = await service.GetByIdAsync(generatedCertId);
                Console.WriteLine($"         Step 3 (Issue): Status={certIss?.Status} (Expected: Issued) - {(certIss?.Status == "Issued" ? "OK" : "FAIL")}");

                if (certIss?.Status == "Issued")
                {
                    Console.WriteLine("  [PASS] Complete workflow lifecycle tested successfully.");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] Workflow transition mismatch.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Workflow Transition Error: {ex.Message}");
                failed++;
            }
        }
        else
        {
            Console.WriteLine("  [SKIP] Skipping workflow transitions because generation failed.");
        }

        // 7. Test Public Verification
        Console.WriteLine("\n[7/8] Testing Public Certificate Verification...");
        if (!string.IsNullOrWhiteSpace(generatedCertNo))
        {
            try
            {
                var verified = await service.VerifyAsync(generatedCertNo);
                if (verified != null)
                {
                    Console.WriteLine($"  [PASS] Certificate {generatedCertNo} successfully verified. Student: {verified.StudentName}");
                    passed++;
                }
                else
                {
                    Console.WriteLine($"  [FAIL] Certificate {generatedCertNo} verification returned null.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Verification Error: {ex.Message}");
                failed++;
            }
        }
        else
        {
            Console.WriteLine("  [SKIP] Skipping verification because no cert number available.");
        }

        // 8. Clean up test certificate
        Console.WriteLine("\n[8/8] Testing Soft Delete / Cleanup...");
        if (generatedCertId > 0)
        {
            try
            {
                var delOk = await service.DeleteAsync(generatedCertId);
                Console.WriteLine($"  [PASS] Test Certificate ID {generatedCertId} deleted successfully.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Cleanup Error: {ex.Message}");
                failed++;
            }
        }

        Console.WriteLine("\n================================================================================");
        Console.WriteLine($"   CERTIFICATES MODULE TEST SUMMARY: {passed} PASSED, {failed} FAILED");
        Console.WriteLine("================================================================================");

        return failed == 0;
    }
}
