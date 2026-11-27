using System;
using System.Data;
using System.IO;
using System.Text.Json;
using MySqlConnector;

class Program
{
    static void Main(string[] args)
    {
        string appSettingsPath = Path.Combine(AppContext.BaseDirectory, "../../../../CollegeManagement.API/appsettings.json");
        if (!File.Exists(appSettingsPath))
        {
            appSettingsPath = Path.Combine(Directory.GetCurrentDirectory(), "Backend/src/CollegeManagement.API/appsettings.json");
        }
        
        string connStr = "";
        if (File.Exists(appSettingsPath))
        {
            var json = JsonDocument.Parse(File.ReadAllText(appSettingsPath));
            connStr = json.RootElement.GetProperty("ConnectionStrings").GetProperty("DefaultConnection").GetString() ?? "";
        }

        if (string.IsNullOrEmpty(connStr))
        {
            Console.WriteLine("Could not find ConnectionString in appsettings.json");
            return;
        }

        string sql = args.Length > 0 ? string.Join(" ", args) : Console.In.ReadToEnd();
        if (string.IsNullOrWhiteSpace(sql))
        {
            Console.WriteLine("No SQL provided.");
            return;
        }

        using var conn = new MySqlConnection(connStr);
        conn.Open();

        using var cmd = new MySqlCommand(sql, conn);
        cmd.CommandTimeout = 120;

        try
        {
            using var reader = cmd.ExecuteReader();
            bool hasResult = false;
            do
            {
                if (reader.HasRows)
                {
                    hasResult = true;
                    var schema = reader.GetColumnSchema();
                    var headers = new List<string>();
                    foreach (var col in schema)
                    {
                        headers.Add(col.ColumnName);
                    }
                    Console.WriteLine(string.Join("\t|\t", headers));
                    Console.WriteLine(new string('-', 80));

                    while (reader.Read())
                    {
                        var row = new List<string>();
                        for (int i = 0; i < reader.FieldCount; i++)
                        {
                            row.Add(reader.IsDBNull(i) ? "NULL" : reader.GetValue(i)?.ToString() ?? "");
                        }
                        Console.WriteLine(string.Join("\t|\t", row));
                    }
                    Console.WriteLine();
                }
            } while (reader.NextResult());

            if (!hasResult)
            {
                Console.WriteLine($"Query executed successfully. Affected rows: {reader.RecordsAffected}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
        }
    }
}
