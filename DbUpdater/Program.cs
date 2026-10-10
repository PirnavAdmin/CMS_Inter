using System;
using MySqlConnector;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        string connectionString = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;";

        using var connection = new MySqlConnection(connectionString);
        await connection.OpenAsync();

        string createProfileEditRequestTable = @"
            CREATE TABLE IF NOT EXISTS StaffProfileEditRequests (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                StaffId INT NOT NULL,
                Status VARCHAR(30) NOT NULL DEFAULT 'Requested',
                RequestReason VARCHAR(500) NULL,
                AdminNotes VARCHAR(500) NULL,
                RequestedAt DATETIME(6) NOT NULL,
                AllowedAt DATETIME(6) NULL,
                AllowedByAdminId INT NULL,
                SubmittedAt DATETIME(6) NULL,
                ReviewedAt DATETIME(6) NULL,
                ReviewedByAdminId INT NULL
            );
        ";

        using var cmd2 = new MySqlCommand(createProfileEditRequestTable, connection);
        await cmd2.ExecuteNonQueryAsync();
        Console.WriteLine("StaffProfileEditRequests table created/verified.");
    }
}
