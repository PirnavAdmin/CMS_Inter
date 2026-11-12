using System;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Helpers
{
    public static class ExaminationFormatHelper
    {
        public static bool IsObjectivePattern(string? pattern)
        {
            if (string.IsNullOrWhiteSpace(pattern)) return false;
            var upper = pattern.Trim().ToUpperInvariant();
            if (upper.Contains("REGULAR")) return false;
            return upper.Contains("OBJECTIVE") ||
                   upper.Contains("JEE") ||
                   upper.Contains("NEET") ||
                   upper.Contains("MAINS") ||
                   upper.Contains("ADVANCE") ||
                   upper.Contains("EAMCET") ||
                   upper.Contains("BITSAT") ||
                   upper.Contains("CUET") ||
                   upper.Contains("PATTERN");
        }

        public static bool IsObjectiveConfiguration(
            string? examPattern,
            string? examType = null,
            string? subjectType = null,
            string? scheduleMode = null,
            string? scheduleExamMode = null,
            string? patternName = null)
        {
            if (string.Equals(scheduleExamMode?.Trim(), "Objective", StringComparison.OrdinalIgnoreCase)) return true;
            if (!string.IsNullOrWhiteSpace(scheduleMode))
            {
                var sm = scheduleMode.Trim().ToUpperInvariant();
                if (sm == "PATTERN_WISE" || sm == "COMBINED_OBJECTIVE" || sm == "COMBINED" || sm == "OBJECTIVE")
                    return true;
            }
            if (!string.IsNullOrWhiteSpace(patternName) && !patternName.Trim().ToUpperInvariant().Contains("REGULAR"))
                return true;
            if (string.Equals(examType?.Trim(), "Objective", StringComparison.OrdinalIgnoreCase)) return true;
            if (!string.IsNullOrWhiteSpace(examType) && examType.Contains("Objective", StringComparison.OrdinalIgnoreCase)) return true;
            if (string.Equals(subjectType?.Trim(), "Objective", StringComparison.OrdinalIgnoreCase)) return true;
            if (IsObjectivePattern(examPattern)) return true;
            return false;
        }

        /// <summary>
        /// Synchronously checks if an examination and/or schedule is configured as Objective.
        /// Evaluates actual configuration attributes rather than inferring from examination name.
        /// </summary>
        public static bool IsObjectiveExam(Examination? exam, ExamSchedule? schedule = null)
        {
            if (schedule != null)
            {
                if (string.Equals(schedule.ExamMode?.Trim(), "Objective", StringComparison.OrdinalIgnoreCase)) return true;
                if (!string.IsNullOrWhiteSpace(schedule.ScheduleMode))
                {
                    var sm = schedule.ScheduleMode.Trim().ToUpperInvariant();
                    if (sm == "PATTERN_WISE" || sm == "COMBINED_OBJECTIVE" || sm == "COMBINED" || sm == "OBJECTIVE")
                        return true;
                }
                if (!string.IsNullOrWhiteSpace(schedule.PatternName) && !schedule.PatternName.Trim().ToUpperInvariant().Contains("REGULAR"))
                    return true;
            }

            if (exam != null)
            {
                if (exam.AssessmentType != null && exam.AssessmentType.AssessmentTypeName.Contains("Objective", StringComparison.OrdinalIgnoreCase))
                    return true;
                if (exam.ExamSchedules != null && exam.ExamSchedules.Any(s => s.IsActive && (
                    string.Equals(s.ExamMode?.Trim(), "Objective", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(s.ScheduleMode?.Trim(), "PATTERN_WISE", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(s.ScheduleMode?.Trim(), "COMBINED_OBJECTIVE", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(s.ScheduleMode?.Trim(), "COMBINED", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(s.ScheduleMode?.Trim(), "OBJECTIVE", StringComparison.OrdinalIgnoreCase) ||
                    (!string.IsNullOrWhiteSpace(s.PatternName) && !s.PatternName.Trim().ToUpperInvariant().Contains("REGULAR")))))
                    return true;
                if (IsObjectivePattern(exam.ExamPattern))
                    return true;
            }

            return false;
        }

        /// <summary>
        /// Asynchronously determines whether an examination and/or subject schedule is configured as Objective
        /// using the persistent database configuration.
        /// </summary>
        public static async Task<bool> IsObjectiveExamAsync(AppDbContext context, int examinationId, int? subjectId = null)
        {
            if (examinationId <= 0) return false;

            var exam = await context.Examinations
                .AsNoTracking()
                .Include(e => e.AssessmentType)
                .Include(e => e.ExamSchedules.Where(s => s.IsActive))
                .FirstOrDefaultAsync(e => e.ExaminationId == examinationId);

            if (exam == null) return false;

            ExamSchedule? relevantSchedule = null;
            if (subjectId.HasValue && subjectId.Value > 0)
            {
                relevantSchedule = exam.ExamSchedules
                    .FirstOrDefault(s => s.SubjectId == subjectId.Value || s.IncludedSubjectIdList.Contains(subjectId.Value));
            }
            if (relevantSchedule == null && exam.ExamSchedules.Any())
            {
                relevantSchedule = exam.ExamSchedules.FirstOrDefault();
            }

            return IsObjectiveExam(exam, relevantSchedule);
        }

        /// <summary>
        /// Asynchronously resolves format and limits using Dapper Stored Procedure without EF Core context.
        /// </summary>
        public static async Task<(bool IsObjective, decimal MaxMarks, decimal PassingMarks)> GetFormatAndLimitsAsync(
            IDbConnection connection, int examinationId, int subjectId, CancellationToken ct = default)
        {
            try
            {
                var row = await connection.QueryFirstOrDefaultAsync<dynamic>(
                    new CommandDefinition("sp_GetExamFormatAndLimits",
                        new { p_ExaminationId = examinationId, p_SubjectId = subjectId },
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));

                if (row != null)
                {
                    var dict = (IDictionary<string, object>)row;
                    string pattern = dict.ContainsKey("ExamPattern") && dict["ExamPattern"] != null ? dict["ExamPattern"].ToString() ?? string.Empty : string.Empty;
                    string category = dict.ContainsKey("ExamCategory") && dict["ExamCategory"] != null ? dict["ExamCategory"].ToString() ?? string.Empty : string.Empty;
                    string assessType = dict.ContainsKey("AssessmentTypeName") && dict["AssessmentTypeName"] != null ? dict["AssessmentTypeName"].ToString() ?? string.Empty : string.Empty;
                    string scheduleMode = dict.ContainsKey("ScheduleMode") && dict["ScheduleMode"] != null ? dict["ScheduleMode"].ToString() ?? string.Empty : string.Empty;
                    string examMode = dict.ContainsKey("ScheduleExamMode") && dict["ScheduleExamMode"] != null ? dict["ScheduleExamMode"].ToString() ?? string.Empty : string.Empty;
                    string patternName = dict.ContainsKey("PatternName") && dict["PatternName"] != null ? dict["PatternName"].ToString() ?? string.Empty : string.Empty;

                    bool isObjective = string.Equals(category, "Objective", StringComparison.OrdinalIgnoreCase) ||
                                       IsObjectiveConfiguration(pattern, assessType, null, scheduleMode, examMode, patternName);

                    decimal maxMarks = dict.ContainsKey("MaxMarks") && dict["MaxMarks"] != null ? Convert.ToDecimal(dict["MaxMarks"]) : 100m;
                    decimal passMarks = dict.ContainsKey("PassingMarks") && dict["PassingMarks"] != null ? Convert.ToDecimal(dict["PassingMarks"]) : 35m;

                    return (isObjective, maxMarks, passMarks);
                }
            }
            catch
            {
                // Fallback default
            }

            return (false, 100m, 35m);
        }

        public static async Task<(bool IsObjective, decimal MaxMarks, decimal InternalMax, decimal PracticalMax, decimal TheoryMax, decimal PassingMarks)> ResolveFormatAndComponentLimitsAsync(
            IDbConnection connection, int examinationId, int subjectId, CancellationToken ct = default)
        {
            try
            {
                if (connection.State != ConnectionState.Open && connection is System.Data.Common.DbConnection dbConn)
                {
                    await dbConn.OpenAsync(ct);
                }

                var row = await connection.QueryFirstOrDefaultAsync<dynamic>(
                    new CommandDefinition("sp_GetExamFormatAndLimits",
                        new { p_ExaminationId = examinationId, p_SubjectId = subjectId },
                        commandType: CommandType.StoredProcedure,
                        cancellationToken: ct));

                if (row != null)
                {
                    var dict = (IDictionary<string, object>)row;
                    string pattern = dict.ContainsKey("ExamPattern") && dict["ExamPattern"] != null ? dict["ExamPattern"].ToString() ?? string.Empty : string.Empty;
                    string category = dict.ContainsKey("ExamCategory") && dict["ExamCategory"] != null ? dict["ExamCategory"].ToString() ?? string.Empty : string.Empty;
                    string assessType = dict.ContainsKey("AssessmentTypeName") && dict["AssessmentTypeName"] != null ? dict["AssessmentTypeName"].ToString() ?? string.Empty : string.Empty;
                    string scheduleMode = dict.ContainsKey("ScheduleMode") && dict["ScheduleMode"] != null ? dict["ScheduleMode"].ToString() ?? string.Empty : string.Empty;
                    string examMode = dict.ContainsKey("ScheduleExamMode") && dict["ScheduleExamMode"] != null ? dict["ScheduleExamMode"].ToString() ?? string.Empty : string.Empty;
                    string patternName = dict.ContainsKey("PatternName") && dict["PatternName"] != null ? dict["PatternName"].ToString() ?? string.Empty : string.Empty;

                    bool isObjective = string.Equals(category, "Objective", StringComparison.OrdinalIgnoreCase) ||
                                       IsObjectiveConfiguration(pattern, assessType, null, scheduleMode, examMode, patternName);

                    decimal maxMarks = dict.ContainsKey("MaxMarks") && dict["MaxMarks"] != null ? Convert.ToDecimal(dict["MaxMarks"]) : 100m;
                    decimal passMarks = dict.ContainsKey("PassingMarks") && dict["PassingMarks"] != null ? Convert.ToDecimal(dict["PassingMarks"]) : 35m;
                    decimal intMax = !isObjective && dict.ContainsKey("InternalMax") && dict["InternalMax"] != null ? Convert.ToDecimal(dict["InternalMax"]) : 0m;
                    decimal pracMax = !isObjective && dict.ContainsKey("PracticalMax") && dict["PracticalMax"] != null ? Convert.ToDecimal(dict["PracticalMax"]) : 0m;
                    decimal thMax = !isObjective && dict.ContainsKey("TheoryMax") && dict["TheoryMax"] != null ? Convert.ToDecimal(dict["TheoryMax"]) : 0m;

                    if (!isObjective && (intMax + pracMax + thMax) > 0m)
                    {
                        maxMarks = intMax + pracMax + thMax;
                    }
                    else if (!isObjective)
                    {
                        thMax = maxMarks;
                    }

                    return (isObjective, maxMarks, intMax, pracMax, thMax, passMarks);
                }
            }
            catch
            {
                // Fallback default
            }

            return (false, 100m, 0m, 0m, 100m, 35m);
        }

        /// <summary>
        /// Asynchronously resolves the configured Maximum Marks and Passing Marks for an examination subject.
        /// Prioritizes the ExamSchedule configuration, then Subject definition, defaulting to 100 max / 35 pass.
        /// </summary>
        public static async Task<(decimal MaxMarks, decimal PassingMarks)> ResolveSubjectMarksLimitsAsync(
            AppDbContext context,
            int examinationId,
            int subjectId,
            Subject? subject = null)
        {
            decimal maxMarks = 100m;
            decimal passingMarks = 35m;

            if (examinationId > 0 && subjectId > 0)
            {
                var schedule = await context.ExamSchedules
                    .AsNoTracking()
                    .Where(s => s.IsActive && s.ExaminationId == examinationId &&
                               (s.SubjectId == subjectId || (s.IncludedSubjectIds != null && s.IncludedSubjectIds.Contains(subjectId.ToString()))))
                    .OrderByDescending(s => s.SubjectId == subjectId)
                    .FirstOrDefaultAsync();

                if (schedule != null)
                {
                    if (schedule.MaxMarks > 0) maxMarks = schedule.MaxMarks;
                    if (schedule.PassingMarks > 0) passingMarks = schedule.PassingMarks;
                    return (maxMarks, passingMarks);
                }
            }

            if (subject != null)
            {
                if (subject.TotalMarks > 0) maxMarks = subject.TotalMarks;
                if (subject.PassingMarks > 0) passingMarks = subject.PassingMarks;
            }
            else if (subjectId > 0)
            {
                var sub = await context.Subjects.AsNoTracking().FirstOrDefaultAsync(s => s.SubjectId == subjectId);
                if (sub != null)
                {
                    if (sub.TotalMarks > 0) maxMarks = sub.TotalMarks;
                    if (sub.PassingMarks > 0) passingMarks = sub.PassingMarks;
                }
            }

            return (maxMarks, passingMarks);
        }
    }
}
