using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Subject;
using CollegeManagement.API.Repositories;
using CollegeManagement.API.Repositories.Implementations;
using Dapper;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public class SubjectModuleBackendTester
    {
        private readonly string _connectionString;

        public SubjectModuleBackendTester(string connectionString)
        {
            var csb = new MySqlConnectionStringBuilder(connectionString)
            {
                AllowUserVariables = true
            };
            _connectionString = csb.ConnectionString;
        }

        public async Task<bool> RunAllTestsAsync()
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("        SUBJECT MODULE 100% STORED PROCEDURE & DAPPER TEST SUITE                ");
            Console.WriteLine("================================================================================");

            int passed = 0;
            int failed = 0;

            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
            using var dbContext = new AppDbContext(optionsBuilder.Options);

            var subjectRepo = new SubjectRepository(dbContext);

            // -------------------------------------------------------------------------
            // TEST 1: Deploy & Verify Stored Procedures and Indexes
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[1/5] Deploying and Verifying Stored Procedures & Indexes...");
            try
            {
                bool deployed = await SubjectDbDeployer.DeployAsync(_connectionString);
                if (!deployed)
                    throw new Exception("Stored procedures deployment failed.");

                using var conn = new MySqlConnection(_connectionString);
                await conn.OpenAsync();

                var spList = new[]
                {
                    "sp_GetAllSubjects",
                    "sp_GetSubjectById",
                    "sp_GetSubjectsByContext",
                    "sp_GetSubjectsByGroupId",
                    "sp_GetSubjectsByBoardId",
                    "sp_GetActiveSubjects",
                    "sp_SearchSubjects",
                    "sp_CheckSubjectCodeExists",
                    "sp_CheckSubjectDependencies",
                    "sp_CreateSubject",
                    "sp_UpdateSubject",
                    "sp_DeleteSubject",
                    "sp_ChangeSubjectStatus"
                };

                foreach (var sp in spList)
                {
                    var count = await conn.ExecuteScalarAsync<int>(
                        "SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_NAME = @Name;",
                        new { Name = sp }
                    );
                    if (count == 0)
                        throw new Exception($"Missing stored procedure: {sp}");
                }
                Console.WriteLine($"  [PASS] All {spList.Length} module stored procedures verified in database.");

                var idxCount = await conn.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Subjects' AND INDEX_NAME = 'IX_Subjects_Context_Active';"
                );
                if (idxCount == 0)
                    throw new Exception("Missing covering index IX_Subjects_Context_Active.");
                Console.WriteLine($"  [PASS] Covering index IX_Subjects_Context_Active verified (Count={idxCount}).");

                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Test 1 failed: {ex.Message}");
                failed++;
                return false;
            }

            int testSubjectId = 0;
            string testCode = $"TSUB_{Random.Shared.Next(10000, 99999)}";
            int testBoardId = 1;
            int testGroupId = 1;
            int testLevelId = 1;

            // -------------------------------------------------------------------------
            // TEST 2: Testing Subject CRUD Operations via Dapper SPs
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[2/5] Testing Subject CRUD Operations via Dapper SPs...");
            try
            {
                // Ensure valid parent Board, Group, and Level IDs from database
                using (var conn = new MySqlConnection(_connectionString))
                {
                    await conn.OpenAsync();
                    var bId = await conn.ExecuteScalarAsync<int?>("SELECT BoardId FROM Boards LIMIT 1;");
                    if (bId.HasValue && bId.Value > 0) testBoardId = bId.Value;

                    var gId = await conn.ExecuteScalarAsync<int?>("SELECT GroupId FROM `Groups` LIMIT 1;");
                    if (gId.HasValue && gId.Value > 0) testGroupId = gId.Value;

                    var lId = await conn.ExecuteScalarAsync<int?>("SELECT AcademicLevelId FROM AcademicLevels LIMIT 1;");
                    if (lId.HasValue && lId.Value > 0) testLevelId = lId.Value;
                }

                var sw = Stopwatch.StartNew();
                var createDto = new CreateSubjectDto
                {
                    BoardId = testBoardId,
                    GroupId = testGroupId,
                    AcademicLevelId = testLevelId,
                    SubjectName = "Integration Test Physics",
                    SubjectCode = testCode,
                    SubjectType = "Theory + Practical",
                    Theory = true,
                    Practical = true,
                    Language = false,
                    Elective = false,
                    InternalMarks = 20,
                    PracticalMarks = 30,
                    ExternalMarks = 50,
                    TotalMarks = 100,
                    PassingMarks = 35,
                    IsActive = true
                };

                var created = await subjectRepo.CreateAsync(createDto);
                sw.Stop();
                testSubjectId = created.SubjectId;
                Console.WriteLine($"  [PASS] Subject created: ID #{created.SubjectId}, Code='{created.SubjectCode}', Board='{created.BoardName}', Group='{created.GroupName}', Level='{created.AcademicLevelName}' in {sw.ElapsedMilliseconds}ms.");

                // Verify code uniqueness validation
                bool exists = await subjectRepo.SubjectCodeExistsAsync(testCode, testBoardId, testGroupId, testLevelId);
                if (!exists) throw new Exception("Code uniqueness check failed: expected exists=true.");
                Console.WriteLine("  [PASS] Code uniqueness validation verified.");

                // Verify GetByIdAsync
                var fetched = await subjectRepo.GetByIdAsync(testSubjectId);
                if (fetched == null || fetched.SubjectCode != testCode)
                    throw new Exception("GetById returned null or mismatched subject code.");
                Console.WriteLine($"  [PASS] GetById returned subject '{fetched.SubjectName}' with TotalMarks={fetched.TotalMarks}.");

                // Verify UpdateAsync
                var updateDto = new UpdateSubjectDto
                {
                    BoardId = testBoardId,
                    GroupId = testGroupId,
                    AcademicLevelId = testLevelId,
                    SubjectName = "Updated Integration Test Physics",
                    SubjectCode = testCode,
                    SubjectType = "Theory",
                    Theory = true,
                    Practical = false,
                    Language = false,
                    Elective = false,
                    InternalMarks = 25,
                    PracticalMarks = 0,
                    ExternalMarks = 75,
                    TotalMarks = 100,
                    PassingMarks = 40,
                    IsActive = true
                };

                var updated = await subjectRepo.UpdateAsync(testSubjectId, updateDto);
                if (updated == null || updated.SubjectName != "Updated Integration Test Physics" || updated.InternalMarks != 25)
                    throw new Exception("UpdateAsync did not persist changes correctly.");
                Console.WriteLine("  [PASS] UpdateAsync verified.");

                // Verify ChangeStatusAsync
                var toggled = await subjectRepo.ChangeStatusAsync(testSubjectId, false);
                if (toggled == null || toggled.IsActive != false)
                    throw new Exception("ChangeStatusAsync failed to deactivate subject.");
                Console.WriteLine("  [PASS] ChangeStatusAsync (Deactivate) verified.");

                var reactivated = await subjectRepo.ChangeStatusAsync(testSubjectId, true);
                if (reactivated == null || reactivated.IsActive != true)
                    throw new Exception("ChangeStatusAsync failed to reactivate subject.");
                Console.WriteLine("  [PASS] ChangeStatusAsync (Reactivate) verified.");

                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Test 2 failed: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // TEST 3: Testing Filtering & Context Queries
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[3/5] Testing Filtering & Context Dapper Queries...");
            try
            {
                var contextSubjects = await subjectRepo.GetByContextAsync(testBoardId, testGroupId, testLevelId);
                if (!contextSubjects.Any(s => s.SubjectId == testSubjectId))
                    throw new Exception("GetByContextAsync did not return the test subject.");
                Console.WriteLine($"  [PASS] GetByContextAsync returned {contextSubjects.Count} subject(s) including test subject.");

                var searchResults = await subjectRepo.SearchAsync("Updated Integration", testBoardId, testGroupId, testLevelId, true);
                if (!searchResults.Any(s => s.SubjectId == testSubjectId))
                    throw new Exception("SearchAsync did not find the test subject.");
                Console.WriteLine($"  [PASS] SearchAsync returned {searchResults.Count} match(es).");

                var activeSubjects = await subjectRepo.GetActiveAsync();
                if (!activeSubjects.Any(s => s.SubjectId == testSubjectId))
                    throw new Exception("GetActiveAsync did not return active test subject.");
                Console.WriteLine($"  [PASS] GetActiveAsync verified ({activeSubjects.Count} active subjects).");

                var groupSubjects = await subjectRepo.GetByGroupIdAsync(testGroupId);
                if (!groupSubjects.Any(s => s.SubjectId == testSubjectId))
                    throw new Exception("GetByGroupIdAsync did not return test subject.");
                Console.WriteLine($"  [PASS] GetByGroupIdAsync verified ({groupSubjects.Count} subjects in group).");

                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Test 3 failed: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // TEST 4: Testing Dependency Check & Bulk Creation
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[4/5] Testing Dependency Check & Bulk Subject Creation...");
            var bulkCreatedIds = new List<int>();
            try
            {
                // Dependency Check
                var deps = await subjectRepo.CheckDependenciesAsync(testSubjectId);
                if (deps == null) throw new Exception("CheckDependenciesAsync returned null.");
                Console.WriteLine($"  [PASS] CheckDependenciesAsync verified: TotalDependencies={deps.TotalDependencies}, HasDependencies={deps.HasDependencies}.");

                // Bulk creation
                string bulkCode1 = $"BULK1_{Random.Shared.Next(1000, 9999)}";
                string bulkCode2 = $"BULK2_{Random.Shared.Next(1000, 9999)}";

                var bulkDtos = new List<CreateSubjectDto>
                {
                    new CreateSubjectDto
                    {
                        BoardId = testBoardId,
                        GroupId = testGroupId,
                        AcademicLevelId = testLevelId,
                        SubjectName = "Bulk Test Subject 1",
                        SubjectCode = bulkCode1,
                        SubjectType = "Theory",
                        Theory = true,
                        TotalMarks = 100,
                        PassingMarks = 35,
                        IsActive = true
                    },
                    new CreateSubjectDto
                    {
                        BoardId = testBoardId,
                        GroupId = testGroupId,
                        AcademicLevelId = testLevelId,
                        SubjectName = "Bulk Test Subject 2",
                        SubjectCode = bulkCode2,
                        SubjectType = "Theory",
                        Theory = true,
                        TotalMarks = 100,
                        PassingMarks = 35,
                        IsActive = true
                    }
                };

                var bulkResults = await subjectRepo.BulkCreateAsync(bulkDtos);
                if (bulkResults.Count != 2)
                    throw new Exception($"BulkCreateAsync expected 2 subjects, received {bulkResults.Count}.");

                bulkCreatedIds.AddRange(bulkResults.Select(s => s.SubjectId));
                Console.WriteLine($"  [PASS] BulkCreateAsync created 2 subjects (IDs: {string.Join(", ", bulkCreatedIds)}).");

                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Test 4 failed: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // TEST 5: Clean Up & Deletion Pipeline
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[5/5] Testing Clean Up & Deletion Pipeline...");
            try
            {
                if (testSubjectId > 0)
                {
                    var delResult = await subjectRepo.DeleteAsync(testSubjectId);
                    if (!delResult.Success)
                        throw new Exception($"DeleteAsync failed: {delResult.Message}");
                    Console.WriteLine($"  [PASS] Successfully deleted test subject #{testSubjectId}.");
                }

                foreach (var id in bulkCreatedIds)
                {
                    var delResult = await subjectRepo.DeleteAsync(id);
                    if (!delResult.Success)
                        throw new Exception($"DeleteAsync failed for bulk subject #{id}: {delResult.Message}");
                }
                Console.WriteLine($"  [PASS] Successfully cleaned up {bulkCreatedIds.Count} bulk created subject(s).");

                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Test 5 failed: {ex.Message}");
                failed++;
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"TEST RESULTS SUMMARY: {passed} PASSED, {failed} FAILED (TOTAL 5)");
            Console.WriteLine("================================================================================\n");

            return failed == 0;
        }
    }
}
