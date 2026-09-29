using System;
using System.Threading.Tasks;
using MySqlConnector;
using Dapper;

namespace DBTest
{
    public static class CheckInactiveSchedules
    {
        public static async Task RunAsync()
        {
            var cs = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;ConnectionTimeout=60;KeepAlive=5;ConvertZeroDateTime=True;Pooling=true;";
            using var conn = new MySqlConnection(cs);
            await conn.OpenAsync();
            var rows = await conn.QueryAsync<dynamic>(@"
                SELECT es.ScheduleId, es.ExamId, e.ExamName, e.Status, e.IsActive AS ExamActive, es.IsActive AS SchedActive, es.Invigilator, es.ExamDate, es.StartTime, es.EndTime
                FROM ExamSchedules es
                INNER JOIN Examinations e ON es.ExamId = e.ExamId
                WHERE e.IsActive = 0 OR e.Status IN ('CANCELLED', 'DELETED');
            ");
            foreach(var r in rows)
            {
                Console.WriteLine($"SchedId: {r.ScheduleId}, ExamId: {r.ExamId}, Exam: {r.ExamName}, ExamActive: {r.ExamActive}, SchedActive: {r.SchedActive}, Inv: {r.Invigilator}, Date: {r.ExamDate:yyyy-MM-dd}");
            }
        }
    }
}
