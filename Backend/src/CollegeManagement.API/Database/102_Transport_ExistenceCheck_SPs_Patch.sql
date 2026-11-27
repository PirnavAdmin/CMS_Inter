-- ============================================================
-- 102: Transport Existence-Check SPs — CollegeId Tenant Scope
-- Patches sp_CheckPickupPointExists and sp_CheckPickupPointSequenceExists
-- to accept p_CollegeId and filter results per-tenant.
-- Safe: p_CollegeId is optional (NULL = SuperAdmin pass-through)
-- ============================================================

DROP PROCEDURE IF EXISTS sp_CheckPickupPointExists;
DELIMITER $$
CREATE PROCEDURE sp_CheckPickupPointExists(
    IN p_RouteId     BIGINT,
    IN p_StopName    VARCHAR(255),
    IN p_ExcludeId   BIGINT,
    IN p_CollegeId   INT
)
BEGIN
    SELECT COUNT(*) FROM PickupPoints
    WHERE RouteId = p_RouteId
      AND LOWER(TRIM(StopName)) = LOWER(TRIM(p_StopName))
      AND (p_ExcludeId IS NULL OR Id != p_ExcludeId)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId);
END$$
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_CheckPickupPointSequenceExists;
DELIMITER $$
CREATE PROCEDURE sp_CheckPickupPointSequenceExists(
    IN p_RouteId    BIGINT,
    IN p_SequenceNo INT,
    IN p_ExcludeId  BIGINT,
    IN p_CollegeId  INT
)
BEGIN
    SELECT COUNT(*) FROM PickupPoints
    WHERE RouteId = p_RouteId
      AND SequenceNo = p_SequenceNo
      AND (p_ExcludeId IS NULL OR Id != p_ExcludeId)
      AND (p_CollegeId IS NULL OR p_CollegeId <= 0 OR CollegeId = p_CollegeId);
END$$
DELIMITER ;
