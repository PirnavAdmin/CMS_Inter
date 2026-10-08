using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Background
{
    /// <summary>
    /// Background service that automatically transitions SCHEDULED examinations to COMPLETED
    /// once all of their scheduled subject time slots have finished according to Indian Standard Time (IST).
    /// </summary>
    public class ExamAutoCompletionWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<ExamAutoCompletionWorker> _logger;

        public ExamAutoCompletionWorker(
            IServiceProvider serviceProvider,
            ILogger<ExamAutoCompletionWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        public static DateTime GetIstNow()
        {
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById("India Standard Time");
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
            }
            catch
            {
                try
                {
                    var tz = TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");
                    return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
                }
                catch
                {
                    return DateTime.UtcNow.AddHours(5).AddMinutes(30);
                }
            }
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ExamAutoCompletionWorker started with Indian Standard Time (IST) synchronization.");

            // Brief initial pause before first evaluation cycle
            await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    int transitioned = await AutoTransitionExaminationsInternalAsync(db, _logger, stoppingToken);
                    if (transitioned > 0)
                    {
                        _logger.LogInformation("ExamAutoCompletionWorker: transitioned {Count} examination(s) to COMPLETED.", transitioned);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in ExamAutoCompletionWorker cycle.");
                }

                // Check every 30 seconds for timely transitions without overloading DB
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }

        public static async Task<int> AutoTransitionExaminationsInternalAsync(AppDbContext db, ILogger? logger = null, CancellationToken ct = default)
        {
            var nowIst = GetIstNow();
            var today = DateOnly.FromDateTime(nowIst);
            var currentTime = TimeOnly.FromDateTime(nowIst);

            var activeCandidateExams = await db.Examinations
                .Include(e => e.ExamSchedules.Where(s => s.IsActive))
                .Where(e => e.IsActive && (e.Status.ToUpper() == "SCHEDULED" || e.Status.ToUpper() == "ONGOING") && e.StartDate <= today)
                .ToListAsync(ct);

            int changedCount = 0;
            foreach (var exam in activeCandidateExams)
            {
                var activeSchedules = exam.ExamSchedules.Where(s => s.IsActive).ToList();

                bool allFinished = false;
                bool hasStarted = false;

                if (activeSchedules.Any())
                {
                    allFinished = activeSchedules.All(s =>
                        s.ExamDate < today || (s.ExamDate == today && s.EndTime <= currentTime));
                    hasStarted = activeSchedules.Any(s =>
                        s.ExamDate < today || (s.ExamDate == today && s.StartTime <= currentTime));
                }
                else
                {
                    allFinished = exam.EndDate < today;
                    hasStarted = exam.StartDate <= today;
                }

                string targetStatus = allFinished ? "COMPLETED" : (hasStarted ? "ONGOING" : "SCHEDULED");

                if (!string.Equals(exam.Status, targetStatus, StringComparison.OrdinalIgnoreCase))
                {
                    logger?.LogInformation(
                        "Auto-transitioning Examination ID {ExamId} ({ExamCode}) from {OldStatus} to {NewStatus} at IST {NowIst:yyyy-MM-dd HH:mm:ss}.",
                        exam.ExaminationId, exam.ExamCode, exam.Status, targetStatus, nowIst);

                    exam.Status = targetStatus;
                    exam.UpdatedAt = DateTime.UtcNow;
                    changedCount++;
                }
            }

            if (db.ChangeTracker.HasChanges())
            {
                await db.SaveChangesAsync(ct);
            }

            return changedCount;
        }
    }
}
