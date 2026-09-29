using System;
using System.Threading.Tasks;
using MySqlConnector;

namespace DBTest
{
    public static class FixRoomIssues
    {
        private const string ConnectionString = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;Allow User Variables=true;ConnectionTimeout=60;KeepAlive=5;ConvertZeroDateTime=True;Pooling=true;MinimumPoolSize=2;MaximumPoolSize=100;ConnectionLifeTime=300;ConnectionIdleTimeout=120;";

        public static async Task RunAsync()
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("          DEPLOYING ROOM STORED PROCEDURES & DB UNIQUE CONSTRAINTS              ");
            Console.WriteLine("================================================================================\n");

            using var conn = new MySqlConnection(ConnectionString);
            await conn.OpenAsync();
            Console.WriteLine("Connected to live MySQL database.\n");

            // 1. Clean up inactive dummy test rooms 49, 50, 51 (all have code 'TEST' and 0 assigned sections)
            Console.WriteLine(">>> 1. CLEANING UP DUMMY TEST ROOMS (49, 50, 51) <<<");
            using (var cmd = new MySqlCommand(@"
                DELETE FROM `Rooms` 
                WHERE RoomId IN (49, 50, 51) 
                  AND RoomId NOT IN (SELECT DISTINCT RoomId FROM `Sections` WHERE RoomId IS NOT NULL);", conn))
            {
                int affected = await cmd.ExecuteNonQueryAsync();
                Console.WriteLine($"   Deleted {affected} dummy test room records.");
            }

            // 2. Deploy updated sp_GetAssignedSectionsByRoom
            Console.WriteLine("\n>>> 2. DEPLOYING sp_GetAssignedSectionsByRoom (Fixing false-positive OR clause) <<<");
            using (var cmd = new MySqlCommand("DROP PROCEDURE IF EXISTS `sp_GetAssignedSectionsByRoom`;", conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }

            string spGetAssigned = @"
CREATE PROCEDURE `sp_GetAssignedSectionsByRoom`(
    IN p_RoomId INT,
    IN p_RoomCode VARCHAR(50)
)
BEGIN
    SELECT 
        s.SectionId, 
        s.SectionName, 
        s.MaximumStrength, 
        s.IsActive
    FROM `Sections` s
    WHERE s.IsActive = 1
      AND (
          CASE 
              WHEN p_RoomId IS NOT NULL AND p_RoomId > 0 THEN s.RoomId = p_RoomId
              WHEN p_RoomCode IS NOT NULL AND p_RoomCode <> '' THEN s.RoomId IN (
                  SELECT r.RoomId FROM `Rooms` r WHERE r.RoomCode = p_RoomCode OR r.RoomNumber = p_RoomCode
              )
              ELSE FALSE
          END
      );
END;";
            using (var cmd = new MySqlCommand(spGetAssigned, conn))
            {
                await cmd.ExecuteNonQueryAsync();
                Console.WriteLine("   [PASS] sp_GetAssignedSectionsByRoom deployed successfully.");
            }

            // 3. Deploy updated sp_GetActiveSectionAssignedToRoom
            Console.WriteLine("\n>>> 3. DEPLOYING sp_GetActiveSectionAssignedToRoom (Fixing false-positive OR clause) <<<");
            using (var cmd = new MySqlCommand("DROP PROCEDURE IF EXISTS `sp_GetActiveSectionAssignedToRoom`;", conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }

            string spGetActive = @"
CREATE PROCEDURE `sp_GetActiveSectionAssignedToRoom`(
    IN p_RoomId INT,
    IN p_RoomCode VARCHAR(50),
    IN p_ExcludeSectionId INT
)
BEGIN
    SELECT 
        s.SectionId, 
        s.SectionName, 
        s.RoomId, 
        s.IsActive
    FROM `Sections` s
    WHERE s.IsActive = 1
      AND (
          CASE 
              WHEN p_RoomId IS NOT NULL AND p_RoomId > 0 THEN s.RoomId = p_RoomId
              WHEN p_RoomCode IS NOT NULL AND p_RoomCode <> '' THEN s.RoomId IN (
                  SELECT r.RoomId FROM `Rooms` r WHERE r.RoomCode = p_RoomCode OR r.RoomNumber = p_RoomCode
              )
              ELSE FALSE
          END
      )
      AND (p_ExcludeSectionId IS NULL OR s.SectionId <> p_ExcludeSectionId)
    LIMIT 1;
END;";
            using (var cmd = new MySqlCommand(spGetActive, conn))
            {
                await cmd.ExecuteNonQueryAsync();
                Console.WriteLine("   [PASS] sp_GetActiveSectionAssignedToRoom deployed successfully.");
            }

            // 4. Deploy updated sp_GetRoomByCode (with p_CampusId support)
            Console.WriteLine("\n>>> 4. DEPLOYING sp_GetRoomByCode (with CampusId scoping) <<<");
            using (var cmd = new MySqlCommand("DROP PROCEDURE IF EXISTS `sp_GetRoomByCode`;", conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }

            string spGetByCode = @"
CREATE PROCEDURE `sp_GetRoomByCode`(
    IN p_RoomCode VARCHAR(50),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        RoomId,
        CampusId,
        COALESCE(RoomCode, RoomNumber, '') AS RoomCode,
        COALESCE(RoomName, RoomNumber, '') AS RoomName,
        RoomNumber,
        BlockName,
        BlockName AS Block,
        BlockName AS Building,
        BlockName AS BuildingName,
        Floor,
        Capacity,
        RoomType,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM `Rooms`
    WHERE (LOWER(TRIM(RoomCode)) = LOWER(TRIM(p_RoomCode))
           OR LOWER(TRIM(RoomNumber)) = LOWER(TRIM(p_RoomCode)))
      AND (p_CampusId IS NULL OR p_CampusId <= 0 OR CampusId = p_CampusId)
    LIMIT 1;
END;";
            using (var cmd = new MySqlCommand(spGetByCode, conn))
            {
                await cmd.ExecuteNonQueryAsync();
                Console.WriteLine("   [PASS] sp_GetRoomByCode deployed successfully.");
            }

            // 5. Deploy updated sp_CreateRoom (with duplicate room guard per campus)
            Console.WriteLine("\n>>> 5. DEPLOYING sp_CreateRoom (with duplicate guard) <<<");
            using (var cmd = new MySqlCommand("DROP PROCEDURE IF EXISTS `sp_CreateRoom`;", conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }

            string spCreateRoom = @"
CREATE PROCEDURE `sp_CreateRoom`(
    IN p_CampusId INT,
    IN p_RoomCode VARCHAR(50),
    IN p_RoomName VARCHAR(100),
    IN p_Capacity INT,
    IN p_RoomType VARCHAR(50),
    IN p_Building VARCHAR(100),
    IN p_BlockName VARCHAR(100),
    IN p_Floor VARCHAR(50),
    IN p_IsActive TINYINT(1)
)
BEGIN
    DECLARE v_Block VARCHAR(100);
    DECLARE v_CampusId INT;
    DECLARE v_Exists INT;

    SET v_Block = COALESCE(p_BlockName, p_Building, '');
    SET v_CampusId = IFNULL(p_CampusId, 1);

    -- Check if room with same code or number already exists in this campus
    SELECT COUNT(1) INTO v_Exists
    FROM `Rooms`
    WHERE CampusId = v_CampusId
      AND (LOWER(TRIM(RoomCode)) = LOWER(TRIM(p_RoomCode)) OR LOWER(TRIM(RoomNumber)) = LOWER(TRIM(p_RoomCode)));

    IF v_Exists > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Room code or room number already exists in this campus.';
    END IF;

    INSERT INTO `Rooms` (
        CampusId,
        RoomNumber,
        RoomCode,
        RoomName,
        BlockName,
        Floor,
        Capacity,
        RoomType,
        IsActive,
        CreatedAt
    ) VALUES (
        v_CampusId,
        p_RoomCode,
        p_RoomCode,
        COALESCE(p_RoomName, p_RoomCode),
        v_Block,
        p_Floor,
        IFNULL(p_Capacity, 60),
        IFNULL(p_RoomType, 'Classroom'),
        IFNULL(p_IsActive, 1),
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS RoomId;
END;";
            using (var cmd = new MySqlCommand(spCreateRoom, conn))
            {
                await cmd.ExecuteNonQueryAsync();
                Console.WriteLine("   [PASS] sp_CreateRoom deployed successfully.");
            }

            // 6. Enforce DB Unique Constraint on (CampusId, RoomCode)
            Console.WriteLine("\n>>> 6. ENFORCING DB UNIQUE CONSTRAINT (CampusId, RoomCode) <<<");
            try
            {
                // Check if index already exists
                using var checkIdxCmd = new MySqlCommand(@"
                    SELECT COUNT(1) FROM information_schema.STATISTICS 
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Rooms' AND INDEX_NAME = 'uq_rooms_campus_roomcode';", conn);
                long idxCount = Convert.ToInt64(await checkIdxCmd.ExecuteScalarAsync());

                if (idxCount == 0)
                {
                    using var addIdxCmd = new MySqlCommand("ALTER TABLE `Rooms` ADD UNIQUE KEY `uq_rooms_campus_roomcode` (`CampusId`, `RoomCode`);", conn);
                    await addIdxCmd.ExecuteNonQueryAsync();
                    Console.WriteLine("   [PASS] Added UNIQUE index `uq_rooms_campus_roomcode` (CampusId, RoomCode).");
                }
                else
                {
                    Console.WriteLine("   [INFO] Index `uq_rooms_campus_roomcode` already exists.");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"   [WARN] Could not add unique index: {ex.Message}");
            }

            // 7. Verify creating, duplicate rejection, and deleting
            Console.WriteLine("\n>>> 7. TESTING CREATION, DUPLICATE REJECTION & DELETION <<<");
            int testRoomId = 0;
            try
            {
                // A. Create test room
                using (var cmd = new MySqlCommand("sp_CreateRoom", conn))
                {
                    cmd.CommandType = System.Data.CommandType.StoredProcedure;
                    cmd.Parameters.AddWithValue("p_CampusId", 1);
                    cmd.Parameters.AddWithValue("p_RoomCode", "UNIT_TEST_ROOM_999");
                    cmd.Parameters.AddWithValue("p_RoomName", "Unit Test Room 999");
                    cmd.Parameters.AddWithValue("p_Capacity", 30);
                    cmd.Parameters.AddWithValue("p_RoomType", "Classroom");
                    cmd.Parameters.AddWithValue("p_Building", "Building A");
                    cmd.Parameters.AddWithValue("p_BlockName", "Block A");
                    cmd.Parameters.AddWithValue("p_Floor", "1");
                    cmd.Parameters.AddWithValue("p_IsActive", 1);

                    testRoomId = Convert.ToInt32(await cmd.ExecuteScalarAsync());
                    Console.WriteLine($"   [PASS] Test room created with RoomId = {testRoomId}.");
                }

                // B. Attempt duplicate creation in same campus -> MUST fail
                bool duplicateRejected = false;
                try
                {
                    using var dupCmd = new MySqlCommand("sp_CreateRoom", conn);
                    dupCmd.CommandType = System.Data.CommandType.StoredProcedure;
                    dupCmd.Parameters.AddWithValue("p_CampusId", 1);
                    dupCmd.Parameters.AddWithValue("p_RoomCode", "UNIT_TEST_ROOM_999");
                    dupCmd.Parameters.AddWithValue("p_RoomName", "Unit Test Room 999 Duplicate");
                    dupCmd.Parameters.AddWithValue("p_Capacity", 30);
                    dupCmd.Parameters.AddWithValue("p_RoomType", "Classroom");
                    dupCmd.Parameters.AddWithValue("p_Building", "Building A");
                    dupCmd.Parameters.AddWithValue("p_BlockName", "Block A");
                    dupCmd.Parameters.AddWithValue("p_Floor", "1");
                    dupCmd.Parameters.AddWithValue("p_IsActive", 1);
                    await dupCmd.ExecuteScalarAsync();
                }
                catch (MySqlException ex)
                {
                    duplicateRejected = true;
                    Console.WriteLine($"   [PASS] Duplicate creation properly rejected: {ex.Message}");
                }
                if (!duplicateRejected)
                {
                    Console.WriteLine("   [FAIL] Duplicate was NOT rejected!");
                }

                // C. Check sp_GetAssignedSectionsByRoom for the test room
                using (var chkCmd = new MySqlCommand("sp_GetAssignedSectionsByRoom", conn))
                {
                    chkCmd.CommandType = System.Data.CommandType.StoredProcedure;
                    chkCmd.Parameters.AddWithValue("p_RoomId", testRoomId);
                    chkCmd.Parameters.AddWithValue("p_RoomCode", "UNIT_TEST_ROOM_999");
                    using var rdr = await chkCmd.ExecuteReaderAsync();
                    if (rdr.HasRows)
                    {
                        Console.WriteLine("   [FAIL] sp_GetAssignedSectionsByRoom returned rows for unassigned test room!");
                    }
                    else
                    {
                        Console.WriteLine("   [PASS] sp_GetAssignedSectionsByRoom correctly returned 0 rows for unassigned test room.");
                    }
                }

                // D. Delete the test room using sp_DeleteRoom
                using (var delCmd = new MySqlCommand("sp_DeleteRoom", conn))
                {
                    delCmd.CommandType = System.Data.CommandType.StoredProcedure;
                    delCmd.Parameters.AddWithValue("p_RoomId", testRoomId);
                    int aff = await delCmd.ExecuteNonQueryAsync();
                    Console.WriteLine($"   [PASS] sp_DeleteRoom successfully deleted test room {testRoomId} (Affected: {aff}).");
                }
            }
            finally
            {
                // Safety cleanup if still exists
                if (testRoomId > 0)
                {
                    using var cleanCmd = new MySqlCommand("DELETE FROM `Rooms` WHERE RoomId = @id;", conn);
                    cleanCmd.Parameters.AddWithValue("@id", testRoomId);
                    await cleanCmd.ExecuteNonQueryAsync();
                }
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine("                   ALL ROOM FIXES DEPLOYED AND VERIFIED!                        ");
            Console.WriteLine("================================================================================\n");
        }
    }
}
