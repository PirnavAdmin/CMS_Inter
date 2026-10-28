using System;
using System.Data;
using System.Linq;
using System.Collections.Generic;
using Dapper;
using MySql.Data.MySqlClient;

string connStr = "Server=collegemanagementdb-mysql-3069cc62-manikesandeep-1393.g.aivencloud.com;Port=19182;Database=CollegeManagement;User ID=avnadmin;Password=AVNS_jgPZED4pphZib4tvJID;SslMode=Required;Allow User Variables=True;ConvertZeroDateTime=True;UseAffectedRows=false;ConnectionTimeout=60;KeepAlive=30;";

using var conn = new MySqlConnection(connStr);
await conn.OpenAsync();

Console.WriteLine("=================================================================");
Console.WriteLine("        TESTING ALL PRODUCTION SPS ACROSS 6 MODULES              ");
Console.WriteLine("=================================================================");

var spList = new[] {
    // 1. Dashboard
    new { Name = "sp_GetDashboardFilters", Params = (object)new {} },
    new { Name = "sp_GetDashboardKPIs", Params = (object)new { p_BoardId = (int?)null, p_AcademicYearId = (int?)null, p_TargetDate = (DateTime?)null, p_CampusId = (int?)null } },
    new { Name = "sp_GetDashboardSummary", Params = (object)new { p_BoardId = (int?)null, p_AcademicYearId = (int?)null, p_TargetDate = (DateTime?)null, p_CampusId = (int?)null } },
    new { Name = "sp_GetDashboardStudentsOverview", Params = (object)new { p_BoardId = (int?)null, p_AcademicYearId = (int?)null, p_CampusId = (int?)null } },
    new { Name = "sp_GetDashboardGroupDistribution", Params = (object)new { p_BoardId = (int?)null, p_AcademicYearId = (int?)null, p_CampusId = (int?)null } },
    new { Name = "sp_GetDashboardWeeklyAttendance", Params = (object)new { p_BoardId = (int?)null, p_AcademicYearId = (int?)null, p_CampusId = (int?)null } },
    new { Name = "sp_GetDashboardCertificateRequests", Params = (object)new { p_CampusId = (int?)null } },
    new { Name = "sp_GetDashboardUpcomingExaminations", Params = (object)new { p_BoardId = (int?)null, p_AcademicYearId = (int?)null, p_CampusId = (int?)null, p_Limit = 5 } },
    new { Name = "sp_GetDashboardRecentActivities", Params = (object)new { p_Limit = 5, p_CampusId = (int?)null } },
    new { Name = "sp_GetDashboardUpcomingHolidays", Params = (object)new { p_CampusId = (int?)null, p_Limit = 5 } },
    new { Name = "sp_GetDashboardTodaysHighlights", Params = (object)new { p_CampusId = (int?)null } },
    
    // 2. Department & Designation
    new { Name = "sp_GetDepartments", Params = (object)new { p_StaffType = (string?)null, p_IncludeInactive = (bool?)false, p_CampusId = (int?)null } },
    new { Name = "sp_GetDepartmentSummary", Params = (object)new {} },
    new { Name = "sp_GetDesignations", Params = (object)new { p_DepartmentId = 0, p_StaffType = "", p_IncludeInactive = 0, p_CampusId = (int?)null } },
    new { Name = "sp_GetDesignationSummary", Params = (object)new {} },
    
    // 3. Certificates
    new { Name = "sp_GetCertificates", Params = (object)new { p_Search = (string?)null, p_Status = (string?)null, p_CertificateType = (string?)null, p_CampusId = (int?)null, p_BoardId = (int?)null, p_AcademicYearId = (int?)null } },
    
    // 4. Reports
    new { Name = "sp_Report_Admissions", Params = (object)new { p_BoardId = (int?)null, p_AcademicYearId = (int?)null, p_AcademicLevelId = (int?)null, p_GroupId = (int?)null, p_SectionId = (int?)null, p_FromDate = (DateTime?)null, p_ToDate = (DateTime?)null, p_CampusId = (int?)null } },
    new { Name = "sp_Report_StudentStrength", Params = (object)new { p_AcademicYearId = (int?)null, p_BoardId = (int?)null, p_CampusId = (int?)null } },
    new { Name = "sp_Report_Attendance", Params = (object)new { p_BoardId = (int?)null, p_AcademicYearId = (int?)null, p_GroupId = (int?)null, p_SectionId = (int?)null, p_FromDate = (DateTime?)null, p_ToDate = (DateTime?)null, p_CampusId = (int?)null } },
    new { Name = "sp_Report_FacultyAttendance", Params = (object)new { p_DepartmentId = (int?)null, p_FromDate = (DateTime?)null, p_ToDate = (DateTime?)null, p_CampusId = (int?)null } },
    new { Name = "sp_Report_FeeCollection", Params = (object)new { p_BoardId = (int?)null, p_AcademicYearId = (int?)null, p_CampusId = (int?)null, p_FromDate = (DateTime?)null, p_ToDate = (DateTime?)null } },
    new { Name = "sp_Report_OutstandingFees", Params = (object)new { p_BoardId = (int?)null, p_AcademicYearId = (int?)null, p_CampusId = (int?)null } },
    new { Name = "sp_Report_Examinations", Params = (object)new { p_AcademicYearId = (int?)null, p_BoardId = (int?)null, p_CampusId = (int?)null } },
    new { Name = "sp_Report_Results", Params = (object)new { p_ExamId = (int?)null, p_CampusId = (int?)null } },
    new { Name = "sp_Report_PassPercentage", Params = (object)new { p_AcademicYearId = (int?)null, p_CampusId = (int?)null } },
    new { Name = "sp_Report_AuditLogs", Params = (object)new { p_Module = (string?)null, p_FromDate = (DateTime?)null, p_ToDate = (DateTime?)null, p_CampusId = (int?)null } }
};

int passed = 0;
int failed = 0;

foreach (var item in spList)
{
    try
    {
        var result = (await conn.QueryAsync<dynamic>(item.Name, item.Params, commandType: CommandType.StoredProcedure)).ToList();
        Console.WriteLine($"[PASS] {item.Name.PadRight(35)} : OK ({result.Count} rows returned)");
        passed++;
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[FAIL] {item.Name.PadRight(35)} : {ex.Message}");
        failed++;
    }
}

Console.WriteLine($"\nRESULTS: {passed} PASSED, {failed} FAILED.");
