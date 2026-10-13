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

            string scriptPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Database", "Scripts", "StoredProcedures", "InventoryModule", "01_InventoryManagement_Complete_Schema_And_SPs.sql");
            if (!File.Exists(scriptPath))
            {
                scriptPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Database", "Scripts", "StoredProcedures", "InventoryModule", "01_InventoryManagement_Complete_Schema_And_SPs.sql"));
            }
            if (!File.Exists(scriptPath))
            {
                scriptPath = @"C:\Users\ADMIN\Desktop\CMS\Backend\src\CollegeManagement.API\Database\Scripts\StoredProcedures\InventoryModule\01_InventoryManagement_Complete_Schema_And_SPs.sql";
            }

            Console.WriteLine($"Loading SQL script from: {scriptPath}");
            if (!File.Exists(scriptPath))
            {
                throw new FileNotFoundException($"Inventory SQL deployment script not found at {scriptPath}");
            }

            string fullSql = await File.ReadAllTextAsync(scriptPath);

            var lines = fullSql.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
            string delimiter = ";";
            var currentStatement = new System.Text.StringBuilder();
            int count = 0;

            foreach (var rawLine in lines)
            {
                string trimmed = rawLine.Trim();

                // Skip full line comments
                if (trimmed.StartsWith("--") || (trimmed.StartsWith("/*") && trimmed.EndsWith("*/")))
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
                            Console.WriteLine($"[Statement {count + 1}] Executing: {sql.Substring(0, Math.Min(60, sql.Length)).Replace("\r", " ").Replace("\n", " ")}...");
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
                            Console.WriteLine($"[Statement {count + 1}] Executing SP: {sql.Substring(0, Math.Min(60, sql.Length)).Replace("\r", " ").Replace("\n", " ")}...");
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

            if (currentStatement.Length > 0)
            {
                string sql = currentStatement.ToString().Trim();
                if (!string.IsNullOrWhiteSpace(sql))
                {
                    Console.WriteLine($"[Statement {count + 1}] Executing final: {sql.Substring(0, Math.Min(60, sql.Length)).Replace("\r", " ").Replace("\n", " ")}...");
                    using var cmd = new MySqlCommand(sql, conn);
                    await cmd.ExecuteNonQueryAsync();
                    count++;
                }
            }

            Console.WriteLine($"\nSUCCESS: Executed {count} SQL statements.");
            Console.WriteLine("Inventory Management tables, seed data, and stored procedures deployed successfully!\n");
        }
    }
}
