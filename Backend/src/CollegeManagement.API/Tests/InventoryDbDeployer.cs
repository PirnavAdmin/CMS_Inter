using System;
using System.IO;
using System.Threading.Tasks;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public static class InventoryDbDeployer
    {
        public static async Task DeployAsync(string connectionString)
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("       DEPLOYING INVENTORY MANAGEMENT MODULE SCHEMA & STORED PROCEDURES        ");
            Console.WriteLine("================================================================================");

            var builder = new MySqlConnectionStringBuilder(connectionString)
            {
                AllowUserVariables = true
            };
            using var conn = new MySqlConnection(builder.ConnectionString);
            await conn.OpenAsync();
            Console.WriteLine($"Connected to database: {conn.Database}");

            string[] scripts = new[]
            {
                "17_InventoryManagement_Crud_SPs.sql"
            };

            foreach (var scriptName in scripts)
            {
                string scriptPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Database", "Scripts", "StoredProcedures", "InventoryModule", scriptName);
                if (!File.Exists(scriptPath))
                {
                    scriptPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Database", "Scripts", "StoredProcedures", "InventoryModule", scriptName));
                }
                if (!File.Exists(scriptPath))
                {
                    scriptPath = Path.Combine(@"C:\Users\admin\OneDrive\Desktop\CMS\Backend\src\CollegeManagement.API\Database\Scripts\StoredProcedures\InventoryModule", scriptName);
                }

                Console.WriteLine($"\nLoading SQL script: {scriptName} from {scriptPath}");
                if (!File.Exists(scriptPath))
                {
                    throw new FileNotFoundException($"Inventory SQL deployment script not found at {scriptPath}");
                }

                await ExecuteScriptAsync(conn, scriptPath);
            }

            Console.WriteLine("\n[SUCCESS] All Inventory Stored Procedures and Schema deployed successfully.");
        }

        private static async Task ExecuteScriptAsync(MySqlConnection conn, string scriptPath)
        {
            string fullSql = await File.ReadAllTextAsync(scriptPath);
            var lines = fullSql.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
            string delimiter = ";";
            var currentStatement = new System.Text.StringBuilder();
            int count = 0;

            foreach (var rawLine in lines)
            {
                string trimmed = rawLine.Trim();

                // Skip comments and USE statements (database is already selected by connection)
                if (trimmed.StartsWith("--") || 
                    (trimmed.StartsWith("/*") && trimmed.EndsWith("*/")) ||
                    trimmed.StartsWith("USE ", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (trimmed.StartsWith("DELIMITER", StringComparison.OrdinalIgnoreCase))
                {
                    delimiter = trimmed.Substring(9).Trim();
                    continue;
                }

                if (string.IsNullOrEmpty(delimiter) || delimiter == ";")
                {
                    if (trimmed.EndsWith(";"))
                    {
                        currentStatement.AppendLine(rawLine.Substring(0, rawLine.LastIndexOf(';')));
                        string sql = currentStatement.ToString().Trim();
                        currentStatement.Clear();

                        if (!string.IsNullOrWhiteSpace(sql))
                        {
                            try
                            {
                                using var cmd = new MySqlCommand(sql, conn);
                                await cmd.ExecuteNonQueryAsync();
                                count++;
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"\n[ERROR on Statement {count + 1}]:\n{sql}\nError: {ex.Message}\n");
                                throw;
                            }
                        }
                        continue;
                    }
                }
                else
                {
                    if (trimmed.EndsWith(delimiter))
                    {
                        currentStatement.AppendLine(rawLine.Substring(0, rawLine.LastIndexOf(delimiter)));
                        string sql = currentStatement.ToString().Trim();
                        currentStatement.Clear();

                        if (!string.IsNullOrWhiteSpace(sql))
                        {
                            try
                            {
                                using var cmd = new MySqlCommand(sql, conn);
                                await cmd.ExecuteNonQueryAsync();
                                count++;
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"\n[ERROR on SP Statement {count + 1}]:\n{sql}\nError: {ex.Message}\n");
                                throw;
                            }
                        }
                        continue;
                    }
                }

                currentStatement.AppendLine(rawLine);
            }

            Console.WriteLine($"  Executed {count} statements from {Path.GetFileName(scriptPath)}");
        }
    }
}
