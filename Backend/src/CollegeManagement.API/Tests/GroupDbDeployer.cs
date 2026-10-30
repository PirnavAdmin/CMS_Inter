using System;
using System.IO;
using System.Threading.Tasks;
using Dapper;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public static class GroupDbDeployer
    {
        public static async Task<bool> DeployAsync(string connectionString)
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("    DEPLOYING GROUP & MASTER GROUP STORED PROCEDURES & OPTIMIZATIONS            ");
            Console.WriteLine("================================================================================");

            var builder = new MySqlConnectionStringBuilder(connectionString)
            {
                AllowUserVariables = true
            };

            using var conn = new MySqlConnection(builder.ConnectionString);
            await conn.OpenAsync();
            Console.WriteLine($"Connected to database: {conn.Database}");

            // Harmonize session collation
            await conn.ExecuteAsync("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;");

            // 1. Verify and create Unique Composite Index for Context Resolution
            try
            {
                var idxExists = await conn.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Groups' AND INDEX_NAME = 'UQ_Groups_MasterGroup_Context';"
                );
                if (idxExists == 0)
                {
                    await conn.ExecuteAsync("CREATE UNIQUE INDEX `UQ_Groups_MasterGroup_Context` ON `Groups` (`MasterGroupId`, `BoardId`, `AcademicYearId`, `AcademicLevelId`);");
                    Console.WriteLine("[PASS] Created unique index UQ_Groups_MasterGroup_Context.");
                }
                else
                {
                    Console.WriteLine("[PASS] Unique index UQ_Groups_MasterGroup_Context already exists.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[NOTE] Unique index status: {ex.Message}");
            }

            string scriptPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Database", "Scripts", "StoredProcedures", "GroupModule", "01_Comprehensive_Group_MasterGroup_StoredProcedures.sql");
            if (!File.Exists(scriptPath))
            {
                scriptPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Database", "Scripts", "StoredProcedures", "GroupModule", "01_Comprehensive_Group_MasterGroup_StoredProcedures.sql"));
            }
            if (!File.Exists(scriptPath))
            {
                scriptPath = @"C:\Users\ADMIN\Desktop\CMS\Backend\src\CollegeManagement.API\Database\Scripts\StoredProcedures\GroupModule\01_Comprehensive_Group_MasterGroup_StoredProcedures.sql";
            }

            Console.WriteLine($"Loading SQL script from: {scriptPath}");
            if (!File.Exists(scriptPath))
            {
                Console.WriteLine($"[ERROR] Script not found at {scriptPath}");
                return false;
            }

            string fullSql = await File.ReadAllTextAsync(scriptPath);
            Console.WriteLine($"Script size: {fullSql.Length} characters.");

            int spCount = 0;
            try
            {
                var sections = fullSql.Split(new[] { "-- -------------------------------------------------------------------------------------" }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var section in sections)
                {
                    var text = section.Trim();
                    if (string.IsNullOrWhiteSpace(text) || text.StartsWith("-- =="))
                        continue;

                    int dropIdx = text.IndexOf("DROP PROCEDURE IF EXISTS", StringComparison.OrdinalIgnoreCase);
                    if (dropIdx >= 0)
                    {
                        int dropSemi = text.IndexOf(';', dropIdx);
                        if (dropSemi > dropIdx)
                        {
                            var dropStmt = text.Substring(dropIdx, dropSemi - dropIdx + 1).Trim();
                            await conn.ExecuteAsync(dropStmt);

                            int createIdx = text.IndexOf("CREATE PROCEDURE", dropSemi, StringComparison.OrdinalIgnoreCase);
                            if (createIdx >= 0)
                            {
                                var createStmt = text.Substring(createIdx).Trim();
                                await conn.ExecuteAsync(createStmt);
                                spCount++;
                            }
                        }
                    }
                }

                Console.WriteLine($"[PASS] Successfully deployed {spCount} stored procedures with utf8mb4_unicode_ci collation.");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[FAIL] Error deploying stored procedures: {ex.Message}");
                return false;
            }
        }
    }
}
