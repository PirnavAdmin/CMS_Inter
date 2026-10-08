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
                
                var email = "naveenponnapula0@gmail.com";
                
                // 1. Get Parent User ID
                var parent = await connection.QueryFirstOrDefaultAsync<dynamic>(
                    "SELECT Id, FirstName, LastName FROM Users WHERE Email = @Email", 
                    new { Email = email });
                    
                if (parent == null) {
                    Console.WriteLine("Parent not found.");
                    return;
                }
                
                Console.WriteLine($"Parent Found: ID={parent.Id}, Name={parent.FirstName} {parent.LastName}");

                // 2. Get Children
                var sql = @"
                    SELECT s.StudentId, s.FirstName, s.LastName
                    FROM ParentStudentMappings psm
                    JOIN Students s ON psm.StudentId = s.StudentId
                    WHERE psm.ParentUserId = @ParentId AND psm.IsActive = 1";
                    
                var children = await connection.QueryAsync<dynamic>(sql, new { ParentId = parent.Id });
                
                foreach(var c in children)
                {
                    Console.WriteLine($"Child: StudentId={c.StudentId}, Name={c.FirstName} {c.LastName}");
                }
            }
            catch(Exception ex)
            {
                Console.WriteLine($"ERROR: {ex.Message}");
            }
        }
    }
}
