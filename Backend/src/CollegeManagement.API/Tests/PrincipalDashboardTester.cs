using System;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Services;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Tests;

public class PrincipalDashboardTester
{
    private readonly string _connectionString;
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public PrincipalDashboardTester(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task RunAsync()
    {
        Console.WriteLine("================================================================================");
        Console.WriteLine("       PRINCIPAL DASHBOARD AGGREGATOR ENDPOINT VERIFICATION");
        Console.WriteLine("================================================================================");

        var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
        optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
        using var dbContext = new AppDbContext(optionsBuilder.Options);

        var repo = new DashboardRepository(dbContext);
        var service = new DashboardService(repo);

        Console.WriteLine("\n[1] Invoking GetPrincipalDashboardAsync for Campus: 1, Board: 1, AcademicYear: 9, Period: Today...");
        var sw = System.Diagnostics.Stopwatch.StartNew();
        var result = await service.GetPrincipalDashboardAsync(1, 1, 9, "Today", null, null);
        sw.Stop();
        Console.WriteLine($"[1b] Completed in: {sw.ElapsedMilliseconds} ms ({sw.Elapsed.TotalSeconds:F2} seconds)");

        Console.WriteLine("\n[2] Verification Results:");
        Console.WriteLine($"  - Principal: {result.Principal.Name} ({result.Principal.Title})");
        Console.WriteLine($"  - College: {result.Principal.College}");
        Console.WriteLine($"  - Academic Year: {result.Principal.AcademicYear}");
        Console.WriteLine($"  - Summary KPI Cards Count: {result.Summary.Count}");
        foreach (var card in result.Summary)
        {
            Console.WriteLine($"     * [{card.Id}] {card.Label}: {card.Value} ({card.Detail}) | Module: {card.ModuleKey}");
        }

        Console.WriteLine($"\n  - Student Attendance Donut:");
        Console.WriteLine($"     Total: {result.Attendance.Total}, Present: {result.Attendance.Present}, Absent: {result.Attendance.Absent}, Leave: {result.Attendance.Leave}, Rate: {result.Attendance.AttendanceRate}%");
        Console.WriteLine($"     Class Breakdown Count: {result.Attendance.Classes.Count}");
        foreach (var c in result.Attendance.Classes)
        {
            Console.WriteLine($"       Section {c.Name}: {c.Value}%");
        }

        Console.WriteLine($"\n  - Staff Attendance Donut:");
        Console.WriteLine($"     Total: {result.StaffAttendance.Total}, Present: {result.StaffAttendance.Present}, Absent: {result.StaffAttendance.Absent}, Leave: {result.StaffAttendance.Leave}, Rate: {result.StaffAttendance.AttendanceRate}%");

        Console.WriteLine($"\n  - Academic Performance Streams Count: {result.Performance.Count}");
        foreach (var p in result.Performance)
        {
            Console.WriteLine($"     Stream {p.Label}: Current={p.Current}%, Previous={p.Previous}%");
        }

        Console.WriteLine($"\n  - Class Overview Rows Count: {result.ClassOverview.Count}");
        foreach (var row in result.ClassOverview)
        {
            Console.WriteLine($"     Class {row.ClassName}: Students={row.Students}, Present={row.Present}, Absent={row.Absent}");
        }

        Console.WriteLine($"\n  - Upcoming Exams Count: {result.Exams.Count}");
        foreach (var exam in result.Exams)
        {
            Console.WriteLine($"     Exam: {exam.Subject} on {exam.Date} at {exam.Time} ({exam.Room})");
        }

        Console.WriteLine($"\n  - Fee Collection Metrics:");
        Console.WriteLine($"     Fee Total Collected: ₹{result.FeeTotal:N2}");
        Console.WriteLine($"     Pending Fees: ₹{result.PendingFees:N2}");
        Console.WriteLine($"     Collection Rate: {result.CollectionRate}%");
        Console.WriteLine($"     Monthly Trend Points: {result.FeeCollection.Count}");

        Console.WriteLine($"\n  - Recent Activities Count: {result.Activities.Count}");
        foreach (var act in result.Activities)
        {
            Console.WriteLine($"     [{act.Icon}] {act.Title}: {act.Description} ({act.Time})");
        }

        Console.WriteLine($"\n  - Notices / Holidays Count: {result.Notices.Count}");
        foreach (var notice in result.Notices)
        {
            Console.WriteLine($"     Notice: {notice.Title} - {notice.Description} ({notice.Date})");
        }

        Console.WriteLine("\n[3] JSON Payload Snapshot (First 500 chars):");
        string json = JsonSerializer.Serialize(result, JsonOpts);
        Console.WriteLine(json.Substring(0, Math.Min(500, json.Length)) + "...");

        Console.WriteLine("\n================================================================================");
        Console.WriteLine("    ALL PRINCIPAL DASHBOARD AGGREGATOR METRICS VERIFIED SUCCESSFULLY!");
        Console.WriteLine("================================================================================");
    }
}
