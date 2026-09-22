using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.DTOs.StaffAttendance.Responses;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using MiniExcelLibs;
using CollegeManagement.API.Models;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.Services.Implementations
{
    public class StaffAttendanceService : IStaffAttendanceService
    {
        private readonly IStaffAttendanceRepository _repository;
        private readonly CollegeManagement.API.Data.AppDbContext _context;

        public StaffAttendanceService(IStaffAttendanceRepository repository, CollegeManagement.API.Data.AppDbContext context)
        {
            _repository = repository;
            _context = context;
        }

        public async Task<IEnumerable<StaffAttendanceItemResponse>> LoadStaffAttendanceAsync(LoadStaffAttendanceRequest request)
        {
            return await _repository.LoadStaffAttendanceAsync(request);
        }

        public async Task<int> BulkSaveStaffAttendanceAsync(BulkSaveStaffAttendanceRequest request, int? currentUserId)
        {
            if (request.StaffAttendances == null || !request.StaffAttendances.Any())
            {
                throw new ArgumentException("At least one staff attendance record is required to save.");
            }

            return await _repository.BulkSaveStaffAttendanceAsync(request, currentUserId);
        }

        public async Task<bool> UpdateStaffAttendanceAsync(UpdateStaffAttendanceRequest request, int? currentUserId)
        {
            return await _repository.UpdateStaffAttendanceAsync(request, currentUserId);
        }

        public async Task<StaffDetailsResponse?> GetStaffDetailsAsync(int facultyId, DateTime date)
        {
            return await _repository.GetStaffDetailsAsync(facultyId, date);
        }

        public async Task<StaffMonthlyReportResponse> GetStaffMonthlyReportGridAsync(StaffMonthlyReportRequest request)
        {
            return await _repository.GetStaffMonthlyReportGridAsync(request);
        }

        public async Task<byte[]> ExportStaffMonthlyReportToCsvAsync(StaffMonthlyReportRequest request)
        {
            var report = await _repository.GetStaffMonthlyReportGridAsync(request);
            var sb = new StringBuilder();

            // Header line
            var headers = new List<string> { "Employee ID", "Staff Name", "Department" };
            foreach (var h in report.DayHeaders)
            {
                headers.Add($"{h.DayNumber} ({h.DayName})");
            }
            headers.AddRange(new[] { "Present", "Absent", "Late", "Leave", "Percentage" });
            sb.AppendLine(string.Join(",", headers.Select(h => $"\"{h}\"")));

            // Rows
            foreach (var row in report.StaffRows)
            {
                var line = new List<string>
                {
                    $"\"{row.EmployeeId}\"",
                    $"\"{row.StaffName}\"",
                    $"\"{row.DepartmentName}\""
                };
                foreach (var st in row.DailyStatus)
                {
                    line.Add($"\"{st}\"");
                }
                line.Add($"\"{row.PresentCount}\"");
                line.Add($"\"{row.AbsentCount}\"");
                line.Add($"\"{row.LateCount}\"");
                line.Add($"\"{row.LeaveCount}\"");
                line.Add($"\"{row.Percentage}%\".");
                sb.AppendLine(string.Join(",", line));
            }

            return Encoding.UTF8.GetBytes(sb.ToString());
        }

        public async Task<byte[]> ExportStaffMonthlyReportToExcelAsync(StaffMonthlyReportRequest request)
        {
            var report = await _repository.GetStaffMonthlyReportGridAsync(request);
            var dataList = new List<Dictionary<string, object>>();

            foreach (var r in report.StaffRows)
            {
                var dict = new Dictionary<string, object>
                {
                    { "Employee ID", r.EmployeeId },
                    { "Staff Name", r.StaffName },
                    { "Department", r.DepartmentName }
                };

                for (int i = 0; i < report.DayHeaders.Count; i++)
                {
                    var dh = report.DayHeaders[i];
                    dict[$"Day {dh.DayNumber} ({dh.DayName})"] = r.DailyStatus.Count > i ? r.DailyStatus[i] : "-";
                }

                dict["Present"] = r.PresentCount;
                dict["Absent"] = r.AbsentCount;
                dict["Late"] = r.LateCount;
                dict["Leave"] = r.LeaveCount;
                dict["Percentage"] = $"{r.Percentage}%";

                dataList.Add(dict);
            }

            using var ms = new MemoryStream();
            await ms.SaveAsAsync(dataList, sheetName: "Staff Monthly Report");
            return ms.ToArray();
        }

        public async Task<CollegeManagement.API.DTOs.Attendance.Responses.YearlyOverviewResponse> GetStaffYearlyOverviewAsync(int staffId, int academicYearId)
        {
            var staff = await _context.Faculties.FindAsync(staffId);
            if (staff == null) throw new CollegeManagement.API.Exceptions.NotFoundException($"Staff with ID {staffId} was not found.");

            // Fetch the academic year details with fallback
            AcademicYear? academicYear = null;
            if (academicYearId > 0)
            {
                academicYear = await _context.AcademicYears.FindAsync(academicYearId);
            }

            if (academicYear == null)
            {
                academicYear = await _context.AcademicYears.FirstOrDefaultAsync(y => y.IsActive)
                               ?? await _context.AcademicYears.OrderByDescending(y => y.AcademicYearId).FirstOrDefaultAsync();
            }

            if (academicYear == null)
            {
                throw new CollegeManagement.API.Exceptions.NotFoundException("No active Academic Year found in the system.");
            }

            academicYearId = academicYear.AcademicYearId;

            var startDate = academicYear.StartDate.ToDateTime(TimeOnly.MinValue);
            var endDate = academicYear.EndDate.ToDateTime(TimeOnly.MaxValue);

            // Fetch all staff attendance records and join with sessions to get dates
            var records = await (from a in _context.StaffAttendances
                                 join s in _context.StaffAttendanceSessions on a.StaffSessionId equals s.StaffSessionId
                                 where a.FacultyId == staffId && s.AttendanceDate >= startDate && s.AttendanceDate <= endDate
                                 select new { a.Status, s.AttendanceDate })
                                 .ToListAsync();

            var response = new CollegeManagement.API.DTOs.Attendance.Responses.YearlyOverviewResponse();
            var months = new List<CollegeManagement.API.DTOs.Attendance.Responses.MonthlyOverviewItem>();

            var currentMonth = new DateTime(startDate.Year, startDate.Month, 1);
            var endMonth = new DateTime(endDate.Year, endDate.Month, 1);

            while (currentMonth <= endMonth)
            {
                var monthRecords = records.Where(r => r.AttendanceDate.Month == currentMonth.Month && r.AttendanceDate.Year == currentMonth.Year).ToList();
                
                int workingDays = monthRecords.Count;
                
                int presentDays = monthRecords.Count(r => r.Status == Enums.AttendanceStatus.Present);
                int lateDays = monthRecords.Count(r => r.Status == Enums.AttendanceStatus.Late);
                int leaveDays = monthRecords.Count(r => r.Status == Enums.AttendanceStatus.Leave);
                int absentDays = monthRecords.Count(r => r.Status == Enums.AttendanceStatus.Absent);

                months.Add(new CollegeManagement.API.DTOs.Attendance.Responses.MonthlyOverviewItem
                {
                    MonthName = currentMonth.ToString("MMMM"),
                    Month = currentMonth.Month,
                    Year = currentMonth.Year,
                    WorkingDays = workingDays,
                    Present = presentDays,
                    Late = lateDays,
                    Absent = absentDays,
                    Leave = leaveDays,
                    AttendancePercentage = workingDays > 0 ? Math.Round((double)(presentDays + lateDays) / workingDays * 100, 1) : 0
                });

                currentMonth = currentMonth.AddMonths(1);
            }

            response.MonthlyRecords = months;
            response.TotalWorkingDays = months.Sum(m => m.WorkingDays);
            response.TotalPresent = months.Sum(m => m.Present);
            response.TotalAbsent = months.Sum(m => m.Absent);
            response.TotalLeave = months.Sum(m => m.Leave);
            response.TotalLate = months.Sum(m => m.Late);
            
            int totalAttended = response.TotalPresent + response.TotalLate;
            response.OverallAttendancePercentage = response.TotalWorkingDays > 0 
                ? Math.Round((double)totalAttended / response.TotalWorkingDays * 100, 1) 
                : 0;

            return response;
        }

        public async Task<byte[]> GenerateImportTemplateAsync()
        {
            var dataList = new List<Dictionary<string, object>>
            {
                new Dictionary<string, object>
                {
                    { "Attendance Date", "2026-09-01" },
                    { "Staff ID", "FAC001" },
                    { "Staff Name", "Dr. John Doe" },
                    { "Department", "Computer Science" },
                    { "Designation", "Assistant Professor" },
                    { "Staff Type", "Teaching" },
                    { "Check-In Time", "09:00" },
                    { "Check-Out Time", "17:00" },
                    { "Attendance Status", "Present" },
                    { "Remarks", "On Time" }
                }
            };

            using var ms = new MemoryStream();
            await ms.SaveAsAsync(dataList, sheetName: "Staff Attendance");
            return ms.ToArray();
        }

        public async Task<object> ImportStaffAttendanceFromExcelAsync(byte[] fileBytes, bool validateOnly, bool isAdmin, string userName, int? userId)
        {
            using var ms = new MemoryStream(fileBytes);
            List<dynamic> rows;
            try
            {
                rows = ms.Query(useHeaderRow: true, sheetName: "Staff Attendance").ToList();
            }
            catch
            {
                ms.Position = 0;
                rows = ms.Query(useHeaderRow: true).ToList();
            }

            var errors = new List<object>();
            int validCount = 0;
            var toSave = new List<StaffAttendance>();
            var sessionsToUpdate = new Dictionary<string, StaffAttendanceSession>();
            int rowIndex = 1;

            foreach (var r in rows)
            {
                rowIndex++;
                var dict = r as IDictionary<string, object>;
                if (dict == null) continue;

                string? empId = dict.ContainsKey("Staff ID") ? dict["Staff ID"]?.ToString()
                              : dict.ContainsKey("Employee ID") ? dict["Employee ID"]?.ToString()
                              : dict.ContainsKey("Faculty ID") ? dict["Faculty ID"]?.ToString() : null;

                string? staffName = dict.ContainsKey("Staff Name") ? dict["Staff Name"]?.ToString() : "";
                string? dateStr = dict.ContainsKey("Attendance Date") ? dict["Attendance Date"]?.ToString() : null;
                string? statusStr = dict.ContainsKey("Attendance Status") ? dict["Attendance Status"]?.ToString()
                                  : dict.ContainsKey("Status") ? dict["Status"]?.ToString() : null;
                string? staffTypeStr = dict.ContainsKey("Staff Type") ? dict["Staff Type"]?.ToString() : null;
                string? inTimeStr = dict.ContainsKey("Check-In Time") ? dict["Check-In Time"]?.ToString()
                                  : dict.ContainsKey("In Time") ? dict["In Time"]?.ToString() : null;
                string? outTimeStr = dict.ContainsKey("Check-Out Time") ? dict["Check-Out Time"]?.ToString()
                                   : dict.ContainsKey("Out Time") ? dict["Out Time"]?.ToString() : null;
                string? remarks = dict.ContainsKey("Remarks") ? dict["Remarks"]?.ToString() : null;

                if (string.IsNullOrWhiteSpace(empId) || string.IsNullOrWhiteSpace(dateStr) || string.IsNullOrWhiteSpace(statusStr))
                {
                    errors.Add(new[] { rowIndex.ToString(), empId ?? "", staffName ?? "", dateStr ?? "", "Missing required fields (Staff ID, Attendance Date, Attendance Status)" });
                    continue;
                }

                if (!DateTime.TryParse(dateStr, out DateTime attDate))
                {
                    errors.Add(new[] { rowIndex.ToString(), empId, staffName ?? "", dateStr, "Invalid Date format (expected YYYY-MM-DD)" });
                    continue;
                }

                AttendanceStatus status;
                var cleanStatus = statusStr.Trim().ToUpperInvariant();
                if (cleanStatus == "P" || cleanStatus == "PRESENT") status = AttendanceStatus.Present;
                else if (cleanStatus == "A" || cleanStatus == "ABSENT") status = AttendanceStatus.Absent;
                else if (cleanStatus == "L" || cleanStatus == "LATE") status = AttendanceStatus.Late;
                else if (cleanStatus == "LV" || cleanStatus == "LEAVE") status = AttendanceStatus.Leave;
                else
                {
                    errors.Add(new[] { rowIndex.ToString(), empId, staffName ?? "", dateStr, $"Invalid Attendance Status: '{statusStr}'" });
                    continue;
                }

                TimeSpan? inTime = null;
                if (!string.IsNullOrWhiteSpace(inTimeStr) && TimeSpan.TryParse(inTimeStr, out var it)) inTime = it;
                TimeSpan? outTime = null;
                if (!string.IsNullOrWhiteSpace(outTimeStr) && TimeSpan.TryParse(outTimeStr, out var ot)) outTime = ot;

                var faculty = await _context.Faculties.FirstOrDefaultAsync(f => f.EmployeeId == empId);
                if (faculty == null && int.TryParse(empId, out var parsedFacultyId))
                {
                    faculty = await _context.Faculties.FirstOrDefaultAsync(f => f.Id == parsedFacultyId);
                }

                if (faculty == null)
                {
                    errors.Add(new[] { rowIndex.ToString(), empId, staffName ?? "", dateStr, $"Staff member with ID '{empId}' not found" });
                    continue;
                }

                string actualName = $"{faculty.FirstName} {faculty.LastName}".Trim();

                StaffType staffType = faculty.FacultyType?.Equals("Non-Teaching", StringComparison.OrdinalIgnoreCase) == true
                    ? StaffType.NonTeaching
                    : StaffType.Teaching;

                if (!string.IsNullOrWhiteSpace(staffTypeStr) && Enum.TryParse<StaffType>(staffTypeStr.Replace(" ", "").Replace("-", ""), true, out var st))
                {
                    staffType = st;
                }

                var exists = await _context.StaffAttendances
                    .Include(a => a.StaffAttendanceSession)
                    .AnyAsync(a => a.FacultyId == faculty.Id && a.StaffAttendanceSession.AttendanceDate.Date == attDate.Date && a.IsActive);

                if (exists)
                {
                    errors.Add(new[] { rowIndex.ToString(), empId, actualName, dateStr, "Attendance already exists for this staff member on this date" });
                    continue;
                }

                validCount++;

                if (!validateOnly)
                {
                    var sessionKey = $"{attDate.Date:yyyyMMdd}_{(byte)staffType}_{faculty.DepartmentId ?? 0}";
                    if (!sessionsToUpdate.TryGetValue(sessionKey, out var session))
                    {
                        session = await _context.StaffAttendanceSessions
                            .FirstOrDefaultAsync(s => s.AttendanceDate.Date == attDate.Date
                                                      && s.StaffType == staffType
                                                      && (faculty.DepartmentId == null || s.DepartmentId == faculty.DepartmentId));

                        if (session == null)
                        {
                            session = new StaffAttendanceSession
                            {
                                AttendanceDate = attDate.Date,
                                DepartmentId = faculty.DepartmentId > 0 ? faculty.DepartmentId : null,
                                StaffType = staffType,
                                TotalStaffCount = 0,
                                CreatedByUserId = userId,
                                CreatedAt = DateTime.UtcNow
                            };
                            await _context.StaffAttendanceSessions.AddAsync(session);
                            await _context.SaveChangesAsync();
                        }
                        sessionsToUpdate[sessionKey] = session;
                    }

                    var newAttendance = new StaffAttendance
                    {
                        StaffSessionId = session.StaffSessionId,
                        FacultyId = faculty.Id,
                        Status = status,
                        InTime = inTime,
                        OutTime = outTime,
                        VerificationMethod = VerificationMethod.Manual,
                        Remarks = remarks,
                        CreatedByUserId = userId,
                        CreatedAt = DateTime.UtcNow
                    };
                    toSave.Add(newAttendance);
                }
            }

            if (!validateOnly && errors.Count == 0 && toSave.Any())
            {
                await _context.StaffAttendances.AddRangeAsync(toSave);
                await _context.SaveChangesAsync();

                var sessionIds = toSave.Select(a => a.StaffSessionId).Distinct().ToList();
                foreach (var sId in sessionIds)
                {
                    var sess = await _context.StaffAttendanceSessions
                        .Include(s => s.StaffAttendances)
                        .FirstOrDefaultAsync(s => s.StaffSessionId == sId);

                    if (sess != null)
                    {
                        sess.TotalStaffCount = sess.StaffAttendances.Count;
                        sess.PresentCount = sess.StaffAttendances.Count(a => a.Status == AttendanceStatus.Present);
                        sess.AbsentCount = sess.StaffAttendances.Count(a => a.Status == AttendanceStatus.Absent);
                        sess.LateCount = sess.StaffAttendances.Count(a => a.Status == AttendanceStatus.Late);
                        sess.LeaveCount = sess.StaffAttendances.Count(a => a.Status == AttendanceStatus.Leave);
                        sess.UpdatedAt = DateTime.UtcNow;
                    }
                }
                await _context.SaveChangesAsync();
            }

            return new { total = rows.Count, valid = validCount, errors = errors };
        }
    }
}
