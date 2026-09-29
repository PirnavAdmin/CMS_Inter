using System;
using System.Threading.Tasks;
using MySqlConnector;
using Dapper;

namespace DBTest
{
    public static class CheckStaff1
    {
        public static async Task RunAsync()
        {
            var cs = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;ConnectionTimeout=60;KeepAlive=5;ConvertZeroDateTime=True;Pooling=true;";
            using var conn = new MySqlConnection(cs);
            await conn.OpenAsync();
            var st1 = await conn.QueryFirstOrDefaultAsync<dynamic>("SELECT Id, FirstName, LastName FROM Staff WHERE Id = 1;");
            Console.WriteLine(st1 != null ? $"Staff 1 exists: {st1.FirstName} {st1.LastName}" : "Staff 1 DOES NOT EXIST");
            
            var row1 = await conn.QueryFirstOrDefaultAsync<dynamic>("SELECT * FROM InvigilatorAssignments WHERE InvigilatorAssignmentId = 1;");
            if (row1 != null) {
                Console.WriteLine($"Row 1: InvigilatorAssignmentId={row1.InvigilatorAssignmentId}, ExamScheduleId={row1.ExamScheduleId}, InvigilatorId={row1.InvigilatorId}");
            }
        }
    }
}
