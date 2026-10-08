using System;
using MySqlConnector;

class Program {
    static void Main() {
        string connStr = "Server=srv1061.hstgr.io;Database=u819242402_CLM_System;Uid=u819242402_CLM;Pwd=Clm@2026;AllowUserVariables=True;";
        using var conn = new MySqlConnection(connStr);
        conn.Open();
        
        Console.WriteLine("--- NumberSeriesConfigurations ---");
        string sql1 = "SELECT SeriesCode, CampusId, CurrentSequence FROM NumberSeriesConfigurations WHERE SeriesCode LIKE 'EXAM_CODE%'";
        using var cmd1 = new MySqlCommand(sql1, conn);
        using var reader1 = cmd1.ExecuteReader();
        while (reader1.Read()) {
            Console.WriteLine($"{reader1["SeriesCode"]} | Campus: {reader1["CampusId"]} | Seq: {reader1["CurrentSequence"]}");
        }
        reader1.Close();
        
        Console.WriteLine("\n--- Students Table Count ---");
        string sql2 = "SELECT COUNT(*) FROM Students";
        using var cmd2 = new MySqlCommand(sql2, conn);
        Console.WriteLine($"Total students: {cmd2.ExecuteScalar()}");
        
        Console.WriteLine("\n--- Students with SP logic Count ---");
        string sql3 = "SELECT COUNT(*) FROM Students WHERE COALESCE(IsActive, 1) = 1";
        using var cmd3 = new MySqlCommand(sql3, conn);
        Console.WriteLine($"Total active students: {cmd3.ExecuteScalar()}");
    }
}
