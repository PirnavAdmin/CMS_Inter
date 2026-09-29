using System;
using System.Data;
using MySqlConnector;

class Program
{
    static void Main()
    {
        string connStr = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;";
        using (var conn = new MySqlConnection(connStr))
        {
            try {
                conn.Open();
                using (var cmd = new MySqlCommand("SHOW TRIGGERS", conn))
                {
                    using (var reader = cmd.ExecuteReader())
                    {
                        while(reader.Read())
                        {
                            Console.WriteLine($"Trigger: {reader[0]} on {reader[2]}");
                        }
                    }
                }
            } catch(Exception ex) { Console.WriteLine(ex.Message); }
        }
    }
}
