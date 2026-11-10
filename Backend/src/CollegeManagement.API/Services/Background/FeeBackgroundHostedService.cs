using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Background;

/// <summary>
/// Background worker service for automated fee maintenance operations:
/// 1. Hourly Overdue Fee Scanning: Automatically transitions unpaid past-due fees
///    and installments to "Overdue".
/// 2. 3-Day Upcoming Fee Reminder Notifications: Dispatches proactive alerts to
///    students/parents for upcoming fee deadlines within a 3-day window.
/// </summary>
public class FeeBackgroundHostedService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<FeeBackgroundHostedService> _logger;

    // Cache of (installmentId, reminderDate) to prevent duplicate reminders within 24h
    private static readonly ConcurrentDictionary<int, DateTime> _lastRemindedUtc = new();

    public FeeBackgroundHostedService(
        IServiceProvider serviceProvider,
        ILogger<FeeBackgroundHostedService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("FeeBackgroundHostedService started. Monitoring fee overdue transitions and reminders.");

        try
        {
            // Initial startup delay of 15 seconds to allow application warmup
            await Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunFeeMaintenanceCycleAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Unhandled error in FeeBackgroundHostedService cycle.");
                }

                // Run cycle every 1 hour
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Graceful cancellation on host shutdown
        }

        _logger.LogInformation("FeeBackgroundHostedService stopped.");
    }

    private async Task RunFeeMaintenanceCycleAsync(CancellationToken ct)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notificationService = scope.ServiceProvider.GetService<INotificationService>();

        var today = DateTime.UtcNow.Date;

        // ========================= JOB 1: OVERDUE SCANNING =========================
        int overdueInstallmentsCount = 0;
        int overdueFeesCount = 0;

        try
        {
            // 1. Scan unpaid installments whose due date has passed
            var pastDueInstallments = await context.FeeInstallments
                .Where(i => i.Status != "Paid" && i.Status != "Overdue" &&
                            i.BalanceAmount > 0 && i.DueDate.Date < today)
                .ToListAsync(ct);

            foreach (var inst in pastDueInstallments)
            {
                inst.Status = "Overdue";
                overdueInstallmentsCount++;
            }

            // 2. Scan student fees with overdue components or past-due installments
            var overdueStudentFeeIds = pastDueInstallments
                .Select(i => i.FeePaymentPlan != null ? i.FeePaymentPlan.StudentFeeId : 0)
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            if (overdueStudentFeeIds.Any())
            {
                var feesToUpdate = await context.StudentFees
                    .Where(sf => overdueStudentFeeIds.Contains(sf.StudentFeeId) &&
                                 sf.Status != "Paid" && sf.Status != "Overdue" &&
                                 sf.BalanceAmount > 0)
                    .ToListAsync(ct);

                foreach (var sf in feesToUpdate)
                {
                    sf.Status = "Overdue";
                    sf.UpdatedAt = DateTime.UtcNow;
                    overdueFeesCount++;
                }
            }

            if (overdueInstallmentsCount > 0 || overdueFeesCount > 0)
            {
                await context.SaveChangesAsync(ct);
                _logger.LogInformation(
                    "Fee overdue cycle: Transitioned {InstCount} installment(s) and {FeeCount} fee account(s) to 'Overdue'.",
                    overdueInstallmentsCount, overdueFeesCount);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to execute overdue fee scanning job.");
        }

        // ========================= JOB 2: 3-DAY UPCOMING REMINDERS =========================
        if (notificationService == null) return;

        try
        {
            var upcomingThreshold = today.AddDays(3);

            var upcomingInstallments = await context.FeeInstallments
                .AsNoTracking()
                .Include(i => i.FeePaymentPlan)
                    .ThenInclude(p => p!.StudentFee)
                        .ThenInclude(sf => sf!.Student)
                .Where(i => i.Status != "Paid" && i.BalanceAmount > 0 &&
                            i.DueDate.Date >= today && i.DueDate.Date <= upcomingThreshold)
                .ToListAsync(ct);

            int remindersSent = 0;
            var now = DateTime.UtcNow;

            foreach (var inst in upcomingInstallments)
            {
                var student = inst.FeePaymentPlan?.StudentFee?.Student;
                if (student == null) continue;

                // Check 24-hour reminder suppression
                if (_lastRemindedUtc.TryGetValue(inst.FeeInstallmentId, out var lastSent) &&
                    (now - lastSent).TotalHours < 24)
                {
                    continue;
                }

                var daysUntilDue = (inst.DueDate.Date - today).Days;
                var dueDescriptor = daysUntilDue == 0 ? "today" :
                                    daysUntilDue == 1 ? "tomorrow" :
                                    $"in {daysUntilDue} days ({inst.DueDate:dd MMM yyyy})";

                var title = "Upcoming Fee Due Reminder";
                var message = $"Dear {student.StudentName}, fee installment #{inst.InstallmentNumber} of ₹{inst.BalanceAmount:N0} is due {dueDescriptor}. Please pay online or at the counter to prevent overdue fines.";

                try
                {
                    await notificationService.SendToStudentAsync(
                        student.StudentId,
                        title,
                        message,
                        "Fee",
                        inst.FeeInstallmentId,
                        $"/student/fees");

                    _lastRemindedUtc[inst.FeeInstallmentId] = now;
                    remindersSent++;
                }
                catch (Exception notifEx)
                {
                    _logger.LogWarning(notifEx, "Failed to send fee reminder to StudentId={StudentId}", student.StudentId);
                }
            }

            if (remindersSent > 0)
            {
                _logger.LogInformation("Dispatched {Count} upcoming fee reminder notification(s).", remindersSent);
            }

            // Cleanup suppression cache older than 7 days
            if (_lastRemindedUtc.Count > 1000)
            {
                var cutoff = now.AddDays(-7);
                foreach (var kvp in _lastRemindedUtc.Where(k => k.Value < cutoff).ToList())
                {
                    _lastRemindedUtc.TryRemove(kvp.Key, out _);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to execute upcoming fee reminder notifications job.");
        }
    }
}
