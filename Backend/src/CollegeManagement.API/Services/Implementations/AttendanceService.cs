using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Attendance.Requests;
using CollegeManagement.API.DTOs.Attendance.Responses;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.DTOs.Common;
using CollegeManagement.API.Models;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using CollegeManagement.API.Models.Reports;
using System.IO;
using System.Text;
using MiniExcelLibs;

namespace CollegeManagement.API.Services.Implementations
{
    /// <summary>
    /// Service implementation for managing Attendance operations and business validations.
    /// </summary>
    public class AttendanceService : IAttendanceService
    {
        #region Constructor

        private readonly IAttendanceRepository _repository;
        private readonly IMapper _mapper;
        private readonly AppDbContext _context;
        private readonly IAuditLogRepository _auditLogRepository;
        private readonly IAttendanceCacheService _attendanceCache;

        /// <summary>
        /// Initializes a new instance of the <see cref="AttendanceService"/> class.
        /// </summary>
        /// <param name="repository">The attendance repository.</param>
        /// <param name="mapper">The AutoMapper instance.</param>
        /// <param name="context">The database context.</param>
        /// <param name="auditLogRepository">The audit log repository.</param>
        /// <param name="attendanceCache">The attendance cache service.</param>
        public AttendanceService(
            IAttendanceRepository repository,
            IMapper mapper,
            AppDbContext context,
            IAuditLogRepository auditLogRepository,
            IAttendanceCacheService attendanceCache)
        {
            _repository = repository;
            _mapper = mapper;
            _context = context;
            _auditLogRepository = auditLogRepository;
            _attendanceCache = attendanceCache;
        }

        #endregion

        #region CRUD

        /// <summary>
        /// Creates a new attendance record after performing duplicate validation checks and master data verification.
        /// </summary>
        public async Task<int> CreateAttendanceAsync(CreateAttendanceRequest request, bool isAdmin, string userName, int? userId = null)
        {
            if (request == null)
            {
                throw new ValidationException("Request body cannot be null.");
            }

            // For Admin session-based attendance, we skip timetable/subject checks
            if (!isAdmin)
            {
                // 1. Validate student exists, is active, and belongs to Section
                var student = await _context.Students.FindAsync(request.StudentId);
                if (student == null)
                {
                    throw new NotFoundException($"Student with ID {request.StudentId} was not found.");
                }
                if (!student.IsActive)
                {
                    throw new ValidationException($"Student with ID {request.StudentId} is not active.");
                }
                if (student.SectionId != request.SectionId)
                {
                    throw new ValidationException($"Student with ID {request.StudentId} does not belong to Section ID {request.SectionId}.");
                }

                // 2. Validate other master IDs and Academic Year date range
                await ValidateMasterDataAsync(request.FacultyId, request.BoardId, request.AcademicYearId, request.AcademicLevelId, request.GroupId, request.ProgramId, request.SectionId, request.SubjectId, request.AttendanceDate);

                // 3. Timetable/Period Checks
                if (request.TimetableId.HasValue)
                {
                    var timetable = await _context.Timetables.FindAsync(request.TimetableId.Value);
                    if (timetable == null || !timetable.IsPublished)
                    {
                        throw new ValidationException($"Published Timetable slot with ID {request.TimetableId.Value} was not found.");
                    }
                    if (timetable.PeriodId != request.PeriodId)
                    {
                        throw new ValidationException($"Timetable slot Period ID {timetable.PeriodId} does not match request Period ID {request.PeriodId}.");
                    }
                    if (timetable.SectionId != request.SectionId || timetable.SubjectId != request.SubjectId || timetable.StaffId != request.FacultyId)
                    {
                        throw new ValidationException("Timetable structural elements (Section, Subject, Faculty) do not match request parameters.");
                    }
                }
                else
                {
                    // Ad-hoc: Validate FacultySubjectAllocation is active
                    var subjectName = await _context.Subjects.Where(s => s.SubjectId == request.SubjectId).Select(s => s.SubjectName).FirstOrDefaultAsync();
                    var allocated = await _context.FacultySubjectAllocations.AnyAsync(a => a.FacultyId == request.FacultyId && a.SubjectId == request.SubjectId);
                    if (!allocated)
                    {
                        throw new ValidationException($"Faculty member {request.FacultyId} is not allocated to subject {request.SubjectId}.");
                    }
                }
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    int id;
                    if (isAdmin)
                    {
                        // 1. Admin Master Data Validation
                        var student = await _context.Students.FindAsync(request.StudentId);
                        if (student == null) throw new NotFoundException($"Student with ID {request.StudentId} was not found.");
                        if (!student.IsActive) throw new ValidationException($"Student with ID {request.StudentId} is not active.");
                        
                        if (student.SectionId != request.SectionId ||
                            student.ProgramId != request.ProgramId ||
                            student.GroupId != request.GroupId ||
                            student.AcademicLevelId != request.AcademicLevelId ||
                            student.AcademicYearId != request.AcademicYearId ||
                            student.BoardId != request.BoardId)
                        {
                            throw new ValidationException($"Student with ID {request.StudentId} does not match the provided academic context.");
                        }

                        // Admin duplicate check based on StudentId + Date + Session
                        var exists = await _context.Attendances.AnyAsync(a => 
                            a.StudentId == request.StudentId && 
                            a.AttendanceDate.Date == request.AttendanceDate.Date && 
                            a.Session == request.Session &&
                            a.IsActive);
                            
                        if (exists)
                        {
                            throw new ConflictException($"Attendance has already been marked for Student ID {request.StudentId} on {request.AttendanceDate:yyyy-MM-dd} for this session.");
                        }

                        // We cannot resolve a Morning/Afternoon AttendanceSession here because 
                        // AttendanceSession lacks a 'Session' field, so we temporarily leave it NULL 
                        // to prevent merging Morning and Afternoon into the same PeriodId=0 session.
                        
                        // BUT we must still check if ANY session for this class/date is locked
                        var anyLockedSession = await _context.AttendanceSessions.AnyAsync(s => 
                            s.AttendanceDate.Date == request.AttendanceDate.Date &&
                            s.GroupId == student.GroupId &&
                            s.SectionId == student.SectionId &&
                            s.IsLocked);
                            
                        if (anyLockedSession)
                        {
                            throw new ConflictException($"An attendance session for this class on {request.AttendanceDate:yyyy-MM-dd} is locked by Faculty and cannot be bypassed by Admin.");
                        }
                        
                        // Admin creating missing attendance directly
                        var attendance = new Attendance
                        {
                            StudentId = request.StudentId,
                            Status = request.Status,
                            Remarks = request.Remarks,
                            Session = request.Session,
                            AttendanceDate = request.AttendanceDate,
                            BoardId = request.BoardId,
                            AcademicYearId = request.AcademicYearId,
                            AcademicLevelId = request.AcademicLevelId,
                            GroupId = request.GroupId,
                            SectionId = request.SectionId,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                            ModifiedByUserId = userId,
                            ModifiedAt = DateTime.UtcNow
                        };
                        _context.Attendances.Add(attendance);
                        await _context.SaveChangesAsync();
                        id = attendance.AttendanceId;
                    }
                    else
                    {
                        // 4. Resolve or Create AttendanceSession
                        var session = await GetOrCreateSessionAsync(request.SectionId, request.PeriodId, request.AttendanceDate, request);

                        // 5. Check if session is locked
                        if (session.IsLocked)
                        {
                            throw new ValidationException("This attendance session is locked and cannot be modified.");
                        }

                        // 6. Prevent duplicate StudentId + AttendanceSessionId
                        var exists = await _repository.AttendanceExistsAsync(request.StudentId, session.AttendanceSessionId);
                        if (exists)
                        {
                            throw new ConflictException($"Attendance has already been marked for Student ID {request.StudentId} in session {session.AttendanceSessionId}.");
                        }

                        // 7. Map and Create the Attendance detail
                        var attendance = _mapper.Map<Attendance>(request);
                        attendance.AttendanceSessionId = session.AttendanceSessionId;

                        id = await _repository.CreateAttendanceAsync(attendance);
                    }

                    // Old Audit logging
                    var dbTransaction = _context.Database.CurrentTransaction?.GetDbTransaction();
                    var audit = new AuditLog
                    {
                        UserName = userName,
                        Action = "CREATE",
                        EntityName = "Attendance",
                        EntityId = id,
                        Description = $"Attendance marked for Student ID {request.StudentId} as '{request.Status}'.",
                        CreatedAt = DateTime.UtcNow
                    };
                    await _auditLogRepository.InsertAsync(audit, dbTransaction);
                    
                    // Phase 3 Mandatory AttendanceAuditHistory
                    _context.AttendanceAuditHistories.Add(new AttendanceAuditHistory
                    {
                        EntityType = "Student",
                        EntityId = id,
                        StudentId = request.StudentId,
                        AttendanceDate = request.AttendanceDate,
                        OldStatus = null,
                        NewStatus = (byte)request.Status,
                        Action = "CREATE",
                        Description = request.Remarks ?? $"Attendance marked for Student ID {request.StudentId} as '{request.Status}'.",
                        ModifiedByUserId = userId,
                        ModifiedByUserName = userName,
                        CreatedAt = DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync();

                    await transaction.CommitAsync();
                    _attendanceCache.InvalidateAll();
                    return id;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        /// <summary>
        /// Creates student attendance records in bulk after master data verification and duplicate checks.
        /// </summary>
        public async Task<int> CreateBulkAttendanceAsync(BulkAttendanceRequest request, bool isAdmin, string userName, int? userId = null)
        {
            if (request == null)
            {
                throw new ValidationException("Request body cannot be null.");
            }
            if (request.Students == null || !request.Students.Any())
            {
                throw new ValidationException("Students list cannot be null or empty.");
            }

            // 1. Validate master IDs and Academic Year date range
            await ValidateMasterDataAsync(request.FacultyId, request.BoardId, request.AcademicYearId, request.AcademicLevelId, request.GroupId, request.ProgramId, request.SectionId, request.SubjectId, request.AttendanceDate);

            if (!isAdmin)
            {
                // 2. Timetable/Period Checks
                if (request.TimetableId.HasValue)
                {
                    var timetable = await _context.Timetables.FindAsync(request.TimetableId.Value);
                    if (timetable == null || !timetable.IsPublished)
                    {
                        throw new ValidationException($"Published Timetable slot with ID {request.TimetableId.Value} was not found.");
                    }
                    if (timetable.PeriodId != request.PeriodId)
                    {
                        throw new ValidationException($"Timetable slot Period ID {timetable.PeriodId} does not match request Period ID {request.PeriodId}.");
                    }
                    if (timetable.SectionId != request.SectionId || timetable.SubjectId != request.SubjectId || timetable.StaffId != request.FacultyId)
                    {
                        throw new ValidationException("Timetable structural elements do not match request parameters.");
                    }
                }
                else
                {
                    // Ad-hoc: Validate allocation
                    var subjectName = await _context.Subjects.Where(s => s.SubjectId == request.SubjectId).Select(s => s.SubjectName).FirstOrDefaultAsync();
                    var allocated = await _context.FacultySubjectAllocations.AnyAsync(a => a.FacultyId == request.FacultyId && a.SubjectId == request.SubjectId);
                    if (!allocated)
                    {
                        throw new ValidationException($"Faculty member {request.FacultyId} is not allocated to subject {request.SubjectId}.");
                    }
                }
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    int? targetSessionId = null;

                    if (!isAdmin)
                    {
                        // 3. Resolve or Create AttendanceSession for Faculty
                        var session = await GetOrCreateSessionAsync(request.SectionId, request.PeriodId, request.AttendanceDate, request);

                        // 4. Check if session is locked
                        if (session.IsLocked)
                        {
                            throw new ValidationException("This attendance session is locked and cannot be modified.");
                        }
                        targetSessionId = session.AttendanceSessionId;
                    }
                    else
                    {
                        // BUT we must still check if ANY session for this class/date is locked
                        var anyLockedSession = await _context.AttendanceSessions.AnyAsync(s => 
                            s.AttendanceDate.Date == request.AttendanceDate.Date &&
                            s.GroupId == request.GroupId &&
                            s.SectionId == request.SectionId &&
                            s.IsLocked);
                            
                        if (anyLockedSession)
                        {
                            throw new ConflictException($"An attendance session for this class on {request.AttendanceDate:yyyy-MM-dd} is locked by Faculty and cannot be bypassed by Admin.");
                        }
                    }

                    var attendances = new List<Attendance>();

                    // 5. Loop & validate student belongs to the section, and check duplicates
                    foreach (var studentRequest in request.Students)
                    {
                        var student = await _context.Students.FindAsync(studentRequest.StudentId);
                        if (student == null)
                        {
                            throw new NotFoundException($"Student with ID {studentRequest.StudentId} was not found.");
                        }
                        if (!student.IsActive)
                        {
                            throw new ValidationException($"Student with ID {studentRequest.StudentId} is not active.");
                        }
                        if (student.SectionId != request.SectionId ||
                            student.ProgramId != request.ProgramId ||
                            student.GroupId != request.GroupId ||
                            student.AcademicLevelId != request.AcademicLevelId ||
                            student.AcademicYearId != request.AcademicYearId ||
                            student.BoardId != request.BoardId)
                        {
                            throw new ValidationException($"Student with ID {studentRequest.StudentId} does not match the provided academic context.");
                        }

                        if (!isAdmin)
                        {
                            var exists = await _repository.AttendanceExistsAsync(studentRequest.StudentId, targetSessionId!.Value);
                            if (exists)
                            {
                                throw new ConflictException($"Attendance has already been marked for Student ID {studentRequest.StudentId} in session {targetSessionId.Value}.");
                            }
                        }
                        else
                        {
                            // Admin checks duplicates based on Date and Session Enum
                            var exists = await _context.Attendances.AnyAsync(a => a.StudentId == studentRequest.StudentId && a.AttendanceDate.Date == request.AttendanceDate.Date && a.Session == request.Session && a.IsActive);
                            if (exists)
                            {
                                throw new ConflictException($"Attendance has already been marked for Student ID {studentRequest.StudentId} on {request.AttendanceDate:yyyy-MM-dd} ({request.Session}).");
                            }
                        }
                        
                        attendances.Add(new Attendance
                        {
                            StudentId = studentRequest.StudentId,
                            Status = studentRequest.Status,
                            Remarks = studentRequest.Remarks,
                            Session = isAdmin ? request.Session : null,
                            AttendanceDate = request.AttendanceDate,
                            BoardId = request.BoardId,
                            AcademicYearId = request.AcademicYearId,
                            AcademicLevelId = request.AcademicLevelId,
                            GroupId = request.GroupId,
                            SectionId = request.SectionId,
                            SubjectId = isAdmin ? null : request.SubjectId,
                            FacultyId = isAdmin ? null : request.FacultyId,
                            AttendanceSessionId = targetSessionId,
                            IsActive = true,
                            CreatedAt = DateTime.UtcNow,
                            ModifiedByUserId = userId,
                            ModifiedAt = DateTime.UtcNow
                        });
                    }

                    int affectedRows = 0;
                    List<Attendance> insertedRecords = new List<Attendance>();

                    if (!isAdmin)
                    {
                        affectedRows = await _repository.CreateBulkAttendanceAsync(attendances, targetSessionId!.Value);

                        // Fetch the inserted attendances to get their generated IDs for the audit history
                        var studentIds = request.Students.Select(s => s.StudentId).ToList();
                        insertedRecords = await _context.Attendances
                            .Where(a => a.AttendanceSessionId == targetSessionId.Value && studentIds.Contains(a.StudentId))
                            .ToListAsync();
                    }
                    else
                    {
                        // Admin bulk insert via EF
                        await _context.Attendances.AddRangeAsync(attendances);
                        await _context.SaveChangesAsync();
                        affectedRows = attendances.Count;
                        insertedRecords = attendances;
                    }

                    foreach (var record in insertedRecords)
                    {
                        _context.AttendanceAuditHistories.Add(new AttendanceAuditHistory
                        {
                            EntityType = "Student",
                            EntityId = record.AttendanceId,
                            StudentId = record.StudentId,
                            AttendanceDate = request.AttendanceDate,
                            OldStatus = null,
                            NewStatus = (byte)record.Status,
                            Action = "CREATE",
                            Description = record.Remarks ?? $"Bulk attendance marked as '{record.Status}'.",
                            ModifiedByUserId = userId,
                            ModifiedByUserName = userName,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                    await _context.SaveChangesAsync();

                    // Old Audit logging (summary)
                    var dbTransaction = _context.Database.CurrentTransaction?.GetDbTransaction();
                    var audit = new AuditLog
                    {
                        UserName = userName,
                        Action = "CREATE",
                        EntityName = "AttendanceSession",
                        EntityId = targetSessionId ?? 0,
                        Description = $"Bulk attendance created for {affectedRows} students.",
                        CreatedAt = DateTime.UtcNow
                    };
                    await _auditLogRepository.InsertAsync(audit, dbTransaction);

                    await transaction.CommitAsync();
                    _attendanceCache.InvalidateAll();
                    return affectedRows;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        /// <summary>
        /// Updates an existing attendance record after validating its existence.
        /// </summary>
        public async Task<int> UpdateAttendanceAsync(UpdateAttendanceRequest request, bool isAdmin, string userName, int? userId = null)
        {
            if (request == null)
            {
                throw new ValidationException("Request body cannot be null.");
            }

            if (request.StudentId.HasValue && request.AttendanceDate.HasValue)
            {
                return await HandleAdminSessionUpdateAsync(request, userName, userId);
            }

            var existing = await _context.Attendances.FindAsync(request.AttendanceId);
            if (existing == null || !existing.IsActive)
            {
                throw new NotFoundException($"Attendance record with ID {request.AttendanceId} was not found.");
            }

            // Verify if the session is locked
            var session = existing.AttendanceSessionId.HasValue ? await _context.AttendanceSessions.FindAsync(existing.AttendanceSessionId) : null;
            bool isLocked = session != null && session.IsLocked;
            
            if (!existing.AttendanceSessionId.HasValue)
            {
                var student = await _context.Students.FindAsync(existing.StudentId);
                if (student != null)
                {
                    isLocked = await _context.AttendanceSessions.AnyAsync(s => 
                        s.AttendanceDate.Date == existing.AttendanceDate.Date &&
                        s.GroupId == student.GroupId &&
                        s.SectionId == student.SectionId &&
                        s.IsLocked);
                }
            }

            if (isLocked)
            {
                throw new ValidationException("An attendance session for this class on this date is locked and cannot be modified.");
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var oldStatus = existing.Status;
                    
                    var attendance = new Attendance
                    {
                        AttendanceId = request.AttendanceId,
                        AttendanceSessionId = existing.AttendanceSessionId,
                        StudentId = existing.StudentId,
                        Status = request.Status,
                        Remarks = request.Remarks,
                        UpdatedAt = DateTime.UtcNow,
                        ModifiedByUserId = userId,
                        ModifiedAt = DateTime.UtcNow
                    };

                    var affectedRows = await _repository.UpdateAttendanceAsync(attendance);

                    // Old Audit logging
                    var dbTransaction = _context.Database.CurrentTransaction?.GetDbTransaction();
                    var prefix = isLocked ? "[ADMIN OVERRIDE] " : "";
                    var audit = new AuditLog
                    {
                        UserName = userName,
                        Action = "UPDATE",
                        EntityName = "Attendance",
                        EntityId = request.AttendanceId,
                        Description = prefix + $"Status updated from '{oldStatus}' to '{request.Status}'.",
                        CreatedAt = DateTime.UtcNow
                    };
                    await _auditLogRepository.InsertAsync(audit, dbTransaction);

                    // Phase 3 Mandatory AttendanceAuditHistory
                    _context.AttendanceAuditHistories.Add(new AttendanceAuditHistory
                    {
                        EntityType = "Student",
                        EntityId = request.AttendanceId,
                        StudentId = existing.StudentId,
                        AttendanceDate = existing.AttendanceDate,
                        OldStatus = (byte)oldStatus,
                        NewStatus = (byte)request.Status,
                        Action = "UPDATE",
                        Description = request.Remarks ?? prefix + $"Status updated from '{oldStatus}' to '{request.Status}'.",
                        ModifiedByUserId = userId,
                        ModifiedByUserName = userName,
                        CreatedAt = DateTime.UtcNow
                    });
                    
                    // We must save changes to persist the EF Core added entity
                    await _context.SaveChangesAsync();

                    await transaction.CommitAsync();
                    _attendanceCache.InvalidateAll();
                    return affectedRows;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        private async Task<int> HandleAdminSessionUpdateAsync(UpdateAttendanceRequest request, string userName, int? userId)
        {
            var studentId = request.StudentId!.Value;
            var date = request.AttendanceDate!.Value.Date;
            
            if (userId.HasValue)
            {
                var userExists = await _context.Users.AnyAsync(u => u.UserId == userId.Value);
                if (!userExists)
                {
                    userId = null; // Prevent FK constraint failure for Admin accounts that aren't in the Users table
                }
            }
            
            var student = await _context.Students.FindAsync(studentId);
            if (student == null || !student.IsActive)
                throw new ValidationException($"Student with ID {studentId} is not active or not found.");

            if ((request.SectionId.HasValue && student.SectionId != request.SectionId) ||
                (request.ProgramId.HasValue && student.ProgramId != request.ProgramId) ||
                (request.GroupId.HasValue && student.GroupId != request.GroupId) ||
                (request.AcademicLevelId.HasValue && student.AcademicLevelId != request.AcademicLevelId) ||
                (request.AcademicYearId.HasValue && student.AcademicYearId != request.AcademicYearId) ||
                (request.BoardId.HasValue && student.BoardId != request.BoardId))
            {
                throw new ValidationException($"Student with ID {studentId} does not match the provided academic context.");
            }

            var isLocked = await _context.AttendanceSessions.AnyAsync(s => 
                s.AttendanceDate.Date == date &&
                s.GroupId == student.GroupId &&
                s.SectionId == student.SectionId &&
                s.IsLocked);

            if (isLocked)
            {
                throw new ValidationException("An attendance session for this class on this date is locked by Faculty and cannot be modified.");
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    int affectedRows = 0;

                    async Task ProcessSessionUpdate(Enums.StudentAttendanceSession session, Enums.AttendanceStatus? newStatus)
                    {
                        if (!newStatus.HasValue) return;

                        var existing = await _context.Attendances.FirstOrDefaultAsync(a => 
                            a.StudentId == studentId && 
                            a.AttendanceDate.Date == date && 
                            a.Session == session && 
                            a.IsActive);

                        if (existing != null)
                        {
                            var oldStatus = existing.Status;
                            if (oldStatus == newStatus.Value && existing.Remarks == request.Remarks) return;

                            existing.Status = newStatus.Value;
                            existing.Remarks = request.Remarks;
                            existing.UpdatedAt = DateTime.UtcNow;
                            existing.ModifiedByUserId = userId;
                            existing.ModifiedAt = DateTime.UtcNow;
                            
                            _context.Attendances.Update(existing);
                            
                            _context.AttendanceAuditHistories.Add(new AttendanceAuditHistory
                            {
                                EntityType = "Student",
                                EntityId = existing.AttendanceId,
                                StudentId = studentId,
                                AttendanceDate = date,
                                OldStatus = (byte)oldStatus,
                                NewStatus = (byte)newStatus.Value,
                                Action = "UPDATE",
                                Description = request.Remarks ?? $"Status updated from {oldStatus} to {newStatus.Value} for {session}.",
                                ModifiedByUserId = userId,
                                ModifiedByUserName = userName,
                                CreatedAt = DateTime.UtcNow
                            });
                            affectedRows++;
                        }
                        else
                        {
                            var newRecord = new Attendance
                            {
                                StudentId = studentId,
                                Status = newStatus.Value,
                                Remarks = request.Remarks,
                                Session = session,
                                AttendanceDate = request.AttendanceDate.Value,
                                BoardId = request.BoardId ?? student.BoardId,
                                AcademicYearId = request.AcademicYearId ?? student.AcademicYearId,
                                AcademicLevelId = request.AcademicLevelId ?? student.AcademicLevelId,
                                GroupId = request.GroupId ?? student.GroupId,
                                SectionId = request.SectionId ?? student.SectionId,
                                IsActive = true,
                                CreatedAt = DateTime.UtcNow,
                                ModifiedByUserId = userId,
                                ModifiedAt = DateTime.UtcNow
                            };
                            _context.Attendances.Add(newRecord);
                            await _context.SaveChangesAsync();
                            
                            _context.AttendanceAuditHistories.Add(new AttendanceAuditHistory
                            {
                                EntityType = "Student",
                                EntityId = newRecord.AttendanceId,
                                StudentId = studentId,
                                AttendanceDate = date,
                                OldStatus = null,
                                NewStatus = (byte)newStatus.Value,
                                Action = "CREATE",
                                Description = request.Remarks ?? $"Attendance marked as {newStatus.Value} for {session}.",
                                ModifiedByUserId = userId,
                                ModifiedByUserName = userName,
                                CreatedAt = DateTime.UtcNow
                            });
                            affectedRows++;
                        }
                    }

                    await ProcessSessionUpdate(Enums.StudentAttendanceSession.Morning, request.MorningStatus);
                    await ProcessSessionUpdate(Enums.StudentAttendanceSession.Afternoon, request.AfternoonStatus);

                    if (affectedRows > 0)
                    {
                        await _context.SaveChangesAsync();
                        _attendanceCache.InvalidateAll();
                    }

                    await transaction.CommitAsync();
                    return affectedRows;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        /// <summary>
        /// Updates multiple existing student attendance records in one bulk operation.
        /// </summary>
        public async Task<int> BulkUpdateAttendanceAsync(BulkUpdateAttendanceRequest request, bool isAdmin, string userName, int? userId = null)
        {
            if (request == null)
            {
                throw new ValidationException("Request body cannot be null.");
            }
            if (request.Updates == null || !request.Updates.Any())
            {
                throw new ValidationException("Updates list cannot be null or empty.");
            }

            // Validate the session exists and check lock
            if (request.AttendanceSessionId.HasValue)
            {
                var session = await _context.AttendanceSessions.FindAsync(request.AttendanceSessionId.Value);
                if (session == null)
                {
                    throw new NotFoundException($"Attendance session with ID {request.AttendanceSessionId} was not found.");
                }
                if (session.IsLocked)
                {
                    throw new ValidationException("This attendance session is locked and cannot be modified.");
                }
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var affectedRows = 0;
                    var descriptionDetails = new List<string>();

                    foreach (var update in request.Updates)
                    {
                        var attendance = await _context.Attendances.FindAsync(update.AttendanceId);
                        if (attendance == null)
                        {
                            throw new NotFoundException($"Attendance record with ID {update.AttendanceId} was not found.");
                        }
                        if (attendance.AttendanceSessionId != request.AttendanceSessionId)
                        {
                            throw new ValidationException($"Attendance record ID {update.AttendanceId} does not match the requested session context.");
                        }

                        // Check lock for Admin session-less records
                        bool isLockedOverride = false;
                        if (!request.AttendanceSessionId.HasValue)
                        {
                            var student = await _context.Students.FindAsync(attendance.StudentId);
                            if (student != null)
                            {
                                isLockedOverride = await _context.AttendanceSessions.AnyAsync(s => 
                                    s.AttendanceDate.Date == attendance.AttendanceDate.Date &&
                                    s.GroupId == student.GroupId &&
                                    s.SectionId == student.SectionId &&
                                    s.IsLocked);
                                    
                                if (isLockedOverride)
                                {
                                    throw new ValidationException("An attendance session for this class on this date is locked and cannot be modified.");
                                }
                            }
                        }

                        var oldStatus = attendance.Status;
                        attendance.Status = update.Status;
                        attendance.Remarks = update.Remarks;
                        attendance.UpdatedAt = DateTime.UtcNow;
                        attendance.ModifiedByUserId = userId;
                        attendance.ModifiedAt = DateTime.UtcNow;

                        affectedRows++;
                        descriptionDetails.Add($"[ID {update.AttendanceId}: {oldStatus} -> {update.Status}]");
                        
                        // Phase 3 Mandatory AttendanceAuditHistory per modified record
                        _context.AttendanceAuditHistories.Add(new AttendanceAuditHistory
                        {
                            EntityType = "Student",
                            EntityId = attendance.AttendanceId,
                            StudentId = attendance.StudentId,
                            AttendanceDate = attendance.AttendanceDate,
                            OldStatus = (byte)oldStatus,
                            NewStatus = (byte)update.Status,
                            Action = "UPDATE",
                            Description = update.Remarks ?? (isLockedOverride ? "[ADMIN OVERRIDE] " : "") + $"Status updated from '{oldStatus}' to '{update.Status}'.",
                            ModifiedByUserId = userId,
                            ModifiedByUserName = userName,
                            CreatedAt = DateTime.UtcNow
                        });
                    }

                    await _context.SaveChangesAsync();

                    // Apply the existing audit logging pattern as a single summary entry
                    var dbTransaction = _context.Database.CurrentTransaction?.GetDbTransaction();
                    var prefix = "";
                    var audit = new AuditLog
                    {
                        UserName = userName,
                        Action = "UPDATE",
                        EntityName = "AttendanceSession",
                        EntityId = request.AttendanceSessionId,
                        Description = prefix + $"Bulk attendance update for {request.Updates.Count} records: " + string.Join(", ", descriptionDetails) + ".",
                        CreatedAt = DateTime.UtcNow
                    };
                    await _auditLogRepository.InsertAsync(audit, dbTransaction);

                    await transaction.CommitAsync();
                    _attendanceCache.InvalidateAll();
                    return affectedRows;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        /// <summary>
        /// Validates existence and updates the active status of an attendance record.
        /// </summary>
        public async Task<int> ChangeAttendanceActiveStatusAsync(int attendanceId, bool isActive, bool isAdmin, string userName)
        {
            var existing = await _context.Attendances.AsNoTracking().FirstOrDefaultAsync(a => a.AttendanceId == attendanceId);
            if (existing == null)
            {
                throw new NotFoundException($"Attendance record with ID {attendanceId} was not found.");
            }

            var session = await _context.AttendanceSessions.FindAsync(existing.AttendanceSessionId);
            bool isLocked = session != null && session.IsLocked;
            if (isLocked && !isAdmin)
            {
                throw new ValidationException("This attendance session is locked and cannot be modified.");
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var affectedRows = await _repository.ChangeAttendanceActiveStatusAsync(attendanceId, isActive);

                    // Audit logging
                    var dbTransaction = _context.Database.CurrentTransaction?.GetDbTransaction();
                    var prefix = isLocked ? "[ADMIN OVERRIDE] " : "";
                    var audit = new AuditLog
                    {
                        UserName = userName,
                        Action = "TOGGLE_STATUS",
                        EntityName = "Attendance",
                        EntityId = attendanceId,
                        Description = prefix + $"Active state changed from '{(existing.IsActive ? "Active" : "Inactive")}' to '{(isActive ? "Active" : "Inactive")}'.",
                        CreatedAt = DateTime.UtcNow
                    };
                    await _auditLogRepository.InsertAsync(audit, dbTransaction);

                    await transaction.CommitAsync();
                    _attendanceCache.InvalidateAll();
                    return affectedRows;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        /// <summary>
        /// Locks an attendance session, preventing further modifications by Faculty members.
        /// </summary>
        public async Task<bool> LockSessionAsync(int sessionId, int lockedByUserId, string userName)
        {
            var session = await _context.AttendanceSessions.FindAsync(sessionId);
            if (session == null)
            {
                throw new NotFoundException($"Attendance session with ID {sessionId} was not found.");
            }

            if (session.IsLocked)
            {
                throw new ValidationException("This attendance session is already locked.");
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    session.IsLocked = true;
                    session.LockedBy = lockedByUserId;
                    session.LockedAt = DateTime.UtcNow;
                    session.UpdatedAt = DateTime.UtcNow;

                    await _context.SaveChangesAsync();

                    // Audit logging
                    var dbTransaction = _context.Database.CurrentTransaction?.GetDbTransaction();
                    var audit = new AttendanceAuditHistory
                    {
                        EntityType = "AttendanceSession",
                        EntityId = sessionId,
                        AttendanceDate = session.AttendanceDate.Date,
                        Action = "LOCK",
                        OldStatus = null,
                        NewStatus = null,
                        Description = $"Attendance session ID {sessionId} was locked.",
                        ModifiedByUserId = lockedByUserId,
                        ModifiedByUserName = userName,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.AttendanceAuditHistories.Add(audit);
                    await _context.SaveChangesAsync();

                    await transaction.CommitAsync();
                    _attendanceCache.InvalidateAll();
                    return true;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        /// <summary>
        /// Unlocks an attendance session, allowing modifications.
        /// </summary>
        public async Task<bool> UnlockSessionAsync(int sessionId, string userName)
        {
            var session = await _context.AttendanceSessions.FindAsync(sessionId);
            if (session == null)
            {
                throw new NotFoundException($"Attendance session with ID {sessionId} was not found.");
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    session.IsLocked = false;
                    session.LockedBy = null;
                    session.LockedAt = null;
                    session.UpdatedAt = DateTime.UtcNow;

                    await _context.SaveChangesAsync();

                    // Audit logging
                    var dbTransaction = _context.Database.CurrentTransaction?.GetDbTransaction();
                    var audit = new AttendanceAuditHistory
                    {
                        EntityType = "AttendanceSession",
                        EntityId = sessionId,
                        AttendanceDate = session.AttendanceDate.Date,
                        Action = "UNLOCK",
                        OldStatus = null,
                        NewStatus = null,
                        Description = $"Attendance session ID {sessionId} was unlocked.",
                        ModifiedByUserName = userName,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.AttendanceAuditHistories.Add(audit);
                    await _context.SaveChangesAsync();

                    await transaction.CommitAsync();
                    _attendanceCache.InvalidateAll();
                    return true;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        /// <summary>
        /// Soft deletes an existing attendance record.
        /// </summary>
        public async Task<bool> DeleteAttendanceAsync(int attendanceId, bool isAdmin, string userName)
        {
            var existing = await _context.Attendances.FindAsync(attendanceId);
            if (existing == null)
            {
                throw new NotFoundException($"Attendance record with ID {attendanceId} was not found.");
            }
            if (!existing.IsActive)
            {
                throw new ValidationException($"Attendance record with ID {attendanceId} is already deleted/inactive.");
            }

            bool isLocked = false;
            if (existing.AttendanceSessionId.HasValue)
            {
                var session = await _context.AttendanceSessions.FindAsync(existing.AttendanceSessionId.Value);
                isLocked = session != null && session.IsLocked;
                if (isLocked)
                {
                    throw new ValidationException("This attendance session is locked and cannot be modified.");
                }
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    existing.IsActive = false;
                    existing.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    // Audit logging
                    var dbTransaction = _context.Database.CurrentTransaction?.GetDbTransaction();
                    var prefix = isLocked ? "[ADMIN OVERRIDE] " : "";
                    var audit = new AuditLog
                    {
                        UserName = userName,
                        Action = "DELETE",
                        EntityName = "Attendance",
                        EntityId = attendanceId,
                        Description = prefix + $"Attendance record ID {attendanceId} was soft deleted.",
                        CreatedAt = DateTime.UtcNow
                    };
                    await _auditLogRepository.InsertAsync(audit, dbTransaction);

                    await transaction.CommitAsync();
                    _attendanceCache.InvalidateAll();
                    return true;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        #endregion

        #region Queries

        /// <summary>
        /// Retrieves a single detailed attendance record by its ID.
        /// </summary>
        public async Task<AttendanceResponse?> GetAttendanceByIdAsync(int attendanceId)
        {
            var key = _attendanceCache.GetCacheKey("GetAttendanceByIdAsync", attendanceId);
            return await _attendanceCache.GetOrCreateAsync(key, async () =>
            {
                var response = await _repository.GetAttendanceByIdAsync(attendanceId);
                if (response == null) return null;

                // Enrich with state fields not returned by the stored procedure, and enforce active checks
                var attendance = await _context.Attendances.AsNoTracking()
                    .FirstOrDefaultAsync(a => a.AttendanceId == attendanceId);
                if (attendance == null || !attendance.IsActive)
                {
                    return null;
                }

                var session = await _context.AttendanceSessions.AsNoTracking()
                    .FirstOrDefaultAsync(s => s.AttendanceSessionId == attendance.AttendanceSessionId);
                if (session == null || !session.IsActive)
                {
                    return null;
                }

                response.IsActive = attendance.IsActive;
                response.IsLocked = session.IsLocked;
                response.LockedBy = session.LockedBy;
                response.LockedAt = session.LockedAt;

                return response;
            });
        }

        /// <summary>
        /// Retrieves a filtered list of attendance records with pagination metadata.
        /// </summary>
        public async Task<PagedResponse<AttendanceListResponse>> GetAttendancesAsync(AttendanceSearchRequest request)
        {
            var key = _attendanceCache.GetCacheKey("GetAttendancesAsync", request);
            return await _attendanceCache.GetOrCreateAsync(key, async () =>
            {
                var totalCount = await _repository.GetAttendancesTotalCountAsync(request);
                var results = (await _repository.GetAttendancesAsync(request)).ToList();

                var currentPage = request.PageNumber <= 0 ? 1 : request.PageNumber;
                var pageSize = request.PageSize <= 0 ? 10 : request.PageSize;
                var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);

                var pagedResponse = new PagedResponse<AttendanceListResponse>
                {
                    Items = results,
                    TotalCount = totalCount,
                    TotalPages = totalPages,
                    CurrentPage = currentPage,
                    PageSize = pageSize
                };

                if (!results.Any()) return pagedResponse;

                // Batch-fetch attendance state for all returned IDs
                var attendanceIds = results.Select(r => r.AttendanceId).ToList();
                var attendanceEntities = await _context.Attendances.AsNoTracking()
                    .Where(a => attendanceIds.Contains(a.AttendanceId))
                    .Select(a => new { a.AttendanceId, a.IsActive, a.AttendanceSessionId })
                    .ToListAsync();

                var sessionIds = attendanceEntities.Select(a => a.AttendanceSessionId).Distinct().ToList();
                var sessionStates = await _context.AttendanceSessions.AsNoTracking()
                    .Where(s => sessionIds.Contains(s.AttendanceSessionId))
                    .Select(s => new { s.AttendanceSessionId, s.IsLocked })
                    .ToDictionaryAsync(s => s.AttendanceSessionId);

                var attendanceLookup = attendanceEntities.ToDictionary(a => a.AttendanceId);

                foreach (var item in results)
                {
                    if (attendanceLookup.TryGetValue(item.AttendanceId, out var att))
                    {
                        item.IsActive = att.IsActive;
                        if (att.AttendanceSessionId.HasValue && sessionStates.TryGetValue(att.AttendanceSessionId.Value, out var ses))
                        {
                            item.IsLocked = ses.IsLocked;
                        }
                    }
                }

                return pagedResponse;
            });
        }

        /// <summary>
        /// Retrieves students available to mark attendance for the specified search criteria.
        /// </summary>
        public async Task<IEnumerable<StudentAttendanceResponse>> GetStudentsForAttendanceAsync(AttendanceSearchRequest request)
        {
            var key = _attendanceCache.GetCacheKey("GetStudentsForAttendanceAsync", request);
            return await _attendanceCache.GetOrCreateAsync(key, () => _repository.GetStudentsForAttendanceAsync(request));
        }

        /// <summary>
        /// Retrieves students for Admin attendance marking (session-based).
        /// </summary>
        public async Task<IEnumerable<StudentAttendanceResponse>> GetAdminStudentsForAttendanceAsync(AttendanceSearchRequest request)
        {
            var key = _attendanceCache.GetCacheKey("GetAdminStudentsForAttendanceAsync", request);
            return await _attendanceCache.GetOrCreateAsync(key, () => _repository.GetAdminStudentsForAttendanceAsync(request));
        }

        /// <summary>
        /// Retrieves statistical summary metrics for the specified filters.
        /// </summary>
        public async Task<IEnumerable<AttendanceDefaulterResponse>> GetAttendanceDefaultersAsync(AttendanceDefaultersRequest request)
        {
            var key = _attendanceCache.GetCacheKey("GetAttendanceDefaultersAsync", request);
            return await _attendanceCache.GetOrCreateAsync(key, () => _repository.GetAttendanceDefaultersAsync(request));
        }

        public async Task<AttendanceSummaryResponse> GetAttendanceSummaryAsync(AttendanceSearchRequest request)
        {
            var key = _attendanceCache.GetCacheKey("GetAttendanceSummaryAsync", request);
            return await _attendanceCache.GetOrCreateAsync(key, () => _repository.GetAttendanceSummaryAsync(request));
        }

        /// <summary>
        /// Retrieves attendance percentages and class counts per student for the specified filters.
        /// </summary>
        public async Task<IEnumerable<AttendancePercentageResponse>> GetAttendancePercentageAsync(AttendanceSearchRequest request)
        {
            var key = _attendanceCache.GetCacheKey("GetAttendancePercentageAsync", request);
            return await _attendanceCache.GetOrCreateAsync(key, () => _repository.GetAttendancePercentageAsync(request));
        }

        /// <summary>
        /// Generates a flat report listing attendance details for the specified filters.
        /// </summary>
        public async Task<IEnumerable<AttendanceReportResponse>> GetAttendanceReportAsync(AttendanceSearchRequest request)
        {
            var key = _attendanceCache.GetCacheKey("GetAttendanceReportAsync", request);
            return await _attendanceCache.GetOrCreateAsync(key, () => _repository.GetAttendanceReportAsync(request));
        }

        #endregion

        #region Helper Methods

        private async Task ValidateMasterDataAsync(int facultyId, int boardId, int academicYearId, int academicLevelId, int groupId, int programId, int sectionId, int subjectId, DateTime? attendanceDate = null)
        {
            var facultyExists = await _context.Faculties.AnyAsync(f => f.Id == facultyId && !f.IsDeleted && f.Status == "Active");
            if (!facultyExists)
            {
                throw new NotFoundException($"Active Faculty with ID {facultyId} was not found.");
            }

            var boardExists = await _context.Boards.AnyAsync(b => b.BoardId == boardId && b.IsActive);
            if (!boardExists)
            {
                throw new NotFoundException($"Active Board with ID {boardId} was not found.");
            }

            var academicYear = await _context.AcademicYears.FirstOrDefaultAsync(ay => ay.AcademicYearId == academicYearId && ay.IsActive);
            if (academicYear == null)
            {
                throw new NotFoundException($"Active Academic Year with ID {academicYearId} was not found.");
            }

            if (attendanceDate.HasValue)
            {
                var targetDate = DateOnly.FromDateTime(attendanceDate.Value.Date);
                if (targetDate < academicYear.StartDate)
                {
                    throw new ValidationException($"Attendance date ({targetDate:yyyy-MM-dd}) cannot be earlier than Academic Year start date ({academicYear.StartDate:yyyy-MM-dd}).");
                }
                if (targetDate > academicYear.EndDate)
                {
                    throw new ValidationException($"Attendance date ({targetDate:yyyy-MM-dd}) cannot be later than Academic Year end date ({academicYear.EndDate:yyyy-MM-dd}).");
                }
            }

            var academicLevelExists = await _context.AcademicLevels.AnyAsync(al => al.AcademicLevelId == academicLevelId && al.IsActive);
            if (!academicLevelExists)
            {
                throw new NotFoundException($"Active Academic Level with ID {academicLevelId} was not found.");
            }

            var groupExists = await _context.Groups.AnyAsync(g => g.GroupId == groupId && g.IsActive);
            if (!groupExists)
            {
                throw new NotFoundException($"Active Group with ID {groupId} was not found.");
            }

            var programExists = await _context.Programs.AnyAsync(p => p.ProgramId == programId && p.IsActive);
            if (!programExists)
            {
                throw new NotFoundException($"Active Program with ID {programId} was not found.");
            }

            var sectionExists = await _context.Sections.AnyAsync(s => s.SectionId == sectionId && s.IsActive);
            if (!sectionExists)
            {
                throw new NotFoundException($"Active Section with ID {sectionId} was not found.");
            }

            var subjectExists = await _context.Subjects.AnyAsync(s => s.SubjectId == subjectId && s.IsActive);
            if (!subjectExists)
            {
                throw new NotFoundException($"Active Subject with ID {subjectId} was not found.");
            }
        }

        private async Task<AttendanceSession> GetOrCreateSessionAsync(int sectionId, int periodId, DateTime date, object requestObj)
        {
            // Find existing session
            var session = await _context.AttendanceSessions.FirstOrDefaultAsync(s => 
                s.SectionId == sectionId && s.PeriodId == periodId && s.AttendanceDate.Date == date.Date);

            if (session != null)
            {
                return session;
            }

            // Create new snapshot session
            session = new AttendanceSession
            {
                AttendanceDate = date.Date,
                PeriodId = periodId,
                IsLocked = false,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            if (requestObj is CreateAttendanceRequest cr)
            {
                session.TimetableId = cr.TimetableId;
                session.SubjectId = cr.SubjectId;
                session.SectionId = cr.SectionId;
                session.FacultyId = cr.FacultyId;
                session.AcademicYearId = cr.AcademicYearId;
                session.AcademicLevelId = cr.AcademicLevelId;
                session.GroupId = cr.GroupId;
                session.BoardId = cr.BoardId;
            }
            else if (requestObj is BulkAttendanceRequest br)
            {
                session.TimetableId = br.TimetableId;
                session.SubjectId = br.SubjectId;
                session.SectionId = br.SectionId;
                session.FacultyId = br.FacultyId;
                session.AcademicYearId = br.AcademicYearId;
                session.AcademicLevelId = br.AcademicLevelId;
                session.GroupId = br.GroupId;
                session.BoardId = br.BoardId;
            }

            await _context.AttendanceSessions.AddAsync(session);
            await _context.SaveChangesAsync();

            return session;
        }

        public async Task<AcademicContextResponse?> GetAcademicContextAsync(int groupId, int sectionId)
        {
            return await _repository.GetAcademicContextAsync(groupId, sectionId);
        }

        public async Task<FacultySubjectDerivationResponse?> GetFacultySubjectAllocationAsync(DateTime date, int? groupId = null, int? sectionId = null, int? periodId = null, string? sessionType = null)
        {
            return await _repository.GetFacultySubjectAllocationAsync(date, groupId, sectionId, periodId, sessionType);
        }

        public async Task<StudentMonthlyReportResponse> GetStudentMonthlyReportGridAsync(StudentMonthlyReportRequest request)
        {
            return await _repository.GetStudentMonthlyReportGridAsync(request);
        }

        public async Task<byte[]> ExportStudentMonthlyReportToCsvAsync(StudentMonthlyReportRequest request)
        {
            var report = await _repository.GetStudentMonthlyReportGridAsync(request);
            var sb = new StringBuilder();

            // Header line
            var headers = new List<string> { "Roll Number", "Student Name" };
            foreach (var h in report.DayHeaders)
            {
                headers.Add($"{h.DayNumber} ({h.DayName})");
            }
            headers.AddRange(new[] { "Present", "Absent", "Late", "Leave", "Percentage" });
            sb.AppendLine(string.Join(",", headers.Select(h => $"\"{h}\"")));

            // Rows
            foreach (var row in report.StudentRows)
            {
                var line = new List<string>
                {
                    $"\"{row.RollNumber}\"",
                    $"\"{row.StudentName}\""
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

        public async Task<byte[]> ExportStudentMonthlyReportToExcelAsync(StudentMonthlyReportRequest request)
        {
            var report = await _repository.GetStudentMonthlyReportGridAsync(request);
            var dataList = new List<Dictionary<string, object>>();

            foreach (var r in report.StudentRows)
            {
                var dict = new Dictionary<string, object>
                {
                    { "Roll Number", r.RollNumber },
                    { "Student Name", r.StudentName }
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
            await ms.SaveAsAsync(dataList, sheetName: "Student Monthly Report");
            return ms.ToArray();
        }

        #endregion
        public async Task<PagedResponse<CollegeManagement.API.DTOs.Attendance.Responses.AttendanceAuditHistoryResponse>> GetAuditHistoryAsync(CollegeManagement.API.DTOs.Attendance.Requests.AuditHistorySearchRequest request)
        {
            var query = _context.AttendanceAuditHistories.AsQueryable();

            if (request.FromDate.HasValue)
                query = query.Where(a => a.AttendanceDate.Date >= request.FromDate.Value.Date);
            if (request.ToDate.HasValue)
                query = query.Where(a => a.AttendanceDate.Date <= request.ToDate.Value.Date);
            if (request.UserId.HasValue && request.UserId.Value > 0)
                query = query.Where(a => a.ModifiedByUserId == request.UserId.Value);
            if (request.StudentId.HasValue && request.StudentId.Value > 0)
                query = query.Where(a => a.StudentId == request.StudentId.Value);
            if (request.FacultyId.HasValue && request.FacultyId.Value > 0)
                query = query.Where(a => a.FacultyId == request.FacultyId.Value);
            if (!string.IsNullOrEmpty(request.EntityType))
                query = query.Where(a => a.EntityType == request.EntityType);
            if (!string.IsNullOrEmpty(request.Action))
                query = query.Where(a => a.Action == request.Action);

            var totalCount = await query.CountAsync();
            var items = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(a => new CollegeManagement.API.DTOs.Attendance.Responses.AttendanceAuditHistoryResponse
                {
                    AuditId = a.AuditId,
                    EntityType = a.EntityType,
                    EntityId = a.EntityId,
                    StudentId = a.StudentId,
                    FacultyId = a.FacultyId,
                    AttendanceDate = a.AttendanceDate,
                    Session = a.Session.HasValue ? a.Session.ToString() : null,
                    OldStatus = a.OldStatus,
                    NewStatus = a.NewStatus,
                    Action = a.Action,
                    Description = a.Description,
                    ModifiedByUserId = a.ModifiedByUserId,
                    ModifiedByUserName = a.ModifiedByUserName,
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();

            return new CollegeManagement.API.DTOs.Common.PagedResponse<CollegeManagement.API.DTOs.Attendance.Responses.AttendanceAuditHistoryResponse>
            {
                Items = items,
                CurrentPage = request.PageNumber,
                PageSize = request.PageSize,
                TotalCount = totalCount,
                TotalPages = (int)Math.Ceiling(totalCount / (double)request.PageSize)
            };
        }

        public async Task<YearlyOverviewResponse> GetStudentYearlyOverviewAsync(int studentId, int academicYearId)
        {
            var student = await _context.Students.FindAsync(studentId);
            if (student == null) throw new NotFoundException($"Student with ID {studentId} was not found.");

            AcademicYear? academicYear = null;
            if (academicYearId > 0)
            {
                academicYear = await _context.AcademicYears.FindAsync(academicYearId);
            }

            if (academicYear == null && student.AcademicYearId.HasValue && student.AcademicYearId.Value > 0)
            {
                academicYear = await _context.AcademicYears.FindAsync(student.AcademicYearId.Value);
            }

            if (academicYear == null)
            {
                academicYear = await _context.AcademicYears.FirstOrDefaultAsync(y => y.IsActive && y.BoardId == student.BoardId)
                               ?? await _context.AcademicYears.FirstOrDefaultAsync(y => y.IsActive)
                               ?? await _context.AcademicYears.OrderByDescending(y => y.AcademicYearId).FirstOrDefaultAsync();
            }

            if (academicYear == null)
            {
                throw new NotFoundException("No active Academic Year found in the system.");
            }

            academicYearId = academicYear.AcademicYearId;

            var startDate = academicYear.StartDate.ToDateTime(TimeOnly.MinValue);
            var endDate = academicYear.EndDate.ToDateTime(TimeOnly.MaxValue);

            var records = await _context.Attendances
                .Where(a => a.StudentId == studentId && a.IsActive && a.AcademicYearId == academicYearId && a.AttendanceDate >= startDate && a.AttendanceDate <= endDate)
                .ToListAsync();

            var response = new YearlyOverviewResponse();
            var months = new List<MonthlyOverviewItem>();

            var currentMonth = new DateTime(startDate.Year, startDate.Month, 1);
            var endMonth = new DateTime(endDate.Year, endDate.Month, 1);

            while (currentMonth <= endMonth)
            {
                var monthRecords = records.Where(r => r.AttendanceDate.Month == currentMonth.Month && r.AttendanceDate.Year == currentMonth.Year).ToList();
                var distinctDays = monthRecords.Select(r => r.AttendanceDate.Date).Distinct().ToList();
                int workingDays = distinctDays.Count;
                
                int presentDays = 0;
                int absentDays = 0;
                int halfDays = 0;

                foreach (var day in distinctDays)
                {
                    var dayRecords = monthRecords.Where(r => r.AttendanceDate.Date == day).ToList();
                    var morning = dayRecords.FirstOrDefault(r => r.Session == Enums.StudentAttendanceSession.Morning);
                    var afternoon = dayRecords.FirstOrDefault(r => r.Session == Enums.StudentAttendanceSession.Afternoon);

                    bool isMorningPresent = morning != null && morning.Status == Enums.AttendanceStatus.Present;
                    bool isAfternoonPresent = afternoon != null && afternoon.Status == Enums.AttendanceStatus.Present;
                    
                    bool hasMorning = morning != null;
                    bool hasAfternoon = afternoon != null;

                    if (isMorningPresent && isAfternoonPresent) {
                        presentDays++;
                    } else if ((isMorningPresent && hasAfternoon && !isAfternoonPresent) || (isAfternoonPresent && hasMorning && !isMorningPresent)) {
                        halfDays++;
                    } else if (isMorningPresent || isAfternoonPresent) {
                        presentDays++;
                    } else {
                        absentDays++;
                    }
                }

                months.Add(new MonthlyOverviewItem
                {
                    MonthName = currentMonth.ToString("MMMM"),
                    Month = currentMonth.Month,
                    Year = currentMonth.Year,
                    WorkingDays = workingDays,
                    Present = presentDays,
                    Absent = absentDays,
                    HalfDays = halfDays,
                    AttendancePercentage = workingDays > 0 ? Math.Round((double)(presentDays + 0.5 * halfDays) / workingDays * 100, 1) : 0
                });

                currentMonth = currentMonth.AddMonths(1);
            }

            response.MonthlyRecords = months;
            response.TotalWorkingDays = months.Sum(m => m.WorkingDays);
            response.TotalPresent = months.Sum(m => m.Present);
            response.TotalAbsent = months.Sum(m => m.Absent);
            response.TotalHalfDays = months.Sum(m => m.HalfDays);
            
            double totalAttended = response.TotalPresent + (0.5 * response.TotalHalfDays);
            response.OverallAttendancePercentage = response.TotalWorkingDays > 0 
                ? Math.Round(totalAttended / response.TotalWorkingDays * 100, 1) 
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
                    { "Admission No", "ADM-001" },
                    { "Student Name", "Example Student" },
                    { "Session", "Morning" },
                    { "Attendance Status", "Present" },
                    { "Remarks", "On Time" }
                }
            };
            
            using var ms = new MemoryStream();
            await ms.SaveAsAsync(dataList, sheetName: "Student Attendance");
            return ms.ToArray();
        }

        public async Task<object> ImportAttendanceFromExcelAsync(byte[] fileBytes, bool validateOnly, bool isAdmin, string userName, int? userId)
        {
            using var ms = new MemoryStream(fileBytes);
            var rows = ms.Query(useHeaderRow: true, sheetName: "Student Attendance").ToList();

            var errors = new List<object>();
            int validCount = 0;
            var toSave = new List<Attendance>();
            var auditRecords = new List<AttendanceAuditHistory>();
            int rowIndex = 1;

            foreach (var r in rows)
            {
                rowIndex++;
                var dict = r as IDictionary<string, object>;
                if (dict == null) continue;

                string? admNo = dict.ContainsKey("Admission No") ? dict["Admission No"]?.ToString() : null;
                string? dateStr = dict.ContainsKey("Attendance Date") ? dict["Attendance Date"]?.ToString() : null;
                string? sessionStr = dict.ContainsKey("Session") ? dict["Session"]?.ToString() : null;
                string? statusStr = dict.ContainsKey("Attendance Status") ? dict["Attendance Status"]?.ToString() : null;
                string? remarks = dict.ContainsKey("Remarks") ? dict["Remarks"]?.ToString() : null;

                if (string.IsNullOrWhiteSpace(admNo) || string.IsNullOrWhiteSpace(dateStr) || string.IsNullOrWhiteSpace(statusStr))
                {
                    errors.Add(new[] { rowIndex.ToString(), admNo ?? "", "", dateStr ?? "", "Missing required fields" });
                    continue;
                }

                if (!DateTime.TryParse(dateStr, out DateTime attDate))
                {
                    errors.Add(new[] { rowIndex.ToString(), admNo, "", dateStr, "Invalid Date format" });
                    continue;
                }

                if (!Enum.TryParse<Enums.AttendanceStatus>(statusStr, true, out var status))
                {
                    errors.Add(new[] { rowIndex.ToString(), admNo, "", dateStr, "Invalid Attendance Status" });
                    continue;
                }

                Enums.StudentAttendanceSession? session = null;
                if (!string.IsNullOrWhiteSpace(sessionStr) && Enum.TryParse<Enums.StudentAttendanceSession>(sessionStr, true, out var s))
                {
                    session = s;
                }

                var student = await _context.Students.FirstOrDefaultAsync(st => st.AdmissionNo == admNo);
                if (student == null)
                {
                    errors.Add(new[] { rowIndex.ToString(), admNo, "", dateStr, "Student not found" });
                    continue;
                }

                var exists = await _context.Attendances.AnyAsync(a => a.StudentId == student.StudentId && a.AttendanceDate.Date == attDate.Date && a.Session == session && a.IsActive);
                if (exists)
                {
                    errors.Add(new[] { rowIndex.ToString(), admNo, student.StudentName, dateStr, "Attendance already exists" });
                    continue;
                }

                validCount++;
                if (!validateOnly)
                {
                    var attendance = new Attendance
                    {
                        StudentId = student.StudentId,
                        Status = status,
                        Remarks = remarks,
                        Session = session,
                        AttendanceDate = attDate,
                        BoardId = student.BoardId,
                        AcademicYearId = student.AcademicYearId,
                        AcademicLevelId = student.AcademicLevelId,
                        GroupId = student.GroupId,
                        SectionId = student.SectionId,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        ModifiedByUserId = userId,
                        ModifiedAt = DateTime.UtcNow
                    };
                    toSave.Add(attendance);
                }
            }

            if (!validateOnly && errors.Count == 0 && toSave.Any())
            {
                await _context.Attendances.AddRangeAsync(toSave);
                await _context.SaveChangesAsync();
                
                foreach(var a in toSave)
                {
                    auditRecords.Add(new AttendanceAuditHistory
                    {
                        EntityType = "Student",
                        EntityId = a.AttendanceId,
                        StudentId = a.StudentId,
                        AttendanceDate = a.AttendanceDate,
                        OldStatus = null,
                        NewStatus = (byte)a.Status,
                        Action = "CREATE",
                        Description = a.Remarks ?? "Imported bulk attendance as '" + a.Status + "'.",
                        ModifiedByUserId = userId,
                        ModifiedByUserName = userName,
                        CreatedAt = DateTime.UtcNow
                    });
                }
                await _context.AttendanceAuditHistories.AddRangeAsync(auditRecords);
                await _context.SaveChangesAsync();
                _attendanceCache.InvalidateAll();
            }

            return new { total = rows.Count, valid = validCount, errors = errors };
        }

    }
}
