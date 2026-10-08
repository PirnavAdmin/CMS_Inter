using System;
using System.IO;
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
            
            try
            {
                var count = await connection.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM Marks WHERE StudentId = 860 AND IsActive = 1 AND IsPublished = 1");
                Console.WriteLine($"Student 860 has {count} published marks.");
                
                var examCount = await connection.ExecuteScalarAsync<int>(
                    "SELECT COUNT(DISTINCT ExaminationId) FROM Marks WHERE StudentId = 860");
                Console.WriteLine($"Student 860 is associated with {examCount} exams total (published or not).");
            }
            catch(Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
            }
        }
    }
}
