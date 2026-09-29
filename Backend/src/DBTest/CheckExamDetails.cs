using System;
using System.Threading.Tasks;
using MySqlConnector;
using Dapper;

namespace DBTest
{
    public static class CheckExamDetails
    {
        public static async Task RunAsync()
        {
            var cs = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;ConnectionTimeout=60;KeepAlive=5;ConvertZeroDateTime=True;Pooling=true;";
            using var conn = new MySqlConnection(cs);
            await conn.OpenAsync();
            var exams = await conn.QueryAsync<dynamic>("SELECT ExamId, ExamName, ExamCode, Status, IsActive FROM Examinations WHERE ExamId IN (104, 114, 115);");
            foreach(var e in exams)
            {
                Console.WriteLine($"ExamId: {e.ExamId}, Name: {e.ExamName}, Code: {e.ExamCode}, Status: {e.Status}, Active: {e.IsActive}");
            }
        }
    }
}
