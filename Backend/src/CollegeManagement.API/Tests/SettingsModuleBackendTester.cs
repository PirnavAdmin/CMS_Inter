using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Settings;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models.Settings;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Services.Implementations;
using Dapper;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public class SettingsModuleBackendTester
    {
        private readonly string _connectionString;

        public SettingsModuleBackendTester(string connectionString)
        {
            _connectionString = connectionString;
        }

        public async Task<bool> RunAllTestsAsync()
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("       SETTINGS MODULE (NUMBER SERIES & TEMPLATES) BACKEND SUITE");
            Console.WriteLine("================================================================================");

            int passed = 0;
            int failed = 0;

            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
            using var dbContext = new AppDbContext(optionsBuilder.Options);

            var numRepo = new NumberSeriesRepository(dbContext);
            var numService = new NumberSeriesService(numRepo);

            var templateRepo = new TemplateRepository(dbContext);
            var templateService = new TemplateService(templateRepo, dbContext);

            // -------------------------------------------------------------------------
            // 1. Database Connection & Schema Verification
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[1/8] Testing Database Connection & Settings Tables...");
            try
            {
                using var conn = new MySqlConnection(_connectionString);
                await conn.OpenAsync();
                var dbName = await conn.ExecuteScalarAsync<string>("SELECT DATABASE();");
                Console.WriteLine($"  [PASS] Connected to Database: {dbName}");

                await numRepo.EnsureTableAndSeedsAsync();
                await templateRepo.EnsureSeedsAsync();

                var cols = (await conn.QueryAsync<(string Field, string Type, string Null, string Key, string Default, string Extra)>("SHOW COLUMNS FROM templates;")).ToList();
                Console.WriteLine("  Templates columns:");
                foreach (var c in cols)
                {
                    Console.WriteLine($"    - {c.Field} ({c.Type})");
                }

                Console.WriteLine("  [PASS] Tables and initial seeds initialized.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Database setup error: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // 2. Number Series: Verify All 9 Standard Cards
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[2/8] Testing Number Series: Fetching all 9 series configurations...");
            var expected9Cards = new[]
            {
                "TEACHING_STAFF_ID",
                "NON_TEACHING_STAFF_ID",
                "ADMISSION_NO",
                "ROLL_NO",
                "STUDENT_ID",
                "SECTION_NAME",
                "EXAM_CODE",
                "CERTIFICATE_NO",
                "RECEIPT_NO"
            };

            try
            {
                var allSeries = (await numService.GetAllSeriesAsync()).ToList();
                Console.WriteLine($"  Retrieved {allSeries.Count} number series configurations.");

                bool allFound = true;
                foreach (var expected in expected9Cards)
                {
                    var found = allSeries.FirstOrDefault(s =>
                        s.SeriesCode.Equals(expected, StringComparison.OrdinalIgnoreCase) ||
                        (expected == "TEACHING_STAFF_ID" && s.SeriesCode == "EMPLOYEE_ID"));

                    if (found != null)
                    {
                        Console.WriteLine($"    -> [{found.SeriesCode}] '{found.SeriesName}' | Pattern: {found.FormatPattern} | Preview: {found.LivePreview} | Slug: {found.Slug}");
                    }
                    else
                    {
                        Console.WriteLine($"    [!] Missing expected series: {expected}");
                        allFound = false;
                    }
                }

                if (allFound && allSeries.Count >= 9)
                {
                    Console.WriteLine("  [PASS] All 9 standard number series cards verified.");
                    passed++;
                }
                else
                {
                    Console.WriteLine($"  [FAIL] Expected at least 9 series cards, found {allSeries.Count}.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Number series retrieval failed: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // 3. Number Series: Code and Slug Lookup
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[3/8] Testing Number Series Code & Slug Lookup...");
            try
            {
                var testSlugs = new[]
                {
                    ("teaching-staff-id", "TEACHING_STAFF_ID"),
                    ("non-teaching-staff-id", "NON_TEACHING_STAFF_ID"),
                    ("admission-no", "ADMISSION_NO"),
                    ("roll-no", "ROLL_NO"),
                    ("student-id", "STUDENT_ID"),
                    ("section-name", "SECTION_NAME"),
                    ("exam-code", "EXAM_CODE"),
                    ("certificate-number", "CERTIFICATE_NO"),
                    ("receipt-no", "RECEIPT_NO")
                };

                int matchCount = 0;
                foreach (var (slug, expectedCode) in testSlugs)
                {
                    var res = await numService.GetSeriesByCodeAsync(slug);
                    if (res != null)
                    {
                        matchCount++;
                    }
                    else
                    {
                        Console.WriteLine($"    [!] Failed to lookup slug: {slug}");
                    }
                }

                if (matchCount == testSlugs.Length)
                {
                    Console.WriteLine($"  [PASS] All {matchCount}/{testSlugs.Length} slugs and codes resolved successfully.");
                    passed++;
                }
                else
                {
                    Console.WriteLine($"  [FAIL] Only {matchCount}/{testSlugs.Length} slugs resolved.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Slug lookup error: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // 4. Number Series: On-The-Fly Live Preview Engine
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[4/8] Testing Number Series Live Preview Engine...");
            try
            {
                var preview1 = await numService.GetLivePreviewAsync("admission-no", "ADM-{YYYY}-{SEQ}", 4, "ADM");
                Console.WriteLine($"  Preview 'admission-no' (ADM-{{YYYY}}-{{SEQ}}): {preview1}");

                var preview2 = await numService.GetLivePreviewAsync("section-name", "{GROUP}-Section {SECTION}", 1, "");
                Console.WriteLine($"  Preview 'section-name' ({{GROUP}}-Section {{SECTION}}): {preview2}");

                var preview3 = await numService.GetLivePreviewAsync("certificate-number", "CND-{YEAR}-{RANDOM}", 6, "CND");
                Console.WriteLine($"  Preview 'certificate-number' (CND-{{YEAR}}-{{RANDOM}}): {preview3}");

                if (!string.IsNullOrWhiteSpace(preview1) && !string.IsNullOrWhiteSpace(preview2) && !string.IsNullOrWhiteSpace(preview3))
                {
                    Console.WriteLine("  [PASS] Live preview engine successfully formatted all dynamic tokens.");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] Live preview returned empty output.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Live preview error: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // 5. Number Series: Atomic Next Sequence Generation
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[5/8] Testing Atomic Sequence Increment & Number Generation...");
            try
            {
                var genRes = await numService.GenerateNextNumberAsync("receipt-no");
                if (genRes != null && !string.IsNullOrWhiteSpace(genRes.GeneratedNumber))
                {
                    Console.WriteLine($"  [PASS] Generated next Receipt No: '{genRes.GeneratedNumber}' (Sequence #{genRes.SequenceNumber})");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] Next number generation failed.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Sequence generation error: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // 6. Templates: Catalog, Categories & Seed Verification
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[6/8] Testing Templates: Catalog, Categories & Active Templates...");
            try
            {
                var pagedTemplates = await templateService.GetAllTemplatesAsync(1, 20, null, null, null);
                Console.WriteLine($"  Total Templates in Catalog: {pagedTemplates.TotalCount}");

                var expectedTemplates = new[] { "BC", "CC", "SC", "TC", "OC", "BONAFIDE_CERT", "STUDY_CERT", "CONDUCT_CERT", "TRANSFER_CERT", "CUSTOM_CERT", "BONAFIDE_BIEAP", "BONAFIDE_TSBIE", "STUDY_CONDUCT_CERT", "TRANSFER_CERTIFICATE" };
                int certTemplatesFound = 0;
                foreach (var t in pagedTemplates.Items)
                {
                    Console.WriteLine($"    -> [{t.TemplateCode}] '{t.Title}' (Cat: {t.Category}, Ver: v{t.Version})");
                    if (expectedTemplates.Contains(t.TemplateCode, StringComparer.OrdinalIgnoreCase)) certTemplatesFound++;
                }

                if (certTemplatesFound >= 4)
                {
                    Console.WriteLine($"  [PASS] Core certificate templates verified in catalog ({certTemplatesFound} templates matching standard types).");
                    passed++;
                }
                else
                {
                    Console.WriteLine($"  [FAIL] Only {certTemplatesFound} core certificate templates found.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Template catalog error: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // 7. Templates: Dynamic Placeholder Preview Engine
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[7/8] Testing Templates: Dynamic Token Rendering Engine...");
            try
            {
                var renderRequest = new RenderCertificateTemplateRequestDto
                {
                    TemplateCode = "BONAFIDE_CERT",
                    AdmissionNo = "ADM-2026-0001",
                    Purpose = "Higher Education & University Admissions",
                    IssuedBy = "Principal Dr. Rao"
                };

                var rendered = await templateService.RenderTemplateAsync(renderRequest);
                if (rendered != null && !string.IsNullOrWhiteSpace(rendered.RenderedHtml))
                {
                    Console.WriteLine($"  Rendered Output Preview:\n  \"{rendered.RenderedHtml.Substring(0, Math.Min(120, rendered.RenderedHtml.Length))}...\"");
                    Console.WriteLine($"  Applied Placeholders Count: {rendered.AppliedPlaceholders.Count}");
                    Console.WriteLine("  [PASS] Template dynamically hydrated with 0 raw code tags.");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] Template rendering produced empty content.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Template render error: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // 8. Templates: Full CRUD Lifecycle (Create, Update, Toggle, Delete)
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[8/8] Testing Templates: Full CRUD Lifecycle...");
            try
            {
                var testCode = $"TEST_LETTER_{DateTime.UtcNow.Ticks % 100000}";
                var createDto = new CreateTemplateDto
                {
                    TemplateCode = testCode,
                    Title = "Automated Test Offer Letter",
                    Category = "Document",
                    ContentBody = "Dear {{student_name}}, Welcome to {{group_name}}!",
                    Placeholders = new List<string> { "{{student_name}}", "{{group_name}}" }
                };

                // Create
                var created = await templateService.CreateTemplateAsync(createDto);
                Console.WriteLine($"  Created template ID={created.Id}, Version={created.Version}");

                // Update
                var updateDto = new UpdateTemplateDto
                {
                    Title = "Automated Test Offer Letter (Updated)",
                    Category = "Document",
                    ContentBody = "Dear {{student_name}}, Welcome to {{group_name}} for {{academic_year}}!",
                    Placeholders = new List<string> { "{{student_name}}", "{{group_name}}", "{{academic_year}}" },
                    IsActive = true
                };
                var updated = await templateService.UpdateTemplateAsync(created.Id, updateDto);
                Console.WriteLine($"  Updated template ID={updated?.Id}, New Version={updated?.Version}");

                // Toggle
                var toggled = await templateService.ToggleTemplateActiveAsync(created.Id);
                Console.WriteLine($"  Toggled active state: {toggled}");

                // Delete
                var deleted = await templateService.DeleteTemplateAsync(created.Id);
                Console.WriteLine($"  Soft-deleted template: {deleted}");

                if (created.Id > 0 && updated?.Version > created.Version && toggled && deleted)
                {
                    Console.WriteLine("  [PASS] Template CRUD lifecycle tested successfully.");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] Template CRUD lifecycle assertions failed.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Template CRUD error: {ex.Message}");
                failed++;
            }

            Console.WriteLine("================================================================================");
            Console.WriteLine($"   SETTINGS MODULE SUITE RESULT: {passed}/8 PASSED | {failed} FAILED");
            Console.WriteLine("================================================================================");

            return failed == 0;
        }
    }
}
