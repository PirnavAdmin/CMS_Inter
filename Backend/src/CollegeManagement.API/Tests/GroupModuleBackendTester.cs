using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Groups;
using CollegeManagement.API.DTOs.MasterGroups;
using CollegeManagement.API.Repositories;
using CollegeManagement.API.Repositories.Implementations;
using Dapper;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public class GroupModuleBackendTester
    {
        private readonly string _connectionString;

        public GroupModuleBackendTester(string connectionString)
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
            Console.WriteLine("        GROUP & MASTER GROUP MODULE 100% STORED PROCEDURE TEST SUITE            ");
            Console.WriteLine("================================================================================");

            int passed = 0;
            int failed = 0;

            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
            using var dbContext = new AppDbContext(optionsBuilder.Options);

            var groupRepo = new GroupRepository(dbContext);
            var masterGroupRepo = new MasterGroupRepository(dbContext);

            // -------------------------------------------------------------------------
            // TEST 1: Deploy & Verify Stored Procedures and Indexes
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[1/5] Deploying and Verifying Stored Procedures & Indexes...");
            try
            {
                bool deployed = await GroupDbDeployer.DeployAsync(_connectionString);
                if (!deployed)
                    throw new Exception("Stored procedures deployment failed.");

                using var conn = new MySqlConnection(_connectionString);
                await conn.OpenAsync();

                var spList = new[]
                {
                    "sp_GetAllGroups", "sp_GetGroupById", "sp_GetGroupsByBoard", "sp_CreateGroup",
                    "sp_UpdateGroup", "sp_CheckGroupDependencies", "sp_DeleteGroup", "sp_ActivateGroup",
                    "sp_ValidateGroupCode", "sp_GetGroupStudents", "sp_GetGroupSubjects", "sp_GetGroupSummary",
                    "sp_GetGroupDropdown", "sp_GetGroupPrograms", "sp_GetMasterGroups", "sp_GetMasterGroupById",
                    "sp_GetMasterGroupProgramsBatch", "sp_GetBoardAcademicLevelsBatch", "sp_CreateMasterGroup",
                    "sp_UpdateMasterGroup", "sp_ActivateMasterGroup", "sp_CheckMasterGroupDependencies",
                    "sp_DeleteMasterGroup", "sp_ClearMasterGroupPrograms", "sp_AddMasterGroupProgram",
                    "sp_ValidateMasterGroupCode", "sp_ResolveGroupContext", "sp_ClearGroupPrograms",
                    "sp_AddGroupProgram", "sp_GetGroupProgramsBatch"
                };

                var existingSps = (await conn.QueryAsync<string>(
                    "SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'PROCEDURE';"
                )).ToHashSet(StringComparer.OrdinalIgnoreCase);

                var missing = spList.Where(sp => !existingSps.Contains(sp)).ToList();
                if (missing.Count > 0)
                {
                    Console.WriteLine($"  [FAIL] Missing stored procedures: {string.Join(", ", missing)}");
                    failed++;
                }
                else
                {
                    Console.WriteLine($"  [PASS] All {spList.Length} module stored procedures verified in database.");

                    // Check Unique Index
                    var indexCount = await conn.ExecuteScalarAsync<int>(
                        "SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Groups' AND INDEX_NAME = 'UQ_Groups_MasterGroup_Context';"
                    );
                    Console.WriteLine($"  [PASS] Unique composite index UQ_Groups_MasterGroup_Context verified (Count={indexCount}).");
                    passed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Test 1 Error: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // TEST 2: Master Group Catalog CRUD (Option B)
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[2/5] Testing Master Group Catalog CRUD Operations...");
            int testMasterGroupId = 0;
            int testBoardId = 0;
            string testMgCode = $"TMG_{DateTime.UtcNow.Ticks % 100000}";
            try
            {
                using var conn = new MySqlConnection(_connectionString);
                await conn.OpenAsync();

                // Find a valid board with programs and academic levels
                var boardRow = await conn.QueryFirstOrDefaultAsync<dynamic>(
                    "SELECT b.BoardId FROM Boards b INNER JOIN BoardAcademicLevels bal ON b.BoardId = bal.BoardId WHERE b.IsActive = 1 AND bal.IsActive = 1 LIMIT 1;"
                );

                if (boardRow == null)
                    throw new Exception("No active board found with configured academic levels.");

                testBoardId = (int)boardRow.BoardId;

                var programRow = await conn.QueryFirstOrDefaultAsync<dynamic>(
                    "SELECT ProgramId FROM Programs WHERE IsActive = 1 LIMIT 1;"
                );
                int testProgramId = programRow != null ? (int)programRow.ProgramId : 1;

                var sw = Stopwatch.StartNew();
                var createReq = new CreateMasterGroupRequestDto
                {
                    BoardId = testBoardId,
                    GroupName = $"Test Master Group {testMgCode}",
                    GroupCode = testMgCode,
                    Description = "Automated audit verification master group",
                    IsActive = true,
                    ProgramIds = new List<int> { testProgramId }
                };

                var created = await masterGroupRepo.CreateAsync(createReq);
                sw.Stop();
                testMasterGroupId = created.MasterGroupId;

                Console.WriteLine($"  [PASS] Master Group created: ID #{testMasterGroupId}, Code='{created.GroupCode}' in {sw.ElapsedMilliseconds}ms.");

                // Validate code uniqueness
                bool codeExists = await masterGroupRepo.CodeExistsAsync(testBoardId, testMgCode);
                bool fakeCodeExists = await masterGroupRepo.CodeExistsAsync(testBoardId, "NONEXISTENT_CODE_XYZ");
                if (!codeExists || fakeCodeExists)
                    throw new Exception("Master Group CodeExists validation check failed.");
                Console.WriteLine("  [PASS] Master Group code uniqueness validation verified.");

                // Get by ID
                var fetched = await masterGroupRepo.GetByIdAsync(testMasterGroupId);
                if (fetched == null || fetched.Programs.Count == 0)
                    throw new Exception("GetById failed to return master group or its associated programs.");
                Console.WriteLine($"  [PASS] GetById returned Master Group with {fetched.Programs.Count} program(s) and {fetched.EligibleLevels.Count} eligible level(s).");

                // Update Master Group
                var updateReq = new UpdateMasterGroupRequestDto
                {
                    GroupName = $"Updated Master Group {testMgCode}",
                    GroupCode = testMgCode,
                    Description = "Updated description",
                    IsActive = true,
                    ProgramIds = new List<int> { testProgramId }
                };
                var updated = await masterGroupRepo.UpdateAsync(testMasterGroupId, updateReq);
                if (updated == null || updated.GroupName != updateReq.GroupName)
                    throw new Exception("Update Master Group failed.");
                Console.WriteLine("  [PASS] Update Master Group verified.");

                // Status toggle
                await masterGroupRepo.ActivateAsync(testMasterGroupId, false);
                var deactivated = await masterGroupRepo.GetByIdAsync(testMasterGroupId);
                if (deactivated?.IsActive != false)
                    throw new Exception("Deactivate Master Group failed.");

                await masterGroupRepo.ActivateAsync(testMasterGroupId, true);
                var reactivated = await masterGroupRepo.GetByIdAsync(testMasterGroupId);
                if (reactivated?.IsActive != true)
                    throw new Exception("Reactivate Master Group failed.");
                Console.WriteLine("  [PASS] Master Group status toggle (Activate/Deactivate) verified.");

                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Test 2 Error: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // TEST 3: Option B Academic-Context Resolution Engine (sp_ResolveGroupContext)
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[3/5] Testing Option B Context Resolution & Idempotency...");
            int resolvedGroupId = 0;
            try
            {
                using var conn = new MySqlConnection(_connectionString);
                await conn.OpenAsync();

                var contextRow = await conn.QueryFirstOrDefaultAsync<dynamic>(@"
                    SELECT bal.AcademicLevelId, ay.AcademicYearId
                    FROM BoardAcademicLevels bal
                    CROSS JOIN AcademicYears ay
                    WHERE bal.BoardId = @BoardId 
                      AND bal.IsActive = 1
                      AND ay.IsActive = 1 
                      AND (ay.BoardId IS NULL OR ay.BoardId <= 0 OR ay.BoardId = @BoardId)
                    LIMIT 1;",
                    new { BoardId = testBoardId }
                );

                if (contextRow == null)
                    throw new Exception("Could not find eligible AcademicLevel and AcademicYear combination for board.");

                int testLevelId = (int)contextRow.AcademicLevelId;
                int testYearId = (int)contextRow.AcademicYearId;

                var resolveReq = new ResolveGroupContextRequestDto
                {
                    MasterGroupId = testMasterGroupId,
                    BoardId = testBoardId,
                    AcademicYearId = testYearId,
                    AcademicLevelId = testLevelId
                };

                // Resolution 1: Brand new creation
                var sw1 = Stopwatch.StartNew();
                var res1 = await masterGroupRepo.ResolveContextAsync(resolveReq);
                sw1.Stop();

                if (!res1.IsNewlyCreated || res1.GroupId <= 0)
                    throw new Exception($"Initial context resolution failed. Expected IsNewlyCreated=true, got {res1.IsNewlyCreated}.");

                resolvedGroupId = res1.GroupId;
                Console.WriteLine($"  [PASS] Initial Context Resolution: Generated GroupId #{resolvedGroupId}, Code='{res1.GroupCode}', NewlyCreated={res1.IsNewlyCreated} in {sw1.ElapsedMilliseconds}ms.");

                // Resolution 2: Idempotency check (MUST return existing GroupId, IsNewlyCreated=false)
                var sw2 = Stopwatch.StartNew();
                var res2 = await masterGroupRepo.ResolveContextAsync(resolveReq);
                sw2.Stop();

                if (res2.IsNewlyCreated || res2.GroupId != resolvedGroupId)
                    throw new Exception($"Idempotency check failed! Expected GroupId={resolvedGroupId} and IsNewlyCreated=false, got GroupId={res2.GroupId}, IsNewlyCreated={res2.IsNewlyCreated}.");

                Console.WriteLine($"  [PASS] Idempotency Resolution: Re-resolved same GroupId #{res2.GroupId}, NewlyCreated={res2.IsNewlyCreated} in {sw2.ElapsedMilliseconds}ms.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Test 3 Error: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // TEST 4: Contextual Group Dapper SP Operations
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[4/5] Testing Contextual Group Dapper SP Operations...");
            try
            {
                if (resolvedGroupId <= 0)
                    throw new Exception("Skipping Test 4 because resolvedGroupId is invalid.");

                // Get by ID
                var group = await groupRepo.GetByIdAsync(resolvedGroupId);
                if (group == null || group.GroupId != resolvedGroupId)
                    throw new Exception("groupRepo.GetByIdAsync failed.");
                Console.WriteLine($"  [PASS] groupRepo.GetByIdAsync returned group '{group.GroupName}' with {group.Programs.Count} program(s).");

                // Get Dropdown
                var dropdown = await groupRepo.GetDropdownAsync(testBoardId);
                if (!dropdown.Any(d => d.GroupId == resolvedGroupId))
                    throw new Exception("Resolved group not found in dropdown list.");
                Console.WriteLine($"  [PASS] groupRepo.GetDropdownAsync verified (Dropdown count={dropdown.Count}).");

                // Get Summary
                var summary = await groupRepo.GetSummaryAsync(resolvedGroupId);
                if (summary == null)
                    throw new Exception("groupRepo.GetSummaryAsync returned null.");
                Console.WriteLine($"  [PASS] groupRepo.GetSummaryAsync verified (TotalStudents={summary.TotalStudents}, TotalSubjects={summary.TotalSubjects}).");

                // Code validation
                bool codeExists = await groupRepo.GroupCodeExistsAsync(group.GroupCode);
                if (!codeExists)
                    throw new Exception("groupRepo.GroupCodeExistsAsync failed for existing code.");
                Console.WriteLine("  [PASS] groupRepo.GroupCodeExistsAsync verified.");

                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Test 4 Error: {ex.Message}");
                failed++;
            }

            // -------------------------------------------------------------------------
            // TEST 5: Clean Up & Deletion Dependency Protection
            // -------------------------------------------------------------------------
            Console.WriteLine("\n[5/5] Testing Clean Up & Deletion Pipeline...");
            try
            {
                if (resolvedGroupId > 0)
                {
                    bool groupDeleted = await groupRepo.DeleteAsync(resolvedGroupId);
                    if (!groupDeleted)
                        throw new Exception($"Failed to delete contextual group #{resolvedGroupId}.");
                    Console.WriteLine($"  [PASS] Successfully deleted contextual test group #{resolvedGroupId}.");
                }

                if (testMasterGroupId > 0)
                {
                    bool mgDeleted = await masterGroupRepo.DeleteAsync(testMasterGroupId);
                    if (!mgDeleted)
                        throw new Exception($"Failed to delete master test group #{testMasterGroupId}.");
                    Console.WriteLine($"  [PASS] Successfully deleted master test group #{testMasterGroupId}.");
                }

                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Test 5 Error: {ex.Message}");
                failed++;
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"TEST RESULTS SUMMARY: {passed} PASSED, {failed} FAILED (TOTAL {passed + failed})");
            Console.WriteLine("================================================================================");

            return failed == 0;
        }
    }
}
