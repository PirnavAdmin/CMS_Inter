DROP PROCEDURE IF EXISTS sp_GetPeriods;
DELIMITER //
CREATE PROCEDURE sp_GetPeriods()
BEGIN
    SELECT 
        PeriodId,
        PeriodName,
        StartTime,
        EndTime,
        DisplayOrder,
        IsBreak,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM Periods
    ORDER BY DisplayOrder ASC, StartTime ASC;
END //
DELIMITER ;
