using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Background
{
    /// <summary>
    /// Background service that automatically transitions examinations between SCHEDULED, ONGOING,
    /// and COMPLETED based on active schedule time slots and examination periods in IST (UTC+5:30).
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
            _logger.LogInformation("ExamAutoCompletionWorker started with IST timezone evaluation.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckAndTransitionExaminationsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in ExamAutoCompletionWorker cycle.");
                }

                // Check every 1 minute for responsive status transitions in IST
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }

        private async Task CheckAndTransitionExaminationsAsync(CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var cache = scope.ServiceProvider.GetService<IMemoryCache>();

            var istNow = ExaminationStatusHelper.GetIstNow();

            var candidateExams = await db.Examinations
                .Include(e => e.ExamSchedules.Where(s => s.IsActive))
                .Where(e => e.IsActive && e.Status != "CANCELLED" && e.Status != "DRAFT")
                .ToListAsync(ct);

            foreach (var exam in candidateExams)
            {
                var currentStatus = (exam.Status ?? string.Empty).Trim().ToUpperInvariant();
                var newStatus = ExaminationStatusHelper.CalculateAuthoritativeStatus(
                    currentStatus,
                    exam.StartDate,
                    exam.EndDate,
                    exam.ExamSchedules,
                    istNow);

                if (!string.Equals(currentStatus, newStatus, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogInformation(
                        "Auto-transitioning Examination ID {ExamId} ({ExamCode}) from '{OldStatus}' to '{NewStatus}' at IST {IstTime:yyyy-MM-dd HH:mm:ss}.",
                        exam.ExaminationId, exam.ExamCode, currentStatus, newStatus, istNow);

                    exam.Status = newStatus;
                    exam.UpdatedAt = DateTime.UtcNow;

                    if (cache != null)
                    {
                        cache.Remove($"exam:details:{exam.ExaminationId}");
                        cache.Remove($"exam:schedules:{exam.ExaminationId}");
                        cache.Remove($"exam:eligible-subjects:{exam.ExaminationId}");
                    }
                }
            }

            if (db.ChangeTracker.HasChanges())
            {
                await db.SaveChangesAsync(ct);
            }
        }
    }
}
