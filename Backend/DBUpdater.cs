using System;
using System.IO;
using System.Data;
using Microsoft.Extensions.Configuration;
using MySql.Data.MySqlClient;

class Program
{
    static void Main()
    {
        var builder = new ConfigurationBuilder()
            .SetBasePath(@"c:\Users\gumma\Desktop\CMS\Backend\src\CollegeManagement.API")
            .AddJsonFile("appsettings.json");
        var configuration = builder.Build();
        
        string connString = configuration.GetConnectionString("DefaultConnection");
        using (var connection = new MySqlConnection(connString))
        {
            connection.Open();
            Console.WriteLine("Connected to Database.");
            
            // Check if PhotoPath exists
            var checkCmd = new MySqlCommand("SHOW COLUMNS FROM Staffs LIKE 'PhotoPath'", connection);
            var result = checkCmd.ExecuteScalar();
            if (result == null)
            {
                Console.WriteLine("Adding PhotoPath to Staffs...");
                var alterCmd = new MySqlCommand("ALTER TABLE Staffs ADD COLUMN PhotoPath VARCHAR(500) NULL;", connection);
                alterCmd.ExecuteNonQuery();
                Console.WriteLine("PhotoPath added successfully!");
            }
            else
            {
                Console.WriteLine("PhotoPath column already exists.");
            }
        }
    }
}
