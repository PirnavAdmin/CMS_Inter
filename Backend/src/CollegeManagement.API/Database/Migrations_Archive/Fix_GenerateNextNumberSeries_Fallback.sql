DROP PROCEDURE IF EXISTS `sp_GenerateNextNumberSeries`;
DELIMITER //

CREATE PROCEDURE `sp_GenerateNextNumberSeries`(
    IN p_SeriesCode VARCHAR(50),
    IN p_CampusId INT
)
BEGIN
    DECLARE v_CurrentSequence BIGINT;
    DECLARE v_FormatPattern VARCHAR(100);
    DECLARE v_Prefix VARCHAR(20);
    DECLARE v_NumberLength INT;
    DECLARE v_StartNumber INT;
    DECLARE v_Description VARCHAR(500);
    DECLARE v_NextNumber VARCHAR(100);
    DECLARE v_FoundCampusId INT;

    -- Step 1: Find the configuration (Prioritize exact Campus match, fallback to Global/NULL)
    SELECT `CurrentSequence`, `FormatPattern`, `Prefix`, `NumberLength`, `StartNumber`, `Description`, `CampusId`
    INTO v_CurrentSequence, v_FormatPattern, v_Prefix, v_NumberLength, v_StartNumber, v_Description, v_FoundCampusId
    FROM `NumberSeriesConfigurations`
    WHERE `SeriesCode` = p_SeriesCode
      AND (p_CampusId IS NULL OR CampusId = p_CampusId OR CampusId IS NULL)
    ORDER BY CASE WHEN CampusId = p_CampusId THEN 1 ELSE 0 END DESC
    LIMIT 1;

    IF v_CurrentSequence IS NOT NULL THEN
        -- Step 2: Check if we used the global fallback for a specific campus
        IF p_CampusId IS NOT NULL AND (v_FoundCampusId IS NULL OR v_FoundCampusId != p_CampusId) THEN
            -- We must NOT increment the global fallback. Create a new sequence for this campus!
            INSERT INTO `NumberSeriesConfigurations` 
                (`SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, `IsActive`, `CampusId`, `CreatedAt`, `UpdatedAt`)
            SELECT 
                `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `StartNumber`, `Description`, `IsActive`, p_CampusId, UTC_TIMESTAMP(), UTC_TIMESTAMP()
            FROM `NumberSeriesConfigurations`
            WHERE `SeriesCode` = p_SeriesCode AND CampusId IS NULL
            LIMIT 1;
            
            -- Set current sequence to start number for the first generated number
            SET v_CurrentSequence = v_StartNumber;
        ELSE
            -- Exact match found, safely increment
            IF v_CurrentSequence < v_StartNumber THEN
                SET v_CurrentSequence = v_StartNumber;
            ELSE
                SET v_CurrentSequence = v_CurrentSequence + 1;
            END IF;

            UPDATE `NumberSeriesConfigurations`
            SET `CurrentSequence` = v_CurrentSequence,
                `UpdatedAt` = UTC_TIMESTAMP()
            WHERE `SeriesCode` = p_SeriesCode
              AND (CampusId = p_CampusId OR (p_CampusId IS NULL AND CampusId IS NULL));
        END IF;

        -- Step 3: Format the next number
        SET v_NextNumber = CONCAT(IFNULL(v_Prefix, ''), LPAD(v_CurrentSequence, v_NumberLength, '0'));

        SELECT v_NextNumber AS `GeneratedNumber`;
    ELSE
        SELECT NULL AS `GeneratedNumber`;
    END IF;
END //

DELIMITER ;
