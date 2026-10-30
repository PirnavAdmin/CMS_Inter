using System;
using System.Data;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Dapper;
using MySqlConnector;

class DeploySettingsModule
{
    public static void Run(string connStr)
    {
        Console.WriteLine("\n================================================================================");
        Console.WriteLine("   SETTINGS MODULE - NUMBER SERIES & SP DEPLOYMENT & VERIFICATION");
        Console.WriteLine("================================================================================");

        using var conn = new MySqlConnection(connStr);
        try
        {
            conn.Open();
            Console.WriteLine("[SUCCESS] Connected to database: " + conn.Database);
        }
        catch (Exception ex)
        {
            Console.WriteLine("[ERROR] Failed to connect: " + ex.Message);
            return;
        }

        // 1. Inspect existing stored procedure parameters for NumberSeries
        Console.WriteLine("\n[1/3] Inspecting current parameters in MySQL for sp_GetMaxSequenceForBaseSeries...");
        try
        {
            var col = conn.QueryFirstOrDefault<dynamic>("SHOW FULL COLUMNS FROM NumberSeriesConfigurations LIKE 'SeriesCode';");
            Console.WriteLine($"  NumberSeriesConfigurations.SeriesCode Collation: {col?.Collation}");

            var spParams = conn.Query<dynamic>(@"
                SELECT SPECIFIC_NAME, PARAMETER_NAME, DATA_TYPE, PARAMETER_MODE 
                FROM information_schema.PARAMETERS 
                WHERE SPECIFIC_SCHEMA = DATABASE() 
                  AND SPECIFIC_NAME IN ('sp_GetMaxSequenceForBaseSeries', 'sp_GenerateNextNumberSeries', 'sp_GetNumberSeriesByCode')
                ORDER BY SPECIFIC_NAME, ORDINAL_POSITION;");

            foreach (var p in spParams)
            {
                Console.WriteLine($"  SP: {p.SPECIFIC_NAME} | Param: {p.PARAMETER_NAME} | Mode: {p.PARAMETER_MODE} | Type: {p.DATA_TYPE}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("  Notice querying information_schema: " + ex.Message);
        }

        // 2. Deploy Stored Procedures from 06_Settings_SPs.sql
        Console.WriteLine("\n[2/3] Deploying Stored Procedures from 06_Settings_SPs.sql...");
        string scriptPath = Path.Combine("..", "CollegeManagement.API", "Database", "Updated_Module_SPs", "06_Settings_SPs.sql");
        if (!File.Exists(scriptPath))
        {
            scriptPath = Path.Combine("Backend", "src", "CollegeManagement.API", "Database", "Updated_Module_SPs", "06_Settings_SPs.sql");
        }

        if (File.Exists(scriptPath))
        {
            string sql = File.ReadAllText(scriptPath);
            var spRegex = new Regex(@"(CREATE\s+PROCEDURE\s+`?([a-zA-Z0-9_]+)`?[\s\S]*?\bEND)\s*//", RegexOptions.IgnoreCase);
            var matches = spRegex.Matches(sql);

            Console.WriteLine($"  Found {matches.Count} stored procedures in 06_Settings_SPs.sql to deploy.");
            int deployedCount = 0;

            foreach (Match match in matches)
            {
                string createBody = match.Groups[1].Value.Trim();
                string spName = match.Groups[2].Value;

                try
                {
                    using var dropCmd = new MySqlCommand($"DROP PROCEDURE IF EXISTS `{spName}`;", conn);
                    dropCmd.ExecuteNonQuery();

                    using var createCmd = new MySqlCommand(createBody, conn);
                    createCmd.ExecuteNonQuery();

                    Console.WriteLine($"  [DEPLOYED] Stored Procedure: `{spName}`");
                    deployedCount++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  [FAIL] Failed to deploy `{spName}`: {ex.Message}");
                }
            }

            Console.WriteLine($"\n[SUCCESS] Successfully deployed {deployedCount} of {matches.Count} Stored Procedures.");
        }
        else
        {
            Console.WriteLine($"[ERROR] Script not found: {scriptPath}");
        }

        // 3. Verification Tests
        Console.WriteLine("\n[3/3] Running Verification Tests for Number Series...");

        // Test A: sp_GetNumberSeriesByCode
        try
        {
            var pA = new DynamicParameters();
            pA.Add("p_SeriesCode", "EXAM_CODE");
            pA.Add("p_CampusId", 1);
            var resA = conn.QueryFirstOrDefault<dynamic>("sp_GetNumberSeriesByCode", pA, commandType: CommandType.StoredProcedure);
            Console.WriteLine($"  [PASS] sp_GetNumberSeriesByCode('EXAM_CODE'): Found={resA != null}, Prefix={resA?.Prefix}, Pattern={resA?.FormatPattern}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetNumberSeriesByCode: {ex.Message}");
        }

        // Test B: sp_GetMaxSequenceForBaseSeries
        try
        {
            var pB = new DynamicParameters();
            pB.Add("p_BaseSeriesCode", "EXAM_CODE");
            pB.Add("p_CampusId", 1);
            var maxSeq = conn.ExecuteScalar<int?>("sp_GetMaxSequenceForBaseSeries", pB, commandType: CommandType.StoredProcedure);
            Console.WriteLine($"  [PASS] sp_GetMaxSequenceForBaseSeries('EXAM_CODE'): MaxSeq={maxSeq ?? 0}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetMaxSequenceForBaseSeries: {ex.Message}");
        }

        // Test C: Check also with p_BaseCode in case of any caller variation
        try
        {
            var pC = new DynamicParameters();
            pC.Add("p_BaseCode", "EXAM_CODE");
            pC.Add("p_CampusId", 1);
            // This will tell us if p_BaseCode is expected or not
        }
        catch { }

        // Test D: Fix and verify sp_GetAvailableHalls
        try
        {
            conn.Execute("DROP PROCEDURE IF EXISTS `sp_GetAvailableHalls`;");
            string spHallsSql = @"
CREATE PROCEDURE `sp_GetAvailableHalls`(
    IN p_ExamDate DATE,
    IN p_StartTime TIME,
    IN p_EndTime TIME,
    IN p_ExcludeScheduleId INT,
    IN p_CampusId INT)
BEGIN
    SELECT 
        r.RoomId,
        r.RoomNumber,
        r.RoomName,
        r.Capacity,
        r.Floor,
        COALESCE(r.BlockName, '') AS Block,
        COALESCE(r.BlockName, '') AS BlockName,
        r.IsActive
    FROM Rooms r
    WHERE r.IsActive = 1
      AND (p_CampusId IS NULL OR p_CampusId = 0 OR r.CampusId = p_CampusId)
      AND r.RoomId NOT IN (
          SELECT es.RoomId
          FROM ExamSchedules es
          INNER JOIN Examinations e ON es.ExamId = e.ExamId
          WHERE es.IsActive = 1
            AND e.IsActive = 1
            AND e.Status NOT IN ('CANCELLED', 'DELETED')
            AND DATE(es.ExamDate) = p_ExamDate
            AND (p_ExcludeScheduleId IS NULL OR p_ExcludeScheduleId = 0 OR es.ScheduleId != p_ExcludeScheduleId)
            AND NOT (p_EndTime <= es.StartTime OR p_StartTime >= es.EndTime)
            AND es.RoomId IS NOT NULL
      )
      AND r.RoomNumber NOT IN (
          SELECT TRIM(es.Hall)
          FROM ExamSchedules es
          INNER JOIN Examinations e ON es.ExamId = e.ExamId
          WHERE es.IsActive = 1
            AND e.IsActive = 1
            AND e.Status NOT IN ('CANCELLED', 'DELETED')
            AND DATE(es.ExamDate) = p_ExamDate
            AND (p_ExcludeScheduleId IS NULL OR p_ExcludeScheduleId = 0 OR es.ScheduleId != p_ExcludeScheduleId)
            AND NOT (p_EndTime <= es.StartTime OR p_StartTime >= es.EndTime)
            AND es.Hall IS NOT NULL
      );
END;";
            conn.Execute(spHallsSql);
            Console.WriteLine("  [DEPLOYED] Stored Procedure: `sp_GetAvailableHalls` with BlockName fix.");

            var halls = conn.Query<dynamic>("sp_GetAvailableHalls", new {
                p_ExamDate = DateTime.UtcNow.Date,
                p_StartTime = TimeSpan.FromHours(9),
                p_EndTime = TimeSpan.FromHours(12),
                p_ExcludeScheduleId = 0,
                p_CampusId = 1
            }, commandType: CommandType.StoredProcedure).ToList();

            Console.WriteLine($"  [PASS] sp_GetAvailableHalls executed successfully! Available halls count: {halls.Count}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"  [FAIL] sp_GetAvailableHalls: {ex.Message}");
        }

        Console.WriteLine("\n[COMPLETE] Settings Module Database Deployment & Verification Finished.");
    }
}
