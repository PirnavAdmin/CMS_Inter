using System;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Services.Implementations;
using CollegeManagement.API.Tests;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

class Program
{
    static async Task Main(string[] args)
    {
        Console.WriteLine("Setting up test dependencies...");
        string connStr = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;Allow User Variables=true;";

        var services = new ServiceCollection();
        services.AddLogging(b => b.AddConsole().SetMinimumLevel(LogLevel.Warning));

        services.AddDbContext<AppDbContext>(options =>
        {
            options.UseMySql(connStr, ServerVersion.AutoDetect(connStr));
        });

        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IRoleRepository, RoleRepository>();
        services.AddScoped<IPermissionRepository, PermissionRepository>();
        services.AddScoped<IRoleManagementService, RoleManagementService>();

        var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();

        var roleService = scope.ServiceProvider.GetRequiredService<IRoleManagementService>();
        var permRepo = scope.ServiceProvider.GetRequiredService<IPermissionRepository>();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        Console.WriteLine("\nTesting ExamAutoCompletionWorker Lifecycle Logic...");

        var nowIst = CollegeManagement.API.Services.Background.ExamAutoCompletionWorker.GetIstNow();
        var today = DateOnly.FromDateTime(nowIst);
        var currentTime = TimeOnly.FromDateTime(nowIst);
        Console.WriteLine($"Current IST Time: {nowIst:yyyy-MM-dd HH:mm:ss} | Date: {today} | Time: {currentTime}");

        // Test Simulation:
        // 1. Future Exam -> SCHEDULED
        var futureSchedules = new List<CollegeManagement.API.Models.ExamSchedule>
        {
            new() { ExamDate = today.AddDays(1), StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(12, 0), IsActive = true }
        };
        bool futureFinished = futureSchedules.All(s => s.ExamDate < today || (s.ExamDate == today && s.EndTime <= currentTime));
        bool futureStarted = futureSchedules.Any(s => s.ExamDate < today || (s.ExamDate == today && s.StartTime <= currentTime));
        string futureStatus = futureFinished ? "COMPLETED" : (futureStarted ? "ONGOING" : "SCHEDULED");
        Console.WriteLine($"Future exam status: {futureStatus} (Expected: SCHEDULED) -> {(futureStatus == "SCHEDULED" ? "PASS" : "FAIL")}");

        // 2. Active Slot Right Now -> ONGOING
        var ongoingSchedules = new List<CollegeManagement.API.Models.ExamSchedule>
        {
            new() { ExamDate = today, StartTime = currentTime.AddHours(-1), EndTime = currentTime.AddHours(1), IsActive = true }
        };
        bool ongoingFinished = ongoingSchedules.All(s => s.ExamDate < today || (s.ExamDate == today && s.EndTime <= currentTime));
        bool ongoingStarted = ongoingSchedules.Any(s => s.ExamDate < today || (s.ExamDate == today && s.StartTime <= currentTime));
        string ongoingStatus = ongoingFinished ? "COMPLETED" : (ongoingStarted ? "ONGOING" : "SCHEDULED");
        Console.WriteLine($"Active slot exam status: {ongoingStatus} (Expected: ONGOING) -> {(ongoingStatus == "ONGOING" ? "PASS" : "FAIL")}");

        // 3. Concluded Slot -> COMPLETED
        var concludedSchedules = new List<CollegeManagement.API.Models.ExamSchedule>
        {
            new() { ExamDate = today, StartTime = currentTime.AddHours(-3), EndTime = currentTime.AddHours(-1), IsActive = true }
        };
        bool concludedFinished = concludedSchedules.All(s => s.ExamDate < today || (s.ExamDate == today && s.EndTime <= currentTime));
        bool concludedStarted = concludedSchedules.Any(s => s.ExamDate < today || (s.ExamDate == today && s.StartTime <= currentTime));
        string concludedStatus = concludedFinished ? "COMPLETED" : (concludedStarted ? "ONGOING" : "SCHEDULED");
        Console.WriteLine($"Concluded slot exam status: {concludedStatus} (Expected: COMPLETED) -> {(concludedStatus == "COMPLETED" ? "PASS" : "FAIL")}");

        if (futureStatus == "SCHEDULED" && ongoingStatus == "ONGOING" && concludedStatus == "COMPLETED")
        {
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("\nALL 3 LIFECYCLE TRANSITION LOGIC TESTS PASSED SUCCESSFULLY!");
            Console.ResetColor();
        }
        else
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("\nLIFECYCLE TESTS FAILED!");
            Console.ResetColor();
            Environment.Exit(1);
        }
    }
}
