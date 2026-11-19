using System;
using MySqlConnector;

class Program
{
    private const string MySqlConnStr = "Server=collegemanagementdb-mysql-3069cc62-manikesandeep-1393.g.aivencloud.com;Port=19182;Database=CollegeManagement;User ID=avnadmin;Password=AVNS_jgPZED4pphZib4tvJID;SslMode=Required;";

    static void Main()
    {
        using var conn = new MySqlConnection(MySqlConnStr);
        conn.Open();

        using var cmd = conn.CreateCommand();
        cmd.CommandText = "SELECT COUNT(*) FROM Notifications WHERE UserId = 1064;";
        var count = cmd.ExecuteScalar();
        Console.WriteLine($"Total Notifications for User 1064 (College 8 Admin): {count}");
    }
}
