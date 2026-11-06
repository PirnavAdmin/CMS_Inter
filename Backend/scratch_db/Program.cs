using System;
using System.Data;
using System.Linq;
using System.Collections.Generic;
using Dapper;
using MySql.Data.MySqlClient;

string connStr = "Server=collegemanagementdb-mysql-3069cc62-manikesandeep-1393.g.aivencloud.com;Port=19182;Database=CollegeManagement;User ID=avnadmin;Password=AVNS_jgPZED4pphZib4tvJID;SslMode=Required;Allow User Variables=True;";
using var conn = new MySqlConnection(connStr);
await conn.OpenAsync();

Console.WriteLine("Connected to database successfully!");

string[] sps = { "sp_GetResultStatistics", "sp_GetResultAnalysis", "sp_GetFailedStudents", "sp_GetRankList", "sp_ProcessResults", "sp_GetSectionResultSummaries" };
foreach (var sp in sps)
{
    try
    {
        var row = await conn.QueryFirstOrDefaultAsync<dynamic>($"SHOW CREATE PROCEDURE `{sp}`;");
        if (row != null)
        {
            var dict = (IDictionary<string, object>)row;
            Console.WriteLine($"\n================== {sp} ==================");
            Console.WriteLine(dict["Create Procedure"]?.ToString());
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error fetching {sp}: {ex.Message}");
    }
}

// Also check Examinations matching MPC or recent exams
Console.WriteLine("\n================== Recent Examinations ==================");
var exams = await conn.QueryAsync<dynamic>("SELECT ExaminationId, ExamName, ExamCode, BoardId, AcademicYearId, AcademicLevelId, GroupId, Status FROM Examinations ORDER BY ExaminationId DESC LIMIT 10;");
foreach (var e in exams)
{
    var dict = (IDictionary<string, object>)e;
    Console.WriteLine($"ExamId: {dict["ExaminationId"]}, Name: {dict["ExamName"]}, Code: {dict["ExamCode"]}, GroupId: {dict["GroupId"]}, Status: {dict["Status"]}");
}
