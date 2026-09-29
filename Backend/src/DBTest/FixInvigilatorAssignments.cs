using System;
using System.Threading.Tasks;
using MySqlConnector;
using Dapper;

namespace DBTest
{
    public static class FixInvigilatorAssignments
    {
        private const string ConnectionString = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;ConnectionTimeout=60;KeepAlive=5;ConvertZeroDateTime=True;Pooling=true;MinimumPoolSize=2;MaximumPoolSize=100;ConnectionLifeTime=300;ConnectionIdleTimeout=120;";

        public static async Task RunAsync()
        {
            using var conn = new MySqlConnection(ConnectionString);
            await conn.OpenAsync();

            Console.WriteLine("=== 1. Deactivating schedules for deleted/inactive/cancelled examinations ===");
            var rowsUpdated = await conn.ExecuteAsync(@"
                UPDATE ExamSchedules es
                INNER JOIN Examinations e ON es.ExamId = e.ExamId
                SET es.IsActive = 0
                WHERE e.IsActive = 0 OR e.Status IN ('CANCELLED', 'DELETED');
            ");
            Console.WriteLine($"Deactivated {rowsUpdated} stale schedule rows.");

            Console.WriteLine("\n=== 2. Updating InvigilatorAssignments table Foreign Key to Staff(Id) ===");
            try
            {
                // Check existing foreign keys
                var existingFks = await conn.QueryAsync<string>(@"
                    SELECT CONSTRAINT_NAME
                    FROM information_schema.TABLE_CONSTRAINTS
                    WHERE TABLE_SCHEMA = 'u819242402_CLM_System'
                      AND TABLE_NAME = 'InvigilatorAssignments'
                      AND CONSTRAINT_TYPE = 'FOREIGN KEY';
                ");

                foreach (var fk in existingFks)
                {
                    Console.WriteLine($"Found existing FK: {fk}");
                }

                // Check if FK_InvigilatorAssignments_Staff_StaffId already exists
                var hasStaffFk = await conn.ExecuteScalarAsync<int>(@"
                    SELECT COUNT(*)
                    FROM information_schema.TABLE_CONSTRAINTS
                    WHERE TABLE_SCHEMA = 'u819242402_CLM_System'
                      AND TABLE_NAME = 'InvigilatorAssignments'
                      AND CONSTRAINT_NAME = 'FK_InvigilatorAssignments_Staff_StaffId';
                ");

                if (hasStaffFk == 0)
                {
                    await conn.ExecuteAsync(@"
                        ALTER TABLE `InvigilatorAssignments`
                        ADD CONSTRAINT `FK_InvigilatorAssignments_Staff_StaffId`
                        FOREIGN KEY (`InvigilatorId`) REFERENCES `Staff` (`Id`) ON DELETE CASCADE;
                    ");
                    Console.WriteLine("Added FK_InvigilatorAssignments_Staff_StaffId successfully.");
                }
                else
                {
                    Console.WriteLine("FK_InvigilatorAssignments_Staff_StaffId already exists.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error modifying InvigilatorAssignments FK: " + ex.Message);
            }

            Console.WriteLine("\n=== 3. Deploying updated sp_CheckInvigilatorConflict ===");
            await conn.ExecuteAsync("DROP PROCEDURE IF EXISTS `sp_CheckInvigilatorConflict`;");
            await conn.ExecuteAsync(@"
                CREATE PROCEDURE `sp_CheckInvigilatorConflict`(
                    IN p_ExamDate DATE,
                    IN p_StartTime TIME,
                    IN p_EndTime TIME,
                    IN p_Invigilator VARCHAR(150),
                    IN p_ExcludeScheduleId INT,
                    IN p_CampusId INT)
                BEGIN
                    SELECT COUNT(*) AS ConflictCount
                    FROM ExamSchedules es
                    INNER JOIN Examinations e ON es.ExamId = e.ExamId
                    WHERE es.IsActive = 1
                      AND e.IsActive = 1
                      AND e.Status NOT IN ('CANCELLED', 'DELETED')
                      AND DATE(es.ExamDate) = p_ExamDate
                      AND LOWER(TRIM(es.Invigilator)) = LOWER(TRIM(p_Invigilator))
                      AND (p_ExcludeScheduleId IS NULL OR p_ExcludeScheduleId = 0 OR es.ScheduleId != p_ExcludeScheduleId)
                      AND NOT (p_EndTime <= es.StartTime OR p_StartTime >= es.EndTime);
                END;
            ");
            Console.WriteLine("Deployed sp_CheckInvigilatorConflict.");

            Console.WriteLine("\n=== 4. Deploying updated sp_CheckRoomConflict ===");
            await conn.ExecuteAsync("DROP PROCEDURE IF EXISTS `sp_CheckRoomConflict`;");
            await conn.ExecuteAsync(@"
                CREATE PROCEDURE `sp_CheckRoomConflict`(
                    IN p_ExamDate DATE,
                    IN p_StartTime TIME,
                    IN p_EndTime TIME,
                    IN p_Hall VARCHAR(100),
                    IN p_ExcludeScheduleId INT,
                    IN p_CampusId INT)
                BEGIN
                    SELECT COUNT(*) AS ConflictCount
                    FROM ExamSchedules es
                    INNER JOIN Examinations e ON es.ExamId = e.ExamId
                    WHERE es.IsActive = 1
                      AND e.IsActive = 1
                      AND e.Status NOT IN ('CANCELLED', 'DELETED')
                      AND DATE(es.ExamDate) = p_ExamDate
                      AND LOWER(TRIM(es.Hall)) = LOWER(TRIM(p_Hall))
                      AND (p_ExcludeScheduleId IS NULL OR p_ExcludeScheduleId = 0 OR es.ScheduleId != p_ExcludeScheduleId)
                      AND NOT (p_EndTime <= es.StartTime OR p_StartTime >= es.EndTime);
                END;
            ");
            Console.WriteLine("Deployed sp_CheckRoomConflict.");

            Console.WriteLine("\n=== 5. Deploying updated sp_AssignInvigilator ===");
            await conn.ExecuteAsync("DROP PROCEDURE IF EXISTS `sp_AssignInvigilator`;");
            await conn.ExecuteAsync(@"
                CREATE PROCEDURE `sp_AssignInvigilator`(
                    IN p_ExamScheduleId INT,
                    IN p_InvigilatorId INT,
                    IN p_HallNumber VARCHAR(100),
                    IN p_CampusId INT)
                BEGIN
                    INSERT INTO InvigilatorAssignments (
                        ExamScheduleId,
                        InvigilatorId,
                        HallNumber,
                        AssignedAt
                    ) VALUES (
                        p_ExamScheduleId,
                        p_InvigilatorId,
                        COALESCE(p_HallNumber, ''),
                        UTC_TIMESTAMP()
                    )
                    ON DUPLICATE KEY UPDATE
                        HallNumber = VALUES(HallNumber),
                        AssignedAt = VALUES(AssignedAt);
                END;
            ");
            Console.WriteLine("Deployed sp_AssignInvigilator.");

            Console.WriteLine("\n=== 6. Deploying updated sp_GetInvigilatorsBySchedule ===");
            await conn.ExecuteAsync("DROP PROCEDURE IF EXISTS `sp_GetInvigilatorsBySchedule`;");
            await conn.ExecuteAsync(@"
                CREATE PROCEDURE `sp_GetInvigilatorsBySchedule`(
                    IN p_ExamScheduleId INT,
                    IN p_CampusId INT)
                BEGIN
                    SELECT 
                        ia.InvigilatorAssignmentId AS Id,
                        ia.InvigilatorAssignmentId,
                        ia.ExamScheduleId,
                        ia.InvigilatorId,
                        ia.HallNumber,
                        ia.AssignedAt,
                        COALESCE(s.Email, '') AS InvigilatorEmail,
                        CONCAT(COALESCE(s.FirstName, ''), ' ', COALESCE(s.LastName, '')) AS InvigilatorName
                    FROM InvigilatorAssignments ia
                    LEFT JOIN Staff s ON ia.InvigilatorId = s.Id
                    WHERE ia.ExamScheduleId = p_ExamScheduleId;
                END;
            ");
            Console.WriteLine("Deployed sp_GetInvigilatorsBySchedule.");

            Console.WriteLine("\n=== 7. Verification: Testing conflict check for 'roopa g' on 2026-11-02 09:00 - 12:00 ===");
            var conflictCount = await conn.ExecuteScalarAsync<int>(@"
                CALL sp_CheckInvigilatorConflict('2026-11-02', '09:00:00', '12:00:00', 'roopa g', 0, 0);
            ");
            Console.WriteLine($"Conflict count for 'roopa g': {conflictCount} (Expected: 0 now that Exam 104 is recognized as inactive)");

            Console.WriteLine("\n=== 8. Verification: Checking InvigilatorAssignments DDL ===");
            var ddlRow = await conn.QueryFirstOrDefaultAsync<dynamic>("SHOW CREATE TABLE InvigilatorAssignments;");
            if (ddlRow != null)
            {
                var dict = (System.Collections.Generic.IDictionary<string, object>)ddlRow;
                foreach (var kvp in dict)
                {
                    Console.WriteLine($"{kvp.Key}: {kvp.Value}");
                }
            }
        }
    }
}
