using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Tests;

namespace TestSp
{
    class Program
    {
        static async Task Main(string[] args)
        {
            string appSettingsPath = @"C:\Users\ADMIN\Desktop\CMS\Project\Backend\src\CollegeManagement.API\appsettings.json";
            if (!File.Exists(appSettingsPath))
            {
                appSettingsPath = @"C:\Users\ADMIN\Desktop\CMS\Backend\src\CollegeManagement.API\appsettings.json";
            }
            string json = await File.ReadAllTextAsync(appSettingsPath);
            using var doc = JsonDocument.Parse(json);
            string cs = doc.RootElement.GetProperty("ConnectionStrings").GetProperty("DefaultConnection").GetString()!;

            Console.WriteLine("Executing SectionModuleBackendTester...");
            var tester = new SectionModuleBackendTester(cs);
            bool success = await tester.RunAllTestsAsync();
            Environment.Exit(success ? 0 : 1);
        }
    }
}