using System;
using System.IO;
using System.Threading.Tasks;
using Dapper;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public static class SectionDbDeployer
    {
        public static async Task<bool> DeployAsync(string connectionString)
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("    DEPLOYING SECTION MODULE STORED PROCEDURES & OPTIMIZATIONS                  ");
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

            // Verify or create performance composite index on Sections table
            try
            {
                var idxExists = await conn.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Sections' AND INDEX_NAME = 'IX_Sections_Campus_Year_Group';"
                );
                if (idxExists == 0)
                {
                    await conn.ExecuteAsync("CREATE INDEX `IX_Sections_Campus_Year_Group` ON `Sections` (`CampusId`, `AcademicYearId`, `GroupId`, `IsActive`);");
                    Console.WriteLine("[PASS] Created index IX_Sections_Campus_Year_Group.");
                }
                else
                {
                    Console.WriteLine("[PASS] Index IX_Sections_Campus_Year_Group already exists.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[NOTE] Index check: {ex.Message}");
            }

            string scriptPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Database", "Scripts", "StoredProcedures", "SectionModule", "01_Unified_Section_Stored_Procedures.sql");
            if (!File.Exists(scriptPath))
            {
                scriptPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Database", "Scripts", "StoredProcedures", "SectionModule", "01_Unified_Section_Stored_Procedures.sql"));
            }
            if (!File.Exists(scriptPath))
            {
                scriptPath = @"C:\Users\ADMIN\Desktop\CMS\Backend\src\CollegeManagement.API\Database\Scripts\StoredProcedures\SectionModule\01_Unified_Section_Stored_Procedures.sql";
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
                var sections = fullSql.Split(new[] { "-- ------------------------------------------------------------------------------------" }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var section in sections)
                {
                    var text = section.Trim();
                    if (string.IsNullOrWhiteSpace(text) || text.StartsWith("-- =="))
                        continue;

                    int createIdx = text.IndexOf("CREATE PROCEDURE", StringComparison.OrdinalIgnoreCase);
                    if (createIdx < 0)
                        continue;

                    // Extract procedure name
                    int nameStart = createIdx + "CREATE PROCEDURE".Length;
                    while (nameStart < text.Length && (char.IsWhiteSpace(text[nameStart]) || text[nameStart] == '`'))
                        nameStart++;
                    int nameEnd = nameStart;
                    while (nameEnd < text.Length && text[nameEnd] != '(' && text[nameEnd] != '`' && !char.IsWhiteSpace(text[nameEnd]))
                        nameEnd++;

                    string procName = text.Substring(nameStart, nameEnd - nameStart).Trim('`', ' ');

                    // Drop existing procedure
                    await conn.ExecuteAsync($"DROP PROCEDURE IF EXISTS `{procName}`;");

                    // Extract body starting at CREATE PROCEDURE
                    string body = text.Substring(createIdx);
                    body = body.Replace("DELIMITER ;", "").Replace("DELIMITER //", "").Trim();
                    while (body.EndsWith("//") || body.EndsWith(";") || char.IsWhiteSpace(body[body.Length - 1]))
                    {
                        if (body.EndsWith("//"))
                            body = body.Substring(0, body.Length - 2).Trim();
                        else if (body.EndsWith(";"))
                            body = body.Substring(0, body.Length - 1).Trim();
                        else
                            body = body.TrimEnd();
                    }

                    await conn.ExecuteAsync(body);
                    spCount++;
                    Console.WriteLine($"  [DEPLOYED] `{procName}`");
                }

                Console.WriteLine($"\n[PASS] Successfully deployed {spCount} stored procedures to database.");
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
