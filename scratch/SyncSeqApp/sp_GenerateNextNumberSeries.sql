CREATE DEFINER=`u819242402_CLM`@`%` PROCEDURE `sp_GenerateNextNumberSeries`(
    IN p_SeriesCode VARCHAR(200),
    IN p_CampusId INT,
    IN p_BaseSeriesCode VARCHAR(50)
)
BEGIN
    DECLARE v_Id INT;
    DECLARE v_CurrentSequence BIGINT;
    DECLARE v_StartNumber INT;
    
    DECLARE v_BaseId INT;
    DECLARE v_BaseStartNum INT;
    DECLARE v_MaxGlobalSeq BIGINT;

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
            SELECT MAX(`CurrentSequence`)
            INTO v_MaxGlobalSeq
            FROM `NumberSeriesConfigurations`
            WHERE `SeriesCode` LIKE CONCAT(p_BaseSeriesCode, '%')
              AND (`CampusId` = p_CampusId OR `CampusId` <=> p_CampusId);
              
            IF v_MaxGlobalSeq IS NOT NULL AND v_MaxGlobalSeq >= v_BaseStartNum THEN
                SET v_CurrentSequence = v_MaxGlobalSeq;
            ELSE
                SET v_CurrentSequence = v_BaseStartNum - 1;
            END IF;
            
            SET v_CurrentSequence = v_CurrentSequence + 1;

            INSERT INTO `NumberSeriesConfigurations` 
            (`SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, `IsActive`, `CreatedAt`, `UpdatedAt`, `CampusId`)
            SELECT 
                p_SeriesCode, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, v_CurrentSequence, `Description`, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP(), p_CampusId
            FROM `NumberSeriesConfigurations`
            WHERE `Id` = v_BaseId;
        END IF;
    END IF;
    
    SELECT * FROM `NumberSeriesConfigurations` 
    WHERE `SeriesCode` = p_SeriesCode AND `CampusId` <=> p_CampusId 
    LIMIT 1;
END