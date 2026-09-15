using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Evaluations;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Enums;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class MarksRepository : IMarksRepository
    {
        private readonly AppDbContext _context;

        public MarksRepository(AppDbContext context)
        {
            _context = context;
        }

        // --- Existing Basic & Legacy Operations ---
        public async Task<IEnumerable<Mark>> GetAllAsync()
        {
            var marks = await _context.Marks
                .AsNoTracking()
                .Where(m => m.IsActive)
                .ToListAsync();
            await EnrichMarkNavigationsAsync(marks);
            return marks;
        }

        public async Task<Mark?> GetByIdAsync(int id)
        {
            var mark = await _context.Marks
                .FirstOrDefaultAsync(m => m.MarkId == id && m.IsActive);
            if (mark != null)
            {
                await EnrichMarkNavigationsAsync(new List<Mark> { mark });
            }
            return mark;
        }

        public async Task<Mark?> GetByExamSubjectStudentAsync(int examinationId, int subjectId, int studentId)
        {
            return await _context.Marks
                .FirstOrDefaultAsync(m => m.ExaminationId == examinationId && m.SubjectId == subjectId && m.StudentId == studentId);
        }

        public async Task<IEnumerable<Mark>> GetByStudentIdAsync(int studentId)
        {
            return await GetByStudentAsync(studentId);
        }

        public async Task<IEnumerable<Mark>> GetByStudentAsync(int studentId)
        {
            var marks = await _context.Marks
                .AsNoTracking()
                .Where(m => m.StudentId == studentId && m.IsActive)
                .ToListAsync();
            await EnrichMarkNavigationsAsync(marks);
            return marks;
        }

        public async Task<IEnumerable<Mark>> GetBySubjectAsync(int subjectId)
        {
            var marks = await _context.Marks
                .AsNoTracking()
                .Where(m => m.SubjectId == subjectId && m.IsActive)
                .ToListAsync();
            await EnrichMarkNavigationsAsync(marks);
            return marks;
        }

        public async Task<IEnumerable<Mark>> GetByExamIdAsync(int examinationId)
        {
            return await GetByExamAsync(examinationId);
        }

        public async Task<IEnumerable<Mark>> GetByExamAsync(int examinationId)
        {
            var marks = await _context.Marks
                .AsNoTracking()
                .Where(m => m.ExaminationId == examinationId && m.IsActive)
                .ToListAsync();
            await EnrichMarkNavigationsAsync(marks);
            return marks;
        }

        public async Task AddAsync(Mark mark)
        {
            await _context.Marks.AddAsync(mark);
        }

        public async Task<Mark> CreateAsync(Mark mark)
        {
            // Disconnect entity navigation graph to prevent EF Core from trying to re-insert/update related tables
            mark.Student = null;
            mark.Subject = null;
            mark.Faculty = null;
            mark.SectionNavigation = null;
            mark.BoardNavigation = null;
            mark.AcademicYear = null;
            mark.AcademicLevelNavigation = null;
            mark.GroupNavigation = null;
            mark.Examination = null;

            await _context.Marks.AddAsync(mark);
            await _context.SaveChangesAsync();
            return mark;
        }

        public async Task AddRangeAsync(IEnumerable<Mark> marks)
        {
            await _context.Marks.AddRangeAsync(marks);
        }

        public async Task<Mark> UpdateAsync(Mark mark)
        {
            mark.UpdatedAt = DateTime.UtcNow;

            // Disconnect entity navigation graph to prevent EF Core from trying to re-insert/update related tables
            mark.Student = null;
            mark.Subject = null;
            mark.Faculty = null;
            mark.SectionNavigation = null;
            mark.BoardNavigation = null;
            mark.AcademicYear = null;
            mark.AcademicLevelNavigation = null;
            mark.GroupNavigation = null;
            mark.Examination = null;

            var tracked = _context.Marks.Local.FirstOrDefault(m => m.MarkId == mark.MarkId);
            if (tracked != null)
            {
                _context.Entry(tracked).CurrentValues.SetValues(mark);
            }
            else
            {
                _context.Entry(mark).State = EntityState.Modified;
            }

            await _context.SaveChangesAsync();
            return mark;
        }

        public async Task<Mark> UpdateAsync(Mark mark, int userId)
        {
            return await UpdateAsync(mark);
        }

        public async Task<Mark> UpdateAsync(int id, Mark mark)
        {
            var existing = await _context.Marks.FindAsync(id);
            if (existing != null)
            {
                existing.InternalMarks = mark.InternalMarks;
                existing.PracticalMarks = mark.PracticalMarks;
                existing.TheoryMarks = mark.TheoryMarks;
                existing.TotalMarks = mark.TotalMarks;
                existing.PassingMarks = mark.PassingMarks > 0 ? mark.PassingMarks : existing.PassingMarks;
                existing.IsAbsent = mark.IsAbsent;
                existing.Remarks = mark.Remarks;
                if (mark.FacultyId.HasValue && mark.FacultyId.Value > 0)
                {
                    existing.FacultyId = mark.FacultyId;
                }
                if (mark.BoardId.HasValue && mark.BoardId.Value > 0)
                {
                    existing.BoardId = mark.BoardId;
                }
                if (!string.IsNullOrWhiteSpace(mark.Board))
                {
                    existing.Board = mark.Board;
                }
                if (mark.AcademicYearId > 0)
                {
                    existing.AcademicYearId = mark.AcademicYearId;
                }
                if (mark.AcademicLevelId.HasValue && mark.AcademicLevelId.Value > 0)
                {
                    existing.AcademicLevelId = mark.AcademicLevelId;
                }
                if (!string.IsNullOrWhiteSpace(mark.AcademicLevel))
                {
                    existing.AcademicLevel = mark.AcademicLevel;
                }
                if (mark.GroupId > 0)
                {
                    existing.GroupId = mark.GroupId;
                }
                if (mark.SectionId > 0)
                {
                    existing.SectionId = mark.SectionId;
                }
                if (!string.IsNullOrWhiteSpace(mark.RollNo))
                {
                    existing.RollNo = mark.RollNo;
                }
                if (!string.IsNullOrWhiteSpace(mark.StudentName))
                {
                    existing.StudentName = mark.StudentName;
                }
                existing.IsActive = true;
                existing.UpdatedAt = DateTime.UtcNow;

                existing.Student = null;
                existing.Subject = null;
                existing.Faculty = null;
                existing.SectionNavigation = null;
                existing.BoardNavigation = null;
                existing.AcademicYear = null;
                existing.AcademicLevelNavigation = null;
                existing.GroupNavigation = null;
                existing.Examination = null;

                _context.Marks.Update(existing);
                await _context.SaveChangesAsync();
                return existing;
            }
            return mark;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var mark = await _context.Marks.FindAsync(id);
            if (mark != null)
            {
                mark.IsActive = false;
                mark.UpdatedAt = DateTime.UtcNow;
                _context.Marks.Update(mark);
                return await _context.SaveChangesAsync() > 0;
            }
            return false;
        }

        public async Task<bool> RestoreAsync(int id)
        {
            var mark = await _context.Marks.FindAsync(id);
            if (mark != null)
            {
                mark.IsActive = true;
                mark.UpdatedAt = DateTime.UtcNow;
                _context.Marks.Update(mark);
                return await _context.SaveChangesAsync() > 0;
            }
            return false;
        }

        public async Task<int> VerifyMarksAsync(int examinationId, string verifiedBy)
        {
            var marks = await _context.Marks
                .Where(m => m.ExaminationId == examinationId && m.IsActive)
                .ToListAsync();

            if (!marks.Any()) return 0;

            var now = DateTime.UtcNow;
            foreach (var mark in marks)
            {
                mark.IsVerified = true;
                mark.VerifiedBy = verifiedBy;
                mark.VerifiedAt = now;
                mark.Status = EvaluationStatus.VERIFIED;
                mark.UpdatedAt = now;
            }

            _context.Marks.UpdateRange(marks);
            return await _context.SaveChangesAsync();
        }

        public async Task<int> VerifyMarksAsync(int examinationId, int? subjectId, int? sectionId, string verifiedBy)
        {
            var query = _context.Marks.Where(m => m.ExaminationId == examinationId && m.IsActive);

            if (subjectId.HasValue && subjectId.Value > 0)
                query = query.Where(m => m.SubjectId == subjectId.Value);

            if (sectionId.HasValue && sectionId.Value > 0)
                query = query.Where(m => m.SectionId == sectionId.Value);

            var marks = await query.ToListAsync();
            if (!marks.Any()) return 0;

            var now = DateTime.UtcNow;
            foreach (var mark in marks)
            {
                mark.IsVerified = true;
                mark.VerifiedBy = verifiedBy;
                mark.VerifiedAt = now;
                mark.Status = EvaluationStatus.VERIFIED;
                mark.UpdatedAt = now;
            }

            _context.Marks.UpdateRange(marks);
            return await _context.SaveChangesAsync();
        }

        public async Task<int> PublishMarksAsync(int examinationId)
        {
            var marks = await _context.Marks
                .Where(m => m.ExaminationId == examinationId && m.IsActive)
                .ToListAsync();

            if (!marks.Any()) return 0;

            var now = DateTime.UtcNow;
            foreach (var mark in marks)
            {
                mark.IsPublished = true;
                mark.PublishedAt = now;
                mark.UpdatedAt = now;
            }

            _context.Marks.UpdateRange(marks);
            return await _context.SaveChangesAsync();
        }

        public async Task<int> PublishMarksAsync(int examinationId, int? subjectId, int? sectionId)
        {
            var query = _context.Marks.Where(m => m.ExaminationId == examinationId && m.IsActive);

            if (subjectId.HasValue && subjectId.Value > 0)
                query = query.Where(m => m.SubjectId == subjectId.Value);

            if (sectionId.HasValue && sectionId.Value > 0)
                query = query.Where(m => m.SectionId == sectionId.Value);

            var marks = await query.ToListAsync();
            if (!marks.Any()) return 0;

            var now = DateTime.UtcNow;
            foreach (var mark in marks)
            {
                mark.IsPublished = true;
                mark.PublishedAt = now;
                mark.UpdatedAt = now;
            }

            _context.Marks.UpdateRange(marks);
            return await _context.SaveChangesAsync();
        }

        public async Task<bool> SaveChangesAsync()
        {
            return await _context.SaveChangesAsync() > 0;
        }

        // --- 3-Tier Admin Evaluation & Governance Queries ---
        public async Task<IEnumerable<Mark>> GetFilteredEvaluationsAsync(EvaluationFilterDto filter)
        {
            var query = BuildFilteredEvaluationQuery(filter);

            var marks = await query
                .AsNoTracking()
                .OrderByDescending(m => m.CreatedAt)
                .Skip((filter.PageNumber - 1) * filter.PageSize)
                .Take(filter.PageSize)
                .ToListAsync();

            await EnrichMarkNavigationsAsync(marks);
            return marks;
        }

        public async Task<int> GetFilteredEvaluationsCountAsync(EvaluationFilterDto filter)
        {
            var query = BuildFilteredEvaluationQuery(filter);
            return await query.CountAsync();
        }

        public async Task<IEnumerable<Mark>> GetEvaluationMarksListAsync(int subjectId, int sectionId, int examinationId)
        {
            var query = _context.Marks
                .AsNoTracking()
                .Where(m => m.IsActive);

            if (subjectId > 0)
                query = query.Where(m => m.SubjectId == subjectId);

            if (sectionId > 0)
                query = query.Where(m => m.SectionId == sectionId);

            if (examinationId > 0)
                query = query.Where(m => m.ExaminationId == examinationId);

            var marks = await query.OrderBy(m => m.RollNo).ToListAsync();
            await EnrichMarkNavigationsAsync(marks);
            return marks;
        }

        public async Task<bool> UpdateEvaluationStatusAsync(int subjectId, int sectionId, int examinationId, EvaluationStatus targetStatus, int userId, string? remarks = null)
        {
            var query = _context.Marks.Where(m => m.SubjectId == subjectId && m.IsActive);
            if (sectionId > 0) query = query.Where(m => m.SectionId == sectionId);
            if (examinationId > 0)
                query = query.Where(m => m.ExaminationId == examinationId);

            var marks = await query.ToListAsync();

            if (!marks.Any()) return false;

            var now = DateTime.UtcNow;
            foreach (var mark in marks)
            {
                mark.Student = null;
                mark.Subject = null;
                mark.Faculty = null;
                mark.SectionNavigation = null;
                mark.BoardNavigation = null;
                mark.GroupNavigation = null;
                mark.AcademicLevelNavigation = null;
                mark.AcademicYear = null;

                mark.Status = targetStatus;
                mark.UpdatedAt = now;

                if (!string.IsNullOrWhiteSpace(remarks))
                {
                    mark.Remarks = remarks;
                }

                if (targetStatus == EvaluationStatus.VERIFIED)
                {
                    mark.IsVerified = true;
                    mark.VerifiedBy = userId.ToString();
                    mark.VerifiedAt = now;
                }
                else if (targetStatus == EvaluationStatus.APPROVED)
                {
                    mark.ApprovedBy = userId;
                    mark.ApprovedAt = now;
                }
            }

            _context.Marks.UpdateRange(marks);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<bool> ToggleEvaluationLockAsync(int subjectId, int sectionId, int examinationId, bool isLocked)
        {
            var query = _context.Marks.Where(m => m.SubjectId == subjectId && m.IsActive);
            if (sectionId > 0) query = query.Where(m => m.SectionId == sectionId);
            if (examinationId > 0)
                query = query.Where(m => m.ExaminationId == examinationId);
            else
                query = query.Where(m => m.ExaminationId <= 0);

            var marks = await query.ToListAsync();

            if (!marks.Any()) return false;

            foreach (var mark in marks)
            {
                mark.Student = null;
                mark.Subject = null;
                mark.Faculty = null;
                mark.SectionNavigation = null;
                mark.BoardNavigation = null;
                mark.GroupNavigation = null;
                mark.AcademicLevelNavigation = null;
                mark.AcademicYear = null;

                mark.IsLocked = isLocked;
                mark.UpdatedAt = DateTime.UtcNow;
            }

            _context.Marks.UpdateRange(marks);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<IEnumerable<Mark>> GetSubjectStudentMarksAsync(int subjectId, int? sectionId, int? examinationId)
        {
            var query = _context.Marks
                .AsNoTracking()
                .Where(m => m.SubjectId == subjectId && m.IsActive);

            if (sectionId.HasValue && sectionId.Value > 0)
                query = query.Where(m => m.SectionId == sectionId.Value);

            if (examinationId.HasValue && examinationId.Value > 0)
                query = query.Where(m => m.ExaminationId == examinationId.Value);

            var marks = await query.OrderBy(m => m.RollNo).ToListAsync();
            await EnrichMarkNavigationsAsync(marks);
            return marks;
        }

        public async Task<bool> ExecuteGlobalApprovalAsync(CollegeManagement.API.DTOs.Marks.GlobalApprovalRequestDto dto, int userId)
        {
            var query = _context.Marks.Where(m => m.IsActive);

            if (dto.BoardId.HasValue && dto.BoardId.Value > 0)
                query = query.Where(m => m.BoardId == dto.BoardId.Value);

            if (dto.AcademicYearId > 0)
                query = query.Where(m => m.AcademicYearId == dto.AcademicYearId);

            if (dto.AcademicLevelId.HasValue && dto.AcademicLevelId.Value > 0)
                query = query.Where(m => m.AcademicLevelId == dto.AcademicLevelId.Value);

            if (dto.GroupId > 0)
                query = query.Where(m => m.GroupId == dto.GroupId);

            if (dto.SectionId.HasValue && dto.SectionId.Value > 0)
                query = query.Where(m => m.SectionId == dto.SectionId.Value);

            if (dto.ExaminationId > 0)
                query = query.Where(m => m.ExaminationId == dto.ExaminationId);

            var marks = await query.ToListAsync();

            if (!marks.Any())
            {
                throw new InvalidOperationException("No mark entries were found matching the specified approval context.");
            }

            var unverifiedCount = marks.Count(m => m.Status != EvaluationStatus.VERIFIED);
            if (unverifiedCount > 0)
            {
                var submittedCount = marks.Count(m => m.Status == EvaluationStatus.SUBMITTED);
                var rejectedCount = marks.Count(m => m.Status == EvaluationStatus.REJECTED);
                var approvedCount = marks.Count(m => m.Status == EvaluationStatus.APPROVED);

                throw new InvalidOperationException(
                    $"Global approval failed. All subject marks in the selected context must be in 'VERIFIED' status before final approval. " +
                    $"Found {unverifiedCount} record(s) not verified (Submitted: {submittedCount}, Rejected: {rejectedCount}, Already Approved: {approvedCount}).");
            }

            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var now = DateTime.UtcNow;
                    foreach (var mark in marks)
                    {
                        mark.Student = null;
                        mark.Subject = null;
                        mark.Faculty = null;
                        mark.SectionNavigation = null;
                        mark.BoardNavigation = null;
                        mark.GroupNavigation = null;
                        mark.AcademicLevelNavigation = null;
                        mark.AcademicYear = null;

                        mark.Status = EvaluationStatus.APPROVED;
                        mark.ApprovedBy = userId > 0 ? userId : dto.ApprovedBy;
                        mark.ApprovedAt = now;
                        mark.UpdatedAt = now;
                    }

                    _context.Marks.UpdateRange(marks);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return true;
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });
        }

        // --- Private Helper Query Builder ---
        private IQueryable<Mark> BuildFilteredEvaluationQuery(EvaluationFilterDto filter)
        {
            var query = _context.Marks.Where(m => m.IsActive);

            if (filter.BoardId.HasValue && filter.BoardId.Value > 0)
                query = query.Where(m => m.BoardId == filter.BoardId.Value);

            if (filter.AcademicYearId.HasValue && filter.AcademicYearId.Value > 0)
                query = query.Where(m => m.AcademicYearId == filter.AcademicYearId.Value);

            if (filter.AcademicLevelId.HasValue && filter.AcademicLevelId.Value > 0)
                query = query.Where(m => m.AcademicLevelId == filter.AcademicLevelId.Value);

            if (filter.GroupId.HasValue && filter.GroupId.Value > 0)
                query = query.Where(m => m.GroupId == filter.GroupId.Value);

            if (filter.SectionId.HasValue && filter.SectionId.Value > 0)
                query = query.Where(m => m.SectionId == filter.SectionId.Value);

            if (filter.ExaminationId.HasValue && filter.ExaminationId.Value > 0)
                query = query.Where(m => m.ExaminationId == filter.ExaminationId.Value);

            if (filter.SubjectId.HasValue && filter.SubjectId.Value > 0)
                query = query.Where(m => m.SubjectId == filter.SubjectId.Value);

            if (filter.StudentId.HasValue && filter.StudentId.Value > 0)
                query = query.Where(m => m.StudentId == filter.StudentId.Value);

            if (filter.FacultyId.HasValue && filter.FacultyId.Value > 0)
                query = query.Where(m => m.FacultyId == filter.FacultyId.Value);

            if (filter.Status.HasValue)
                query = query.Where(m => m.Status == filter.Status.Value);

            return query;
        }

        private async Task EnrichMarkNavigationsAsync(IEnumerable<Mark>? marks)
        {
            if (marks == null) return;
            var markList = marks.ToList();
            if (!markList.Any()) return;

            try
            {
                var conn = _context.Database.GetDbConnection();
                if (conn.State != ConnectionState.Open)
                    await conn.OpenAsync();

                var subjectIds = markList.Select(m => m.SubjectId).Where(id => id > 0).Distinct().ToList();
                var sectionIds = markList.Select(m => m.SectionId).Where(id => id > 0).Distinct().ToList();
                var groupIds = markList.Select(m => m.GroupId).Where(id => id > 0).Distinct().ToList();
                var examIds = markList.Select(m => m.ExaminationId).Where(id => id > 0).Distinct().ToList();
                var facultyIds = markList.Where(m => m.FacultyId.HasValue && m.FacultyId.Value > 0).Select(m => m.FacultyId!.Value).Distinct().ToList();
                var studentIds = markList.Select(m => m.StudentId).Where(id => id > 0).Distinct().ToList();
                var boardIds = markList.Where(m => m.BoardId.HasValue && m.BoardId.Value > 0).Select(m => m.BoardId!.Value).Distinct().ToList();
                var yearIds = markList.Select(m => m.AcademicYearId).Where(id => id > 0).Distinct().ToList();
                var levelIds = markList.Where(m => m.AcademicLevelId.HasValue && m.AcademicLevelId.Value > 0).Select(m => m.AcademicLevelId!.Value).Distinct().ToList();

                var subjects = new Dictionary<int, (string Name, string Code)>();
                if (subjectIds.Any())
                {
                    try
                    {
                        var rows = await conn.QueryAsync<(int SubjectId, string SubjectName, string SubjectCode)>(
                            $"SELECT SubjectId, SubjectName, SubjectCode FROM Subjects WHERE SubjectId IN ({string.Join(",", subjectIds)})");
                        foreach (var r in rows) subjects[r.SubjectId] = (r.SubjectName, r.SubjectCode);
                    }
                    catch { }
                }

                var sections = new Dictionary<int, string>();
                if (sectionIds.Any())
                {
                    try
                    {
                        var rows = await conn.QueryAsync<(int SectionId, string SectionName)>(
                            $"SELECT SectionId, SectionName FROM Sections WHERE SectionId IN ({string.Join(",", sectionIds)})");
                        foreach (var r in rows) sections[r.SectionId] = r.SectionName;
                    }
                    catch { }
                }

                var groups = new Dictionary<int, string>();
                if (groupIds.Any())
                {
                    try
                    {
                        var rows = await conn.QueryAsync<(int GroupId, string GroupName)>(
                            $"SELECT GroupId, GroupName FROM `Groups` WHERE GroupId IN ({string.Join(",", groupIds)})");
                        foreach (var r in rows) groups[r.GroupId] = r.GroupName;
                    }
                    catch { }
                }

                var exams = new Dictionary<int, string>();
                if (examIds.Any())
                {
                    try
                    {
                        var rows = await conn.QueryAsync<(int ExaminationId, string ExamName)>(
                            $"SELECT ExamId AS ExaminationId, ExamName FROM Examinations WHERE ExamId IN ({string.Join(",", examIds)})");
                        foreach (var r in rows) exams[r.ExaminationId] = r.ExamName;
                    }
                    catch { }
                }

                var faculties = new Dictionary<int, (string FirstName, string LastName, string EmployeeId)>();
                if (facultyIds.Any())
                {
                    try
                    {
                        var rows = await conn.QueryAsync<(int Id, string FirstName, string LastName, string? EmployeeId)>(
                            $"SELECT Id, FirstName, LastName, EmployeeId FROM Faculties WHERE Id IN ({string.Join(",", facultyIds)})");
                        foreach (var r in rows) faculties[r.Id] = (r.FirstName, r.LastName, r.EmployeeId ?? $"FAC{r.Id:0000}");
                    }
                    catch
                    {
                        try
                        {
                            var rows = await conn.QueryAsync<(int Id, string FirstName, string LastName)>(
                                $"SELECT Id, FirstName, LastName FROM Faculties WHERE Id IN ({string.Join(",", facultyIds)})");
                            foreach (var r in rows) faculties[r.Id] = (r.FirstName, r.LastName, $"FAC{r.Id:0000}");
                        }
                        catch { }
                    }
                }

                var students = new Dictionary<int, (string Name, string RollNo, string AdmissionNo)>();
                if (studentIds.Any())
                {
                    try
                    {
                        var rows = await conn.QueryAsync<(int StudentId, string StudentName, string RollNo, string AdmissionNo)>(
                            $"SELECT StudentId, StudentName, RollNo, AdmissionNo FROM Students WHERE StudentId IN ({string.Join(",", studentIds)})");
                        foreach (var r in rows) students[r.StudentId] = (r.StudentName, r.RollNo, r.AdmissionNo);
                    }
                    catch { }
                }

                var boards = new Dictionary<int, string>();
                if (boardIds.Any())
                {
                    try
                    {
                        var rows = await conn.QueryAsync<(int BoardId, string BoardName)>(
                            $"SELECT BoardId, BoardName FROM Boards WHERE BoardId IN ({string.Join(",", boardIds)})");
                        foreach (var r in rows) boards[r.BoardId] = r.BoardName;
                    }
                    catch { }
                }

                var years = new Dictionary<int, string>();
                if (yearIds.Any())
                {
                    try
                    {
                        var rows = await conn.QueryAsync<(int AcademicYearId, string AcademicYearName)>(
                            $"SELECT AcademicYearId, AcademicYearName FROM AcademicYears WHERE AcademicYearId IN ({string.Join(",", yearIds)})");
                        foreach (var r in rows) years[r.AcademicYearId] = r.AcademicYearName;
                    }
                    catch { }
                }

                var levels = new Dictionary<int, string>();
                if (levelIds.Any())
                {
                    try
                    {
                        var rows = await conn.QueryAsync<(int AcademicLevelId, string LevelName)>(
                            $"SELECT AcademicLevelId, LevelName FROM AcademicLevels WHERE AcademicLevelId IN ({string.Join(",", levelIds)})");
                        foreach (var r in rows) levels[r.AcademicLevelId] = r.LevelName;
                    }
                    catch { }
                }

                foreach (var m in markList)
                {
                    if (subjects.TryGetValue(m.SubjectId, out var sub))
                    {
                        m.Subject = new Subject { SubjectId = m.SubjectId, SubjectName = sub.Name, SubjectCode = sub.Code };
                    }
                    if (sections.TryGetValue(m.SectionId, out var secName))
                    {
                        m.SectionNavigation = new Section { SectionId = m.SectionId, SectionName = secName };
                    }
                    if (groups.TryGetValue(m.GroupId, out var grpName))
                    {
                        m.GroupNavigation = new Group { GroupId = m.GroupId, GroupName = grpName };
                    }
                    if (exams.TryGetValue(m.ExaminationId, out var exName))
                    {
                        m.Examination = new Examination { ExaminationId = m.ExaminationId, ExamName = exName };
                    }
                    if (m.FacultyId.HasValue && faculties.TryGetValue(m.FacultyId.Value, out var fac))
                    {
                        m.Faculty = new CollegeManagement.API.Models.Faculty.Faculty
                        {
                            Id = m.FacultyId.Value,
                            FirstName = fac.FirstName,
                            LastName = fac.LastName,
                            EmployeeId = fac.EmployeeId
                        };
                    }
                    if (students.TryGetValue(m.StudentId, out var stu))
                    {
                        if (string.IsNullOrWhiteSpace(m.StudentName)) m.StudentName = stu.Name;
                        if (string.IsNullOrWhiteSpace(m.RollNo)) m.RollNo = stu.RollNo;
                        m.Student = new Student
                        {
                            StudentId = m.StudentId,
                            StudentName = stu.Name,
                            RollNo = stu.RollNo,
                            AdmissionNo = stu.AdmissionNo
                        };
                    }
                    if (m.BoardId.HasValue && boards.TryGetValue(m.BoardId.Value, out var bName))
                    {
                        m.BoardNavigation = new Board { BoardId = m.BoardId.Value, BoardName = bName };
                        if (string.IsNullOrWhiteSpace(m.Board)) m.Board = bName;
                    }
                    if (years.TryGetValue(m.AcademicYearId, out var yName))
                    {
                        m.AcademicYear = new AcademicYear { AcademicYearId = m.AcademicYearId, AcademicYearName = yName };
                    }
                    if (m.AcademicLevelId.HasValue && levels.TryGetValue(m.AcademicLevelId.Value, out var lName))
                    {
                        m.AcademicLevelNavigation = new AcademicLevel { AcademicLevelId = m.AcademicLevelId.Value, LevelName = lName };
                        if (string.IsNullOrWhiteSpace(m.AcademicLevel)) m.AcademicLevel = lName;
                    }
                }
            }
            catch
            {
                // Fallback gracefully
            }
        }

        public async Task<bool> UpdateStudentMarksAsync(int subjectId, int sectionId, int examinationId, List<StudentMarkUpdateItemDto> updates, int userId)
        {
            if (updates == null || !updates.Any()) return false;

            var existingMarks = await _context.Marks
                .Where(m => m.SubjectId == subjectId && m.SectionId == sectionId && m.ExaminationId == examinationId && m.IsActive)
                .ToListAsync();

            if (!existingMarks.Any()) return false;

            var now = DateTime.UtcNow;
            foreach (var update in updates)
            {
                Mark? target = null;
                if (update.MarkId.HasValue && update.MarkId.Value > 0)
                {
                    target = existingMarks.FirstOrDefault(m => m.MarkId == update.MarkId.Value);
                }
                if (target == null && update.StudentId > 0)
                {
                    target = existingMarks.FirstOrDefault(m => m.StudentId == update.StudentId);
                }

                if (target != null)
                {
                    if (update.Internal.HasValue) target.InternalMarks = (int)update.Internal.Value;
                    if (update.Practical.HasValue) target.PracticalMarks = (int)update.Practical.Value;
                    if (update.Theory.HasValue) target.TheoryMarks = (int)update.Theory.Value;
                    if (update.IsAbsent.HasValue) target.IsAbsent = update.IsAbsent.Value;
                    if (update.Remarks != null) target.Remarks = update.Remarks;

                    target.TotalMarks = target.InternalMarks + target.PracticalMarks + target.TheoryMarks;
                    target.Status = EvaluationStatus.SUBMITTED; // Reset to submitted on edit
                    target.UpdatedAt = now;
                }
            }

            _context.Marks.UpdateRange(existingMarks);
            return await _context.SaveChangesAsync() > 0;
        }

        public async Task<IEnumerable<dynamic>> GetGroupSectionsAsync(int groupId)
        {
            try
            {
                var conn = _context.Database.GetDbConnection();
                if (conn.State != ConnectionState.Open)
                    await conn.OpenAsync();

                try
                {
                    return await conn.QueryAsync(
                        "sp_GetActiveSectionsByGroup",
                        new { p_GroupId = groupId },
                        commandType: CommandType.StoredProcedure);
                }
                catch (MySqlConnector.MySqlException ex) when (ex.Number == 1305)
                {
                    return await conn.QueryAsync(
                        "SELECT SectionId AS sectionId, SectionName AS sectionName FROM Sections WHERE GroupId = @groupId AND IsActive = 1 ORDER BY SectionName;",
                        new { groupId });
                }
            }
            catch
            {
                return Enumerable.Empty<dynamic>();
            }
        }

        public async Task<IEnumerable<dynamic>> GetGroupSubjectsAsync(int groupId)
        {
            try
            {
                var conn = _context.Database.GetDbConnection();
                if (conn.State != ConnectionState.Open)
                    await conn.OpenAsync();

                try
                {
                    return await conn.QueryAsync(
                        "sp_GetActiveSubjectsByGroup",
                        new { p_GroupId = groupId },
                        commandType: CommandType.StoredProcedure);
                }
                catch (MySqlConnector.MySqlException ex) when (ex.Number == 1305)
                {
                    return await conn.QueryAsync(
                        "SELECT SubjectId AS subjectId, SubjectName AS subjectName, SubjectCode AS subjectCode FROM Subjects WHERE GroupId = @groupId AND IsActive = 1 ORDER BY SubjectName;",
                        new { groupId });
                }
            }
            catch
            {
                return Enumerable.Empty<dynamic>();
            }
        }
    }
}