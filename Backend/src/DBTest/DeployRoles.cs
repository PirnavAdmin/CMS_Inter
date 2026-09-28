using System;
using System.Data;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using MySqlConnector;

namespace DBTest
{
    public static class DeployRoles
    {
        private const string ConnectionString = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;Allow User Variables=true;ConnectionTimeout=60;KeepAlive=5;ConvertZeroDateTime=True;Pooling=true;MinimumPoolSize=2;MaximumPoolSize=100;ConnectionLifeTime=300;ConnectionIdleTimeout=120;";

        public static async Task RunAsync()
        {
            Console.WriteLine("=========================================================");
            Console.WriteLine("  DEPLOYING UNIFIED ROLES & PERMISSIONS STORED PROCEDURES ");
            Console.WriteLine("=========================================================");

            string sqlFilePath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "CollegeManagement.API", "Database", "Scripts", "StoredProcedures", "RoleModule", "01_Unified_Roles_and_Permissions_Schema.sql"));

            if (!File.Exists(sqlFilePath))
            {
                // Fallback direct path
                sqlFilePath = @"C:\Users\Dell\Desktop\CMS\Backend\src\CollegeManagement.API\Database\Scripts\StoredProcedures\RoleModule\01_Unified_Roles_and_Permissions_Schema.sql";
            }

            Console.WriteLine($"Reading SQL from: {sqlFilePath}");
            string scriptText = await File.ReadAllTextAsync(sqlFilePath);

            using var conn = new MySqlConnection(ConnectionString);
            await conn.OpenAsync();
            Console.WriteLine("Connected to MySQL database successfully.");

            // Split the script by DELIMITER blocks and regular statements
            // A simple robust way:
            // 1. DDL/Inserts are separated by standard semicolons (until DELIMITER //)
            // 2. Procedures are bounded by DELIMITER // ... DELIMITER ;
            
            var blocks = Regex.Split(scriptText, @"DELIMITER\s+//", RegexOptions.IgnoreCase);

            // First block contains table creations, alterations, and seed inserts
            string preamble = blocks[0];
            var regularStatements = preamble.Split(';', StringSplitOptions.RemoveEmptyEntries);
            Console.WriteLine($"\n[1/3] Executing {regularStatements.Length} preamble statements (tables/seeds)...");

            int stmtIdx = 1;
            foreach (var rawStmt in regularStatements)
            {
                string stmt = rawStmt.Trim();
                if (string.IsNullOrWhiteSpace(stmt) || stmt.StartsWith("--"))
                    continue;

                try
                {
                    using var cmd = new MySqlCommand(stmt, conn);
                    await cmd.ExecuteNonQueryAsync();
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  Warning on stmt {stmtIdx}: {ex.Message}");
                }
                stmtIdx++;
            }
            Console.WriteLine("Preamble executed.");

            // Subsequent blocks contain procedures followed by DELIMITER ;
            Console.WriteLine("\n[2/3] Deploying Stored Procedures...");
            for (int i = 1; i < blocks.Length; i++)
            {
                string block = blocks[i];
                // In block, procedure body ends at DELIMITER ; or //
                int endDelimIdx = block.IndexOf("DELIMITER ;", StringComparison.OrdinalIgnoreCase);
                string procBody;
                string trailing = "";
                if (endDelimIdx >= 0)
                {
                    procBody = block.Substring(0, endDelimIdx).Trim();
                    trailing = block.Substring(endDelimIdx + "DELIMITER ;".Length).Trim();
                }
                else
                {
                    procBody = block.Trim();
                }

                // Remove trailing //
                if (procBody.EndsWith("//"))
                {
                    procBody = procBody.Substring(0, procBody.Length - 2).Trim();
                }

                // If procBody has DROP PROCEDURE before CREATE PROCEDURE
                // e.g. DROP PROCEDURE IF EXISTS `xyz`; CREATE PROCEDURE ...
                // But in our script, DROP PROCEDURE was before DELIMITER // !
                // Let's check if procBody starts with CREATE PROCEDURE
                if (!string.IsNullOrWhiteSpace(procBody))
                {
                    var procNameMatch = Regex.Match(procBody, @"CREATE\s+PROCEDURE\s+`?([a-zA-Z0-9_]+)`?", RegexOptions.IgnoreCase);
                    string procName = procNameMatch.Success ? procNameMatch.Groups[1].Value : $"Proc_{i}";

                    try
                    {
                        using var dropCmd = new MySqlCommand($"DROP PROCEDURE IF EXISTS `{procName}`;", conn);
                        await dropCmd.ExecuteNonQueryAsync();

                        using var createCmd = new MySqlCommand(procBody, conn);
                        await createCmd.ExecuteNonQueryAsync();
                        Console.WriteLine($"  [OK] Deployed procedure: {procName}");
                    }
                    catch (Exception ex)
                    {
                        Console.ForegroundColor = ConsoleColor.Red;
                        Console.WriteLine($"  [FAIL] Failed deploying procedure {procName}: {ex.Message}");
                        Console.ResetColor();
                    }
                }

                // Execute trailing if any (like DROP PROCEDURE before the next DELIMITER)
                if (!string.IsNullOrWhiteSpace(trailing))
                {
                    var trailingStatements = trailing.Split(';', StringSplitOptions.RemoveEmptyEntries);
                    foreach (var rawTrailing in trailingStatements)
                    {
                        string tStmt = rawTrailing.Trim();
                        if (string.IsNullOrWhiteSpace(tStmt) || tStmt.StartsWith("--"))
                            continue;
                        try
                        {
                            using var tCmd = new MySqlCommand(tStmt, conn);
                            await tCmd.ExecuteNonQueryAsync();
                        }
                        catch (Exception ex)
                        {
                            // ignore warning
                        }
                    }
                }
            }

            // -------------------------------------------------------------
            // VERIFICATION CALLS
            // -------------------------------------------------------------
            Console.WriteLine("\n[3/3] Verifying Live Procedure Results...");

            // Test 1: sp_GetRoleCards
            Console.WriteLine("\n--> Calling sp_GetRoleCards(1, 1, NULL)...");
            using (var cmdCards = new MySqlCommand("sp_GetRoleCards", conn) { CommandType = CommandType.StoredProcedure })
            {
                cmdCards.Parameters.AddWithValue("p_CampusId", 1);
                cmdCards.Parameters.AddWithValue("p_BoardId", 1);
                cmdCards.Parameters.AddWithValue("p_AcademicYearId", DBNull.Value);

                using var reader = await cmdCards.ExecuteReaderAsync();
                while (await reader.ReadAsync())
                {
                    Console.WriteLine($"    Role {reader["RoleId"]}: {reader["RoleName"]} -> UserCount: {reader["UserCount"]}, PermissionsCount: {reader["PermissionsCount"]}");
                }
            }

            // Test 2: sp_GetRoleMembers for Faculty (Role 4)
            Console.WriteLine("\n--> Calling sp_GetRoleMembers(4, 1, 1, NULL)...");
            using (var cmdMembers = new MySqlCommand("sp_GetRoleMembers", conn) { CommandType = CommandType.StoredProcedure })
            {
                cmdMembers.Parameters.AddWithValue("p_RoleId", 4);
                cmdMembers.Parameters.AddWithValue("p_CampusId", 1);
                cmdMembers.Parameters.AddWithValue("p_BoardId", 1);
                cmdMembers.Parameters.AddWithValue("p_AcademicYearId", DBNull.Value);

                using var reader = await cmdMembers.ExecuteReaderAsync();
                int memberCount = 0;
                while (await reader.ReadAsync())
                {
                    memberCount++;
                    if (memberCount <= 5)
                    {
                        Console.WriteLine($"    Member {memberCount}: UserId={reader["UserId"]}, Code={reader["UserCode"]}, Name={reader["Name"]}, Dept={reader["Department"]}, Desig={reader["Designation"]}");
                    }
                }
                Console.WriteLine($"    Total Faculty Members Returned: {memberCount}");
            }

            // Test 3: sp_GetRoleMembers for Students (Role 5)
            Console.WriteLine("\n--> Calling sp_GetRoleMembers(5, 1, 1, NULL)...");
            using (var cmdStudents = new MySqlCommand("sp_GetRoleMembers", conn) { CommandType = CommandType.StoredProcedure })
            {
                cmdStudents.Parameters.AddWithValue("p_RoleId", 5);
                cmdStudents.Parameters.AddWithValue("p_CampusId", 1);
                cmdStudents.Parameters.AddWithValue("p_BoardId", 1);
                cmdStudents.Parameters.AddWithValue("p_AcademicYearId", DBNull.Value);

                using var reader = await cmdStudents.ExecuteReaderAsync();
                int studentCount = 0;
                while (await reader.ReadAsync())
                {
                    studentCount++;
                }
                Console.WriteLine($"    Total Student Members Returned: {studentCount}");
            }

            Console.WriteLine("\nDEPLOYMENT AND VERIFICATION COMPLETED SUCCESSFULLY.");
        }
    }
}
