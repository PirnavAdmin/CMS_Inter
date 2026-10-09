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
    /// once all of their scheduled subject time slots have finished.
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

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ExamAutoCompletionWorker started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckAndCompleteExaminationsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in ExamAutoCompletionWorker cycle.");
                }

                // Check every 15 minutes to conserve database connection pool limits
                await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
            }
        }

        private async Task CheckAndCompleteExaminationsAsync(CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var now = DateTime.UtcNow;
            var today = DateOnly.FromDateTime(now);
            var currentTime = TimeOnly.FromDateTime(now);

            var scheduledExams = await db.Examinations
                .Include(e => e.ExamSchedules.Where(s => s.IsActive))
                .Where(e => e.IsActive && e.Status.ToUpper() == "SCHEDULED")
                .ToListAsync(ct);

            foreach (var exam in scheduledExams)
            {
                var activeSchedules = exam.ExamSchedules.Where(s => s.IsActive).ToList();
                if (!activeSchedules.Any()) continue;

                // Find the latest exam schedule end point
                bool allFinished = activeSchedules.All(s =>
                    s.ExamDate < today || (s.ExamDate == today && s.EndTime <= currentTime));

                if (allFinished)
                {
                    _logger.LogInformation(
                        "Auto-completing Examination ID {ExamId} ({ExamCode}) as all schedules have concluded.",
                        exam.ExaminationId, exam.ExamCode);

                    exam.Status = "COMPLETED";
                    exam.UpdatedAt = DateTime.UtcNow;
                }
            }

            if (db.ChangeTracker.HasChanges())
            {
                await db.SaveChangesAsync(ct);
            }
        }
    }
}
