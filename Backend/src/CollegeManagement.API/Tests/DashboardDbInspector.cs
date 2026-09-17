using System;
using System.Collections.Generic;
using System.Data;
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
        Console.WriteLine("    FORENSIC LIVE DATABASE INSPECTION FOR DASHBOARD RECONCILIATION");
        Console.WriteLine("================================================================================");

        using var conn = new MySqlConnection(_connectionString);
        await conn.OpenAsync();
        var dbName = await conn.ExecuteScalarAsync<string>("SELECT DATABASE();");
        Console.WriteLine($"Database: {dbName}\n");

        // Helper to print table columns
        async Task PrintColumns(string tableName)
        {
            Console.WriteLine($"\n--- SCHEMA: {tableName} ---");
            try
            {
                var cols = await conn.QueryAsync<dynamic>(@"
                    SELECT column_name, data_type, is_nullable, column_default, column_key
                    FROM information_schema.columns
                    WHERE table_schema = DATABASE() AND table_name = @tableName
                    ORDER BY ordinal_position;", new { tableName });
                foreach (var c in cols)
                {
                    Console.WriteLine($"  {c.column_name,-25} | {c.data_type,-15} | Nullable: {c.is_nullable,-3} | Key: {c.column_key,-3} | Def: {c.column_default}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [ERROR] {ex.Message}");
            }
        }

        // 1. Boards & Academic Years
        await PrintColumns("Boards");
        var boards = await conn.QueryAsync<dynamic>("SELECT BoardId, BoardName, BoardCode, IsActive FROM Boards;");
        Console.WriteLine("  Boards Data:");
        foreach (var b in boards) Console.WriteLine($"    BoardId: {b.BoardId}, Code: '{b.BoardCode}', Name: '{b.BoardName}', IsActive: {b.IsActive}");

        await PrintColumns("AcademicYears");
        var ays = await conn.QueryAsync<dynamic>("SELECT AcademicYearId, AcademicYearName, BoardId, StartDate, EndDate, IsActive FROM AcademicYears ORDER BY StartDate DESC;");
        Console.WriteLine("  Academic Years Data:");
        foreach (var a in ays) Console.WriteLine($"    AY_ID: {a.AcademicYearId}, Name: '{a.AcademicYearName}', BoardId: {a.BoardId}, Range: {a.StartDate:yyyy-MM-dd} to {a.EndDate:yyyy-MM-dd}, IsActive: {a.IsActive}");

        // 2. Students & StudentAdmissions
        await PrintColumns("Students");
        await PrintColumns("StudentAdmissions");

        Console.WriteLine("\n--- STUDENTS COUNTS & GROUPINGS ---");
        var studentCounts = await conn.QueryAsync<dynamic>(@"
            SELECT BoardId, AcademicYearId, IsActive, COUNT(*) as Cnt 
            FROM Students 
            GROUP BY BoardId, AcademicYearId, IsActive;");
        foreach (var s in studentCounts) Console.WriteLine($"    BoardId: {s.BoardId}, AcademicYearId: {s.AcademicYearId}, IsActive: {s.IsActive}, Count: {s.Cnt}");

        var totalActiveStudents = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM Students WHERE IsActive = 1 OR IsActive IS NULL;");
        Console.WriteLine($"  Total Active Students in DB: {totalActiveStudents}");

        // Check if StudentAdmissions has records
        try {
            var saCount = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM StudentAdmissions;");
            Console.WriteLine($"  Total records in StudentAdmissions table: {saCount}");
        } catch (Exception ex) { Console.WriteLine("  StudentAdmissions table query error: " + ex.Message); }

        // Monthly Admission Date Distribution in Students
        Console.WriteLine("\n--- MONTHLY ADMISSION TREND IN STUDENTS ---");
        var monthlyAdmissions = await conn.QueryAsync<dynamic>(@"
            SELECT 
                BoardId,
                AcademicYearId,
                DATE_FORMAT(AdmissionDate, '%Y-%m') as YearMonth,
                DATE_FORMAT(AdmissionDate, '%b %Y') as Period,
                COUNT(*) as Cnt
            FROM Students
            WHERE (IsActive = 1 OR IsActive IS NULL) AND AdmissionDate IS NOT NULL
            GROUP BY BoardId, AcademicYearId, DATE_FORMAT(AdmissionDate, '%Y-%m'), DATE_FORMAT(AdmissionDate, '%b %Y')
            ORDER BY YearMonth ASC;");
        foreach (var m in monthlyAdmissions) Console.WriteLine($"    BoardId: {m.BoardId}, AY: {m.AcademicYearId}, Month: {m.Period}, Count: {m.Cnt}");

        // 3. Staff Classification
        await PrintColumns("Staff");
        Console.WriteLine("\n--- STAFF BREAKDOWN ---");
        var staffData = await conn.QueryAsync<dynamic>(@"
            SELECT BoardId, StaffType, Status, IsDeleted, COUNT(*) as Cnt
            FROM Staff
            GROUP BY BoardId, StaffType, Status, IsDeleted;");
        foreach (var st in staffData) Console.WriteLine($"    BoardId: {st.BoardId}, StaffType: '{st.StaffType}', Status: '{st.Status}', IsDeleted: {st.IsDeleted}, Count: {st.Cnt}");

        // 4. Groups & Sections
        await PrintColumns("Groups");
        Console.WriteLine("\n--- GROUPS DATA ---");
        var groups = await conn.QueryAsync<dynamic>(@"
            SELECT GroupId, GroupName, GroupCode, BoardId, AcademicYearId, AcademicLevelId, IsActive 
            FROM `Groups`;");
        foreach (var g in groups) Console.WriteLine($"    GroupId: {g.GroupId}, Name: '{g.GroupName}', Code: '{g.GroupCode}', BoardId: {g.BoardId}, AY: {g.AcademicYearId}, Level: {g.AcademicLevelId}, IsActive: {g.IsActive}");

        Console.WriteLine("\n--- STUDENTS BY GROUP ---");
        var studentsByGroup = await conn.QueryAsync<dynamic>(@"
            SELECT 
                s.BoardId,
                s.AcademicYearId,
                s.GroupId,
                COALESCE(g.GroupName, CONCAT('Group #', s.GroupId)) as GroupName,
                COUNT(s.StudentId) as StudentCount
            FROM Students s
            LEFT JOIN `Groups` g ON s.GroupId = g.GroupId
            WHERE (s.IsActive = 1 OR s.IsActive IS NULL)
            GROUP BY s.BoardId, s.AcademicYearId, s.GroupId, g.GroupName;");
        foreach (var sg in studentsByGroup) Console.WriteLine($"    BoardId: {sg.BoardId}, AY: {sg.AcademicYearId}, GroupId: {sg.GroupId}, GroupName: '{sg.GroupName}', Count: {sg.StudentCount}");

        await PrintColumns("Sections");
        Console.WriteLine("\n--- SECTIONS DATA ---");
        var sections = await conn.QueryAsync<dynamic>(@"
            SELECT SectionId, SectionName, GroupId, BoardId, AcademicYearId, IsActive 
            FROM `Sections`;");
        foreach (var sec in sections) Console.WriteLine($"    SectionId: {sec.SectionId}, Name: '{sec.SectionName}', GroupId: {sec.GroupId}, BoardId: {sec.BoardId}, AY: {sec.AcademicYearId}, IsActive: {sec.IsActive}");

        // 5. Attendances
        await PrintColumns("Attendances");
        Console.WriteLine("\n--- ATTENDANCES TODAY ---");
        var attToday = await conn.QueryAsync<dynamic>(@"
            SELECT 
                Status,
                COUNT(*) as Cnt
            FROM Attendances
            WHERE DATE(AttendanceDate) = CURDATE()
            GROUP BY Status;");
        foreach (var at in attToday) Console.WriteLine($"    Status: '{at.Status}', Count: {at.Cnt}");

        // 6. Staff Attendance Sessions
        await PrintColumns("StaffAttendanceSessions");
        Console.WriteLine("\n--- STAFF ATTENDANCE SESSIONS TODAY ---");
        var staffAttSessions = await conn.QueryAsync<dynamic>(@"
            SELECT * FROM StaffAttendanceSessions WHERE DATE(AttendanceDate) = CURDATE();");
        foreach (IDictionary<string, object> row in staffAttSessions)
        {
            Console.WriteLine("    StaffAttSession: " + string.Join(" | ", row.Select(kv => $"{kv.Key}: {kv.Value}")));
        }

        // 7. Certificates
        await PrintColumns("certificates");
        Console.WriteLine("\n--- CERTIFICATES BREAKDOWN BY STATUS ---");
        var certCounts = await conn.QueryAsync<dynamic>(@"
            SELECT Status, CertificateType, COUNT(*) as Cnt
            FROM certificates
            GROUP BY Status, CertificateType;");
        foreach (var c in certCounts) Console.WriteLine($"    Status: '{c.Status}', Type: '{c.CertificateType}', Count: {c.Cnt}");

        // 8. Examinations
        await PrintColumns("Examinations");
        Console.WriteLine("\n--- EXAMINATIONS BREAKDOWN ---");
        var examRows = await conn.QueryAsync<dynamic>(@"
            SELECT ExaminationId, ExamName, ExamCode, Status, StartDate, EndDate, IsActive, BoardId, AcademicYearId
            FROM Examinations
            ORDER BY StartDate DESC;");
        foreach (var ex in examRows) Console.WriteLine($"    ExamId: {ex.ExaminationId}, Name: '{ex.ExamName}', Code: '{ex.ExamCode}', Status: '{ex.Status}', Start: {ex.StartDate:yyyy-MM-dd}, End: {ex.EndDate:yyyy-MM-dd}, BoardId: {ex.BoardId}, AY: {ex.AcademicYearId}, IsActive: {ex.IsActive}");

        Console.WriteLine("\n================================================================================");
        Console.WriteLine("                 FORENSIC INSPECTION COMPLETE");
        Console.WriteLine("================================================================================");
    }
}

