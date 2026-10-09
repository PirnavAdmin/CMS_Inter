using System;
using MySql.Data.MySqlClient;
using Dapper;
using System.Text.Json;

string connStr = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;";

try
{
    using var connection = new MySqlConnection(connStr);
    
    var prog = connection.Query("SELECT ProgramId, ProgramName FROM Programs WHERE ProgramId = 1");
    Console.WriteLine("--- PROGRAM 1 ---");
    Console.WriteLine(JsonSerializer.Serialize(prog, new JsonSerializerOptions { WriteIndented = true }));

    var sec = connection.Query("SELECT SectionId, SectionName, ProgramId FROM Sections WHERE SectionId = 30");
    Console.WriteLine("\n--- SECTION 30 ---");
    Console.WriteLine(JsonSerializer.Serialize(sec, new JsonSerializerOptions { WriteIndented = true }));
    
    var group = connection.Query("SELECT GroupId, GroupName FROM StudentGroups WHERE GroupId = 37");
    Console.WriteLine("\n--- GROUP 37 ---");
    Console.WriteLine(JsonSerializer.Serialize(group, new JsonSerializerOptions { WriteIndented = true }));
}
catch (Exception ex)
{
    Console.WriteLine("Error: " + ex.Message);
}
