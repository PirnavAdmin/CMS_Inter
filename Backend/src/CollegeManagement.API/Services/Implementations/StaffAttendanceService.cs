using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Attendance.Responses;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.DTOs.StaffAttendance.Responses;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using MiniExcelLibs;

namespace CollegeManagement.API.Services.Implementations
{
    public class StaffAttendanceService : IStaffAttendanceService
    {
        private readonly IStaffAttendanceRepository _repository;

        public StaffAttendanceService(IStaffAttendanceRepository repository)
        {
            _repository = repository;
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

        public async Task<YearlyOverviewResponse> GetStaffYearlyOverviewAsync(int staffId, int academicYearId, int? campusId = null)
        {
            return await _repository.GetStaffYearlyOverviewAsync(staffId, academicYearId, campusId);
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

        public async Task<object> ImportStaffAttendanceFromExcelAsync(byte[] fileBytes, bool validateOnly, bool isAdmin, string userName, int? userId, int? campusId = null)
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
            int rowIndex = 1;

            var importContext = await _repository.GetStaffImportContextAsync(campusId);
            var staffMap = new Dictionary<string, StaffImportStaffItem>(StringComparer.OrdinalIgnoreCase);
            var staffByIdMap = new Dictionary<int, StaffImportStaffItem>();

            foreach (var s in importContext.StaffList)
            {
                if (!string.IsNullOrWhiteSpace(s.EmployeeId))
                {
                    staffMap[s.EmployeeId.Trim()] = s;
                }
                staffByIdMap[s.FacultyId] = s;
            }

            var validRecordsToSave = new List<UpdateStaffAttendanceRequest>();

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

                StaffImportStaffItem? faculty = null;
                var trimmedEmpId = empId.Trim();
                if (staffMap.TryGetValue(trimmedEmpId, out var foundStaff))
                {
                    faculty = foundStaff;
                }
                else if (int.TryParse(trimmedEmpId, out var parsedFacultyId) && staffByIdMap.TryGetValue(parsedFacultyId, out var foundById))
                {
                    faculty = foundById;
                }

                if (faculty == null)
                {
                    errors.Add(new[] { rowIndex.ToString(), empId, staffName ?? "", dateStr, $"Staff member with ID '{empId}' not found" });
                    continue;
                }

                string actualName = faculty.FullName;
                var attendanceKey = $"{faculty.FacultyId}_{attDate:yyyyMMdd}";

                if (importContext.ExistingAttendanceKeys.Contains(attendanceKey))
                {
                    errors.Add(new[] { rowIndex.ToString(), empId, actualName, dateStr, "Attendance already exists for this staff member on this date" });
                    continue;
                }

                StaffType staffType = (StaffType)faculty.StaffType;
                if (!string.IsNullOrWhiteSpace(staffTypeStr) && Enum.TryParse<StaffType>(staffTypeStr.Replace(" ", "").Replace("-", ""), true, out var st))
                {
                    staffType = st;
                }

                validCount++;

                if (!validateOnly)
                {
                    validRecordsToSave.Add(new UpdateStaffAttendanceRequest
                    {
                        FacultyId = faculty.FacultyId,
                        AttendanceDate = attDate.Date,
                        StaffType = staffType,
                        Status = status,
                        InTime = inTime,
                        OutTime = outTime,
                        Remarks = remarks,
                        DepartmentId = faculty.DepartmentId,
                        CampusId = faculty.CampusId ?? campusId
                    });
                    importContext.ExistingAttendanceKeys.Add(attendanceKey);
                }
            }

            if (!validateOnly && errors.Count == 0 && validRecordsToSave.Any())
            {
                foreach (var record in validRecordsToSave)
                {
                    await _repository.UpdateStaffAttendanceAsync(record, userId);
                }
            }

            return new { total = rows.Count, valid = validCount, errors = errors };
        }

        #region Self-Service My Attendance & Regularization

        public async Task<MyAttendanceTodayResponse> GetMyTodayStatusAsync(int facultyId, DateTime date)
        {
            return await _repository.GetMyTodayStatusAsync(facultyId, date);
        }

        public async Task<MyAttendanceTodayResponse> PunchInAsync(int facultyId, StaffPunchRequest request, string? clientIp, int? userId)
        {
            return await _repository.PunchInAsync(facultyId, request, clientIp, userId);
        }

        public async Task<MyAttendanceTodayResponse> PunchOutAsync(int facultyId, StaffPunchRequest request, string? clientIp, int? userId)
        {
            return await _repository.PunchOutAsync(facultyId, request, clientIp, userId);
        }

        public async Task<MyAttendanceHistoryResponse> GetMyAttendanceHistoryAsync(int facultyId, string period, DateTime? targetDate)
        {
            return await _repository.GetMyAttendanceHistoryAsync(facultyId, period, targetDate);
        }

        public async Task<bool> SubmitRegularizationAsync(int facultyId, SubmitRegularizationRequest request, int? userId)
        {
            return await _repository.SubmitRegularizationAsync(facultyId, request, userId);
        }

        public async Task<IEnumerable<RegularizationItemDto>> GetRegularizationsAsync(string? status, int? departmentId)
        {
            return await _repository.GetRegularizationsAsync(status, departmentId);
        }

        public async Task<bool> ReviewRegularizationAsync(int regularizationId, ReviewRegularizationRequest request, int? reviewerUserId)
        {
            return await _repository.ReviewRegularizationAsync(regularizationId, request, reviewerUserId);
        }

        public async Task<int> ResolveStaffIdByUserIdAsync(int userId)
        {
            return await _repository.ResolveStaffIdByUserIdAsync(userId);
        }

        #endregion
    }
}
