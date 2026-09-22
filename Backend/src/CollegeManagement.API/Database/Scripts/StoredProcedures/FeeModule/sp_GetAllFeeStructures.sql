DROP PROCEDURE IF EXISTS sp_GetAllFeeStructures;
DELIMITER //
CREATE PROCEDURE sp_GetAllFeeStructures()
BEGIN
    SELECT 
        fs.Id,
        fs.BoardId,
        b.BoardName,
        fs.AcademicYearId,
        ay.AcademicYearName,
        fs.GroupId,
        g.GroupName,
        fs.FeeType,
        fs.Amount,
        fs.DueDate,
        fs.IsActive
    FROM FeeStructures fs
    LEFT JOIN Boards b ON b.BoardId = fs.BoardId
    LEFT JOIN AcademicYears ay ON ay.AcademicYearId = fs.AcademicYearId
    LEFT JOIN `Groups` g ON g.GroupId = fs.GroupId
    WHERE fs.IsActive = 1
    ORDER BY fs.Id DESC;
END //
DELIMITER ;
