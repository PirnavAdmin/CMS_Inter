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

        var scheds = await db.ExamSchedules
            .Where(s => s.ExamId == 163 || s.ExamId == 164)
            .Select(s => new { s.ScheduleId, s.ExamId, s.SubjectId, s.ExamDate, s.StartTime, s.EndTime, s.IsActive })
            .ToListAsync();

        foreach (var s in scheds)
        {
            Console.WriteLine($"ExamId: {s.ExamId} | SchedId: {s.ScheduleId} | Date: {s.ExamDate:yyyy-MM-dd} | {s.StartTime} - {s.EndTime} | Active: {s.IsActive}");
        }
    }
}
