using System;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Implementations;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Background
{
    /// <summary>
    /// Background cleanup service that enforces notification History retention rules:
    /// - Removes all History (IsRead = 1) rows for users with 30+ days since their latest notification.
    /// - Enforces the 10-record History limit per user without touching active/unread notifications.
    /// </summary>
    public class NotificationHistoryCleanupWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<NotificationHistoryCleanupWorker> _logger;

        public NotificationHistoryCleanupWorker(
            IServiceProvider serviceProvider,
            ILogger<NotificationHistoryCleanupWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("NotificationHistoryCleanupWorker started.");

            try
            {
                await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken);

                while (!stoppingToken.IsCancellationRequested)
                {
                    try
                    {
                        using var scope = _serviceProvider.CreateScope();
                        var repo = scope.ServiceProvider.GetRequiredService<INotificationRepository>();
                        int deleted = await repo.PurgeAllExpiredHistoryAsync();
                        if (deleted > 0)
                        {
                            NotificationService.InvalidateAllUserCaches();
                            _logger.LogInformation(
                                "NotificationHistoryCleanupWorker purged {DeletedCount} expired or excess notification history records.",
                                deleted);
                        }
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        break;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error in NotificationHistoryCleanupWorker cycle.");
                    }

                    await Task.Delay(TimeSpan.FromHours(6), stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Graceful shutdown
            }
        }
    }
}
