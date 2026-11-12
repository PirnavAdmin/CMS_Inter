using System;
using System.Linq;
using Dapper;
using MySql.Data.MySqlClient;

string connStr = "Server=collegemanagementdb-mysql-3069cc62-manikesandeep-1393.g.aivencloud.com;Port=19182;Database=CollegeManagement;User ID=avnadmin;Password=AVNS_jgPZED4pphZib4tvJID;SslMode=Required;Allow User Variables=True;";
using var conn = new MySqlConnection(connStr);
await conn.OpenAsync();

Console.WriteLine("1. Testing sp_SuperAdmin_GetDashboardSummary...");
using (var multi = await conn.QueryMultipleAsync("sp_SuperAdmin_GetDashboardSummary", commandType: System.Data.CommandType.StoredProcedure))
{
    var counts = await multi.ReadFirstOrDefaultAsync<dynamic>();
    Console.WriteLine($"   TotalColleges={counts?.TotalColleges}, ActiveColleges={counts?.ActiveColleges}, PaidPlanColleges={counts?.PaidPlanColleges}, ActiveLoginAccounts={counts?.ActiveLoginAccounts}");
}

Console.WriteLine("\n2. Testing sp_SuperAdmin_GetAllPlans...");
var allPlans = (await conn.QueryAsync<dynamic>("sp_SuperAdmin_GetAllPlans", commandType: System.Data.CommandType.StoredProcedure)).ToList();
Console.WriteLine($"   Plans returned: {allPlans.Count}");
foreach (var p in allPlans)
{
    Console.WriteLine($"    - Plan: {p.PlanName}, Price: ₹{p.Price}, Limit: {p.AccountLimit} accounts");
}

Console.WriteLine("\n3. Testing sp_SuperAdmin_GetPlatformSettings...");
var settings = (await conn.QueryAsync<dynamic>("sp_SuperAdmin_GetPlatformSettings", commandType: System.Data.CommandType.StoredProcedure)).ToList();
foreach (var s in settings)
{
    Console.WriteLine($"    - {s.SettingKey} = {s.SettingValue}");
}
