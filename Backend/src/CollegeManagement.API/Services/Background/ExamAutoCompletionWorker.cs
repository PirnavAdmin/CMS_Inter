using System;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Repositories.Interfaces;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Background
{
    /// <summary>
    /// Background service that automatically transitions examinations between SCHEDULED, ONGOING,
    /// and COMPLETED based on active schedule time slots and examination periods in IST (UTC+5:30).
    /// Executes set-based MySQL stored procedures with zero EF Core tracking overhead.
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

            try
            {
                // Wait 5 seconds on initial startup to allow host initialization to complete
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

                while (!stoppingToken.IsCancellationRequested)
                {
                    try
                    {
                        await CheckAndTransitionExaminationsAsync(stoppingToken);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error in ExamAutoCompletionWorker cycle.");
                    }

                    // Check every 1 minute for responsive status transitions in IST
                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Graceful cancellation on host shutdown
            }
        }

        private async Task CheckAndTransitionExaminationsAsync(CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var examRepo = scope.ServiceProvider.GetRequiredService<IExaminationRepository>();

            var istNow = ExaminationStatusHelper.GetIstNow();

            var rowsAffected = await examRepo.AutoTransitionExaminationStatusesAsync(istNow);
            if (rowsAffected > 0)
            {
                _logger.LogInformation("Auto-transitioned examination statuses for {Count} exam session(s) at IST {IstTime:yyyy-MM-dd HH:mm:ss}.",
                    rowsAffected, istNow);
            }
        }
    }
}
