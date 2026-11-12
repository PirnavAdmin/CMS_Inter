using CollegeManagement.API.Services.Implementations;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Background;

public sealed class FeePaymentEmailDispatcherWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly PaymentEmailDispatchSignal _signal;
    private readonly ILogger<FeePaymentEmailDispatcherWorker> _logger;

    public FeePaymentEmailDispatcherWorker(
        IServiceScopeFactory scopeFactory,
        PaymentEmailDispatchSignal signal,
        ILogger<FeePaymentEmailDispatcherWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _signal = signal;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("FeePaymentEmailDispatcherWorker started.");

        // Small initial startup delay so EF/DB initialization finishes cleanly
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var outboxService = scope.ServiceProvider.GetRequiredService<IPaymentEmailOutboxService>();
                int processed = await outboxService.DispatchDueAsync(20, stoppingToken);

                // If a full batch was processed, drain again immediately without waiting
                if (processed >= 20)
                    continue;
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred in FeePaymentEmailDispatcherWorker polling loop.");
            }

            await _signal.WaitAsync(TimeSpan.FromSeconds(15), stoppingToken);
        }
    }
}
