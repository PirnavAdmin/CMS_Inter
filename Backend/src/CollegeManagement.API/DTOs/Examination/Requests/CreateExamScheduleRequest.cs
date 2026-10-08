using System;
using System.ComponentModel.DataAnnotations;
using System.Globalization;

namespace CollegeManagement.API.DTOs.Examination.Requests
{
    public class CreateExamScheduleRequest
    {
        public int ExaminationId { get; set; }
        public int? CampusId { get; set; } = 1;

        public int? GroupId { get; set; }
        public int? BoardId { get; set; }
        public int? AcademicLevelId { get; set; }

        public int SubjectId { get; set; }

        public DateOnly ExamDate { get; set; }

        public string? Date
        {
            get => ExamDate.ToString("yyyy-MM-dd");
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    var val = value.Trim();
                    if (val.Length >= 10 && DateOnly.TryParseExact(val.Substring(0, 10), "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d1))
                    {
                        ExamDate = d1;
                    }
                    else if (DateOnly.TryParse(val, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d2))
                    {
                        ExamDate = d2;
                    }
                    else if (DateTime.TryParse(val, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
                    {
                        ExamDate = DateOnly.FromDateTime(dt);
                    }
                }
            }
        }

        public TimeOnly StartTime { get; set; }

        public string? StartTimeString
        {
            get => StartTime.ToString("HH:mm:ss");
            set
            {
                if (!string.IsNullOrWhiteSpace(value) && TryParseTime(value, out var t))
                {
                    StartTime = t;
                }
            }
        }

        public TimeOnly EndTime { get; set; }

        public string? EndTimeString
        {
            get => EndTime.ToString("HH:mm:ss");
            set
            {
                if (!string.IsNullOrWhiteSpace(value) && TryParseTime(value, out var t))
                {
                    EndTime = t;
                }
            }
        }

        public string? SessionId { get; set; }
        public string ScheduleMode { get; set; } = "SUBJECT_WISE";

        public int? RoomId { get; set; }
        public int? InvigilatorId { get; set; }

        public string? Hall { get; set; }

        public string? RoomNumber
        {
            get => Hall;
            set => Hall = value;
        }

        public string? Venue
        {
            get => Hall;
            set => Hall = value;
        }

        public string? Invigilator { get; set; }

        public string? InvigilatorName
        {
            get => Invigilator;
            set => Invigilator = value;
        }

        public string ExamMode { get; set; } = "Written";

        public string? Mode
        {
            get => ExamMode;
            set
            {
                if (!string.IsNullOrWhiteSpace(value))
                    ExamMode = value;
            }
        }

        public decimal MaxMarks { get; set; } = 100.00m;

        public decimal? TotalMarks
        {
            get => MaxMarks;
            set
            {
                if (value.HasValue && value.Value > 0)
                    MaxMarks = value.Value;
            }
        }

        public decimal PassingMarks { get; set; } = 35.00m;

        public decimal? PassPercentage { get; set; }

        public string? PatternName { get; set; }

        public int? CandidateCount { get; set; }

        public int? CandidatesCount
        {
            get => CandidateCount;
            set => CandidateCount = value;
        }

        public int? Capacity
        {
            get => CandidateCount;
            set => CandidateCount = value;
        }

        public object? HallAssignments { get; set; }

        public System.Collections.Generic.List<int>? SubjectIds { get; set; }

        public System.Collections.Generic.List<int>? IncludedSubjectIds { get; set; }

        public System.Collections.Generic.List<CreateExamScheduleRequest>? Schedules { get; set; }

        private static bool TryParseTime(string raw, out TimeOnly time)
        {
            time = default;
            if (string.IsNullOrWhiteSpace(raw)) return false;

            var trimmed = raw.Trim();
            string[] formats = { "HH:mm:ss", "HH:mm", "H:mm:ss", "H:mm", "h:mm tt", "hh:mm tt" };
            foreach (var fmt in formats)
            {
                if (TimeOnly.TryParseExact(trimmed, fmt, CultureInfo.InvariantCulture, DateTimeStyles.None, out time))
                    return true;
            }

            if (TimeOnly.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.None, out time))
                return true;

            if (TimeSpan.TryParse(trimmed, CultureInfo.InvariantCulture, out var ts))
            {
                time = TimeOnly.FromTimeSpan(ts);
                return true;
            }

            if (DateTime.TryParse(trimmed, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt))
            {
                time = TimeOnly.FromDateTime(dt);
                return true;
            }

            return false;
        }
    }
}