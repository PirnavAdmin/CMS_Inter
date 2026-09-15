using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using MySqlConnector;

namespace CollegeManagement.API.Tests;

public class DashboardDbInspector
{
    private readonly string _connectionString;

    public DashboardDbInspector(string connectionString)
    {
        _connectionString = connectionString;
    }

    public async Task InspectAsync()
    {
        Console.WriteLine("================================================================================");
        Console.WriteLine("          DEEP DATABASE SEARCH FOR CERTIFICATES & DATA");
        Console.WriteLine("================================================================================");

        using var conn = new MySqlConnection(_connectionString);
        await conn.OpenAsync();
        var dbName = await conn.ExecuteScalarAsync<string>("SELECT DATABASE();");
        Console.WriteLine($"Database: {dbName}\n");

        var allTables = (await conn.QueryAsync<string>("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE();")).ToList();
        Console.WriteLine($"Total tables in database: {allTables.Count}");
        Console.WriteLine("Tables: " + string.Join(", ", allTables));

        Console.WriteLine("\n--- ACADEMIC YEARS ---");
        var ayRows = await conn.QueryAsync<dynamic>("SELECT * FROM `AcademicYears`;");
        foreach (IDictionary<string, object> r in ayRows)
        {
            Console.WriteLine("  AY: " + string.Join(" | ", r.Select(kv => $"{kv.Key}: {kv.Value}")));
        }

        Console.WriteLine("\n--- STUDENTS ATTENDANCE SESSIONS & ATTENDANCES TODAY ---");
        try {
            var attSessions = await conn.QueryAsync<dynamic>("SELECT * FROM `attendance_sessions` WHERE DATE(AttendanceDate) = CURDATE() OR DATE(CreatedAt) = CURDATE();");
            foreach (IDictionary<string, object> r in attSessions) {
                Console.WriteLine("  AttSession: " + string.Join(" | ", r.Select(kv => $"{kv.Key}: {kv.Value}")));
            }
        } catch (Exception ex) { Console.WriteLine("  Error querying attendance_sessions: " + ex.Message); }

        try {
            var attRecords = await conn.QueryAsync<dynamic>("SELECT a.*, s.StudentName, s.BoardId, s.AcademicYearId FROM `Attendances` a INNER JOIN `Students` s ON a.StudentId = s.StudentId WHERE DATE(a.AttendanceDate) = CURDATE();");
            Console.WriteLine($"  Total Attendances today in Attendances table: {attRecords.Count()}");
            foreach (IDictionary<string, object> r in attRecords.Take(10)) {
                Console.WriteLine("  Attendance: " + string.Join(" | ", r.Select(kv => $"{kv.Key}: {kv.Value}")));
            }
        } catch (Exception ex) { Console.WriteLine("  Error querying Attendances: " + ex.Message); }

        Console.WriteLine("\n--- STAFF ATTENDANCE SESSIONS TODAY ---");
        try {
            var staffAtt = await conn.QueryAsync<dynamic>("SELECT * FROM `StaffAttendanceSessions` WHERE DATE(AttendanceDate) = CURDATE();");
            foreach (IDictionary<string, object> r in staffAtt) {
                Console.WriteLine("  StaffAttSession: " + string.Join(" | ", r.Select(kv => $"{kv.Key}: {kv.Value}")));
            }
        } catch (Exception ex) { Console.WriteLine("  Error querying StaffAttendanceSessions: " + ex.Message); }

        Console.WriteLine("\n--- EXAMINATIONS ---");
        try {
            var exams = await conn.QueryAsync<dynamic>("SELECT ExaminationId, ExamName, ExamCode, Status, StartDate, EndDate, IsActive, BoardId, AcademicYearId FROM `Examinations`;");
            foreach (IDictionary<string, object> r in exams) {
                Console.WriteLine("  Exam: " + string.Join(" | ", r.Select(kv => $"{kv.Key}: {kv.Value}")));
            }
        } catch (Exception ex) { Console.WriteLine("  Error querying Examinations: " + ex.Message); }
    }
}
