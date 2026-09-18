using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Reports;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Models.Reports;
using Dapper;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace CollegeManagement.API.Tests;

public class ReportDbDiagnostic
{
    private readonly string _connectionString;

    public ReportDbDiagnostic(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task RunDiagnosticAsync()
    {
        Console.WriteLine("================================================================================");
        Console.WriteLine("    DETAILED DIRECT EF CORE METHOD EXCEPTION ISOLATION");
        Console.WriteLine("================================================================================");

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
        using var _context = new AppDbContext(optionsBuilder.Options);

        // Inspect student 7
        Console.WriteLine("\n[Student 7 Inspection]");
        var conn = _context.Database.GetDbConnection();
        var stu7 = await conn.QueryFirstOrDefaultAsync("SELECT * FROM Students WHERE StudentId = 7");
        if (stu7 != null)
        {
            Console.WriteLine($"Student 7: StudentId={stu7.StudentId}, Name={stu7.StudentName}, BoardId={stu7.BoardId}, AY={stu7.AcademicYearId}, GroupId={stu7.GroupId}, SectionId={stu7.SectionId}, IsActive={stu7.IsActive}");
        }
        else
        {
            Console.WriteLine("Student 7 does NOT exist in Students table!");
        }

        var resultsAll = await conn.QueryAsync("SELECT * FROM Results");
        foreach (var r in resultsAll)
        {
            Console.WriteLine($"Result: ResultId={r.ResultId}, StudentId={r.StudentId}, BoardId={r.BoardId}, AY={r.AcademicYearId}, Level={r.AcademicLevelId}, GroupId={r.GroupId}, ExamId={r.ExamId}, SubjectId={r.SubjectId}, Marks={r.TotalMarks}, Status={r.ResultStatus}, Published={r.IsPublished}");
        }
    }
}
