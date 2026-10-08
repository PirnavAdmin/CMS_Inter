using System;
using System.Threading.Tasks;
using MySqlConnector;
using Dapper;

namespace TestSp
{
    class Program
    {
        static async Task Main(string[] args)
        {
            var cs = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;ConnectionTimeout=60;";
            using var conn = new MySqlConnection(cs);
            await conn.OpenAsync();
            try
            {
                // Alter table column
                await conn.ExecuteAsync("ALTER TABLE NumberSeriesConfigurations MODIFY SeriesCode VARCHAR(255) NOT NULL;");
                Console.WriteLine("Altered NumberSeriesConfigurations table successfully.");

                // Re-create sp_GenerateNextNumberSeries with VARCHAR(255)
                var sp1 = @"
DROP PROCEDURE IF EXISTS `sp_GenerateNextNumberSeries`;
CREATE PROCEDURE `sp_GenerateNextNumberSeries`(
    IN p_SeriesCode VARCHAR(255),
    IN p_CampusId INT,
    IN p_BaseSeriesCode VARCHAR(255)
)
BEGIN
    DECLARE v_Id INT;
    DECLARE v_CurrentSequence BIGINT;
    DECLARE v_StartNumber INT;
    
    DECLARE v_BaseId INT;
    DECLARE v_BaseStartNum INT;

    SELECT `Id`, `CurrentSequence`, `StartNumber`
    INTO v_Id, v_CurrentSequence, v_StartNumber
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = p_SeriesCode AND (`CampusId` = p_CampusId OR `CampusId` <=> p_CampusId)
    LIMIT 1;

    IF v_Id IS NOT NULL THEN
        IF v_CurrentSequence < v_StartNumber THEN
            SET v_CurrentSequence = v_StartNumber;
        ELSE
            SET v_CurrentSequence = v_CurrentSequence + 1;
        END IF;

        UPDATE `NumberSeriesConfigurations`
        SET `CurrentSequence` = v_CurrentSequence, `UpdatedAt` = UTC_TIMESTAMP()
        WHERE `Id` = v_Id;
    ELSE
        SELECT `Id`, `StartNumber`
        INTO v_BaseId, v_BaseStartNum
        FROM `NumberSeriesConfigurations`
        WHERE `SeriesCode` = p_BaseSeriesCode AND (CampusId = p_CampusId OR CampusId IS NULL)
        ORDER BY CampusId DESC
        LIMIT 1;

        IF v_BaseId IS NOT NULL THEN
            SET v_CurrentSequence = v_BaseStartNum;

            INSERT INTO `NumberSeriesConfigurations` 
            (`SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, `IsActive`, `CreatedAt`, `UpdatedAt`, `CampusId`)
            SELECT 
                p_SeriesCode, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, v_CurrentSequence, `Description`, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP(), p_CampusId
            FROM `NumberSeriesConfigurations`
            WHERE `Id` = v_BaseId;
        END IF;
    END IF;
    
    SELECT * FROM `NumberSeriesConfigurations` 
    WHERE `SeriesCode` = p_SeriesCode AND (`CampusId` = p_CampusId OR `CampusId` <=> p_CampusId) 
    LIMIT 1;
END;
";
                await conn.ExecuteAsync(sp1);
                Console.WriteLine("Recreated sp_GenerateNextNumberSeries successfully.");

                // Also update other SPs dealing with SeriesCode to use 255
                var sp2 = @"
DROP PROCEDURE IF EXISTS `sp_GetNumberSeriesByCode`;
CREATE PROCEDURE `sp_GetNumberSeriesByCode`(
    IN p_SeriesCode VARCHAR(255),
    IN p_CampusId INT
)
BEGIN
    SELECT * FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = p_SeriesCode AND (`CampusId` = p_CampusId OR `CampusId` <=> p_CampusId)
    LIMIT 1;
END;
";
                await conn.ExecuteAsync(sp2);
                Console.WriteLine("Recreated sp_GetNumberSeriesByCode successfully.");
                
                var sp3 = @"
DROP PROCEDURE IF EXISTS `sp_GetMaxSequenceForBaseSeries`;
CREATE PROCEDURE `sp_GetMaxSequenceForBaseSeries`(
    IN p_BaseCode VARCHAR(255),
    IN p_CampusId INT,
    IN p_Board VARCHAR(255),
    IN p_AcademicYear VARCHAR(100)
)
BEGIN
    SELECT MAX(CurrentSequence) 
    FROM NumberSeriesConfigurations 
    WHERE (SeriesCode = p_BaseCode OR SeriesCode LIKE CONCAT(p_BaseCode, '|%'))
      AND (CampusId = p_CampusId OR CampusId IS NULL);
END;
";
                await conn.ExecuteAsync(sp3);
                Console.WriteLine("Recreated sp_GetMaxSequenceForBaseSeries successfully.");

                var sp4 = @"
DROP PROCEDURE IF EXISTS `sp_UpdateNumberSeriesByCode`;
CREATE PROCEDURE `sp_UpdateNumberSeriesByCode`(
    IN p_SeriesCode VARCHAR(255),
    IN p_Prefix VARCHAR(50),
    IN p_FormatPattern VARCHAR(100),
    IN p_NumberLength INT,
    IN p_StartNumber INT,
    IN p_Description TEXT,
    IN p_CampusId INT
)
BEGIN
    UPDATE `NumberSeriesConfigurations`
    SET 
        `Prefix` = p_Prefix,
        `FormatPattern` = p_FormatPattern,
        `NumberLength` = p_NumberLength,
        `StartNumber` = p_StartNumber,
        `Description` = p_Description,
        `UpdatedAt` = UTC_TIMESTAMP()
    WHERE `SeriesCode` = p_SeriesCode AND (`CampusId` = p_CampusId OR `CampusId` <=> p_CampusId);
END;
";
                await conn.ExecuteAsync(sp4);
                Console.WriteLine("Recreated sp_UpdateNumberSeriesByCode successfully.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
            }
        }
    }
}
