using System;
using System.Data;
using System.Threading.Tasks;
using MySqlConnector;
using Dapper;

namespace DBTest
{
    public static class InspectInvigilator
    {
        private const string ConnectionString = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;ConnectionTimeout=60;KeepAlive=5;ConvertZeroDateTime=True;Pooling=true;MinimumPoolSize=2;MaximumPoolSize=100;ConnectionLifeTime=300;ConnectionIdleTimeout=120;";

        public static async Task RunAsync()
        {
            using var conn = new MySqlConnection(ConnectionString);
            await conn.OpenAsync();

            Console.WriteLine("=== 1. SHOW CREATE TABLE InvigilatorAssignments ===");
            try
            {
                var row = await conn.QueryFirstOrDefaultAsync<dynamic>("SHOW CREATE TABLE InvigilatorAssignments;");
                if (row != null)
                {
                    var dict = (IDictionary<string, object>)row;
                    foreach (var kvp in dict)
                    {
                        Console.WriteLine($"{kvp.Key}: {kvp.Value}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }

            Console.WriteLine("\n=== 2. Foreign Keys on InvigilatorAssignments ===");
            try
            {
                var fks = await conn.QueryAsync<dynamic>(@"
                    SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
                    FROM information_schema.KEY_COLUMN_USAGE
                    WHERE TABLE_SCHEMA = 'u819242402_CLM_System'
                      AND TABLE_NAME = 'InvigilatorAssignments'
                      AND REFERENCED_TABLE_NAME IS NOT NULL;
                ");
                foreach (var fk in fks)
                {
                    Console.WriteLine($"Constraint: {fk.CONSTRAINT_NAME}, Column: {fk.COLUMN_NAME} -> {fk.REFERENCED_TABLE_NAME}({fk.REFERENCED_COLUMN_NAME})");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }

            Console.WriteLine("\n=== 3. Rows in InvigilatorAssignments ===");
            try
            {
                var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM InvigilatorAssignments;");
                Console.WriteLine($"Total rows: {count}");
                var rows = await conn.QueryAsync<dynamic>("SELECT * FROM InvigilatorAssignments ORDER BY InvigilatorAssignmentId DESC LIMIT 10;");
                foreach (var r in rows)
                {
                    var dict = (IDictionary<string, object>)r;
                    Console.WriteLine(string.Join(", ", dict.Select(kv => $"{kv.Key}={kv.Value}")));
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }

            Console.WriteLine("\n=== 4. ExamSchedules with Invigilator LIKE '%roopa%' OR on 2026-11-02 ===");
            try
            {
                var scheds = await conn.QueryAsync<dynamic>(@"
                    SELECT ScheduleId, ExamId, SubjectId, ExamDate, StartTime, EndTime, RoomId, Hall, InvigilatorId, Invigilator, IsActive
                    FROM ExamSchedules
                    WHERE ExamDate = '2026-11-02' OR Invigilator LIKE '%roopa%'
                    ORDER BY ExamDate, StartTime;
                ");
                foreach (var s in scheds)
                {
                    Console.WriteLine($"ScheduleId: {s.ScheduleId}, ExamId: {s.ExamId}, SubId: {s.SubjectId}, Date: {s.ExamDate:yyyy-MM-dd}, Time: {s.StartTime}-{s.EndTime}, Room: {s.RoomId}/{s.Hall}, InvId: {s.InvigilatorId}, Inv: '{s.Invigilator}', Active: {s.IsActive}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }

            Console.WriteLine("\n=== 5. Staff row for 'roopa g' ===");
            try
            {
                var staff = await conn.QueryAsync<dynamic>(@"
                    SELECT Id, FirstName, LastName, Designation, Status, IsDeleted
                    FROM Staff
                    WHERE FirstName LIKE '%roopa%' OR LastName LIKE '%roopa%';
                ");
                foreach (var st in staff)
                {
                    Console.WriteLine($"StaffId: {st.Id}, Name: {st.FirstName} {st.LastName}, Desig: {st.Designation}, Status: {st.Status}, Del: {st.IsDeleted}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }

            Console.WriteLine("\n=== 6. Examination Statuses for 104, 114, 115 ===");
            try
            {
                var exams = await conn.QueryAsync<dynamic>(@"
                    SELECT ExaminationId, ExamName, ExamCode, Status, IsActive, StartDate, EndDate
                    FROM Examinations
                    WHERE ExaminationId IN (104, 114, 115);
                ");
                foreach (var e in exams)
                {
                    Console.WriteLine($"ExamId: {e.ExaminationId}, Name: {e.ExamName}, Code: {e.ExamCode}, Status: {e.Status}, Active: {e.IsActive}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
            }
        }
    }
}
