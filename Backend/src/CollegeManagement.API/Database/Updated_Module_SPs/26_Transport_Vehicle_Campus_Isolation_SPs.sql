-- =============================================================================
-- Migration: Transport Vehicle Campus Isolation Stored Procedures
-- Purpose:
--   1. sp_GetTransportVehicles: filters by p_CampusId, returns authoritative CampusId and CampusName.
--   2. sp_CreateTransportVehicles: receives p_CampusId and persists it.
--   3. sp_UpdateTransportVehicles: receives p_CampusId; preserves existing campus if omitted or null.
--   4. sp_GetTransportVehiclesById: joins Campuses to return CampusId and CampusName.
--   5. sp_GetTransportVehicleByIdOrNumber: joins Campuses to return CampusId and CampusName.
-- =============================================================================

DELIMITER //

DROP PROCEDURE IF EXISTS `sp_GetTransportVehicles`//
CREATE PROCEDURE `sp_GetTransportVehicles`(
    IN p_Search VARCHAR(100),
    IN p_VehicleType VARCHAR(50),
    IN p_Status TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    SELECT 
        v.`VehicleId`,
        v.`VehicleNumber`,
        COALESCE(v.`VehicleRegistrationNo`, v.`VehicleNumber`) AS RegistrationNumber,
        COALESCE(v.`VehicleName`, v.`VehicleNumber`) AS VehicleName,
        v.`VehicleType`,
        v.`Make` AS Manufacturer,
        v.`Model`,
        v.`ChassisNumber`,
        v.`EngineNumber`,
        v.`GpsDeviceId`,
        v.`InsuranceNumber`,
        v.`InsuranceExpiry`,
        v.`PollutionExpiry`,
        v.`FitnessExpiry`,
        v.`Capacity`,
        v.`IsAC`,
        CASE WHEN v.`Status` = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        v.`CreatedAt`,
        v.`CampusId`,
        c.`CampusName`
    FROM `TransportVehicles` v
    LEFT JOIN `Campuses` c ON v.`CampusId` = c.`CampusId`
    WHERE v.`IsDeleted` = 0
      AND (
          p_CampusId IS NULL OR p_CampusId <= 0 
          OR v.`CampusId` = p_CampusId
      )
      AND (
          p_Status IS NULL 
          OR (p_Status = 1 AND v.`Status\` = 1)
          OR (p_Status = 0 AND v.\`Status\` = 0)
      )
      AND (
          p_VehicleType IS NULL OR p_VehicleType = '' 
          OR LOWER(v.\`VehicleType\`) = LOWER(p_VehicleType)
      )
      AND (
          p_Search IS NULL OR p_Search = ''
          OR LOWER(v.\`VehicleNumber\`) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(v.\`VehicleRegistrationNo\`, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(v.\`VehicleName\`, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(v.\`VehicleType\`, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
          OR LOWER(COALESCE(v.\`GpsDeviceId\`, '')) LIKE CONCAT('%', LOWER(p_Search), '%')
      )
    ORDER BY v.\`VehicleNumber\` ASC;
END//

DROP PROCEDURE IF EXISTS \`sp_CreateTransportVehicles\`//
CREATE PROCEDURE \`sp_CreateTransportVehicles\`(
    IN p_VehicleNumber VARCHAR(50),
    IN p_VehicleType VARCHAR(50),
    IN p_Capacity INT,
    IN p_IsActive TINYINT(1),
    IN p_VehicleRegistrationNo VARCHAR(50),
    IN p_MaximumCapacity INT,
    IN p_Make VARCHAR(100),
    IN p_Model VARCHAR(100),
    IN p_YearOfManufacture INT,
    IN p_ChassisNumber VARCHAR(100),
    IN p_EngineNumber VARCHAR(100),
    IN p_InsuranceExpiry DATE,
    IN p_FitnessExpiry DATE,
    IN p_PollutionExpiry DATE,
    IN p_GpsDeviceId VARCHAR(100),
    IN p_IsAC TINYINT(1),
    IN p_InsuranceNumber VARCHAR(100),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CampusId INT
)
BEGIN
    INSERT INTO \`TransportVehicles\` (
        \`VehicleNumber\`, \`VehicleRegistrationNo\`, \`VehicleName\`, \`VehicleType\`,
        \`Make\`, \`Model\`, \`ChassisNumber\`, \`EngineNumber\`, \`GpsDeviceId\`, \`InsuranceNumber\`,
        \`InsuranceExpiry\`, \`PollutionExpiry\`, \`FitnessExpiry\`, \`Capacity\`, \`IsAC\`,
        \`Status\`, \`IsDeleted\`, \`CreatedBy\`, \`CreatedAt\`, \`CampusId\`
    ) VALUES (
        p_VehicleNumber, COALESCE(p_VehicleRegistrationNo, p_VehicleNumber), p_VehicleNumber, COALESCE(p_VehicleType, 'Bus'),
        p_Make, p_Model, p_ChassisNumber, p_EngineNumber, p_GpsDeviceId, p_InsuranceNumber,
        p_InsuranceExpiry, p_PollutionExpiry, p_FitnessExpiry, COALESCE(p_Capacity, 40), COALESCE(p_IsAC, 1),
        COALESCE(p_IsActive, 1), 0, p_CreatedBy, NOW(), p_CampusId
    );
    SELECT LAST_INSERT_ID() AS VehicleId;
END//

DROP PROCEDURE IF EXISTS \`sp_UpdateTransportVehicles\`//
CREATE PROCEDURE \`sp_UpdateTransportVehicles\`(
    IN p_Id BIGINT,
    IN p_VehicleNumber VARCHAR(50),
    IN p_VehicleType VARCHAR(50),
    IN p_Capacity INT,
    IN p_IsActive TINYINT(1),
    IN p_VehicleRegistrationNo VARCHAR(50),
    IN p_MaximumCapacity INT,
    IN p_Make VARCHAR(100),
    IN p_Model VARCHAR(100),
    IN p_YearOfManufacture INT,
    IN p_ChassisNumber VARCHAR(100),
    IN p_EngineNumber VARCHAR(100),
    IN p_InsuranceExpiry DATE,
    IN p_FitnessExpiry DATE,
    IN p_PollutionExpiry DATE,
    IN p_GpsDeviceId VARCHAR(100),
    IN p_IsAC TINYINT(1),
    IN p_InsuranceNumber VARCHAR(100),
    IN p_CreatedBy BIGINT,
    IN p_UpdatedBy BIGINT,
    IN p_CampusId INT
)
BEGIN
    UPDATE \`TransportVehicles\`
    SET 
        \`VehicleNumber\` = COALESCE(p_VehicleNumber, \`VehicleNumber\`),
        \`VehicleRegistrationNo\` = COALESCE(p_VehicleRegistrationNo, \`VehicleRegistrationNo\`),
        \`VehicleType\` = COALESCE(p_VehicleType, \`VehicleType\`),
        \`Make\` = p_Make,
        \`Model\` = p_Model,
        \`ChassisNumber\` = p_ChassisNumber,
        \`EngineNumber\` = p_EngineNumber,
        \`GpsDeviceId\` = p_GpsDeviceId,
        \`InsuranceNumber\` = p_InsuranceNumber,
        \`InsuranceExpiry\` = p_InsuranceExpiry,
        \`PollutionExpiry\` = p_PollutionExpiry,
        \`FitnessExpiry\` = p_FitnessExpiry,
        \`Capacity\` = COALESCE(p_Capacity, \`Capacity\`),
        \`IsAC\` = COALESCE(p_IsAC, \`IsAC\`),
        \`Status\` = COALESCE(p_IsActive, \`Status\`),
        \`CampusId\` = CASE 
            WHEN p_CampusId IS NOT NULL AND p_CampusId > 0 THEN p_CampusId 
            ELSE \`CampusId\` 
        END,
        \`UpdatedBy\` = p_UpdatedBy,
        \`UpdatedAt\` = NOW()
    WHERE \`VehicleId\` = p_Id AND \`IsDeleted\` = 0;
    
    SELECT ROW_COUNT() AS AffectedRows;
END//

DROP PROCEDURE IF EXISTS \`sp_GetTransportVehiclesById\`//
CREATE PROCEDURE \`sp_GetTransportVehiclesById\`(
    IN p_Id BIGINT
)
BEGIN
    SELECT 
        v.\`VehicleId\`,
        v.\`VehicleNumber\`,
        COALESCE(v.\`VehicleRegistrationNo\`, v.\`VehicleNumber\`) AS RegistrationNumber,
        COALESCE(v.\`VehicleName\`, v.\`VehicleNumber\`) AS VehicleName,
        v.\`VehicleType\`,
        v.\`Make\` AS Manufacturer,
        v.\`Model\`,
        v.\`ChassisNumber\`,
        v.\`EngineNumber\`,
        v.\`GpsDeviceId\`,
        v.\`InsuranceNumber\`,
        v.\`InsuranceExpiry\`,
        v.\`PollutionExpiry\`,
        v.\`FitnessExpiry\`,
        v.\`Capacity\`,
        v.\`IsAC\`,
        CASE WHEN v.\`Status\` = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        v.\`CreatedAt\`,
        v.\`CampusId\`,
        c.\`CampusName\`
    FROM \`TransportVehicles\` v
    LEFT JOIN \`Campuses\` c ON v.\`CampusId\` = c.\`CampusId\`
    WHERE v.\`VehicleId\` = p_Id AND v.\`IsDeleted\` = 0
    LIMIT 1;
END//

DROP PROCEDURE IF EXISTS \`sp_GetTransportVehicleByIdOrNumber\`//
CREATE PROCEDURE \`sp_GetTransportVehicleByIdOrNumber\`(
    IN p_SearchId BIGINT,
    IN p_SearchStr VARCHAR(100)
)
BEGIN
    SELECT 
        v.\`VehicleId\`,
        v.\`VehicleNumber\`,
        COALESCE(v.\`VehicleRegistrationNo\`, v.\`VehicleNumber\`) AS RegistrationNumber,
        COALESCE(v.\`VehicleName\`, v.\`VehicleNumber\`) AS VehicleName,
        v.\`VehicleType\`,
        v.\`Make\` AS Manufacturer,
        v.\`Model\`,
        v.\`ChassisNumber\`,
        v.\`EngineNumber\`,
        v.\`GpsDeviceId\`,
        v.\`InsuranceNumber\`,
        v.\`InsuranceExpiry\`,
        v.\`PollutionExpiry\`,
        v.\`FitnessExpiry\`,
        v.\`Capacity\`,
        v.\`IsAC\`,
        CASE WHEN v.\`Status\` = 1 THEN 'Active' ELSE 'Inactive' END AS Status,
        v.\`CreatedAt\`,
        v.\`CampusId\`,
        c.\`CampusName\`
    FROM \`TransportVehicles\` v
    LEFT JOIN \`Campuses\` c ON v.\`CampusId\` = c.\`CampusId\`
    WHERE v.\`IsDeleted\` = 0
      AND (v.\`VehicleId\` = p_SearchId OR LOWER(v.\`VehicleNumber\`) = LOWER(p_SearchStr) OR LOWER(v.\`VehicleRegistrationNo\`) = LOWER(p_SearchStr))
    LIMIT 1;
END//

DELIMITER ;
