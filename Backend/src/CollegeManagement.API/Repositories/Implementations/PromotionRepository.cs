using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Promotion;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class PromotionRepository : IPromotionRepository
    {
        private readonly AppDbContext _context;

        public PromotionRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        private async Task OpenAsync()
        {
            if (Connection.State != ConnectionState.Open)
            {
                await ((System.Data.Common.DbConnection)Connection).OpenAsync();
            }
        }

        // ============================================================
        // 1. GET ELIGIBLE STUDENTS
        // ============================================================
        public async Task<IEnumerable<EligibleStudentDto>> GetEligibleStudentsAsync(
            PromotionEligibilityQuery q)
        {
            await OpenAsync();

            return await Connection.QueryAsync<EligibleStudentDto>(
                "sp_GetEligiblePromotionStudents",
                new
                {
                    p_AcademicYearId = q.AcademicYearId,
                    p_BoardId = q.BoardId,
                    p_AcademicLevel = q.AcademicLevel,
                    p_GroupId = q.GroupId,
                    p_ProgramId = q.ProgramId,
                    p_Section = q.Section,
                    p_Medium = q.Medium,
                    p_TargetAcademicYearId = q.TargetAcademicYearId,
                    p_TargetAcademicLevel = q.TargetAcademicLevel,
                    p_TargetGroupId = q.TargetGroupId,
                    p_TargetSection = q.TargetSection,
                    p_TargetMedium = q.TargetMedium,
                    p_Search = q.Search,
                    p_EligibilityStatus = q.EligibilityStatus,
                    p_CampusId = q.CampusId
                },
                commandType: CommandType.StoredProcedure);
        }

        // ============================================================
        // 2. PREVIEW
        // ============================================================
        public async Task<PromotionPreviewResponse> PreviewAsync(
            PromotionPreviewRequest request)
        {
            var students = await GetEligibleStudentsAsync(
                new PromotionEligibilityQuery
                {
                    AcademicYearId = request.SourceAcademicYearId,
                    BoardId = request.SourceBoardId,
                    AcademicLevel = request.SourceAcademicLevel,
                    GroupId = request.SourceGroupId,
                    Section = request.SourceSection,
                    Medium = request.SourceMedium,

                    TargetAcademicYearId = request.TargetAcademicYearId,
                    TargetBoardId = request.TargetBoardId,
                    TargetAcademicLevel = request.TargetAcademicLevel,
                    TargetGroupId = request.TargetGroupId,
                    TargetSection = request.TargetSection,
                    TargetMedium = request.TargetMedium
                });

            var byId = students.ToDictionary(x => x.StudentId);

            var response = new PromotionPreviewResponse
            {
                TotalSelected = request.StudentIds.Distinct().Count()
            };

            foreach (var studentId in request.StudentIds.Distinct())
            {
                if (byId.TryGetValue(studentId, out var student))
                {
                    response.Students.Add(
                        new PromotionPreviewStudentDto
                        {
                            StudentId = studentId,
                            StudentName = student.StudentName,
                            EligibilityStatus = student.EligibilityStatus,
                            EligibilityReason = student.EligibilityReason
                        });
                }
                else
                {
                    response.Students.Add(
                        new PromotionPreviewStudentDto
                        {
                            StudentId = studentId,
                            StudentName = string.Empty,
                            EligibilityStatus = "Not Eligible",
                            EligibilityReason =
                                "Student is not available in the selected source cohort or already has an active promotion."
                        });
                }
            }

            response.EligibleCount =
                response.Students.Count(x =>
                    x.EligibilityStatus.Equals(
                        "Eligible",
                        StringComparison.OrdinalIgnoreCase));

            response.NotEligibleCount =
                response.Students.Count - response.EligibleCount;

            return response;
        }

        // ============================================================
        // 3. EXECUTE PROMOTION
        // ============================================================
        public async Task<PromotionExecutionResponse> PromoteStudentsAsync(
            PromoteStudentsRequest request,
            string performedBy = "System")
        {
            await OpenAsync();

            var preview = await PreviewAsync(
                new PromotionPreviewRequest
                {
                    SourceAcademicYearId = request.SourceAcademicYearId,
                    SourceBoardId = request.SourceBoardId,
                    SourceAcademicLevel = request.SourceAcademicLevel,
                    SourceGroupId = request.SourceGroupId,
                    SourceSection = request.SourceSection,
                    SourceMedium = request.SourceMedium,

                    TargetAcademicYearId = request.TargetAcademicYearId,
                    TargetBoardId = request.TargetBoardId,
                    TargetAcademicLevel = request.TargetAcademicLevel,
                    TargetGroupId = request.TargetGroupId,
                    TargetSection = request.TargetSection,
                    TargetMedium = request.TargetMedium,

                    StudentIds = request.StudentIds
                });

            var response = new PromotionExecutionResponse
            {
                PromotionBatchId = Guid.NewGuid().ToString("N"),
                TotalRequested = request.StudentIds.Distinct().Count()
            };

            foreach (var item in preview.Students)
            {
                response.Students.Add(
                    new PromotionExecutionStudentDto
                    {
                        StudentId = item.StudentId,
                        StudentName = item.StudentName,
                        PromotionStatus =
                            item.EligibilityStatus.Equals(
                                "Eligible",
                                StringComparison.OrdinalIgnoreCase)
                                ? "Promoted"
                                : "Failed",
                        Message = item.EligibilityReason
                    });
            }

            var eligibleIds = preview.Students
                .Where(x =>
                    x.EligibilityStatus.Equals(
                        "Eligible",
                        StringComparison.OrdinalIgnoreCase))
                .Select(x => x.StudentId)
                .Distinct()
                .ToList();

            if (eligibleIds.Count == 0)
            {
                response.FailedCount = response.TotalRequested;
                return response;
            }

            using var transaction = Connection.BeginTransaction();

            try
            {
                int? targetAcademicLevelId = request.TargetAcademicLevelId;
                int? targetSectionId = request.TargetSectionId;

                foreach (var studentId in eligibleIds)
                {
                    var student = await Connection.QuerySingleOrDefaultAsync<dynamic>(
                        "sp_GetStudentById",
                        new { p_StudentId = studentId },
                        transaction,
                        commandType: CommandType.StoredProcedure);

                    if (student == null)
                    {
                        continue;
                    }

                    await Connection.ExecuteAsync(
                        "sp_PromoteSingleStudent",
                        new
                        {
                            p_StudentId = studentId,
                            p_PromotionBatchId = response.PromotionBatchId,
                            p_FromBoardId = student.BoardId != null ? (int?)student.BoardId : null,
                            p_ToBoardId = request.TargetBoardId,
                            p_FromAcademicYearId = (int)student.AcademicYearId,
                            p_ToAcademicYearId = request.TargetAcademicYearId,
                            p_FromClassId = student.AcademicLevelId != null ? (int?)student.AcademicLevelId : null,
                            p_ToClassId = targetAcademicLevelId,
                            p_FromSectionId = student.SectionId != null ? (int?)student.SectionId : null,
                            p_ToSectionId = targetSectionId,
                            p_FromGroupId = (int)student.GroupId,
                            p_ToGroupId = request.TargetGroupId,
                            p_FromAcademicLevel = (string)student.AcademicLevelName,
                            p_ToAcademicLevel = request.TargetAcademicLevel,
                            p_FromSection = (string)student.SectionName,
                            p_ToSection = request.TargetSection,
                            p_PromotedBy = string.IsNullOrWhiteSpace(performedBy) ? "System" : performedBy,
                            p_TargetMedium = request.TargetMedium
                        },
                        transaction,
                        commandType: CommandType.StoredProcedure);
                }

                transaction.Commit();

                response.PromotedCount = eligibleIds.Count;
                response.FailedCount = response.TotalRequested - response.PromotedCount;

                return response;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        // ============================================================
        // 4. PROMOTION HISTORY
        // ============================================================
        public async Task<IEnumerable<PromotionHistoryDto>> GetHistoryAsync(
            PromotionHistoryQuery q)
        {
            await OpenAsync();

            return await Connection.QueryAsync<PromotionHistoryDto>(
                "sp_GetPromotionHistory",
                new
                {
                    p_AcademicYearId = q.AcademicYearId,
                    p_TargetAcademicYearId = q.TargetAcademicYearId,
                    p_AcademicLevel = q.AcademicLevel,
                    p_TargetAcademicLevel = q.TargetAcademicLevel,
                    p_GroupId = q.GroupId,
                    p_Section = q.Section,
                    p_StudentId = q.StudentId,
                    p_Search = q.Search,
                    p_PromotionStatus = q.PromotionStatus,
                    p_FromDate = q.FromDate,
                    p_ToDate = q.ToDate
                },
                commandType: CommandType.StoredProcedure);
        }

        // ============================================================
        // 5. ROLLBACK
        // ============================================================
        public async Task<RollbackResponse> RollbackAsync(
            RollbackPromotionRequest request,
            string performedBy = "System")
        {
            await OpenAsync();

            using var transaction = Connection.BeginTransaction();

            try
            {
                var history = (await Connection.QueryAsync<PromotionHistoryDto>(
                    "sp_GetPromotionHistory",
                    new
                    {
                        p_AcademicYearId = (int?)null,
                        p_TargetAcademicYearId = (int?)null,
                        p_AcademicLevel = (string?)null,
                        p_TargetAcademicLevel = (string?)null,
                        p_GroupId = (int?)null,
                        p_Section = (string?)null,
                        p_StudentId = (int?)null,
                        p_Search = (string?)null,
                        p_PromotionStatus = (string?)null,
                        p_FromDate = (DateTime?)null,
                        p_ToDate = (DateTime?)null
                    },
                    transaction,
                    commandType: CommandType.StoredProcedure))
                    .FirstOrDefault(x => x.PromotionId == request.PromotionId);

                if (history == null)
                {
                    throw new InvalidOperationException("Promotion was not found.");
                }

                if (history.RollbackStatus)
                {
                    throw new InvalidOperationException("Promotion has already been rolled back.");
                }

                await Connection.ExecuteAsync(
                    "sp_RollbackPromotionRecord",
                    new
                    {
                        p_PromotionId = request.PromotionId,
                        p_RollbackBy = string.IsNullOrWhiteSpace(performedBy) ? "System" : performedBy,
                        p_Reason = request.Reason
                    },
                    transaction,
                    commandType: CommandType.StoredProcedure);

                transaction.Commit();

                return new RollbackResponse
                {
                    PromotionId = request.PromotionId,
                    StudentId = history.StudentId,
                    StudentName = history.StudentName,
                    RollbackStatus = "RolledBack",
                    RollbackReason = request.Reason,
                    RolledBackAt = DateTime.UtcNow,
                    RolledBackBy = string.IsNullOrWhiteSpace(performedBy) ? "System" : performedBy
                };
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        // ============================================================
        // 6. PROMOTE SINGLE STUDENT
        // ============================================================
        public async Task<PromotionHistoryDto?> PromoteSingleStudentAsync(
            int studentId,
            PromoteSingleStudentRequest request,
            string performedBy = "System")
        {
            await OpenAsync();

            var student = await Connection.QuerySingleOrDefaultAsync<dynamic>(
                "sp_GetStudentById",
                new { p_StudentId = studentId },
                commandType: CommandType.StoredProcedure);

            if (student == null)
            {
                return null;
            }

            int sourceYearId = student.AcademicYearId != null ? Convert.ToInt32(student.AcademicYearId) : 1;
            int sourceGroupId = student.GroupId != null ? Convert.ToInt32(student.GroupId) : 1;
            string sourceLevel = student.AcademicLevelName != null ? Convert.ToString(student.AcademicLevelName) : "Junior Inter";
            string sourceSection = student.SectionName != null ? Convert.ToString(student.SectionName) : "A";

            var preview = await PreviewAsync(
                new PromotionPreviewRequest
                {
                    SourceAcademicYearId = sourceYearId,
                    SourceBoardId = student.BoardId != null ? Convert.ToInt32(student.BoardId) : (int?)null,
                    SourceAcademicLevel = sourceLevel,
                    SourceGroupId = sourceGroupId,
                    SourceSection = sourceSection,
                    SourceMedium = student.Medium != null ? Convert.ToString(student.Medium) : (string?)null,
                    TargetAcademicYearId = request.TargetAcademicYearId,
                    TargetBoardId = request.TargetBoardId,
                    TargetAcademicLevel = request.TargetAcademicLevel,
                    TargetGroupId = request.TargetGroupId,
                    TargetSection = request.TargetSection,
                    TargetMedium = request.TargetMedium,
                    StudentIds = new List<int> { studentId }
                });

            if (preview.EligibleCount == 0)
            {
                var reason = preview.Students.FirstOrDefault()?.EligibilityReason ?? "Student is not eligible for promotion.";
                throw new CollegeManagement.API.Exceptions.ValidationException(reason);
            }

            await PromoteStudentsAsync(
                new PromoteStudentsRequest
                {
                    StudentIds = new List<int> { studentId },
                    SourceAcademicYearId = sourceYearId,
                    SourceBoardId = student.BoardId != null ? Convert.ToInt32(student.BoardId) : (int?)null,
                    SourceAcademicLevel = sourceLevel,
                    SourceGroupId = sourceGroupId,
                    SourceSection = sourceSection,
                    SourceMedium = student.Medium != null ? Convert.ToString(student.Medium) : (string?)null,
                    TargetAcademicYearId = request.TargetAcademicYearId,
                    TargetBoardId = request.TargetBoardId,
                    TargetAcademicLevel = request.TargetAcademicLevel,
                    TargetGroupId = request.TargetGroupId,
                    TargetSection = request.TargetSection,
                    TargetMedium = request.TargetMedium
                },
                performedBy);

            return (await GetHistoryAsync(
                new PromotionHistoryQuery
                {
                    StudentId = studentId
                })).FirstOrDefault();
        }

        // ============================================================
        // 7. GROUP ALLOCATION
        // ============================================================
        public async Task<AllocationResponse> AllocateGroupAsync(
            GroupAllocationRequest request)
        {
            await OpenAsync();

            var response = new AllocationResponse();
            var ids = request.StudentIds.Distinct().ToList();
            if (ids.Count > 0)
            {
                try
                {
                    var json = JsonSerializer.Serialize(ids);
                    await Connection.ExecuteAsync(
                        "sp_AllocateStudentGroup",
                        new
                        {
                            p_StudentIdsJson = json,
                            p_TargetAcademicYearId = request.TargetAcademicYearId,
                            p_TargetAcademicLevelId = request.TargetAcademicLevelId,
                            p_TargetGroupId = request.TargetGroupId
                        },
                        commandType: CommandType.StoredProcedure);

                    response.UpdatedCount = ids.Count;
                    foreach (var id in ids)
                    {
                        response.Students.Add(new AllocationStudentDto
                        {
                            StudentId = id,
                            Status = "Updated",
                            Message = "Group allocated successfully."
                        });
                    }
                }
                catch (Exception ex)
                {
                    response.FailedCount = ids.Count;
                    foreach (var id in ids)
                    {
                        response.Students.Add(new AllocationStudentDto
                        {
                            StudentId = id,
                            Status = "Failed",
                            Message = ex.Message
                        });
                    }
                }
            }

            return response;
        }

        // ============================================================
        // 7b. PROGRAM ALLOCATION
        // ============================================================
        public async Task<AllocationResponse> AllocateProgramAsync(
            ProgramAllocationRequest request)
        {
            await OpenAsync();

            var response = new AllocationResponse();
            var ids = request.StudentIds.Distinct().ToList();
            if (ids.Count > 0)
            {
                try
                {
                    var json = JsonSerializer.Serialize(ids);
                    await Connection.ExecuteAsync(
                        "sp_AllocateStudentProgram",
                        new
                        {
                            p_StudentIdsJson = json,
                            p_TargetAcademicYearId = request.TargetAcademicYearId,
                            p_TargetAcademicLevelId = request.TargetAcademicLevelId,
                            p_TargetGroupId = request.TargetGroupId,
                            p_TargetProgramId = request.TargetProgramId
                        },
                        commandType: CommandType.StoredProcedure);

                    response.UpdatedCount = ids.Count;
                    foreach (var id in ids)
                    {
                        response.Students.Add(new AllocationStudentDto
                        {
                            StudentId = id,
                            Status = "Updated",
                            Message = "Program allocated successfully."
                        });
                    }
                }
                catch (Exception ex)
                {
                    response.FailedCount = ids.Count;
                    foreach (var id in ids)
                    {
                        response.Students.Add(new AllocationStudentDto
                        {
                            StudentId = id,
                            Status = "Failed",
                            Message = ex.Message
                        });
                    }
                }
            }

            return response;
        }

        // ============================================================
        // 8. SECTION ALLOCATION
        // ============================================================
        public async Task<AllocationResponse> AllocateSectionAsync(
            SectionAllocationRequest request)
        {
            await OpenAsync();

            var response = new AllocationResponse();
            var ids = request.StudentIds.Distinct().ToList();
            if (ids.Count > 0)
            {
                try
                {
                    var json = JsonSerializer.Serialize(ids);
                    await Connection.ExecuteAsync(
                        "sp_AllocateStudentSection",
                        new
                        {
                            p_StudentIdsJson = json,
                            p_TargetAcademicYearId = request.TargetAcademicYearId,
                            p_TargetAcademicLevelId = request.TargetAcademicLevelId,
                            p_TargetGroupId = request.TargetGroupId,
                            p_TargetSectionId = request.TargetSectionId
                        },
                        commandType: CommandType.StoredProcedure);

                    response.UpdatedCount = ids.Count;
                    foreach (var id in ids)
                    {
                        response.Students.Add(new AllocationStudentDto
                        {
                            StudentId = id,
                            Status = "Updated",
                            Message = "Section allocated successfully."
                        });
                    }
                }
                catch (Exception ex)
                {
                    response.FailedCount = ids.Count;
                    foreach (var id in ids)
                    {
                        response.Students.Add(new AllocationStudentDto
                        {
                            StudentId = id,
                            Status = "Failed",
                            Message = ex.Message
                        });
                    }
                }
            }

            return response;
        }

        // ============================================================
        // 9. PROMOTION REPORT
        // ============================================================
        public async Task<PromotionReportResponse> GetPromotionReportAsync(
            PromotionReportQuery q)
        {
            await OpenAsync();

            var historyItems = await Connection.QueryAsync<PromotionHistoryDto>(
                "sp_GetPromotionHistory",
                new
                {
                    p_AcademicYearId = q.AcademicYearId,
                    p_TargetAcademicYearId = q.TargetAcademicYearId,
                    p_AcademicLevel = q.AcademicLevel,
                    p_TargetAcademicLevel = q.TargetAcademicLevel,
                    p_GroupId = q.GroupId,
                    p_Section = q.Section,
                    p_StudentId = (int?)null,
                    p_Search = (string?)null,
                    p_PromotionStatus = q.PromotionStatus,
                    p_FromDate = (DateTime?)null,
                    p_ToDate = (DateTime?)null
                },
                commandType: CommandType.StoredProcedure);

            if (q.CampusId.HasValue) { var validStudents = await _context.Students.Where(s => s.CampusId == q.CampusId.Value).Select(s => s.StudentId).ToListAsync(); historyItems = historyItems.Where(x => validStudents.Contains(x.StudentId)).ToList(); } var details = historyItems.Select(x => new PromotionReportDetailDto
            {
                PromotionId = x.PromotionId,
                StudentId = x.StudentId,
                AdmissionNo = x.AdmissionNo,
                StudentName = x.StudentName,
                SourceAcademicYear = x.SourceAcademicYear,
                SourceLevel = x.SourceAcademicLevel,
                TargetAcademicYear = x.TargetAcademicYear,
                TargetLevel = x.TargetAcademicLevel,
                SourceGroup = x.SourceGroup,
                TargetGroup = x.TargetGroup,
                SourceSection = x.SourceSection,
                TargetSection = x.TargetSection,
                EligibilityStatus = x.RollbackStatus ? "Not Eligible" : "Eligible",
                PromotionStatus = x.PromotionStatus,
                PromotionDate = x.PromotionDate
            }).ToList();

            return new PromotionReportResponse
            {
                TotalStudents = details.Count,
                EligibleStudents = details.Count(x => x.EligibilityStatus.Equals("Eligible", StringComparison.OrdinalIgnoreCase)),
                NotEligibleStudents = details.Count(x => x.EligibilityStatus.Equals("Not Eligible", StringComparison.OrdinalIgnoreCase)),
                PromotedStudents = details.Count(x => x.PromotionStatus.Equals("Promoted", StringComparison.OrdinalIgnoreCase)),
                NotPromotedStudents = details.Count(x => !x.PromotionStatus.Equals("Promoted", StringComparison.OrdinalIgnoreCase)),
                RolledBackStudents = details.Count(x => x.PromotionStatus.Equals("RolledBack", StringComparison.OrdinalIgnoreCase)),
                Details = details
            };
        }
    }
}
