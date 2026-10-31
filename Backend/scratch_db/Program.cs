using System;
using System.Data;
using System.Linq;
using System.Collections.Generic;
using Dapper;
using MySql.Data.MySqlClient;

string connStr = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;ConvertZeroDateTime=True;Pooling=true;MinimumPoolSize=1;MaximumPoolSize=5;";
using var conn = new MySqlConnection(connStr);
await conn.OpenAsync();

var allTables = (await conn.QueryAsync<string>("SHOW TABLES;")).ToList();
var approvalTables = allTables.Where(t => t.Contains("Approval", StringComparison.OrdinalIgnoreCase) || t.Contains("Exam", StringComparison.OrdinalIgnoreCase) || t.Contains("Leave", StringComparison.OrdinalIgnoreCase)).ToList();

Console.WriteLine("Relevant tables:");
foreach (var t in approvalTables)
{
    var count = await conn.ExecuteScalarAsync<int>($"SELECT COUNT(*) FROM `{t}`;");
    Console.WriteLine($"  {t} ({count} rows)");
}

// Check if Examination has approval fields or an approvals table
var examCols = (await conn.QueryAsync("DESCRIBE Examinations;")).ToList();
Console.WriteLine("\nExaminations approval-related columns:");
foreach (var c in examCols)
{
    var d = (IDictionary<string, object>)c;
    string col = d["Field"]?.ToString() ?? "";
    if (col.Contains("Approv", StringComparison.OrdinalIgnoreCase) || col.Contains("Status", StringComparison.OrdinalIgnoreCase))
    {
        Console.WriteLine($"  {col} ({d["Type"]})");
    }
}
