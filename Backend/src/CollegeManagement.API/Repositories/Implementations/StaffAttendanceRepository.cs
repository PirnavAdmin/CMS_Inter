using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Attendance.Responses;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.DTOs.StaffAttendance.Responses;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class StaffAttendanceRepository : IStaffAttendanceRepository
    {
        private readonly AppDbContext _context;

        public StaffAttendanceRepository(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<StaffAttendanceItemResponse>> LoadStaffAttendanceAsync(LoadStaffAttendanceRequest request)
        {
            DateTime targetDate = DateTime.UtcNow.Date;
            if (request.AttendanceDate.HasValue)
            {
                targetDate = request.AttendanceDate.Value.Date;
            }
            else if (!string.IsNullOrEmpty(request.Date) && DateTime.TryParse(request.Date, out var parsedDt))
            {
                targetDate = parsedDt.Date;
            }

            // Fetch staff members filtered by staff type and optional department
            var query = _context.Staffs
                .Where(f => !f.IsDeleted && f.Status == "Active");

            if (request.StaffType.HasValue)
            {
                if (request.StaffType.Value == StaffType.Teaching)
                {
                    query = query.Where(f => f.StaffType == null || f.StaffType.ToLower() == "teaching");
                }
                else if (request.StaffType.Value == StaffType.NonTeaching)
                {
                    query = query.Where(f => f.StaffType != null && f.StaffType.ToLower() != "teaching");
                }
            }

            if (request.DepartmentId.HasValue && request.DepartmentId.Value > 0)
            {
                query = query.Where(f => f.DepartmentId == request.DepartmentId.Value);
            }

            var facultyList = await query
                .Include(f => f.DepartmentRef)
                .Include(f => f.DesignationRef)
                .OrderBy(f => f.FirstName)
                .ThenBy(f => f.LastName)
                .ToListAsync();

            // Find existing attendances for today across sessions
            var attendancesForDate = await _context.StaffAttendances
                .Include(a => a.StaffAttendanceSession)
                .Where(a => a.StaffAttendanceSession.AttendanceDate.Date == targetDate
                            && (!request.StaffType.HasValue || a.StaffAttendanceSession.StaffType == request.StaffType.Value)
                            && a.IsActive)
                .OrderByDescending(a => a.UpdatedAt ?? a.CreatedAt)
                .ToListAsync();

            var attendanceByFaculty = attendancesForDate
                .GroupBy(a => a.FacultyId)
                .ToDictionary(g => g.Key, g => g.First());

            var result = new List<StaffAttendanceItemResponse>();

            foreach (var f in facultyList)
            {
                attendanceByFaculty.TryGetValue(f.FacultyId, out var markedEntry);

                result.Add(new StaffAttendanceItemResponse
                {
                    FacultyId = f.FacultyId,
                    EmployeeId = string.IsNullOrEmpty(f.EmployeeId)
                        ? (request.StaffType == StaffType.Teaching ? $"FAC{f.FacultyId:D3}" : $"NTS{f.FacultyId:D3}")
                        : f.EmployeeId,
                    StaffName = $"{f.FirstName} {f.LastName}".Trim(),
                    DepartmentId = f.DepartmentId,
                    DepartmentName = f.DepartmentRef?.DepartmentName ?? (!string.IsNullOrEmpty(f.Department) ? f.Department : "General"),
                    DesignationName = f.DesignationRef?.Name ?? (!string.IsNullOrEmpty(f.Designation) ? f.Designation : "Staff"),
                    Status = markedEntry?.Status ?? AttendanceStatus.Present,
                    InTime = markedEntry?.InTime,
                    OutTime = markedEntry?.OutTime,
                    VerificationMethod = markedEntry?.VerificationMethod ?? VerificationMethod.Manual,
                    Remarks = markedEntry?.Remarks
                });
            }

            if (request.FacultyId.HasValue && request.FacultyId.Value > 0)
            {
                result = result.Where(r => r.FacultyId == request.FacultyId.Value).ToList();
            }

            if (request.Status.HasValue)
            {
                result = result.Where(r => r.Status == request.Status.Value).ToList();
            }

            return result;
        }

        public async Task<int> BulkSaveStaffAttendanceAsync(BulkSaveStaffAttendanceRequest request, int? currentUserId)
        {
            var targetDate = request.AttendanceDate.Date;

            // Find existing session or create new
            var session = await _context.StaffAttendanceSessions
                .Include(s => s.StaffAttendances)
                .FirstOrDefaultAsync(s => s.AttendanceDate.Date == targetDate
                                          && s.StaffType == request.StaffType
                                          && (request.DepartmentId == null || s.DepartmentId == request.DepartmentId));

            if (session == null)
            {
                session = new StaffAttendanceSession
                {
                    AttendanceDate = targetDate,
                    DepartmentId = request.DepartmentId > 0 ? request.DepartmentId : null,
                    StaffType = request.StaffType,
                    TotalStaffCount = request.StaffAttendances.Count,
                    CreatedByUserId = currentUserId,
                    CreatedAt = DateTime.UtcNow
                };

                await _context.StaffAttendanceSessions.AddAsync(session);
                await _context.SaveChangesAsync();
            }

            int present = 0, absent = 0, late = 0, leave = 0;

            foreach (var entry in request.StaffAttendances)
            {
                switch (entry.Status)
                {
                    case AttendanceStatus.Present: present++; break;
                    case AttendanceStatus.Absent: absent++; break;
                    case AttendanceStatus.Late: late++; break;
                    case AttendanceStatus.Leave: leave++; break;
                }

                var existingAttendance = session.StaffAttendances.FirstOrDefault(a => a.FacultyId == entry.FacultyId);
                if (existingAttendance != null)
                {
                    existingAttendance.Status = entry.Status;
                    existingAttendance.InTime = entry.InTime;
                    existingAttendance.OutTime = entry.OutTime;
                    existingAttendance.VerificationMethod = entry.VerificationMethod;
                    existingAttendance.DeviceId = entry.DeviceId;
                    existingAttendance.Remarks = entry.Remarks;
                    existingAttendance.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    var newAttendance = new StaffAttendance
                    {
                        StaffSessionId = session.StaffSessionId,
                        FacultyId = entry.FacultyId,
                        Status = entry.Status,
                        InTime = entry.InTime,
                        OutTime = entry.OutTime,
                        VerificationMethod = entry.VerificationMethod,
                        DeviceId = entry.DeviceId,
                        Remarks = entry.Remarks,
                        CreatedByUserId = currentUserId,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _context.StaffAttendances.AddAsync(newAttendance);
                }
            }

            session.TotalStaffCount = request.StaffAttendances.Count;
            session.PresentCount = present;
            session.AbsentCount = absent;
            session.LateCount = late;
            session.LeaveCount = leave;
            session.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return request.StaffAttendances.Count;
        }

        public async Task<bool> UpdateStaffAttendanceAsync(UpdateStaffAttendanceRequest request, int? currentUserId)
        {
            var targetDate = request.AttendanceDate.Date;

            // Locate any existing attendance record for this faculty on this date directly
            var existingAttendance = await _context.StaffAttendances
                .Include(a => a.StaffAttendanceSession)
                    .ThenInclude(s => s.StaffAttendances)
                .Where(a => a.FacultyId == request.FacultyId
                            && a.StaffAttendanceSession.AttendanceDate.Date == targetDate
                            && a.StaffAttendanceSession.StaffType == request.StaffType
                            && a.IsActive)
                .OrderByDescending(a => a.UpdatedAt ?? a.CreatedAt)
                .FirstOrDefaultAsync();

            StaffAttendanceSession session;
            AttendanceStatus? oldStatus = null;

            if (existingAttendance != null)
            {
                session = existingAttendance.StaffAttendanceSession;
                if (session.IsLocked)
                {
                    throw new InvalidOperationException("Attendance session is locked and cannot be modified.");
                }

                oldStatus = existingAttendance.Status;
                existingAttendance.Status = request.Status;
                existingAttendance.InTime = request.InTime;
                existingAttendance.OutTime = request.OutTime;
                existingAttendance.Remarks = request.Remarks;
                existingAttendance.UpdatedAt = DateTime.UtcNow;

                // Deactivate any duplicate records for this faculty on the same date across other sessions
                var duplicateRecords = await _context.StaffAttendances
                    .Include(a => a.StaffAttendanceSession)
                    .Where(a => a.FacultyId == request.FacultyId
                                && a.StaffAttendanceSession.AttendanceDate.Date == targetDate
                                && a.StaffAttendanceId != existingAttendance.StaffAttendanceId)
                    .ToListAsync();
                foreach (var dup in duplicateRecords)
                {
                    dup.IsActive = false;
                    dup.UpdatedAt = DateTime.UtcNow;
                }
            }
            else
            {
                // Find existing session for date and staff type (matching department or college-wide departmentId == null)
                session = await _context.StaffAttendanceSessions
                    .Include(s => s.StaffAttendances)
                    .FirstOrDefaultAsync(s => s.AttendanceDate.Date == targetDate
                                              && s.StaffType == request.StaffType
                                              && (s.DepartmentId == null || (request.DepartmentId.HasValue && s.DepartmentId == request.DepartmentId.Value)));

                if (session != null && session.IsLocked)
                {
                    throw new InvalidOperationException("Attendance session is locked and cannot be modified.");
                }

                if (session == null)
                {
                    var query = _context.Staffs.Where(f => !f.IsDeleted && f.Status == "Active");
                    if (request.StaffType == StaffType.Teaching)
                    {
                        query = query.Where(f => f.StaffType == null || f.StaffType.ToLower() == "teaching");
                    }
                    else
                    {
                        query = query.Where(f => f.StaffType != null && f.StaffType.ToLower() != "teaching");
                    }
                    if (request.DepartmentId.HasValue && request.DepartmentId.Value > 0)
                    {
                        query = query.Where(f => f.DepartmentId == request.DepartmentId.Value);
                    }

                    session = new StaffAttendanceSession
                    {
                        AttendanceDate = targetDate,
                        DepartmentId = request.DepartmentId > 0 ? request.DepartmentId : null,
                        StaffType = request.StaffType,
                        TotalStaffCount = await query.CountAsync(),
                        CreatedByUserId = currentUserId,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _context.StaffAttendanceSessions.AddAsync(session);
                    await _context.SaveChangesAsync();
                }

                var newAttendance = new StaffAttendance
                {
                    StaffSessionId = session.StaffSessionId,
                    FacultyId = request.FacultyId,
                    Status = request.Status,
                    InTime = request.InTime,
                    OutTime = request.OutTime,
                    Remarks = request.Remarks,
                    CreatedByUserId = currentUserId,
                    CreatedAt = DateTime.UtcNow
                };
                session.StaffAttendances.Add(newAttendance);
            }

            session.PresentCount = session.StaffAttendances.Count(a => a.IsActive && a.Status == AttendanceStatus.Present);
            session.AbsentCount = session.StaffAttendances.Count(a => a.IsActive && a.Status == AttendanceStatus.Absent);
            session.LateCount = session.StaffAttendances.Count(a => a.IsActive && a.Status == AttendanceStatus.Late);
            session.LeaveCount = session.StaffAttendances.Count(a => a.IsActive && a.Status == AttendanceStatus.Leave);
            session.UpdatedAt = DateTime.UtcNow;
            
            if (currentUserId.HasValue)
            {
                var userExists = await _context.Users.AnyAsync(u => u.UserId == currentUserId.Value);
                if (!userExists)
                {
                    currentUserId = null;
                }
            }

            var audit = new AttendanceAuditHistory
            {
                EntityType = "Staff",
                EntityId = request.FacultyId,
                FacultyId = request.FacultyId,
                StudentId = null,
                AttendanceDate = request.AttendanceDate,
                Session = 0,
                OldStatus = (byte?)oldStatus,
                NewStatus = (byte)request.Status,
                Action = oldStatus == null ? "Created" : "Updated",
                ModifiedByUserId = currentUserId,
                ModifiedByUserName = currentUserId.HasValue ? await _context.Users.Where(u => u.UserId == currentUserId.Value).Select(u => u.FullName).FirstOrDefaultAsync() : null,
                CreatedAt = DateTime.UtcNow,
                Description = request.Remarks ?? (oldStatus == null ? "Created via Admin UI" : "Updated via Admin UI"),
            };
            await _context.AttendanceAuditHistories.AddAsync(audit);

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<StaffDetailsResponse?> GetStaffDetailsAsync(int facultyId, DateTime date)
        {
            var faculty = await _context.Staffs
                .FirstOrDefaultAsync(f => f.Id == facultyId);

            if (faculty == null) return null;

            var targetDate = date.Date;

            var attendance = await _context.StaffAttendances
                .Include(a => a.StaffAttendanceSession)
                .FirstOrDefaultAsync(a => a.FacultyId == facultyId
                                          && a.StaffAttendanceSession.AttendanceDate.Date == targetDate
                                          && a.IsActive);

            var status = attendance?.Status ?? AttendanceStatus.Present;

            return new StaffDetailsResponse
            {
                FacultyId = faculty.Id,
                EmployeeId = string.IsNullOrEmpty(faculty.EmployeeId) ? $"EMP{faculty.Id:D3}" : faculty.EmployeeId,
                StaffName = $"{faculty.FirstName} {faculty.LastName}".Trim(),
                DepartmentName = !string.IsNullOrEmpty(faculty.Department) ? faculty.Department : "General",
                DesignationName = !string.IsNullOrEmpty(faculty.Designation) ? faculty.Designation : "Staff",
                StaffType = (faculty.StaffType == null || faculty.StaffType.ToLower() == "teaching") ? StaffType.Teaching : StaffType.NonTeaching,
                TodayStatus = status,
                InTime = attendance?.InTime,
                OutTime = attendance?.OutTime,
                StatusText = status.ToString()
            };
        }

        public async Task<StaffMonthlyReportResponse> GetStaffMonthlyReportGridAsync(StaffMonthlyReportRequest request)
        {
            int targetMonth = request.Month.HasValue && request.Month.Value > 0 ? request.Month.Value : (request.Date?.Month ?? DateTime.UtcNow.Month);
            int targetYear = request.Year.HasValue && request.Year.Value > 0 ? request.Year.Value : (request.Date?.Year ?? DateTime.UtcNow.Year);

            int daysInMonth = DateTime.DaysInMonth(targetYear, targetMonth);

            var dayHeaders = new List<DayHeaderDto>();
            for (int day = 1; day <= daysInMonth; day++)
            {
                var dt = new DateTime(targetYear, targetMonth, day);
                bool isHoliday = dt.DayOfWeek == DayOfWeek.Sunday;
                string dayNameUpper = dt.ToString("ddd", CultureInfo.InvariantCulture).ToUpper();

                dayHeaders.Add(new DayHeaderDto
                {
                    DayNumber = day,
                    DateString = dt.ToString("yyyy-MM-dd"),
                    DayName = dayNameUpper,
                    CombinedHeader = $"{day} {dayNameUpper}",
                    IsHoliday = isHoliday
                });
            }

            var facultyQuery = _context.Staffs
                .Where(f => !f.IsDeleted && f.Status == "Active");

            if (request.StaffType.HasValue)
            {
                if (request.StaffType.Value == StaffType.Teaching)
                {
                    facultyQuery = facultyQuery.Where(f => f.StaffType == null || f.StaffType.ToLower() == "teaching");
                }
                else if (request.StaffType.Value == StaffType.NonTeaching)
                {
                    facultyQuery = facultyQuery.Where(f => f.StaffType != null && f.StaffType.ToLower() != "teaching");
                }
            }

            if (request.BoardId.HasValue && request.BoardId.Value > 0)
            {
                facultyQuery = facultyQuery.Where(f => f.BoardId == request.BoardId.Value || f.BoardId == null);
            }

            if (request.DepartmentId.HasValue && request.DepartmentId.Value > 0)
            {
                facultyQuery = facultyQuery.Where(f => f.DepartmentId == request.DepartmentId.Value);
            }

            if (request.FacultyId.HasValue && request.FacultyId.Value > 0)
            {
                facultyQuery = facultyQuery.Where(f => f.Id == request.FacultyId.Value);
            }

            var facultyList = await facultyQuery.OrderBy(f => f.FirstName).ToListAsync();

            var startDate = new DateTime(targetYear, targetMonth, 1);
            var endDate = new DateTime(targetYear, targetMonth, daysInMonth);

            var monthAttendances = await _context.StaffAttendances
                .Include(a => a.StaffAttendanceSession)
                .Where(a => a.StaffAttendanceSession.AttendanceDate.Date >= startDate
                            && a.StaffAttendanceSession.AttendanceDate.Date <= endDate
                            && a.StaffAttendanceSession.StaffType == request.StaffType
                            && a.IsActive)
                .OrderByDescending(a => a.UpdatedAt ?? a.CreatedAt)
                .ToListAsync();

            var staffRows = new List<StaffMonthlyGridRowDto>();
            int totalPresentAll = 0, totalAbsentAll = 0, totalLateAll = 0, totalLeaveAll = 0;

            int workingDaysCount = dayHeaders.Count(d => !d.IsHoliday);

            foreach (var staff in facultyList)
            {
                var dailyStatus = new List<string>();
                int presentCount = 0, absentCount = 0, lateCount = 0, leaveCount = 0;

                for (int day = 1; day <= daysInMonth; day++)
                {
                    var header = dayHeaders[day - 1];
                    if (header.IsHoliday)
                    {
                        dailyStatus.Add("-");
                        continue;
                    }

                    var record = monthAttendances.FirstOrDefault(a => a.FacultyId == staff.FacultyId && a.StaffAttendanceSession.AttendanceDate.Day == day);

                    if (record == null)
                    {
                        dailyStatus.Add("-");
                    }
                    else
                    {
                        switch (record.Status)
                        {
                            case AttendanceStatus.Present:
                                dailyStatus.Add("P");
                                presentCount++;
                                break;
                            case AttendanceStatus.Absent:
                                dailyStatus.Add("A");
                                absentCount++;
                                break;
                            case AttendanceStatus.Late:
                                dailyStatus.Add("L");
                                lateCount++;
                                break;
                            case AttendanceStatus.Leave:
                                dailyStatus.Add("LV");
                                leaveCount++;
                                break;
                            default:
                                dailyStatus.Add("P");
                                presentCount++;
                                break;
                        }
                    }
                }

                int markedCount = presentCount + absentCount + lateCount + leaveCount;
                double percentage = markedCount > 0 ? Math.Round((double)(presentCount + lateCount) / markedCount * 100, 1) : 0;

                string empId = string.IsNullOrEmpty(staff.EmployeeId)
                    ? (request.StaffType == StaffType.Teaching ? $"FAC{staff.FacultyId:D3}" : $"NTS{staff.FacultyId:D3}")
                    : staff.EmployeeId;

                staffRows.Add(new StaffMonthlyGridRowDto
                {
                    FacultyId = staff.FacultyId,
                    EmployeeId = empId,
                    StaffName = $"{staff.FirstName} {staff.LastName}".Trim(),
                    DepartmentName = !string.IsNullOrEmpty(staff.Department) ? staff.Department : "General",
                    DailyStatus = dailyStatus,
                    PresentCount = presentCount,
                    AbsentCount = absentCount,
                    LateCount = lateCount,
                    LeaveCount = leaveCount,
                    Percentage = percentage
                });

                totalPresentAll += presentCount;
                totalAbsentAll += absentCount;
                totalLateAll += lateCount;
                totalLeaveAll += leaveCount;
            }

            int totalStaff = staffRows.Count;
            int totalMarkedAll = totalPresentAll + totalAbsentAll + staffRows.Sum(r => r.LateCount + r.LeaveCount);
            double overallPercentage = totalMarkedAll > 0
                ? Math.Round((double)(totalPresentAll + totalLateAll) / totalMarkedAll * 100, 1)
                : 0;

            string deptName = "All Departments";
            if (request.DepartmentId.HasValue && request.DepartmentId.Value > 0)
            {
                var dept = await _context.Departments.FirstOrDefaultAsync(d => d.DepartmentId == request.DepartmentId.Value);
                if (dept != null) deptName = dept.DepartmentName;
            }

            return new StaffMonthlyReportResponse
            {
                Month = targetMonth,
                Year = targetYear,
                DepartmentName = deptName,
                StaffTypeName = request.StaffType == StaffType.Teaching ? "Teaching Staff" : "Non-Teaching Staff",
                TotalWorkingDays = workingDaysCount,
                TotalPresent = totalPresentAll,
                TotalAbsent = totalAbsentAll,
                TotalLate = totalLateAll,
                TotalLeave = totalLeaveAll,
                OverallAttendancePercentage = overallPercentage,
                DayHeaders = dayHeaders,
                StaffRows = staffRows
            };
        }
    }
}
