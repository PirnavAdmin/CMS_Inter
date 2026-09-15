using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.DTOs.StaffAttendance.Responses;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Services.Implementations
{
    public class LeaveManagementService : ILeaveManagementService
    {
        private readonly CollegeManagement.API.Data.AppDbContext _context;

        public LeaveManagementService(CollegeManagement.API.Data.AppDbContext context)
        {
            _context = context;
        }

        public async Task<StaffLeaveResponse> CreateStaffLeaveRequestAsync(CreateStaffLeaveRequest request, int userId)
        {
            
            decimal requestedDays = (decimal)(request.EndDate.Date - request.StartDate.Date).TotalDays + 1;
            int? validUserId = null;
            if (userId > 0 && await _context.Users.AnyAsync(u => u.UserId == userId))
            {
                validUserId = userId;
            }
            else
            {
                validUserId = await _context.Users.Select(u => (int?)u.UserId).FirstOrDefaultAsync();
            }
            int? categoryId = request.LeaveCategoryId;
            if (!categoryId.HasValue && (byte)request.LeaveType > 0)
            {
                categoryId = (int)request.LeaveType;
            }

            var balance = await _context.StaffLeaveBalances
                .FirstOrDefaultAsync(b => b.StaffId == request.StaffId && 
                                          ((categoryId.HasValue && b.LeaveCategoryId == categoryId) || b.LeaveType == request.LeaveType) && 
                                          b.AcademicYearId == request.AcademicYearId);
            
            if (balance != null && balance.RemainingDays < requestedDays)
            {
                throw new CollegeManagement.API.Exceptions.ConflictException("Insufficient leave balance.");
            }

            var leave = new CollegeManagement.API.Models.StaffLeaveRequest
            {
                StaffId = request.StaffId,
                LeaveType = request.LeaveType,
                LeaveCategoryId = categoryId,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Reason = request.Reason,
                DepartmentId = request.DepartmentId,
                AcademicYearId = request.AcademicYearId,
                Status = CollegeManagement.API.Enums.LeaveStatus.Pending,
                CreatedByUserId = validUserId,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.StaffLeaveRequests.Add(leave);
            await _context.SaveChangesAsync();

            return await GetStaffLeaveByIdAsync(leave.StaffLeaveRequestId);
        }

        public async Task<StaffLeaveResponse> ActionStaffLeaveRequestAsync(int leaveRequestId, StaffLeaveActionRequest request, int userId)
        {
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var leave = await _context.StaffLeaveRequests
                        .FromSqlInterpolated($"SELECT * FROM StaffLeaveRequests WHERE StaffLeaveRequestId = {leaveRequestId} FOR UPDATE")
                        .Include(l => l.Staff)
                        .FirstOrDefaultAsync();
                        
                    if (leave == null) throw new CollegeManagement.API.Exceptions.NotFoundException("Leave request not found");

                    if (leave.Status != CollegeManagement.API.Enums.LeaveStatus.Pending && request.Status != CollegeManagement.API.Enums.LeaveStatus.Pending)
                    {
                        if (leave.Status == request.Status) 
                            throw new CollegeManagement.API.Exceptions.ConflictException($"Leave request is already {leave.Status}.");
                        else
                            throw new CollegeManagement.API.Exceptions.ConflictException($"Leave request was already processed and is now {leave.Status}.");
                    }

                    // Ensure userId is a valid existing User in the database to prevent foreign key constraint violations
                    int? validUserId = null;
                    if (userId > 0 && await _context.Users.AnyAsync(u => u.UserId == userId))
                    {
                        validUserId = userId;
                    }
                    else
                    {
                        validUserId = await _context.Users.Select(u => (int?)u.UserId).FirstOrDefaultAsync();
                    }

                    var userName = validUserId.HasValue
                        ? (await _context.Users.Where(u => u.UserId == validUserId.Value).Select(u => u.FullName).FirstOrDefaultAsync() ?? "Admin")
                        : "Admin";

                    var oldStatus = leave.Status;
                    leave.Status = request.Status;
                    if (request.Status == CollegeManagement.API.Enums.LeaveStatus.Rejected)
                    {
                        leave.RejectionReason = request.RejectionReason;

                        // Create Audit History for Rejection
                        // userName already resolved
                        _context.AttendanceAuditHistories.Add(new CollegeManagement.API.Models.AttendanceAuditHistory
                        {
                            EntityType = "Staff",
                            EntityId = leave.StaffLeaveRequestId, // using leave ID since no attendance record created
                            FacultyId = leave.StaffId,
                            AttendanceDate = leave.StartDate.Date,
                            OldStatus = null,
                            NewStatus = 0, // Fallback for Rejection
                            Action = "REJECT",
                            Description = "Leave Rejected: " + request.RejectionReason,
                            ModifiedByUserId = validUserId,
                            ModifiedByUserName = userName,
                            CreatedAt = DateTime.UtcNow
                        });

                        // Revert leave balance if this request was previously approved
                        if (oldStatus == CollegeManagement.API.Enums.LeaveStatus.Approved)
                        {
                            var revBalance = await _context.StaffLeaveBalances
                                .FirstOrDefaultAsync(b => b.StaffId == leave.StaffId &&
                                                          ((leave.LeaveCategoryId.HasValue && b.LeaveCategoryId == leave.LeaveCategoryId.Value) || b.LeaveType == leave.LeaveType) &&
                                                          b.AcademicYearId == leave.AcademicYearId);

                            if (revBalance != null)
                            {
                                decimal requestedDays = (decimal)(leave.EndDate.Date - leave.StartDate.Date).TotalDays + 1;
                                revBalance.UsedDays = Math.Max(0, revBalance.UsedDays - requestedDays);
                                revBalance.RemainingDays = Math.Max(0, revBalance.TotalDays - revBalance.UsedDays);
                                revBalance.UpdatedAt = DateTime.UtcNow;
                            }
                        }
                    }
                                        // Auto-cancel active timetable substitutions if leave is rejected or revoked
                    if (request.Status != CollegeManagement.API.Enums.LeaveStatus.Approved)
                    {
                        var activeSubstitutions = await _context.TimetableSubstitutions
                            .Where(ts => ts.StaffLeaveRequestId == leaveRequestId && ts.Status == "Active")
                            .ToListAsync();

                        foreach (var sub in activeSubstitutions)
                        {
                            sub.Status = "Cancelled";
                            sub.Remarks = (sub.Remarks ?? "") + " | Auto-cancelled due to leave rejection/revocation";
                            sub.UpdatedByUserId = validUserId;
                            sub.UpdatedAt = DateTime.UtcNow;
                        }
                    }

                    leave.ApprovedByUserId = validUserId;
                    leave.ApprovedAt = DateTime.UtcNow;
                    leave.UpdatedAt = DateTime.UtcNow;

                    // If approved, create or update StaffAttendance for each day in the date range
                    if (request.Status == CollegeManagement.API.Enums.LeaveStatus.Approved && oldStatus != CollegeManagement.API.Enums.LeaveStatus.Approved && leave.StartDate.Year >= 2020 && leave.EndDate.Year >= 2020 && leave.StartDate <= leave.EndDate)
                    {
                        // userName already resolved
                        for (var date = leave.StartDate.Date; date <= leave.EndDate.Date; date = date.AddDays(1))
                        {
                            // Skip Sundays as per existing project convention
                            if (date.DayOfWeek == DayOfWeek.Sunday) continue;

                            var staffType = leave.Staff.StaffType.Equals("Teaching", StringComparison.OrdinalIgnoreCase) 
                                ? CollegeManagement.API.Enums.StaffType.Teaching 
                                : CollegeManagement.API.Enums.StaffType.NonTeaching;

                            // Find or create session
                            var session = await _context.StaffAttendanceSessions
                                .FirstOrDefaultAsync(s => s.AttendanceDate.Date == date && s.StaffType == staffType && s.DepartmentId == leave.Staff.DepartmentId);
                                
                            if (session == null)
                            {
                                session = new CollegeManagement.API.Models.StaffAttendanceSession
                                {
                                    AttendanceDate = date,
                                    StaffType = staffType,
                                    DepartmentId = leave.Staff.DepartmentId,
                                    CreatedAt = DateTime.UtcNow,
                                    CreatedByUserId = validUserId,
                                    IsActive = true
                                };
                                _context.StaffAttendanceSessions.Add(session);
                                await _context.SaveChangesAsync();
                            }

                            var existingAttendance = await _context.StaffAttendances
                                .FirstOrDefaultAsync(a => a.FacultyId == leave.StaffId && a.StaffSessionId == session.StaffSessionId);

                            if (existingAttendance == null)
                            {
                                var newAtt = new CollegeManagement.API.Models.StaffAttendance
                                {
                                    FacultyId = leave.StaffId,
                                    StaffSessionId = session.StaffSessionId,
                                    Status = CollegeManagement.API.Enums.AttendanceStatus.Leave,
                                    Remarks = "Leave Approved: " + leave.Reason,
                                    VerificationMethod = CollegeManagement.API.Enums.VerificationMethod.Manual,
                                    CreatedAt = DateTime.UtcNow,
                                    CreatedByUserId = validUserId,
                                    IsActive = true
                                };
                                _context.StaffAttendances.Add(newAtt);
                                await _context.SaveChangesAsync();

                                _context.AttendanceAuditHistories.Add(new CollegeManagement.API.Models.AttendanceAuditHistory
                                {
                                    EntityType = "Staff",
                                    EntityId = newAtt.StaffAttendanceId,
                                    FacultyId = leave.StaffId,
                                    AttendanceDate = date,
                                    OldStatus = null,
                                    NewStatus = (byte)CollegeManagement.API.Enums.AttendanceStatus.Leave,
                                    Action = "CREATE",
                                    Description = "Leave Approved",
                                    ModifiedByUserId = validUserId,
                                    ModifiedByUserName = userName,
                                    CreatedAt = DateTime.UtcNow
                                });
                            }
                            else
                            {
                                var oldAttStatus = existingAttendance.Status;
                                existingAttendance.Status = CollegeManagement.API.Enums.AttendanceStatus.Leave;
                                existingAttendance.Remarks = "Leave Approved: " + leave.Reason;
                                existingAttendance.UpdatedAt = DateTime.UtcNow;
                                
                                _context.AttendanceAuditHistories.Add(new CollegeManagement.API.Models.AttendanceAuditHistory
                                {
                                    EntityType = "Staff",
                                    EntityId = existingAttendance.StaffAttendanceId,
                                    FacultyId = leave.StaffId,
                                    AttendanceDate = date,
                                    OldStatus = (byte)oldAttStatus,
                                    NewStatus = (byte)CollegeManagement.API.Enums.AttendanceStatus.Leave,
                                    Action = "UPDATE",
                                    Description = "Leave Approved",
                                    ModifiedByUserId = validUserId,
                                    ModifiedByUserName = userName,
                                    CreatedAt = DateTime.UtcNow
                                });
                            }
                        }

                        // Deduct leave balance for approved request
                        var matchingBalance = await _context.StaffLeaveBalances
                            .FirstOrDefaultAsync(b => b.StaffId == leave.StaffId &&
                                                      ((leave.LeaveCategoryId.HasValue && b.LeaveCategoryId == leave.LeaveCategoryId.Value) || b.LeaveType == leave.LeaveType) &&
                                                      b.AcademicYearId == leave.AcademicYearId);

                        if (matchingBalance != null)
                        {
                            decimal requestedDays = (decimal)(leave.EndDate.Date - leave.StartDate.Date).TotalDays + 1;
                            matchingBalance.UsedDays += requestedDays;
                            matchingBalance.RemainingDays = Math.Max(0, matchingBalance.TotalDays - matchingBalance.UsedDays);
                            matchingBalance.UpdatedAt = DateTime.UtcNow;
                        }
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return await GetStaffLeaveByIdAsync(leave.StaffLeaveRequestId);
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        public async Task<IEnumerable<StaffLeaveResponse>> GetStaffLeaveRequestsAsync(int? staffId = null, int? departmentId = null, CollegeManagement.API.Enums.LeaveStatus? status = null)
        {
            var query = _context.StaffLeaveRequests.Where(l => l.IsActive);
            
            if (staffId.HasValue) query = query.Where(l => l.StaffId == staffId);
            if (departmentId.HasValue) query = query.Where(l => l.DepartmentId == departmentId);
            if (status.HasValue) query = query.Where(l => l.Status == status);

            var list = await query
                .OrderByDescending(l => l.CreatedAt)
                .Include(l => l.Staff)
                    .ThenInclude(s => s.DepartmentRef)
                .Include(l => l.Department)
                .Include(l => l.ApprovedByUser)
                .Include(l => l.LeaveCategory)
                .ToListAsync();

            return list.Select(l => new StaffLeaveResponse
            {
                StaffLeaveRequestId = l.StaffLeaveRequestId,
                StaffId = l.StaffId,
                StaffName = l.Staff != null ? $"{l.Staff.FirstName} {l.Staff.LastName}".Trim() : "Staff Member",
                Department = l.Staff?.DepartmentRef?.DepartmentName ?? l.Department?.DepartmentName ?? "Mathematics",
                StaffType = l.Staff?.StaffType == "Teaching" ? "Teaching Staff" : (l.Staff?.StaffType ?? "Teaching Staff"),
                LeaveType = l.LeaveType,
                LeaveCategoryId = l.LeaveCategoryId,
                LeaveCategoryName = l.LeaveCategory != null ? l.LeaveCategory.CategoryName : l.LeaveType.ToString(),
                StartDate = l.StartDate,
                EndDate = l.EndDate,
                TotalDays = (decimal)(l.EndDate.Date - l.StartDate.Date).TotalDays + 1,
                Reason = l.Reason,
                Status = l.Status,
                RejectionReason = l.RejectionReason,
                ApprovedByUserId = l.ApprovedByUserId,
                ApprovedByUserName = l.ApprovedByUser != null ? l.ApprovedByUser.FullName : null,
                ApprovedAt = l.ApprovedAt,
                CreatedAt = l.CreatedAt
            }).ToList();
        }

        
        public async Task<LeaveDetailsDto> GetStaffLeaveDetailsAsync(int leaveRequestId)
        {
            var leave = await _context.StaffLeaveRequests
                .Include(l => l.Staff)
                .Include(l => l.Staff.DepartmentRef)
                .Include(l => l.LeaveCategory)
                .Include(l => l.ApprovedByUser)
                .FirstOrDefaultAsync(l => l.StaffLeaveRequestId == leaveRequestId);
                
            if (leave == null) throw new CollegeManagement.API.Exceptions.NotFoundException("Leave request not found");

            decimal totalDays = (decimal)(leave.EndDate.Date - leave.StartDate.Date).TotalDays + 1;

            var balance = await _context.StaffLeaveBalances
                .FirstOrDefaultAsync(b => b.StaffId == leave.StaffId && 
                                          ((leave.LeaveCategoryId.HasValue && b.LeaveCategoryId == leave.LeaveCategoryId.Value) || b.LeaveType == leave.LeaveType) && 
                                          b.AcademicYearId == leave.AcademicYearId);

            return new LeaveDetailsDto
            {
                StaffLeaveRequestId = leave.StaffLeaveRequestId,
                StaffId = leave.StaffId,
                StaffName = leave.Staff.FirstName + " " + leave.Staff.LastName,
                StaffCode = leave.Staff.EmployeeId,
                Department = leave.Staff.DepartmentRef != null ? leave.Staff.DepartmentRef.DepartmentName : "Mathematics",
                StaffType = leave.Staff.StaffType == "Teaching" ? "Teaching Staff" : (leave.Staff.StaffType ?? "Teaching Staff"),
                LeaveType = leave.LeaveType,
                LeaveCategoryId = leave.LeaveCategoryId,
                LeaveCategoryName = leave.LeaveCategory != null ? leave.LeaveCategory.CategoryName : leave.LeaveType.ToString(),
                StartDate = leave.StartDate,
                EndDate = leave.EndDate,
                TotalDays = totalDays,
                Reason = leave.Reason,
                Status = leave.Status,
                RejectionReason = leave.RejectionReason,
                ApprovedByUserId = leave.ApprovedByUserId,
                ApprovedByUserName = leave.ApprovedByUser?.FullName,
                ApprovedAt = leave.ApprovedAt,
                CreatedAt = leave.CreatedAt,
                Balance = balance != null ? new LeaveBalanceDto
                {
                    Total = balance.TotalDays,
                    Used = balance.UsedDays,
                    Remaining = balance.RemainingDays
                } : new LeaveBalanceDto()
            };
        }

        public async Task<IEnumerable<StaffLeaveHistorySummaryDto>> GetStaffLeaveHistorySummaryAsync(int? departmentId = null, string staffType = null)
        {
            var query = _context.Staffs
                .Include(s => s.DepartmentRef)
                .AsQueryable();

            if (departmentId.HasValue) query = query.Where(s => s.DepartmentId == departmentId);
            if (!string.IsNullOrEmpty(staffType)) query = query.Where(s => s.StaffType == staffType);

            var staffs = await query.ToListAsync();
            var summaries = new List<StaffLeaveHistorySummaryDto>();

            var currentYear = await _context.AcademicYears.FirstOrDefaultAsync(y => y.IsActive);
            int yearId = currentYear?.AcademicYearId ?? 0;

            var allRequests = await _context.StaffLeaveRequests
                .Where(r => r.AcademicYearId == yearId && r.IsActive)
                .ToListAsync();

            var allBalances = await _context.StaffLeaveBalances
                .Where(b => b.AcademicYearId == yearId)
                .ToListAsync();

            var requestsByStaff = allRequests.GroupBy(r => r.StaffId).ToDictionary(g => g.Key, g => g.ToList());
            var balancesByStaff = allBalances.GroupBy(b => b.StaffId).ToDictionary(g => g.Key, g => g.ToList());

            foreach (var staff in staffs)
            {
                var requests = requestsByStaff.TryGetValue(staff.Id, out var rList) ? rList : new List<CollegeManagement.API.Models.StaffLeaveRequest>();
                var balances = balancesByStaff.TryGetValue(staff.Id, out var bList) ? bList : new List<CollegeManagement.API.Models.StaffLeaveBalance>();

                summaries.Add(new StaffLeaveHistorySummaryDto
                {
                    StaffId = staff.Id,
                    StaffName = $"{staff.FirstName} {staff.LastName}".Trim(),
                    StaffCode = staff.EmployeeId,
                    Department = staff.DepartmentRef != null ? staff.DepartmentRef.DepartmentName : "Mathematics",
                    StaffType = staff.StaffType == "Teaching" ? "Teaching Staff" : (staff.StaffType ?? "Teaching Staff"),
                    TotalRequests = requests.Count,
                    TotalLeaves = balances.Sum(b => b.TotalDays),
                    Used = balances.Sum(b => b.UsedDays),
                    Remaining = balances.Sum(b => b.RemainingDays),
                    Approved = requests.Count(r => r.Status == CollegeManagement.API.Enums.LeaveStatus.Approved),
                    Pending = requests.Count(r => r.Status == CollegeManagement.API.Enums.LeaveStatus.Pending),
                    Rejected = requests.Count(r => r.Status == CollegeManagement.API.Enums.LeaveStatus.Rejected)
                });
            }
            return summaries;
        }

        public async Task<StaffLeaveHistoryDto> GetStaffLeaveHistoryAsync(int staffId)
        {
            var staff = await _context.Staffs
                .Include(s => s.DepartmentRef)
                .FirstOrDefaultAsync(s => s.Id == staffId);
                
            if (staff == null) throw new CollegeManagement.API.Exceptions.NotFoundException("Staff not found");

            var currentYear = await _context.AcademicYears.FirstOrDefaultAsync(y => y.IsActive);
            int yearId = currentYear?.AcademicYearId ?? 0;

            var rawRequests = await _context.StaffLeaveRequests
                .Where(r => r.StaffId == staffId && r.AcademicYearId == yearId && r.IsActive)
                .OrderByDescending(r => r.CreatedAt)
                .Include(l => l.ApprovedByUser)
                .ToListAsync();

            var requests = rawRequests.Select(l => new StaffLeaveResponse
            {
                StaffLeaveRequestId = l.StaffLeaveRequestId,
                StaffId = l.StaffId,
                StaffName = $"{staff.FirstName} {staff.LastName}".Trim(),
                Department = staff.DepartmentRef?.DepartmentName ?? "Mathematics",
                StaffType = staff.StaffType == "Teaching" ? "Teaching Staff" : (staff.StaffType ?? "Teaching Staff"),
                LeaveType = l.LeaveType,
                StartDate = l.StartDate,
                EndDate = l.EndDate,
                TotalDays = (decimal)(l.EndDate.Date - l.StartDate.Date).TotalDays + 1,
                Reason = l.Reason,
                Status = l.Status,
                RejectionReason = l.RejectionReason,
                ApprovedByUserId = l.ApprovedByUserId,
                ApprovedByUserName = l.ApprovedByUser != null ? l.ApprovedByUser.FullName : null,
                ApprovedAt = l.ApprovedAt,
                CreatedAt = l.CreatedAt
            }).ToList();

            var balances = await _context.StaffLeaveBalances
                .Where(b => b.StaffId == staffId && b.AcademicYearId == yearId)
                .ToListAsync();

            return new StaffLeaveHistoryDto
            {
                StaffId = staff.Id,
                StaffName = $"{staff.FirstName} {staff.LastName}".Trim(),
                StaffCode = staff.EmployeeId,
                Department = staff.DepartmentRef != null ? staff.DepartmentRef.DepartmentName : "Mathematics",
                StaffType = staff.StaffType == "Teaching" ? "Teaching Staff" : (staff.StaffType ?? "Teaching Staff"),
                TotalRequests = requests.Count,
                Approved = requests.Count(r => r.Status == CollegeManagement.API.Enums.LeaveStatus.Approved),
                Pending = requests.Count(r => r.Status == CollegeManagement.API.Enums.LeaveStatus.Pending),
                Rejected = requests.Count(r => r.Status == CollegeManagement.API.Enums.LeaveStatus.Rejected),
                Balance = new LeaveBalanceDto
                {
                    Total = balances.Sum(b => b.TotalDays),
                    Used = balances.Sum(b => b.UsedDays),
                    Remaining = balances.Sum(b => b.RemainingDays)
                },
                History = requests
            };
        }

        private async Task<StaffLeaveResponse> GetStaffLeaveByIdAsync(int id)
        {
            var l = await _context.StaffLeaveRequests
                .Include(r => r.Staff)
                    .ThenInclude(s => s.DepartmentRef)
                .Include(r => r.Department)
                .Include(r => r.ApprovedByUser)
                .Include(r => r.LeaveCategory)
                .FirstOrDefaultAsync(r => r.StaffLeaveRequestId == id);

            if (l == null) return null!;

            return new StaffLeaveResponse
            {
                StaffLeaveRequestId = l.StaffLeaveRequestId,
                StaffId = l.StaffId,
                StaffName = l.Staff != null ? $"{l.Staff.FirstName} {l.Staff.LastName}".Trim() : "Staff Member",
                Department = l.Staff?.DepartmentRef?.DepartmentName ?? l.Department?.DepartmentName ?? "Mathematics",
                StaffType = l.Staff?.StaffType == "Teaching" ? "Teaching Staff" : (l.Staff?.StaffType ?? "Teaching Staff"),
                LeaveType = l.LeaveType,
                LeaveCategoryId = l.LeaveCategoryId,
                LeaveCategoryName = l.LeaveCategory != null ? l.LeaveCategory.CategoryName : l.LeaveType.ToString(),
                StartDate = l.StartDate,
                EndDate = l.EndDate,
                TotalDays = (decimal)(l.EndDate.Date - l.StartDate.Date).TotalDays + 1,
                Reason = l.Reason,
                Status = l.Status,
                RejectionReason = l.RejectionReason,
                ApprovedByUserId = l.ApprovedByUserId,
                ApprovedByUserName = l.ApprovedByUser != null ? l.ApprovedByUser.FullName : null,
                ApprovedAt = l.ApprovedAt,
                CreatedAt = l.CreatedAt
            };
        }
    }
}
