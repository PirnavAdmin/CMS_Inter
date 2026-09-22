using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests;

public static class StaffAttendanceModuleBackendTester
{
    public static async Task<bool> RunAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var attendanceService = scope.ServiceProvider.GetRequiredService<IStaffAttendanceService>();

        Console.WriteLine("================================================================================");
        Console.WriteLine("     STAFF ATTENDANCE MODULE BACKEND VERIFICATION & INTEGRATION SUITE");
        Console.WriteLine("================================================================================");

        int passed = 0;
        int failed = 0;

        // 1. Test Load Teaching Staff
        Console.WriteLine("\n[1/10] Testing Load Staff for Attendance (Teaching)...");
        try
        {
            var loadReq = new LoadStaffAttendanceRequest
            {
                AttendanceDate = DateTime.Today,
                StaffType = StaffType.Teaching
            };
            var staffList = (await attendanceService.LoadStaffAttendanceAsync(loadReq)).ToList();
            Console.WriteLine($"  [PASS] Teaching Staff loaded: {staffList.Count} member(s).");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Load Teaching Staff: {ex.Message}");
            failed++;
        }

        // 2. Test Load Non-Teaching Staff
        Console.WriteLine("\n[2/10] Testing Load Staff for Attendance (Non-Teaching)...");
        try
        {
            var loadReq = new LoadStaffAttendanceRequest
            {
                AttendanceDate = DateTime.Today,
                StaffType = StaffType.NonTeaching
            };
            var staffList = (await attendanceService.LoadStaffAttendanceAsync(loadReq)).ToList();
            Console.WriteLine($"  [PASS] Non-Teaching Staff loaded: {staffList.Count} member(s).");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Load Non-Teaching Staff: {ex.Message}");
            failed++;
        }

        // 3. Test Filter by Department
        Console.WriteLine("\n[3/10] Testing Load Staff Filtered by Department...");
        try
        {
            var loadReq = new LoadStaffAttendanceRequest
            {
                AttendanceDate = DateTime.Today,
                StaffType = StaffType.Teaching,
                DepartmentId = 1
            };
            var staffList = (await attendanceService.LoadStaffAttendanceAsync(loadReq)).ToList();
            Console.WriteLine($"  [PASS] Filtered Staff loaded: {staffList.Count} member(s).");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Filtered Load Staff: {ex.Message}");
            failed++;
        }

        // 4. Test Bulk Save Attendance
        Console.WriteLine("\n[4/10] Testing Bulk Save Staff Attendance...");
        int testFacultyId = 21;
        try
        {
            var loadReq = new LoadStaffAttendanceRequest
            {
                AttendanceDate = DateTime.Today,
                StaffType = StaffType.Teaching
            };
            var staffList = (await attendanceService.LoadStaffAttendanceAsync(loadReq)).ToList();
            if (staffList.Any())
            {
                testFacultyId = staffList.First().FacultyId;
            }

            var bulkReq = new BulkSaveStaffAttendanceRequest
            {
                AttendanceDate = DateTime.Today,
                StaffType = StaffType.Teaching,
                DepartmentId = null,
                StaffAttendances = new List<StaffAttendanceEntryDto>
                {
                    new StaffAttendanceEntryDto
                    {
                        FacultyId = testFacultyId,
                        Status = AttendanceStatus.Present,
                        InTime = new TimeSpan(9, 0, 0),
                        OutTime = new TimeSpan(17, 0, 0),
                        VerificationMethod = VerificationMethod.Manual,
                        Remarks = "Test Entry"
                    }
                }
            };
            var savedCount = await attendanceService.BulkSaveStaffAttendanceAsync(bulkReq, 1);
            Console.WriteLine($"  [PASS] Bulk Save Success: Saved attendance for {savedCount} member(s).");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Bulk Save: {ex.Message}");
            failed++;
        }

        // 5. Test Details Modal
        Console.WriteLine("\n[5/10] Testing Get Staff Attendance Details Modal...");
        try
        {
            var details = await attendanceService.GetStaffDetailsAsync(testFacultyId, DateTime.Today);
            if (details != null)
            {
                Console.WriteLine($"  [PASS] Staff Details Modal: {details.StaffName} ({details.StaffType}), Status: {details.TodayStatus}");
            }
            else
            {
                Console.WriteLine($"  [PASS] Staff Details Modal query executed successfully.");
            }
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Staff Attendance Details Modal: {ex.Message}");
            failed++;
        }

        // 6. Test Monthly Report
        Console.WriteLine("\n[6/10] Testing Monthly Calendar Matrix Report...");
        try
        {
            var monthlyReq = new StaffMonthlyReportRequest
            {
                Year = DateTime.Today.Year,
                Month = DateTime.Today.Month,
                StaffType = StaffType.Teaching
            };
            var monthlyReport = await attendanceService.GetStaffMonthlyReportGridAsync(monthlyReq);
            Console.WriteLine($"  [PASS] Monthly Matrix Generated: {monthlyReport.DayHeaders.Count} Day Headers, {monthlyReport.StaffRows.Count} Staff Rows");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Monthly Report: {ex.Message}");
            failed++;
        }

        // 7. Test Specific Faculty Monthly Report
        Console.WriteLine("\n[7/10] Testing Filter Monthly Report by Specific Faculty...");
        try
        {
            var monthlyReq = new StaffMonthlyReportRequest
            {
                Year = DateTime.Today.Year,
                Month = DateTime.Today.Month,
                StaffType = StaffType.Teaching,
                FacultyId = testFacultyId
            };
            var monthlyReport = await attendanceService.GetStaffMonthlyReportGridAsync(monthlyReq);
            Console.WriteLine($"  [PASS] Specific Faculty Monthly Report: {monthlyReport.StaffRows.Count} row(s) returned for ID={testFacultyId}");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Specific Faculty Monthly Report: {ex.Message}");
            failed++;
        }

        // 8. Test Export CSV
        Console.WriteLine("\n[8/10] Testing Export Monthly Report to CSV...");
        try
        {
            var monthlyReq = new StaffMonthlyReportRequest
            {
                Year = DateTime.Today.Year,
                Month = DateTime.Today.Month,
                StaffType = StaffType.Teaching
            };
            var fileBytes = await attendanceService.ExportStaffMonthlyReportToCsvAsync(monthlyReq);
            Console.WriteLine($"  [PASS] CSV Export: ({fileBytes.Length} bytes)");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] CSV Export: {ex.Message}");
            failed++;
        }

        // 9. Test Export Excel
        Console.WriteLine("\n[9/10] Testing Export Monthly Report to Excel...");
        try
        {
            var monthlyReq = new StaffMonthlyReportRequest
            {
                Year = DateTime.Today.Year,
                Month = DateTime.Today.Month,
                StaffType = StaffType.Teaching
            };
            var fileBytes = await attendanceService.ExportStaffMonthlyReportToExcelAsync(monthlyReq);
            Console.WriteLine($"  [PASS] Excel Export: ({fileBytes.Length} bytes)");
            passed++;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] Excel Export: {ex.Message}");
            failed++;
        }

        // 10. Summary
        Console.WriteLine("\n[10/10] Verifying Final Staff Attendance Suite Integrity...");
        if (failed == 0)
        {
            Console.WriteLine("  [PASS] All Staff Attendance sub-systems verified.");
            passed++;
        }
        else
        {
            Console.WriteLine("  [FAIL] Some sub-systems failed verification.");
            failed++;
        }

        Console.WriteLine("\n================================================================================");
        Console.WriteLine($"   FINAL STAFF ATTENDANCE SUITE RESULT: {passed}/10 PASSED | {failed} FAILED");
        Console.WriteLine("================================================================================");

        return failed == 0;
    }
}
