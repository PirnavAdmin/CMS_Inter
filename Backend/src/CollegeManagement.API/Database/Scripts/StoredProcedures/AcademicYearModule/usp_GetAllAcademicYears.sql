DROP PROCEDURE IF EXISTS usp_GetAllAcademicYears;
DELIMITER //
CREATE PROCEDURE usp_GetAllAcademicYears()
BEGIN
    SELECT 
        AcademicYearId,
        AcademicYearName,
        StartDate,
        EndDate,
        IsActive,
        CreatedAt,
        UpdatedAt
    FROM AcademicYears
    ORDER BY AcademicYearId DESC;
END //
DELIMITER ;
