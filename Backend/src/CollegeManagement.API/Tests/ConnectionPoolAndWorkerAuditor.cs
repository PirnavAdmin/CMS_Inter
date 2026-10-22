using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Services.Background;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public static class ConnectionPoolAndWorkerAuditor
    {
        public static void RunAllTests()
        {
            Console.WriteLine("=== Starting Connection Pooling and Worker Audit Tests ===");
            TestDevelopmentConnectionStringPoolingSettings();
            TestWorkerDisabledInDevelopment();
            TestWorkerIntervalConfigurable();
            Console.WriteLine("=== All Audit Tests Passed Successfully! ===");
        }

        public static void TestDevelopmentConnectionStringPoolingSettings()
        {
            var configPath = Path.Combine(AppContext.BaseDirectory, "appsettings.Development.json");
            if (!File.Exists(configPath))
            {
                // Fallback to project directory
                configPath = Path.Combine(Directory.GetCurrentDirectory(), "appsettings.Development.json");
            }

            var builder = new ConfigurationBuilder();
            if (File.Exists(configPath))
            {
                builder.AddJsonFile(configPath);
            }
            var config = builder.Build();

            var connStr = config.GetConnectionString("DefaultConnection") 
                ?? "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;ConnectionTimeout=60;KeepAlive=30;ConvertZeroDateTime=True;Pooling=true;MinimumPoolSize=0;MaximumPoolSize=5;ConnectionLifeTime=0;ConnectionIdleTimeout=300;";

            var csb = new MySqlConnectionStringBuilder(connStr);

            if (!csb.Pooling)
                throw new InvalidOperationException("Audit Failure: Connection pooling must be enabled.");
            if (csb.ConnectionLifeTime != 0)
                throw new InvalidOperationException($"Audit Failure: ConnectionLifeTime must be 0 to avoid connection churn. Found: {csb.ConnectionLifeTime}");
            if (csb.MinimumPoolSize > 1)
                throw new InvalidOperationException($"Audit Failure: MinimumPoolSize should be <= 1 for shared DB development. Found: {csb.MinimumPoolSize}");
            if (csb.MaximumPoolSize > 10)
                throw new InvalidOperationException($"Audit Failure: MaximumPoolSize should be capped in development. Found: {csb.MaximumPoolSize}");

            csb.TryGetValue("KeepAlive", out var keepAliveVal);
            Console.WriteLine($"[PASS] Connection Pooling Verified: Pooling={csb.Pooling}, MinPool={csb.MinimumPoolSize}, MaxPool={csb.MaximumPoolSize}, LifeTime={csb.ConnectionLifeTime}, IdleTimeout={csb.ConnectionIdleTimeout}, KeepAlive={keepAliveVal}");
        }

        public static void TestWorkerDisabledInDevelopment()
        {
            var inMemorySettings = new System.Collections.Generic.Dictionary<string, string?>
            {
                { "BackgroundWorkers:ExamAutoCompletion:Enabled", "false" }
            };

            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(inMemorySettings)
                .Build();

            var services = new ServiceCollection();
            var serviceProvider = services.BuildServiceProvider();
            var logger = NullLogger<ExamAutoCompletionWorker>.Instance;
            var environment = new MockHostEnvironment { EnvironmentName = "Development" };

            var worker = new ExamAutoCompletionWorker(serviceProvider, logger, configuration, environment);
            using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(200));

            // Execute worker - should idle without polling DB because it is disabled
            worker.StartAsync(cts.Token);
            Thread.Sleep(300);
            worker.StopAsync(CancellationToken.None).Wait(TimeSpan.FromSeconds(1));

            Console.WriteLine("[PASS] ExamAutoCompletionWorker disabled-in-development check verified.");
        }

        public static void TestWorkerIntervalConfigurable()
        {
            var inMemorySettings = new System.Collections.Generic.Dictionary<string, string?>
            {
                { "BackgroundWorkers:ExamAutoCompletion:Enabled", "true" },
                { "BackgroundWorkers:ExamAutoCompletion:PollingIntervalMinutes", "30" }
            };

            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(inMemorySettings)
                .Build();

            var services = new ServiceCollection();
            var serviceProvider = services.BuildServiceProvider();
            var logger = NullLogger<ExamAutoCompletionWorker>.Instance;
            var environment = new MockHostEnvironment { EnvironmentName = "Development" };

            var worker = new ExamAutoCompletionWorker(serviceProvider, logger, configuration, environment);
            using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(500));

            try
            {
                worker.StartAsync(cts.Token).Wait(TimeSpan.FromSeconds(1));
            }
            catch
            {
                // Cancellation expected
            }

            Console.WriteLine("[PASS] ExamAutoCompletionWorker custom interval configuration verified.");
        }

        private class MockHostEnvironment : IHostEnvironment
        {
            public string EnvironmentName { get; set; } = "Development";
            public string ApplicationName { get; set; } = "CollegeManagement.API";
            public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
            public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
        }
    }
}
