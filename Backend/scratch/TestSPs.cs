using System;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Dapper;
using CollegeManagement.API.Data;

namespace ScratchPad
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            try
            {
                var basePath = @"C:\Users\ADMIN\Desktop\CMS\Backend\src\CollegeManagement.API";
                var builder = new ConfigurationBuilder()
                    .SetBasePath(basePath)
                    .AddJsonFile("appsettings.json", optional: true)
                    .AddJsonFile("appsettings.Development.json", optional: true);
                
                var config = builder.Build();
                var connString = config.GetConnectionString("DefaultConnection");

                var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
                optionsBuilder.UseMySql(connString, ServerVersion.AutoDetect(connString));

                using var dbContext = new AppDbContext(optionsBuilder.Options);
                var connection = dbContext.Database.GetDbConnection();
                if (connection.State != ConnectionState.Open) await connection.OpenAsync();
                
                Console.WriteLine("Testing Timetable SP...");
                var timetable = await connection.QueryAsync<dynamic>(
                    "CALL sp_GetStudentTimetable(860);", 
                    commandType: CommandType.Text);
                Console.WriteLine($"Timetable Success! Returned {timetable.Count()} rows.");

                Console.WriteLine("Testing Attendance SP...");
                using var multi = await connection.QueryMultipleAsync(
                    "CALL sp_GetStudentAttendances(860, 0);", 
                    commandType: CommandType.Text);
                var yearInfo = await multi.ReadSingleOrDefaultAsync<dynamic>();
                var attendances = await multi.ReadAsync<dynamic>();
                Console.WriteLine($"Attendance Success! Returned YearInfo: {yearInfo != null}, Attendances: {attendances.Count()} rows.");
            }
            catch(Exception ex)
            {
                Console.WriteLine($"ERROR: {ex.Message}");
            }
        }
    }
}
