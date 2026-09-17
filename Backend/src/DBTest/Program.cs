using System;
using System.Data;
using System.Threading.Tasks;
using MySqlConnector;

namespace DBTest
{
    internal class Program
    {
        private const string ConnectionString = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;ConnectionTimeout=60;KeepAlive=5;ConvertZeroDateTime=True;Pooling=true;MinimumPoolSize=2;MaximumPoolSize=30;ConnectionLifeTime=300;ConnectionIdleTimeout=120;";

        static async Task Main(string[] args)
        {
            Console.WriteLine("Connecting to DB...");
            using var conn = new MySqlConnection(ConnectionString);
            await conn.OpenAsync();
            Console.WriteLine("Connected!");

            int boardId = 1;
            int yearId = 9;

            Console.WriteLine("\n=== Calling sp_GetDashboardStudentAttendance (Overall) ===");
            using (var cmd = new MySqlCommand("sp_GetDashboardStudentAttendance", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("p_BoardId", boardId);
                cmd.Parameters.AddWithValue("p_AcademicYearId", yearId);
                cmd.Parameters.AddWithValue("p_TargetDate", DateTime.UtcNow.Date);
                cmd.Parameters.AddWithValue("p_ViewBy", "Overall");
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        Console.WriteLine($"{reader.GetName(i)}: {reader.GetValue(i)}");
                    }
                }
            }

            Console.WriteLine("\n=== Calling sp_GetDashboardStudentAttendance (Group) ===");
            using (var cmd = new MySqlCommand("sp_GetDashboardStudentAttendance", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("p_BoardId", boardId);
                cmd.Parameters.AddWithValue("p_AcademicYearId", yearId);
                cmd.Parameters.AddWithValue("p_TargetDate", DateTime.UtcNow.Date);
                cmd.Parameters.AddWithValue("p_ViewBy", "Group");
                using var reader = await cmd.ExecuteReaderAsync();
                Console.WriteLine("--- Resultset 1 (Summary) ---");
                if (await reader.ReadAsync())
                {
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        Console.WriteLine($"{reader.GetName(i)}: {reader.GetValue(i)}");
                    }
                }
                Console.WriteLine("--- Resultset 2 (Group Breakdown) ---");
                if (await reader.NextResultAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        Console.WriteLine($"Group: {reader["CategoryName"]} | Total: {reader["TotalStudents"]} | Present: {reader["Present"]} | Absent: {reader["Absent"]} | %: {reader["AttendancePercentage"]}%");
                    }
                }
            }

            Console.WriteLine("\n=== Calling sp_GetDashboardKPIs ===");
            using (var cmd = new MySqlCommand("sp_GetDashboardKPIs", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("p_BoardId", boardId);
                cmd.Parameters.AddWithValue("p_AcademicYearId", yearId);
                cmd.Parameters.AddWithValue("p_TargetDate", DateTime.UtcNow.Date);
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    Console.WriteLine($"TotalStudents: {reader["TotalStudents"]} | TodayAttendance: {reader["TodayAttendance"]}% | Admissions: {reader["Admissions"]}");
                }
            }

            Console.WriteLine("\n=== Calling sp_GetDashboardStaffAttendance (All Staff) ===");
            using (var cmd = new MySqlCommand("sp_GetDashboardStaffAttendance", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("p_BoardId", boardId);
                cmd.Parameters.AddWithValue("p_AcademicYearId", yearId);
                cmd.Parameters.AddWithValue("p_TargetDate", DateTime.UtcNow.Date);
                cmd.Parameters.AddWithValue("p_StaffType", "All Staff");
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        Console.WriteLine($"{reader.GetName(i)}: {reader.GetValue(i)}");
                    }
                }
            }

            Console.WriteLine("\n=== Calling sp_GetDashboardStaffAttendance (Teaching Staff) ===");
            using (var cmd = new MySqlCommand("sp_GetDashboardStaffAttendance", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("p_BoardId", boardId);
                cmd.Parameters.AddWithValue("p_AcademicYearId", yearId);
                cmd.Parameters.AddWithValue("p_TargetDate", DateTime.UtcNow.Date);
                cmd.Parameters.AddWithValue("p_StaffType", "Teaching Staff");
                using var reader = await cmd.ExecuteReaderAsync();
                if (await reader.ReadAsync())
                {
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        Console.WriteLine($"{reader.GetName(i)}: {reader.GetValue(i)}");
                    }
                }
            }
        }
    }
}
