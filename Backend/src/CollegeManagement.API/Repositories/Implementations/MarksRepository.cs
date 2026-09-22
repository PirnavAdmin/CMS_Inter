using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Evaluations;
using CollegeManagement.API.DTOs.Marks;
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

        private IDbConnection Connection => _context.Database.GetDbConnection();

        // =========================================================================
        // BASIC CRUD & RETRIEVAL OPERATIONS (100% STORED PROCEDURES)
        // =========================================================================

        public async Task<IEnumerable<Mark>> GetAllAsync()
        {
            var rows = await Connection.QueryAsync(
                "sp_GetAllMarks",
                commandType: CommandType.StoredProcedure);

            var list = new List<Mark>();
            foreach (var r in rows) list.Add(MapMarkFromRow(r));
            return list;
        }

        public async Task<Mark?> GetByIdAsync(int id)
        {
            var row = await Connection.QueryFirstOrDefaultAsync(
                "sp_GetMarkById",
                new { p_MarkId = id },
                commandType: CommandType.StoredProcedure);

            return row != null ? MapMarkFromRow(row) : null;
        }

        public async Task<Mark?> GetByExamSubjectStudentAsync(int examinationId, int subjectId, int studentId)
        {
            var row = await Connection.QueryFirstOrDefaultAsync(
                "sp_GetMarkByExamSubjectStudent",
                new
                {
                    p_ExaminationId = examinationId,
                    p_SubjectId = subjectId,
                    p_StudentId = studentId
                },
                commandType: CommandType.StoredProcedure);

            return row != null ? MapMarkFromRow(row) : null;
        }

        public async Task<IEnumerable<Mark>> GetByStudentIdAsync(int studentId)
        {
            return await GetByStudentAsync(studentId);
        }

        public async Task<IEnumerable<Mark>> GetByStudentAsync(int studentId)
        {
            var rows = await Connection.QueryAsync(
                "sp_GetMarksByStudent",
                new { p_StudentId = studentId },
                commandType: CommandType.StoredProcedure);

            var list = new List<Mark>();
            foreach (var r in rows) list.Add(MapMarkFromRow(r));
            return list;
        }

        public async Task<IEnumerable<Mark>> GetBySubjectAsync(int subjectId)
        {
            var rows = await Connection.QueryAsync(
                "sp_GetMarksBySubject",
                new { p_SubjectId = subjectId },
                commandType: CommandType.StoredProcedure);

            var list = new List<Mark>();
            foreach (var r in rows) list.Add(MapMarkFromRow(r));
            return list;
        }

        public async Task<IEnumerable<Mark>> GetByExamIdAsync(int examinationId)
        {
            return await GetByExamAsync(examinationId);
        }

        public async Task<IEnumerable<Mark>> GetByExamAsync(int examinationId)
        {
            var rows = await Connection.QueryAsync(
                "sp_GetMarksByExam",
                new { p_ExaminationId = examinationId },
                commandType: CommandType.StoredProcedure);

            var list = new List<Mark>();
            foreach (var r in rows) list.Add(MapMarkFromRow(r));
            return list;
        }

        public async Task AddAsync(Mark mark)
        {
            await CreateAsync(mark);
        }

        public async Task<Mark> CreateAsync(Mark mark)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_Board", mark.Board ?? string.Empty);
            parameters.Add("p_BoardId", mark.BoardId);
            parameters.Add("p_AcademicYearId", mark.AcademicYearId);
            parameters.Add("p_AcademicLevel", mark.AcademicLevel ?? string.Empty);
            parameters.Add("p_AcademicLevelId", mark.AcademicLevelId);
            parameters.Add("p_GroupId", mark.GroupId);
            parameters.Add("p_SectionId", mark.SectionId);
            parameters.Add("p_ExaminationId", mark.ExaminationId);
            parameters.Add("p_SubjectId", mark.SubjectId);
            parameters.Add("p_StudentId", mark.StudentId);
            parameters.Add("p_FacultyId", mark.FacultyId);
            parameters.Add("p_RollNo", mark.RollNo ?? string.Empty);
            parameters.Add("p_StudentName", mark.StudentName ?? string.Empty);
            parameters.Add("p_InternalMarks", mark.InternalMarks);
            parameters.Add("p_PracticalMarks", mark.PracticalMarks);
            parameters.Add("p_TheoryMarks", mark.TheoryMarks);
            parameters.Add("p_TotalMarks", mark.TotalMarks);
            parameters.Add("p_PassingMarks", mark.PassingMarks > 0 ? mark.PassingMarks : 35);
            parameters.Add("p_IsAbsent", mark.IsAbsent ? 1 : 0);
            parameters.Add("p_Remarks", mark.Remarks);
            parameters.Add("p_Status", (int)mark.Status);

            var createdRow = await Connection.QueryFirstOrDefaultAsync(
                "sp_AddMark",
                parameters,
                commandType: CommandType.StoredProcedure);

            return createdRow != null ? MapMarkFromRow(createdRow) : mark;
        }

        public async Task AddRangeAsync(IEnumerable<Mark> marks)
        {
            foreach (var mark in marks)
            {
                await CreateAsync(mark);
            }
        }

        public async Task<Mark> UpdateAsync(Mark mark)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_MarkId", mark.MarkId);
            parameters.Add("p_InternalMarks", mark.InternalMarks);
            parameters.Add("p_PracticalMarks", mark.PracticalMarks);
            parameters.Add("p_TheoryMarks", mark.TheoryMarks);
            parameters.Add("p_TotalMarks", mark.TotalMarks);
            parameters.Add("p_PassingMarks", mark.PassingMarks > 0 ? mark.PassingMarks : 35);
            parameters.Add("p_IsAbsent", mark.IsAbsent ? 1 : 0);
            parameters.Add("p_Remarks", mark.Remarks);
            parameters.Add("p_FacultyId", mark.FacultyId);
            parameters.Add("p_Status", (int)mark.Status);

            var updatedRow = await Connection.QueryFirstOrDefaultAsync(
                "sp_UpdateMark",
                parameters,
                commandType: CommandType.StoredProcedure);

            return updatedRow != null ? MapMarkFromRow(updatedRow) : mark;
        }

        public async Task<Mark> UpdateAsync(Mark mark, int userId)
        {
            return await UpdateAsync(mark);
        }

        public async Task<Mark> UpdateAsync(int id, Mark mark)
        {
            mark.MarkId = id;
            return await UpdateAsync(mark);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var affected = await Connection.ExecuteScalarAsync<int>(
                "sp_DeleteMark",
                new { p_MarkId = id },
                commandType: CommandType.StoredProcedure);

            return affected > 0;
        }

        public async Task<bool> RestoreAsync(int id)
        {
            var affected = await Connection.ExecuteScalarAsync<int>(
                "sp_RestoreMark",
                new { p_MarkId = id },
                commandType: CommandType.StoredProcedure);

            return affected > 0;
        }

        public async Task<int> VerifyMarksAsync(int examinationId, string verifiedBy)
        {
            return await VerifyMarksAsync(examinationId, null, null, verifiedBy);
        }

        public async Task<int> VerifyMarksAsync(int examinationId, int? subjectId, int? sectionId, string verifiedBy)
        {
            return await Connection.ExecuteScalarAsync<int>(
                "sp_VerifyMarks",
                new
                {
                    p_ExaminationId = examinationId,
                    p_SubjectId = subjectId ?? 0,
                    p_SectionId = sectionId ?? 0,
                    p_VerifiedBy = verifiedBy
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> PublishMarksAsync(int examinationId)
        {
            return await PublishMarksAsync(examinationId, null, null);
        }

        public async Task<int> PublishMarksAsync(int examinationId, int? subjectId, int? sectionId)
        {
            return await Connection.ExecuteScalarAsync<int>(
                "sp_PublishMarks",
                new
                {
                    p_ExaminationId = examinationId,
                    p_SubjectId = subjectId ?? 0,
                    p_SectionId = sectionId ?? 0
                },
                commandType: CommandType.StoredProcedure);
        }

        public Task<bool> SaveChangesAsync()
        {
            return Task.FromResult(true);
        }

        // =========================================================================
        // 3-TIER ADMIN EVALUATION & GOVERNANCE OPERATIONS (100% STORED PROCEDURES)
        // =========================================================================

        public async Task<IEnumerable<Mark>> GetFilteredEvaluationsAsync(EvaluationFilterDto filter)
        {
            int pageNumber = filter.PageNumber <= 0 ? 1 : filter.PageNumber;
            int pageSize = filter.PageSize <= 0 ? 10000 : filter.PageSize;
            int offset = (pageNumber - 1) * pageSize;

            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", filter.BoardId ?? 0);
            parameters.Add("p_AcademicYearId", filter.AcademicYearId ?? 0);
            parameters.Add("p_AcademicLevelId", filter.AcademicLevelId ?? 0);
            parameters.Add("p_GroupId", filter.GroupId ?? 0);
            parameters.Add("p_SectionId", filter.SectionId ?? 0);
            parameters.Add("p_ExaminationId", filter.ExaminationId ?? 0);
            parameters.Add("p_SubjectId", filter.SubjectId ?? 0);
            parameters.Add("p_StudentId", filter.StudentId ?? 0);
            parameters.Add("p_FacultyId", filter.FacultyId ?? 0);
            parameters.Add("p_Status", filter.Status.HasValue ? (int)filter.Status.Value : 0);
            parameters.Add("p_Offset", offset);
            parameters.Add("p_Limit", pageSize);

            var rows = await Connection.QueryAsync(
                "sp_GetFilteredEvaluations",
                parameters,
                commandType: CommandType.StoredProcedure);

            var list = new List<Mark>();
            foreach (var r in rows) list.Add(MapMarkFromRow(r));
            return list;
        }

        public async Task<int> GetFilteredEvaluationsCountAsync(EvaluationFilterDto filter)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_BoardId", filter.BoardId ?? 0);
            parameters.Add("p_AcademicYearId", filter.AcademicYearId ?? 0);
            parameters.Add("p_AcademicLevelId", filter.AcademicLevelId ?? 0);
            parameters.Add("p_GroupId", filter.GroupId ?? 0);
            parameters.Add("p_SectionId", filter.SectionId ?? 0);
            parameters.Add("p_ExaminationId", filter.ExaminationId ?? 0);
            parameters.Add("p_SubjectId", filter.SubjectId ?? 0);
            parameters.Add("p_StudentId", filter.StudentId ?? 0);
            parameters.Add("p_FacultyId", filter.FacultyId ?? 0);
            parameters.Add("p_Status", filter.Status.HasValue ? (int)filter.Status.Value : 0);

            return await Connection.ExecuteScalarAsync<int>(
                "sp_GetFilteredEvaluationsCount",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<Mark>> GetEvaluationMarksListAsync(int subjectId, int sectionId, int examinationId)
        {
            var rows = await Connection.QueryAsync(
                "sp_GetEvaluationMarksList",
                new
                {
                    p_SubjectId = subjectId,
                    p_SectionId = sectionId,
                    p_ExaminationId = examinationId
                },
                commandType: CommandType.StoredProcedure);

            var list = new List<Mark>();
            foreach (var r in rows) list.Add(MapMarkFromRow(r));
            return list;
        }

        public async Task<bool> UpdateEvaluationStatusAsync(int subjectId, int sectionId, int examinationId, EvaluationStatus targetStatus, int userId, string? remarks = null)
        {
            var affected = await Connection.ExecuteScalarAsync<int>(
                "sp_UpdateEvaluationStatus",
                new
                {
                    p_SubjectId = subjectId,
                    p_SectionId = sectionId,
                    p_ExaminationId = examinationId,
                    p_TargetStatus = (int)targetStatus,
                    p_UserId = userId,
                    p_Remarks = remarks
                },
                commandType: CommandType.StoredProcedure);

            return affected > 0;
        }

        public async Task<bool> ToggleEvaluationLockAsync(int subjectId, int sectionId, int examinationId, bool isLocked)
        {
            var affected = await Connection.ExecuteScalarAsync<int>(
                "sp_ToggleEvaluationLock",
                new
                {
                    p_SubjectId = subjectId,
                    p_SectionId = sectionId,
                    p_ExaminationId = examinationId,
                    p_IsLocked = isLocked ? 1 : 0
                },
                commandType: CommandType.StoredProcedure);

            return affected > 0;
        }

        public async Task<IEnumerable<Mark>> GetSubjectStudentMarksAsync(int subjectId, int? sectionId, int? examinationId)
        {
            return await GetEvaluationMarksListAsync(subjectId, sectionId ?? 0, examinationId ?? 0);
        }

        public async Task<bool> ExecuteGlobalApprovalAsync(GlobalApprovalRequestDto dto, int userId)
        {
            var affected = await Connection.ExecuteScalarAsync<int>(
                "sp_ExecuteGlobalApproval",
                new
                {
                    p_BoardId = dto.BoardId ?? 0,
                    p_AcademicYearId = dto.AcademicYearId,
                    p_AcademicLevelId = dto.AcademicLevelId ?? 0,
                    p_GroupId = dto.GroupId,
                    p_SectionId = dto.SectionId ?? 0,
                    p_ExaminationId = dto.ExaminationId,
                    p_UserId = userId > 0 ? userId : dto.ApprovedBy
                },
                commandType: CommandType.StoredProcedure);

            return affected > 0;
        }

        public async Task<bool> UpdateStudentMarksAsync(int subjectId, int sectionId, int examinationId, List<StudentMarkUpdateItemDto> updates, int userId)
        {
            if (updates == null || !updates.Any()) return false;

            var existingMarks = (await GetEvaluationMarksListAsync(subjectId, sectionId, examinationId)).ToList();
            if (!existingMarks.Any()) return false;

            bool anyUpdated = false;
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
                    int internalMarks = update.Internal.HasValue ? (int)update.Internal.Value : target.InternalMarks;
                    int practicalMarks = update.Practical.HasValue ? (int)update.Practical.Value : target.PracticalMarks;
                    int theoryMarks = update.Theory.HasValue ? (int)update.Theory.Value : target.TheoryMarks;
                    bool isAbsent = update.IsAbsent ?? target.IsAbsent;
                    string? remarks = update.Remarks ?? target.Remarks;

                    var parameters = new DynamicParameters();
                    parameters.Add("p_MarkId", target.MarkId);
                    parameters.Add("p_InternalMarks", internalMarks);
                    parameters.Add("p_PracticalMarks", practicalMarks);
                    parameters.Add("p_TheoryMarks", theoryMarks);
                    parameters.Add("p_TotalMarks", isAbsent ? 0 : (internalMarks + practicalMarks + theoryMarks));
                    parameters.Add("p_PassingMarks", target.PassingMarks);
                    parameters.Add("p_IsAbsent", isAbsent ? 1 : 0);
                    parameters.Add("p_Remarks", remarks);
                    parameters.Add("p_FacultyId", target.FacultyId);
                    parameters.Add("p_Status", (int)EvaluationStatus.SUBMITTED);

                    await Connection.QueryFirstOrDefaultAsync(
                        "sp_UpdateMark",
                        parameters,
                        commandType: CommandType.StoredProcedure);

                    anyUpdated = true;
                }
            }

            return anyUpdated;
        }

        public async Task<IEnumerable<dynamic>> GetGroupSectionsAsync(int groupId)
        {
            return await Connection.QueryAsync(
                "sp_GetActiveSectionsByGroup",
                new { p_GroupId = groupId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<dynamic>> GetGroupSubjectsAsync(int groupId)
        {
            return await Connection.QueryAsync(
                "sp_GetActiveSubjectsByGroup",
                new { p_GroupId = groupId },
                commandType: CommandType.StoredProcedure);
        }

        // =========================================================================
        // ROW MAPPER (CLEAN, 0-OVERHEAD IN-MEMORY ENTITY HYDRATION)
        // =========================================================================

        private static Mark MapMarkFromRow(dynamic r)
        {
            var dict = (IDictionary<string, object>)r;

            int markId = dict.ContainsKey("MarkId") && dict["MarkId"] != null ? Convert.ToInt32(dict["MarkId"]) : 0;
            int? boardId = dict.ContainsKey("BoardId") && dict["BoardId"] != null ? Convert.ToInt32(dict["BoardId"]) : null;
            string? board = dict.ContainsKey("Board") && dict["Board"] != null ? dict["Board"].ToString() : (dict.ContainsKey("BoardName") && dict["BoardName"] != null ? dict["BoardName"].ToString() : null);
            int academicYearId = dict.ContainsKey("AcademicYearId") && dict["AcademicYearId"] != null ? Convert.ToInt32(dict["AcademicYearId"]) : 1;
            string? academicLevel = dict.ContainsKey("AcademicLevel") && dict["AcademicLevel"] != null ? dict["AcademicLevel"].ToString() : (dict.ContainsKey("LevelName") && dict["LevelName"] != null ? dict["LevelName"].ToString() : null);
            int? academicLevelId = dict.ContainsKey("AcademicLevelId") && dict["AcademicLevelId"] != null ? Convert.ToInt32(dict["AcademicLevelId"]) : null;
            int groupId = dict.ContainsKey("GroupId") && dict["GroupId"] != null ? Convert.ToInt32(dict["GroupId"]) : 1;
            int sectionId = dict.ContainsKey("SectionId") && dict["SectionId"] != null ? Convert.ToInt32(dict["SectionId"]) : 1;
            int examinationId = dict.ContainsKey("ExaminationId") && dict["ExaminationId"] != null ? Convert.ToInt32(dict["ExaminationId"]) : 0;
            int subjectId = dict.ContainsKey("SubjectId") && dict["SubjectId"] != null ? Convert.ToInt32(dict["SubjectId"]) : 0;
            int studentId = dict.ContainsKey("StudentId") && dict["StudentId"] != null ? Convert.ToInt32(dict["StudentId"]) : 0;
            string? rollNo = dict.ContainsKey("RollNo") && dict["RollNo"] != null ? dict["RollNo"].ToString() : (dict.ContainsKey("FullRollNo") && dict["FullRollNo"] != null ? dict["FullRollNo"].ToString() : null);
            string? studentName = dict.ContainsKey("StudentName") && dict["StudentName"] != null ? dict["StudentName"].ToString() : (dict.ContainsKey("FullStudentName") && dict["FullStudentName"] != null ? dict["FullStudentName"].ToString() : null);
            int? facultyId = dict.ContainsKey("FacultyId") && dict["FacultyId"] != null ? Convert.ToInt32(dict["FacultyId"]) : null;
            int internalMarks = dict.ContainsKey("InternalMarks") && dict["InternalMarks"] != null ? Convert.ToInt32(dict["InternalMarks"]) : 0;
            int practicalMarks = dict.ContainsKey("PracticalMarks") && dict["PracticalMarks"] != null ? Convert.ToInt32(dict["PracticalMarks"]) : 0;
            int theoryMarks = dict.ContainsKey("TheoryMarks") && dict["TheoryMarks"] != null ? Convert.ToInt32(dict["TheoryMarks"]) : 0;
            int totalMarks = dict.ContainsKey("TotalMarks") && dict["TotalMarks"] != null ? Convert.ToInt32(dict["TotalMarks"]) : 0;
            int passingMarks = dict.ContainsKey("PassingMarks") && dict["PassingMarks"] != null ? Convert.ToInt32(dict["PassingMarks"]) : 35;
            bool isAbsent = dict.ContainsKey("IsAbsent") && dict["IsAbsent"] != null && (Convert.ToInt32(dict["IsAbsent"]) == 1 || Convert.ToBoolean(dict["IsAbsent"]));
            string? remarks = dict.ContainsKey("Remarks") && dict["Remarks"] != null ? dict["Remarks"].ToString() : null;
            bool isVerified = dict.ContainsKey("IsVerified") && dict["IsVerified"] != null && (Convert.ToInt32(dict["IsVerified"]) == 1 || Convert.ToBoolean(dict["IsVerified"]));
            bool isPublished = dict.ContainsKey("IsPublished") && dict["IsPublished"] != null && (Convert.ToInt32(dict["IsPublished"]) == 1 || Convert.ToBoolean(dict["IsPublished"]));
            int statusInt = dict.ContainsKey("Status") && dict["Status"] != null ? Convert.ToInt32(dict["Status"]) : 1;
            bool isLocked = dict.ContainsKey("IsLocked") && dict["IsLocked"] != null && (Convert.ToInt32(dict["IsLocked"]) == 1 || Convert.ToBoolean(dict["IsLocked"]));
            string? verifiedBy = dict.ContainsKey("VerifiedBy") && dict["VerifiedBy"] != null ? dict["VerifiedBy"].ToString() : null;
            DateTime? verifiedAt = dict.ContainsKey("VerifiedAt") && dict["VerifiedAt"] != null ? Convert.ToDateTime(dict["VerifiedAt"]) : null;
            int? approvedBy = dict.ContainsKey("ApprovedBy") && dict["ApprovedBy"] != null ? Convert.ToInt32(dict["ApprovedBy"]) : null;
            DateTime? approvedAt = dict.ContainsKey("ApprovedAt") && dict["ApprovedAt"] != null ? Convert.ToDateTime(dict["ApprovedAt"]) : null;
            DateTime? publishedAt = dict.ContainsKey("PublishedAt") && dict["PublishedAt"] != null ? Convert.ToDateTime(dict["PublishedAt"]) : null;
            bool isActive = dict.ContainsKey("IsActive") && dict["IsActive"] != null && (Convert.ToInt32(dict["IsActive"]) == 1 || Convert.ToBoolean(dict["IsActive"]));
            DateTime createdAt = dict.ContainsKey("CreatedAt") && dict["CreatedAt"] != null ? Convert.ToDateTime(dict["CreatedAt"]) : DateTime.UtcNow;
            DateTime? updatedAt = dict.ContainsKey("UpdatedAt") && dict["UpdatedAt"] != null ? Convert.ToDateTime(dict["UpdatedAt"]) : null;

            string subjectName = dict.ContainsKey("SubjectName") && dict["SubjectName"] != null ? dict["SubjectName"].ToString()! : string.Empty;
            string subjectCode = dict.ContainsKey("SubjectCode") && dict["SubjectCode"] != null ? dict["SubjectCode"].ToString()! : string.Empty;
            int subjectMax = dict.ContainsKey("SubjectMaxMarks") && dict["SubjectMaxMarks"] != null ? Convert.ToInt32(dict["SubjectMaxMarks"]) : 100;
            bool isPractical = dict.ContainsKey("IsPractical") && dict["IsPractical"] != null && (Convert.ToInt32(dict["IsPractical"]) == 1 || Convert.ToBoolean(dict["IsPractical"]));
            string subjectType = dict.ContainsKey("SubjectType") && dict["SubjectType"] != null ? dict["SubjectType"].ToString()! : (isPractical ? "Practical" : "Theory");

            string fullStudentName = dict.ContainsKey("FullStudentName") && dict["FullStudentName"] != null ? dict["FullStudentName"].ToString()! : (studentName ?? string.Empty);
            string fullRollNo = dict.ContainsKey("FullRollNo") && dict["FullRollNo"] != null ? dict["FullRollNo"].ToString()! : (rollNo ?? string.Empty);
            string admissionNo = dict.ContainsKey("AdmissionNo") && dict["AdmissionNo"] != null ? dict["AdmissionNo"].ToString()! : string.Empty;

            string sectionName = dict.ContainsKey("SectionName") && dict["SectionName"] != null ? dict["SectionName"].ToString()! : string.Empty;
            string groupName = dict.ContainsKey("GroupName") && dict["GroupName"] != null ? dict["GroupName"].ToString()! : string.Empty;
            string examName = dict.ContainsKey("ExamName") && dict["ExamName"] != null ? dict["ExamName"].ToString()! : string.Empty;
            string examPattern = dict.ContainsKey("ExamPattern") && dict["ExamPattern"] != null ? dict["ExamPattern"].ToString()! : "REGULAR_ACADEMIC";
            string examType = dict.ContainsKey("ExamType") && dict["ExamType"] != null ? dict["ExamType"].ToString()! : "Written";
            int examTotal = dict.ContainsKey("ExamTotalMarks") && dict["ExamTotalMarks"] != null ? Convert.ToInt32(dict["ExamTotalMarks"]) : 600;
            decimal examPassPct = dict.ContainsKey("ExamPassPercentage") && dict["ExamPassPercentage"] != null ? Convert.ToDecimal(dict["ExamPassPercentage"]) : 35.00m;

            string boardName = dict.ContainsKey("BoardName") && dict["BoardName"] != null ? dict["BoardName"].ToString()! : (board ?? string.Empty);
            string yearName = dict.ContainsKey("AcademicYearName") && dict["AcademicYearName"] != null ? dict["AcademicYearName"].ToString()! : string.Empty;
            string levelName = dict.ContainsKey("LevelName") && dict["LevelName"] != null ? dict["LevelName"].ToString()! : (academicLevel ?? string.Empty);

            string facultyFirst = dict.ContainsKey("FacultyFirstName") && dict["FacultyFirstName"] != null ? dict["FacultyFirstName"].ToString()! : string.Empty;
            string facultyLast = dict.ContainsKey("FacultyLastName") && dict["FacultyLastName"] != null ? dict["FacultyLastName"].ToString()! : string.Empty;
            string facultyEmp = dict.ContainsKey("FacultyEmployeeId") && dict["FacultyEmployeeId"] != null ? dict["FacultyEmployeeId"].ToString()! : string.Empty;

            var mark = new Mark
            {
                MarkId = markId,
                Board = board ?? boardName,
                BoardId = boardId,
                AcademicYearId = academicYearId,
                AcademicLevel = academicLevel ?? levelName,
                AcademicLevelId = academicLevelId,
                GroupId = groupId,
                SectionId = sectionId,
                ExaminationId = examinationId,
                SubjectId = subjectId,
                StudentId = studentId,
                RollNo = rollNo ?? fullRollNo,
                StudentName = studentName ?? fullStudentName,
                FacultyId = facultyId,
                InternalMarks = internalMarks,
                PracticalMarks = practicalMarks,
                TheoryMarks = theoryMarks,
                TotalMarks = totalMarks,
                PassingMarks = passingMarks,
                IsAbsent = isAbsent,
                Remarks = remarks,
                IsVerified = isVerified,
                IsPublished = isPublished,
                Status = (EvaluationStatus)statusInt,
                IsLocked = isLocked,
                VerifiedBy = verifiedBy,
                VerifiedAt = verifiedAt,
                ApprovedBy = approvedBy,
                ApprovedAt = approvedAt,
                PublishedAt = publishedAt,
                IsActive = isActive,
                CreatedAt = createdAt,
                UpdatedAt = updatedAt,
                Subject = new Subject
                {
                    SubjectId = subjectId,
                    SubjectName = subjectName,
                    SubjectCode = subjectCode,
                    TotalMarks = subjectMax,
                    Practical = isPractical,
                    SubjectType = subjectType
                },
                Student = new Student
                {
                    StudentId = studentId,
                    StudentName = fullStudentName,
                    RollNo = fullRollNo,
                    AdmissionNo = admissionNo
                },
                SectionNavigation = new Section
                {
                    SectionId = sectionId,
                    SectionName = sectionName
                },
                GroupNavigation = new Group
                {
                    GroupId = groupId,
                    GroupName = groupName
                },
                Examination = new Examination
                {
                    ExamId = examinationId,
                    ExaminationId = examinationId,
                    ExamName = examName,
                    ExamPattern = examPattern,
                    TotalMarks = examTotal,
                    PassPercentage = examPassPct,
                    AssessmentType = new AssessmentType
                    {
                        AssessmentTypeName = examType
                    }
                }
            };

            if (boardId.HasValue && boardId.Value > 0)
            {
                mark.BoardNavigation = new Board
                {
                    BoardId = boardId.Value,
                    BoardName = boardName
                };
            }

            if (academicYearId > 0)
            {
                mark.AcademicYear = new AcademicYear
                {
                    AcademicYearId = academicYearId,
                    AcademicYearName = yearName
                };
            }

            if (academicLevelId.HasValue && academicLevelId.Value > 0)
            {
                mark.AcademicLevelNavigation = new AcademicLevel
                {
                    AcademicLevelId = academicLevelId.Value,
                    LevelName = levelName
                };
            }

            if (facultyId.HasValue && facultyId.Value > 0)
            {
                mark.Faculty = new CollegeManagement.API.Models.Faculty.Faculty
                {
                    Id = facultyId.Value,
                    FirstName = facultyFirst,
                    LastName = facultyLast,
                    EmployeeId = !string.IsNullOrWhiteSpace(facultyEmp) ? facultyEmp : $"FAC{facultyId.Value:D4}"
                };
            }

            return mark;
        }
    }
}