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

            // Fetch staff members filtered by staff type, board, and optional department
            var query = _context.Staffs
                .Where(f => !f.IsDeleted); if (request.CampusId.HasValue) query = query.Where(f => f.CampusId == request.CampusId.Value);

            if (request.BoardId.HasValue && request.BoardId.Value > 0)
            {
                query = query.Where(f => f.BoardId == request.BoardId.Value || f.BoardId == null || f.BoardId == 0);
            }

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

            if (request.CampusId.HasValue && request.CampusId.Value > 0)
            {
                query = query.Where(f => f.CampusId == request.CampusId.Value);
            }

            var facultyList = await query
                .AsNoTracking()
                .Include(f => f.DepartmentRef)
                .Include(f => f.DesignationRef)
                .OrderBy(f => f.FirstName)
                .ThenBy(f => f.LastName)
                .ToListAsync();

            // Find existing attendances for today across sessions using range for index seek
            var nextDate = targetDate.AddDays(1);
            var attendancesForDate = await _context.StaffAttendances
                .AsNoTracking()
                .Include(a => a.StaffAttendanceSession)
                .Where(a => a.StaffAttendanceSession.AttendanceDate >= targetDate && a.StaffAttendanceSession.AttendanceDate < nextDate
                            && (!request.StaffType.HasValue || a.StaffAttendanceSession.StaffType == request.StaffType.Value)
                            && (!request.CampusId.HasValue || a.StaffAttendanceSession.CampusId == request.CampusId.Value)
                            && a.IsActive)
                .OrderByDescending(a => a.UpdatedAt ?? a.CreatedAt)
                .ToListAsync();

            var attendanceByFaculty = attendancesForDate
                .GroupBy(a => a.FacultyId)
                .ToDictionary(g => g.Key, g => g.First());

            bool isHoliday = await _context.Holidays.AnyAsync(h =>
                !h.IsDeleted && h.Status == "Active" &&
                targetDate >= h.StartDate.Date && targetDate <= h.EndDate.Date &&
                (h.AppliesTo == "All Students & Staff" || h.AppliesTo == "Staff Only") &&
                (!request.CampusId.HasValue || h.CampusId == request.CampusId.Value));

            // Check approved leaves for these faculty members on target date
            var staffIds = facultyList.Select(f => f.Id).ToList();
            var approvedLeaves = await _context.StaffLeaveRequests
                .Where(l => l.IsActive && l.Status == LeaveStatus.Approved
                            && staffIds.Contains(l.StaffId)
                            && targetDate >= l.StartDate.Date && targetDate <= l.EndDate.Date)
                .ToDictionaryAsync(l => l.StaffId, l => l);

            var result = new List<StaffAttendanceItemResponse>();

            var timingConfig = await _context.AttendanceTimingConfigs
                .Where(c => c.IsActive && (c.StaffType == null || c.StaffType == request.StaffType))
                .OrderBy(c => c.StaffType == request.StaffType ? 1 : 2)
                .FirstOrDefaultAsync();

            foreach (var f in facultyList)
            {
                attendanceByFaculty.TryGetValue(f.FacultyId, out var markedEntry);
                approvedLeaves.TryGetValue(f.Id, out var leaveEntry);

                bool isLate = false;
                bool isEarlyCheckout = false;
                if (timingConfig != null && markedEntry?.InTime != null)
                {
                    var lateThreshold = timingConfig.LateThreshold.Add(TimeSpan.FromMinutes(timingConfig.GracePeriodMinutes));
                    isLate = markedEntry.InTime.Value > lateThreshold;
                }
                if (timingConfig != null && markedEntry?.OutTime != null)
                {
                    isEarlyCheckout = markedEntry.OutTime.Value < timingConfig.EarlyCheckoutThreshold;
                }

                AttendanceStatus? resolvedStatus = null;
                bool isMarked = false;
                string? remarks = markedEntry?.Remarks;

                if (markedEntry != null)
                {
                    resolvedStatus = (markedEntry.Status == AttendanceStatus.HalfDay || (byte)markedEntry.Status == 4)
                        ? AttendanceStatus.Leave
                        : markedEntry.Status;
                    isMarked = true;
                }
                else if (leaveEntry != null)
                {
                    resolvedStatus = AttendanceStatus.Leave;
                    isMarked = true;
                    remarks = string.IsNullOrEmpty(leaveEntry.Reason) ? "Approved Leave" : $"Approved Leave: {leaveEntry.Reason}";
                }
                else if (isHoliday)
                {
                    resolvedStatus = AttendanceStatus.Holiday;
                    isMarked = true;
                    remarks = "Official Holiday";
                }
                else
                {
                    resolvedStatus = null;
                    isMarked = false;
                }

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
                    Status = resolvedStatus,
                    IsAttendanceMarked = isMarked,
                    InTime = markedEntry?.InTime,
                    OutTime = markedEntry?.OutTime,
                    VerificationMethod = markedEntry?.VerificationMethod ?? VerificationMethod.Manual,
                    Remarks = remarks,
                    IsLate = isLate,
                    IsEarlyCheckout = isEarlyCheckout
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
                                          && (request.DepartmentId == null || s.DepartmentId == request.DepartmentId)
                                          && (request.CampusId == null || s.CampusId == request.CampusId));

            if (session == null)
            {
                session = new StaffAttendanceSession
                {
                    AttendanceDate = targetDate, CampusId = request.CampusId,
                    DepartmentId = request.DepartmentId > 0 ? request.DepartmentId : null,
                    StaffType = request.StaffType,
                    TotalStaffCount = request.StaffAttendances.Count,
                    CreatedByUserId = currentUserId,
                    CreatedAt = DateTime.UtcNow
                };

                await _context.StaffAttendanceSessions.AddAsync(session);
                await _context.SaveChangesAsync();
            }

            var timingConfig = await _context.AttendanceTimingConfigs
                .Where(c => c.IsActive && (c.StaffType == null || c.StaffType == request.StaffType))
                .OrderBy(c => c.StaffType == request.StaffType ? 1 : 2)
                .FirstOrDefaultAsync();

            int present = 0, absent = 0, late = 0, leave = 0;

            foreach (var entry in request.StaffAttendances)
            {
                var effectiveStatus = (entry.Status == AttendanceStatus.HalfDay || (byte)entry.Status == 4)
                    ? AttendanceStatus.Leave
                    : entry.Status;
                var effectiveRemarks = entry.Remarks;

                if (timingConfig != null)
                {
                    if (entry.InTime.HasValue)
                    {
                        var lateThreshold = timingConfig.LateThreshold.Add(TimeSpan.FromMinutes(timingConfig.GracePeriodMinutes));
                        if (entry.InTime.Value > lateThreshold && effectiveStatus == AttendanceStatus.Present)
                        {
                            effectiveStatus = AttendanceStatus.Late;
                        }
                    }

                    if (entry.OutTime.HasValue && entry.OutTime.Value < timingConfig.EarlyCheckoutThreshold)
                    {
                        if (string.IsNullOrWhiteSpace(effectiveRemarks))
                        {
                            effectiveRemarks = "Early Checkout";
                        }
                        else if (!effectiveRemarks.Contains("Early Checkout", StringComparison.OrdinalIgnoreCase))
                        {
                            effectiveRemarks = $"{effectiveRemarks} | Early Checkout";
                        }
                    }
                }

                switch (effectiveStatus)
                {
                    case AttendanceStatus.Present: present++; break;
                    case AttendanceStatus.Absent: absent++; break;
                    case AttendanceStatus.Late: late++; break;
                    case AttendanceStatus.Leave: leave++; break;
                }

                var existingAttendance = session.StaffAttendances.FirstOrDefault(a => a.FacultyId == entry.FacultyId);
                if (existingAttendance != null)
                {
                    existingAttendance.Status = effectiveStatus;
                    existingAttendance.InTime = entry.InTime;
                    existingAttendance.OutTime = entry.OutTime;
                    existingAttendance.VerificationMethod = entry.VerificationMethod;
                    existingAttendance.DeviceId = entry.DeviceId;
                    existingAttendance.Remarks = effectiveRemarks;
                    existingAttendance.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    var newAttendance = new StaffAttendance
                    {
                        StaffSessionId = session.StaffSessionId,
                        FacultyId = entry.FacultyId,
                        Status = effectiveStatus,
                        InTime = entry.InTime,
                        OutTime = entry.OutTime,
                        VerificationMethod = entry.VerificationMethod,
                        DeviceId = entry.DeviceId,
                        Remarks = effectiveRemarks,
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

                var timingConfig = await _context.AttendanceTimingConfigs
                    .Where(c => c.IsActive && (c.StaffType == null || c.StaffType == request.StaffType))
                    .OrderBy(c => c.StaffType == request.StaffType ? 1 : 2)
                    .FirstOrDefaultAsync();

                var effectiveStatus = (request.Status == AttendanceStatus.HalfDay || (byte)request.Status == 4)
                    ? AttendanceStatus.Leave
                    : request.Status;
                var effectiveRemarks = request.Remarks;

                if (timingConfig != null)
                {
                    if (request.InTime.HasValue)
                    {
                        var lateThreshold = timingConfig.LateThreshold.Add(TimeSpan.FromMinutes(timingConfig.GracePeriodMinutes));
                        if (request.InTime.Value > lateThreshold && effectiveStatus == AttendanceStatus.Present)
                        {
                            effectiveStatus = AttendanceStatus.Late;
                        }
                    }

                    if (request.OutTime.HasValue && request.OutTime.Value < timingConfig.EarlyCheckoutThreshold)
                    {
                        if (string.IsNullOrWhiteSpace(effectiveRemarks))
                        {
                            effectiveRemarks = "Early Checkout";
                        }
                        else if (!effectiveRemarks.Contains("Early Checkout", StringComparison.OrdinalIgnoreCase))
                        {
                            effectiveRemarks = $"{effectiveRemarks} | Early Checkout";
                        }
                    }
                }

                oldStatus = existingAttendance.Status;
                existingAttendance.Status = effectiveStatus;
                existingAttendance.InTime = request.InTime;
                existingAttendance.OutTime = request.OutTime;
                existingAttendance.Remarks = effectiveRemarks;
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
                                              && (s.DepartmentId == null || (request.DepartmentId.HasValue && s.DepartmentId == request.DepartmentId.Value))
                                              && (!request.CampusId.HasValue || s.CampusId == request.CampusId.Value));

                if (session != null && session.IsLocked)
                {
                    throw new InvalidOperationException("Attendance session is locked and cannot be modified.");
                }

                if (session == null)
                {
                    var query = _context.Staffs.Where(f => !f.IsDeleted);
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

                    if (request.CampusId.HasValue && request.CampusId.Value > 0)
                    {
                        query = query.Where(f => f.CampusId == request.CampusId.Value);
                    }

                    session = new StaffAttendanceSession
                    {
                        AttendanceDate = targetDate, CampusId = request.CampusId,
                        DepartmentId = request.DepartmentId > 0 ? request.DepartmentId : null,
                        StaffType = request.StaffType,
                        TotalStaffCount = await query.CountAsync(),
                        CreatedByUserId = currentUserId,
                        CreatedAt = DateTime.UtcNow
                    };

                    await _context.StaffAttendanceSessions.AddAsync(session);
                    await _context.SaveChangesAsync();
                }

                var timingConfig = await _context.AttendanceTimingConfigs
                    .Where(c => c.IsActive && (c.StaffType == null || c.StaffType == request.StaffType))
                    .OrderBy(c => c.StaffType == request.StaffType ? 1 : 2)
                    .FirstOrDefaultAsync();

                var effectiveStatus = (request.Status == AttendanceStatus.HalfDay || (byte)request.Status == 4)
                    ? AttendanceStatus.Leave
                    : request.Status;
                var effectiveRemarks = request.Remarks;

                if (timingConfig != null)
                {
                    if (request.InTime.HasValue)
                    {
                        var lateThreshold = timingConfig.LateThreshold.Add(TimeSpan.FromMinutes(timingConfig.GracePeriodMinutes));
                        if (request.InTime.Value > lateThreshold && effectiveStatus == AttendanceStatus.Present)
                        {
                            effectiveStatus = AttendanceStatus.Late;
                        }
                    }

                    if (request.OutTime.HasValue && request.OutTime.Value < timingConfig.EarlyCheckoutThreshold)
                    {
                        if (string.IsNullOrWhiteSpace(effectiveRemarks))
                        {
                            effectiveRemarks = "Early Checkout";
                        }
                        else if (!effectiveRemarks.Contains("Early Checkout", StringComparison.OrdinalIgnoreCase))
                        {
                            effectiveRemarks = $"{effectiveRemarks} | Early Checkout";
                        }
                    }
                }

                var newAttendance = new StaffAttendance
                {
                    StaffSessionId = session.StaffSessionId,
                    FacultyId = request.FacultyId,
                    Status = effectiveStatus,
                    InTime = request.InTime,
                    OutTime = request.OutTime,
                    Remarks = effectiveRemarks,
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
            var monthStartDate = new DateTime(targetYear, targetMonth, 1);
            var monthEndDate = new DateTime(targetYear, targetMonth, daysInMonth);

            var monthHolidays = await _context.Holidays
                .Where(h => !h.IsDeleted && h.Status == "Active"
                         && h.StartDate <= monthEndDate && h.EndDate >= monthStartDate
                         && (h.AppliesTo == "All Students & Staff" || h.AppliesTo == "Staff Only") && (!request.CampusId.HasValue || h.CampusId == request.CampusId))
                .ToListAsync();

            var dayHeaders = new List<DayHeaderDto>();
            for (int day = 1; day <= daysInMonth; day++)
            {
                var dt = new DateTime(targetYear, targetMonth, day);
                bool isSunday = dt.DayOfWeek == DayOfWeek.Sunday;
                var matchingHoliday = monthHolidays.FirstOrDefault(h => dt.Date >= h.StartDate.Date && dt.Date <= h.EndDate.Date);
                bool isOfficialHoliday = matchingHoliday != null;
                bool isHoliday = isSunday || isOfficialHoliday;
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
                .Where(f => !f.IsDeleted);

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
                facultyQuery = facultyQuery.Where(f => f.BoardId == request.BoardId.Value || f.BoardId == null || f.BoardId == 0);
            }

            if (request.DepartmentId.HasValue && request.DepartmentId.Value > 0)
            {
                facultyQuery = facultyQuery.Where(f => f.DepartmentId == request.DepartmentId.Value);
            }

            if (request.FacultyId.HasValue && request.FacultyId.Value > 0)
            {
                facultyQuery = facultyQuery.Where(f => f.Id == request.FacultyId.Value);
            }

            if (request.CampusId.HasValue && request.CampusId.Value > 0)
            {
                facultyQuery = facultyQuery.Where(f => f.CampusId == request.CampusId.Value);
            }

            var facultyList = await facultyQuery.OrderBy(f => f.FirstName).ToListAsync();

            var startDate = new DateTime(targetYear, targetMonth, 1);
            var endDate = new DateTime(targetYear, targetMonth, daysInMonth);

            var monthAttendances = await _context.StaffAttendances
                .Include(a => a.StaffAttendanceSession)
                .Where(a => a.StaffAttendanceSession.AttendanceDate.Date >= startDate
                            && a.StaffAttendanceSession.AttendanceDate.Date <= endDate
                            && (!request.StaffType.HasValue || a.StaffAttendanceSession.StaffType == request.StaffType)
                            && (!request.CampusId.HasValue || a.StaffAttendanceSession.CampusId == request.CampusId.Value)
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
                    var dt = new DateTime(targetYear, targetMonth, day);
                    bool isSunday = dt.DayOfWeek == DayOfWeek.Sunday;
                    var matchingHoliday = monthHolidays.FirstOrDefault(h => dt.Date >= h.StartDate.Date && dt.Date <= h.EndDate.Date);
                    bool isOfficialHoliday = matchingHoliday != null;

                    if (isOfficialHoliday)
                    {
                        dailyStatus.Add("H");
                        continue;
                    }
                    if (isSunday)
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
                                dailyStatus.Add("LT");
                                lateCount++;
                                break;
                            case AttendanceStatus.Leave:
                            case AttendanceStatus.HalfDay:
                                dailyStatus.Add("LV");
                                leaveCount++;
                                break;
                            default:
                                dailyStatus.Add("-");
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

        #region Self-Service My Attendance & Regularization

        public async Task<MyAttendanceTodayResponse> GetMyTodayStatusAsync(int facultyId, DateTime date)
        {
            var targetDate = date.Date;
            var nextDate = targetDate.AddDays(1);

            var timingConfig = await _context.AttendanceTimingConfigs
                .Where(c => c.IsActive)
                .OrderBy(c => c.Id)
                .FirstOrDefaultAsync();

            var shiftStart = timingConfig?.WorkStartTime ?? new TimeSpan(9, 0, 0);
            var shiftEnd = timingConfig?.WorkEndTime ?? new TimeSpan(16, 30, 0);
            var lateThreshold = timingConfig != null
                ? timingConfig.LateThreshold.Add(TimeSpan.FromMinutes(timingConfig.GracePeriodMinutes))
                : new TimeSpan(9, 15, 0);

            var attendance = await _context.StaffAttendances
                .Include(a => a.StaffAttendanceSession)
                .Where(a => a.FacultyId == facultyId 
                            && a.StaffAttendanceSession.AttendanceDate >= targetDate 
                            && a.StaffAttendanceSession.AttendanceDate < nextDate 
                            && a.IsActive)
                .OrderByDescending(a => a.StaffAttendanceId)
                .FirstOrDefaultAsync();

            bool isHoliday = await _context.Holidays.AnyAsync(h =>
                !h.IsDeleted && h.Status == "Active" &&
                targetDate >= h.StartDate.Date && targetDate <= h.EndDate.Date &&
                (h.AppliesTo == "All Students & Staff" || h.AppliesTo == "Staff Only"));

            bool isLeave = await _context.StaffLeaveRequests.AnyAsync(l =>
                l.IsActive && l.StaffId == facultyId && l.Status == LeaveStatus.Approved &&
                targetDate >= l.StartDate.Date && targetDate <= l.EndDate.Date);

            var regularization = await _context.StaffAttendanceRegularizations
                .Where(r => (r.FacultyId == facultyId || r.StaffId == facultyId)
                            && r.AttendanceDate >= targetDate && r.AttendanceDate < nextDate)
                .OrderByDescending(r => r.RegularizationId)
                .FirstOrDefaultAsync();

            string status = "not_punched";
            string? inTimeStr = null;
            string? outTimeStr = null;
            string? durationStr = null;
            bool isLate = false;
            string todayStatus;

            if (attendance != null && attendance.InTime.HasValue)
            {
                inTimeStr = DateTime.Today.Add(attendance.InTime.Value).ToString("hh:mm tt");
                isLate = attendance.InTime.Value > lateThreshold;

                if (attendance.OutTime.HasValue)
                {
                    status = "punched_out";
                    outTimeStr = DateTime.Today.Add(attendance.OutTime.Value).ToString("hh:mm tt");

                    var diff = attendance.OutTime.Value - attendance.InTime.Value;
                    if (diff.TotalMinutes < 0) diff = diff.Add(TimeSpan.FromHours(24));
                    durationStr = $"{(int)diff.TotalHours}h {diff.Minutes}m";
                }
                else
                {
                    status = "punched_in";
                    var nowTime = DateTime.Now.TimeOfDay;
                    var diff = nowTime - attendance.InTime.Value;
                    if (diff.TotalMinutes < 0) diff = diff.Add(TimeSpan.FromHours(24));
                    durationStr = $"{(int)diff.TotalHours}h {diff.Minutes}m";
                }

                if (regularization?.Status == "Approved")
                {
                    todayStatus = "Present";
                }
                else if (attendance.Status == AttendanceStatus.Late || isLate)
                {
                    todayStatus = "Late";
                }
                else if (attendance.Status == AttendanceStatus.HalfDay)
                {
                    todayStatus = "Half Day";
                }
                else
                {
                    todayStatus = "Present";
                }
            }
            else
            {
                if (isHoliday) todayStatus = "Holiday";
                else if (isLeave) todayStatus = "Leave";
                else todayStatus = "Absent";
            }

            bool canRegularize = (todayStatus == "Late" || todayStatus == "Absent" || todayStatus == "Half Day")
                                 && (regularization == null || regularization.Status != "Approved");

            return new MyAttendanceTodayResponse
            {
                Status = status,
                InTime = inTimeStr,
                OutTime = outTimeStr,
                ShiftDuration = durationStr ?? "--",
                ShiftName = $"Morning ({DateTime.Today.Add(shiftStart):hh:mm tt} – {DateTime.Today.Add(shiftEnd):hh:mm tt})",
                ShiftStartTime = DateTime.Today.Add(shiftStart).ToString("hh:mm tt"),
                ShiftEndTime = DateTime.Today.Add(shiftEnd).ToString("hh:mm tt"),
                IsLate = isLate,
                TodayStatus = todayStatus,
                CanRegularize = canRegularize,
                DateFormatted = date.ToString("ddd, MMM dd, yyyy"),
                RegularizationState = regularization?.Status?.ToLowerInvariant()
            };
        }

        public async Task<MyAttendanceTodayResponse> PunchInAsync(int facultyId, StaffPunchRequest request, string? clientIp, int? userId)
        {
            var targetDate = DateTime.Today;
            var nextDate = targetDate.AddDays(1);

            var staff = await _context.Staffs
                .FirstOrDefaultAsync(s => s.Id == facultyId && !s.IsDeleted);

            if (staff == null)
            {
                throw new KeyNotFoundException($"Staff/Faculty with ID {facultyId} was not found.");
            }

            // Find or create session for today
            var session = await _context.StaffAttendanceSessions
                .FirstOrDefaultAsync(s => s.AttendanceDate >= targetDate && s.AttendanceDate < nextDate
                                          && (staff.CampusId == null || s.CampusId == staff.CampusId)
                                          && s.StaffType == StaffType.Teaching);

            if (session == null)
            {
                session = new StaffAttendanceSession
                {
                    AttendanceDate = targetDate,
                    CampusId = staff.CampusId,
                    DepartmentId = staff.DepartmentId,
                    StaffType = StaffType.Teaching,
                    TotalStaffCount = 1,
                    CreatedByUserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };
                await _context.StaffAttendanceSessions.AddAsync(session);
                await _context.SaveChangesAsync();
            }

            var attendance = await _context.StaffAttendances
                .Include(a => a.StaffAttendanceSession)
                .Where(a => a.FacultyId == facultyId 
                            && a.StaffAttendanceSession.AttendanceDate >= targetDate 
                            && a.StaffAttendanceSession.AttendanceDate < nextDate 
                            && a.IsActive)
                .OrderByDescending(a => a.StaffAttendanceId)
                .FirstOrDefaultAsync();

            if (attendance != null && attendance.InTime.HasValue)
            {
                var timeStr = DateTime.Today.Add(attendance.InTime.Value).ToString("hh:mm tt");
                throw new InvalidOperationException($"You have already checked in for today at {timeStr}.");
            }

            var timingConfig = await _context.AttendanceTimingConfigs
                .Where(c => c.IsActive)
                .OrderBy(c => c.Id)
                .FirstOrDefaultAsync();

            var lateThreshold = timingConfig != null
                ? timingConfig.LateThreshold.Add(TimeSpan.FromMinutes(timingConfig.GracePeriodMinutes))
                : new TimeSpan(9, 15, 0);

            var currentTime = DateTime.Now.TimeOfDay;
            var isLate = currentTime > lateThreshold;
            var status = isLate ? AttendanceStatus.Late : AttendanceStatus.Present;

            if (attendance == null)
            {
                attendance = new StaffAttendance
                {
                    StaffSessionId = session.StaffSessionId,
                    FacultyId = facultyId,
                    Status = status,
                    InTime = currentTime,
                    VerificationMethod = request.VerificationMethod,
                    DeviceId = string.IsNullOrWhiteSpace(request.DeviceId) ? "Web Portal" : request.DeviceId,
                    IpAddress = clientIp,
                    Remarks = string.IsNullOrWhiteSpace(request.Remarks) 
                        ? (isLate ? "Late punch logged via Web Portal" : "Web Portal Check-In") 
                        : request.Remarks,
                    CreatedByUserId = userId,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };
                await _context.StaffAttendances.AddAsync(attendance);
            }
            else
            {
                attendance.InTime = currentTime;
                attendance.Status = status;
                attendance.VerificationMethod = request.VerificationMethod;
                attendance.IpAddress = clientIp;
                attendance.DeviceId = string.IsNullOrWhiteSpace(request.DeviceId) ? attendance.DeviceId : request.DeviceId;
                attendance.Remarks = string.IsNullOrWhiteSpace(request.Remarks) ? attendance.Remarks : request.Remarks;
                attendance.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return await GetMyTodayStatusAsync(facultyId, targetDate);
        }

        public async Task<MyAttendanceTodayResponse> PunchOutAsync(int facultyId, StaffPunchRequest request, string? clientIp, int? userId)
        {
            var targetDate = DateTime.Today;
            var nextDate = targetDate.AddDays(1);

            var attendance = await _context.StaffAttendances
                .Include(a => a.StaffAttendanceSession)
                .Where(a => a.FacultyId == facultyId 
                            && a.StaffAttendanceSession.AttendanceDate >= targetDate 
                            && a.StaffAttendanceSession.AttendanceDate < nextDate 
                            && a.IsActive)
                .OrderByDescending(a => a.StaffAttendanceId)
                .FirstOrDefaultAsync();

            if (attendance == null || !attendance.InTime.HasValue)
            {
                throw new InvalidOperationException("You must check in before checking out.");
            }

            if (attendance.OutTime.HasValue)
            {
                var timeStr = DateTime.Today.Add(attendance.OutTime.Value).ToString("hh:mm tt");
                throw new InvalidOperationException($"You have already punched out for today at {timeStr}.");
            }

            attendance.OutTime = DateTime.Now.TimeOfDay;
            attendance.UpdatedAt = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(request.Remarks))
            {
                attendance.Remarks = (attendance.Remarks ?? "") + " | " + request.Remarks;
            }

            await _context.SaveChangesAsync();
            return await GetMyTodayStatusAsync(facultyId, targetDate);
        }

        public async Task<MyAttendanceHistoryResponse> GetMyAttendanceHistoryAsync(int facultyId, string period, DateTime? targetDate)
        {
            var now = targetDate ?? DateTime.Today;
            DateTime start, end;
            string periodKey = (period ?? "week").ToLowerInvariant();

            switch (periodKey)
            {
                case "last_week":
                    int diffLast = ((int)now.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7 + 7;
                    start = now.AddDays(-diffLast).Date;
                    end = start.AddDays(5).Date; // Mon to Sat
                    break;
                case "month":
                    start = new DateTime(now.Year, now.Month, 1);
                    end = start.AddMonths(1).AddDays(-1);
                    break;
                case "last_month":
                    var prevMonth = now.AddMonths(-1);
                    start = new DateTime(prevMonth.Year, prevMonth.Month, 1);
                    end = start.AddMonths(1).AddDays(-1);
                    break;
                case "week":
                default:
                    periodKey = "week";
                    int diff = ((int)now.DayOfWeek - (int)DayOfWeek.Monday + 7) % 7;
                    start = now.AddDays(-diff).Date;
                    end = start.AddDays(5).Date; // Mon to Sat
                    break;
            }

            var nextEnd = end.AddDays(1);

            var attendances = await _context.StaffAttendances
                .AsNoTracking()
                .Include(a => a.StaffAttendanceSession)
                .Where(a => a.FacultyId == facultyId 
                            && a.StaffAttendanceSession.AttendanceDate >= start 
                            && a.StaffAttendanceSession.AttendanceDate < nextEnd 
                            && a.IsActive)
                .ToListAsync();

            var holidays = await _context.Holidays
                .AsNoTracking()
                .Where(h => !h.IsDeleted && h.Status == "Active" && h.StartDate.Date <= end && h.EndDate.Date >= start)
                .ToListAsync();

            var leaves = await _context.StaffLeaveRequests
                .AsNoTracking()
                .Where(l => l.IsActive && l.StaffId == facultyId && l.Status == LeaveStatus.Approved && l.StartDate.Date <= end && l.EndDate.Date >= start)
                .ToListAsync();

            var regularizations = await _context.StaffAttendanceRegularizations
                .AsNoTracking()
                .Where(r => (r.FacultyId == facultyId || r.StaffId == facultyId) && r.AttendanceDate >= start && r.AttendanceDate < nextEnd)
                .ToListAsync();

            var timingConfig = await _context.AttendanceTimingConfigs
                .AsNoTracking()
                .Where(c => c.IsActive)
                .OrderBy(c => c.Id)
                .FirstOrDefaultAsync();

            var shiftStart = timingConfig?.WorkStartTime ?? new TimeSpan(9, 0, 0);
            var shiftEnd = timingConfig?.WorkEndTime ?? new TimeSpan(16, 30, 0);
            string shiftLabel = $"Morning ({DateTime.Today.Add(shiftStart):HH:mm}–{DateTime.Today.Add(shiftEnd):HH:mm})";

            var logs = new List<MyAttendanceLogItemDto>();
            int workingDaysCount = 0;
            int presentCount = 0;
            int leaveCount = 0;
            int absentCount = 0;
            int lateCount = 0;

            for (var d = start; d <= end; d = d.AddDays(1))
            {
                bool isSunday = d.DayOfWeek == DayOfWeek.Sunday;
                bool isPastOrToday = d <= now;

                var att = attendances.FirstOrDefault(a => a.StaffAttendanceSession.AttendanceDate.Date == d);
                var isHoliday = holidays.Any(h => d >= h.StartDate.Date && d <= h.EndDate.Date);
                var isLeaveDay = leaves.Any(l => d >= l.StartDate.Date && d <= l.EndDate.Date);
                var reg = regularizations.FirstOrDefault(r => r.AttendanceDate.Date == d);

                string status;
                string inTimeStr = "--";
                string outTimeStr = "--";
                string hoursStr = "0h 0m";
                string device = "--";

                if (isSunday)
                {
                    status = "Holiday";
                }
                else if (isHoliday)
                {
                    status = "Holiday";
                }
                else
                {
                    workingDaysCount++;

                    if (att != null && att.InTime.HasValue)
                    {
                        inTimeStr = DateTime.Today.Add(att.InTime.Value).ToString("hh:mm tt");
                        device = string.IsNullOrWhiteSpace(att.DeviceId) ? "Bio-Station 01 (Main Gate)" : att.DeviceId;

                        if (att.OutTime.HasValue)
                        {
                            outTimeStr = DateTime.Today.Add(att.OutTime.Value).ToString("hh:mm tt");
                            var diff = att.OutTime.Value - att.InTime.Value;
                            if (diff.TotalMinutes < 0) diff = diff.Add(TimeSpan.FromHours(24));
                            hoursStr = $"{(int)diff.TotalHours}h {diff.Minutes}m";
                        }

                        if (reg?.Status == "Approved")
                        {
                            status = "Present";
                            presentCount++;
                        }
                        else if (att.Status == AttendanceStatus.Late)
                        {
                            status = "Late";
                            presentCount++;
                            lateCount++;
                        }
                        else if (att.Status == AttendanceStatus.HalfDay)
                        {
                            status = "Half Day";
                            presentCount++;
                        }
                        else
                        {
                            status = "Present";
                            presentCount++;
                        }
                    }
                    else if (isLeaveDay)
                    {
                        status = "Leave";
                        leaveCount++;
                    }
                    else if (isPastOrToday)
                    {
                        status = "Absent";
                        absentCount++;
                    }
                    else
                    {
                        status = "--";
                    }
                }

                bool canRegularize = isPastOrToday && (status == "Late" || status == "Absent" || status == "Half Day")
                                     && (reg == null || reg.Status != "Approved");

                logs.Add(new MyAttendanceLogItemDto
                {
                    Id = $"log-{d:yyyyMMdd}",
                    Day = d.ToString("ddd"),
                    Date = d.ToString("dd/MM/yyyy"),
                    RawDate = d.ToString("yyyy-MM-dd"),
                    Shift = isSunday || isHoliday ? "General" : shiftLabel,
                    InTime = inTimeStr,
                    OutTime = outTimeStr,
                    Hours = hoursStr,
                    Device = device,
                    Status = status,
                    CanRegularize = canRegularize,
                    IsToday = d == now,
                    RegularizationState = reg?.Status?.ToLowerInvariant()
                });
            }

            var metrics = new MyAttendanceAnalyticsMetricsDto
            {
                WorkingDays = $"{workingDaysCount} Days",
                WorkingDaysSub = periodKey == "week" ? "Current Week (Mon–Sat)" : (periodKey == "last_week" ? "Previous Week (Mon–Sat)" : $"{now:MMMM yyyy}"),
                PresentDays = $"{presentCount} Days",
                PresentDaysSub = lateCount > 0 ? $"{lateCount} Late punch logged" : "Biometric / Portal verified",
                Leaves = $"{leaveCount} Days",
                LeavesSub = leaveCount > 0 ? $"{leaveCount} Approved leave(s)" : "No leaves applied",
                AbsentDays = $"{absentCount} Days",
                AbsentDaysSub = absentCount > 0 ? $"{absentCount} Unexcused absence" : "No absences"
            };

            return new MyAttendanceHistoryResponse
            {
                Period = periodKey,
                Logs = logs,
                Metrics = metrics
            };
        }

        public async Task<bool> SubmitRegularizationAsync(int facultyId, SubmitRegularizationRequest request, int? userId)
        {
            var targetDate = request.AttendanceDate.Date;
            var nextDate = targetDate.AddDays(1);

            var existing = await _context.StaffAttendanceRegularizations
                .FirstOrDefaultAsync(r => (r.FacultyId == facultyId || r.StaffId == facultyId) 
                                          && r.AttendanceDate >= targetDate && r.AttendanceDate < nextDate);

            TimeSpan? requestedIn = null;
            if (!string.IsNullOrWhiteSpace(request.RequestedInTime) && TimeSpan.TryParse(request.RequestedInTime, out var inParsed))
            {
                requestedIn = inParsed;
            }

            TimeSpan? requestedOut = null;
            if (!string.IsNullOrWhiteSpace(request.RequestedOutTime) && TimeSpan.TryParse(request.RequestedOutTime, out var outParsed))
            {
                requestedOut = outParsed;
            }

            if (existing != null)
            {
                if (existing.Status == "Approved")
                {
                    throw new InvalidOperationException("Attendance for this date has already been regularized and approved.");
                }
                existing.RequestedInTime = requestedIn;
                existing.RequestedOutTime = requestedOut;
                existing.Reason = request.Reason;
                existing.Status = "Pending";
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var newReg = new StaffAttendanceRegularization
                {
                    FacultyId = facultyId,
                    StaffId = facultyId,
                    AttendanceDate = targetDate,
                    RequestedInTime = requestedIn,
                    RequestedOutTime = requestedOut,
                    Reason = request.Reason,
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow
                };
                await _context.StaffAttendanceRegularizations.AddAsync(newReg);
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<RegularizationItemDto>> GetRegularizationsAsync(string? status, int? departmentId)
        {
            var query = _context.StaffAttendanceRegularizations
                .AsNoTracking()
                .Include(r => r.Staff)
                    .ThenInclude(s => s!.DepartmentRef)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(r => r.Status.ToLower() == status.ToLower());
            }

            if (departmentId.HasValue && departmentId.Value > 0)
            {
                query = query.Where(r => r.Staff != null && r.Staff.DepartmentId == departmentId.Value);
            }

            var list = await query
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();

            return list.Select(r => new RegularizationItemDto
            {
                RegularizationId = r.RegularizationId,
                FacultyId = r.FacultyId,
                StaffId = r.StaffId,
                StaffName = r.Staff != null ? $"{r.Staff.FirstName} {r.Staff.LastName}".Trim() : "Staff Member",
                EmployeeId = r.Staff?.EmployeeId ?? $"STF{r.StaffId:D3}",
                DepartmentName = r.Staff?.DepartmentRef?.DepartmentName ?? "General",
                AttendanceDate = r.AttendanceDate,
                RequestedInTime = r.RequestedInTime.HasValue ? DateTime.Today.Add(r.RequestedInTime.Value).ToString("hh:mm tt") : null,
                RequestedOutTime = r.RequestedOutTime.HasValue ? DateTime.Today.Add(r.RequestedOutTime.Value).ToString("hh:mm tt") : null,
                Reason = r.Reason,
                Status = r.Status,
                AdminRemarks = r.AdminRemarks,
                ReviewedAt = r.ReviewedAt,
                CreatedAt = r.CreatedAt
            });
        }

        public async Task<bool> ReviewRegularizationAsync(int regularizationId, ReviewRegularizationRequest request, int? reviewerUserId)
        {
            var reg = await _context.StaffAttendanceRegularizations
                .FirstOrDefaultAsync(r => r.RegularizationId == regularizationId);

            if (reg == null)
            {
                throw new KeyNotFoundException($"Regularization with ID {regularizationId} was not found.");
            }

            reg.Status = request.Status;
            reg.AdminRemarks = request.AdminRemarks;
            reg.ReviewedByUserId = reviewerUserId;
            reg.ReviewedAt = DateTime.UtcNow;
            reg.UpdatedAt = DateTime.UtcNow;

            if (string.Equals(request.Status, "Approved", StringComparison.OrdinalIgnoreCase))
            {
                var targetDate = reg.AttendanceDate.Date;
                var nextDate = targetDate.AddDays(1);
                var facultyId = reg.FacultyId ?? reg.StaffId ?? 0;

                if (facultyId > 0)
                {
                    var attendance = await _context.StaffAttendances
                        .Include(a => a.StaffAttendanceSession)
                        .Where(a => a.FacultyId == facultyId 
                                    && a.StaffAttendanceSession.AttendanceDate >= targetDate 
                                    && a.StaffAttendanceSession.AttendanceDate < nextDate 
                                    && a.IsActive)
                        .FirstOrDefaultAsync();

                    if (attendance == null)
                    {
                        var session = await _context.StaffAttendanceSessions
                            .FirstOrDefaultAsync(s => s.AttendanceDate >= targetDate && s.AttendanceDate < nextDate);

                        if (session == null)
                        {
                            session = new StaffAttendanceSession
                            {
                                AttendanceDate = targetDate,
                                StaffType = StaffType.Teaching,
                                TotalStaffCount = 1,
                                CreatedAt = DateTime.UtcNow,
                                IsActive = true
                            };
                            await _context.StaffAttendanceSessions.AddAsync(session);
                            await _context.SaveChangesAsync();
                        }

                        attendance = new StaffAttendance
                        {
                            StaffSessionId = session.StaffSessionId,
                            FacultyId = facultyId,
                            Status = AttendanceStatus.Present,
                            InTime = reg.RequestedInTime ?? new TimeSpan(9, 0, 0),
                            OutTime = reg.RequestedOutTime ?? new TimeSpan(16, 30, 0),
                            Remarks = $"Regularized: {reg.Reason}",
                            VerificationMethod = VerificationMethod.Manual,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow
                        };
                        await _context.StaffAttendances.AddAsync(attendance);
                    }
                    else
                    {
                        attendance.Status = AttendanceStatus.Present;
                        if (reg.RequestedInTime.HasValue) attendance.InTime = reg.RequestedInTime.Value;
                        if (reg.RequestedOutTime.HasValue) attendance.OutTime = reg.RequestedOutTime.Value;
                        attendance.Remarks = $"Regularized: {reg.Reason}";
                        attendance.UpdatedAt = DateTime.UtcNow;
                    }
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }

        #endregion
    }
}
