using System;
using System.Collections.Generic;
using System.Linq;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Helpers
{
    public static class ExaminationStatusHelper
    {
        private static readonly TimeZoneInfo IstTimeZone = ResolveIstTimeZone();

        private static TimeZoneInfo ResolveIstTimeZone()
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
            }
            catch
            {
                try
                {
                    return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");
                }
                catch
                {
                    return TimeZoneInfo.CreateCustomTimeZone(
                        "IST_Custom",
                        TimeSpan.FromMinutes(330),
                        "India Standard Time",
                        "India Standard Time");
                }
            }
        }

        public static DateTime GetIstNow()
        {
            return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, IstTimeZone);
        }

        public static string CalculateAuthoritativeStatus(
            string? currentStatus,
            DateOnly startDate,
            DateOnly endDate,
            IEnumerable<ExamSchedule>? schedules,
            DateTime? istNowOpt = null)
        {
            var rawStatus = (currentStatus ?? string.Empty).Trim().ToUpperInvariant();
            if (rawStatus == "CANCELLED" || rawStatus == "DELETED")
            {
                return "CANCELLED";
            }

            if (rawStatus == "DRAFT")
            {
                return "DRAFT";
            }

            var istNow = istNowOpt ?? GetIstNow();
            var istToday = DateOnly.FromDateTime(istNow);
            var istTime = TimeOnly.FromDateTime(istNow);

            var activeSchedules = schedules?.Where(s => s.IsActive).ToList() ?? new List<ExamSchedule>();

            if (activeSchedules.Count > 0)
            {
                // 1. Are all active schedules fully finished?
                bool allSchedulesFinished = activeSchedules.All(s =>
                    s.ExamDate < istToday || (s.ExamDate == istToday && s.EndTime <= istTime));

                if (allSchedulesFinished)
                {
                    return "COMPLETED";
                }

                // 2. Is there an active examination session in progress right now?
                bool hasActiveSessionNow = activeSchedules.Any(s =>
                    s.ExamDate == istToday && s.StartTime <= istTime && istTime <= s.EndTime);

                if (hasActiveSessionNow)
                {
                    return "ONGOING";
                }

                // 3. Has the examination started (earliest session start has elapsed) and not all sessions are finished?
                var earliestStart = activeSchedules.Min(s => s.ExamDate.ToDateTime(s.StartTime));
                bool hasStarted = istNow >= earliestStart;

                if (hasStarted)
                {
                    if (istToday >= startDate && istToday <= endDate)
                    {
                        return "ONGOING";
                    }
                    if (istToday < endDate)
                    {
                        return "ONGOING";
                    }
                }

                // 4. If the earliest session has not started yet, it is SCHEDULED
                if (!hasStarted)
                {
                    return "SCHEDULED";
                }

                return "COMPLETED";
            }
            else
            {
                // Fallback when active schedules are not yet assigned/populated
                if (istToday > endDate)
                {
                    return "COMPLETED";
                }
                else if (istToday >= startDate && istToday <= endDate)
                {
                    return "ONGOING";
                }
                else
                {
                    return "SCHEDULED";
                }
            }
        }

        public static string CalculateAuthoritativeStatusForResponse(
            string? currentStatus,
            DateOnly startDate,
            DateOnly endDate,
            int scheduledSubjectsCount,
            DateTime? istNowOpt = null)
        {
            var rawStatus = (currentStatus ?? string.Empty).Trim().ToUpperInvariant();
            if (rawStatus == "CANCELLED" || rawStatus == "DELETED")
            {
                return "CANCELLED";
            }

            if (rawStatus == "DRAFT")
            {
                return "DRAFT";
            }

            var istNow = istNowOpt ?? GetIstNow();
            var istToday = DateOnly.FromDateTime(istNow);

            if (istToday > endDate)
            {
                return "COMPLETED";
            }
            else if (istToday < startDate)
            {
                return "SCHEDULED";
            }
            else
            {
                // Today falls between startDate and endDate
                return "ONGOING";
            }
        }
    }
}
