DROP PROCEDURE IF EXISTS sp_GetPagedFaculties;
DELIMITER //
CREATE PROCEDURE sp_GetPagedFaculties(
    IN p_SearchTerm VARCHAR(100),
    IN p_Department VARCHAR(100),
    IN p_Designation VARCHAR(100),
    IN p_Status VARCHAR(50),
    IN p_SortBy VARCHAR(50),
    IN p_SortOrder VARCHAR(10),
    IN p_PageNumber INT,
    IN p_PageSize INT
)
BEGIN
    DECLARE v_Offset INT;
    SET v_Offset = (IFNULL(p_PageNumber, 1) - 1) * IFNULL(p_PageSize, 10);

    -- Result Set 1: Total Count
    SELECT COUNT(*) 
    FROM Faculties f
    LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId
    WHERE (f.IsDeleted = 0 OR f.IsDeleted IS NULL)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR 
           f.FirstName LIKE CONCAT('%', p_SearchTerm, '%') OR 
           f.LastName LIKE CONCAT('%', p_SearchTerm, '%') OR 
           f.EmployeeId LIKE CONCAT('%', p_SearchTerm, '%') OR 
           f.Email LIKE CONCAT('%', p_SearchTerm, '%') OR
           f.Mobile LIKE CONCAT('%', p_SearchTerm, '%'))
      AND (p_Department IS NULL OR p_Department = '' OR d.DepartmentName = p_Department OR d.DepartmentCode = p_Department)
      AND (p_Designation IS NULL OR p_Designation = '' OR f.Designation = p_Designation)
      AND (p_Status IS NULL OR p_Status = '' OR f.Status = p_Status);

    -- Result Set 2: Paged Items
    SELECT 
        f.Id,
        f.EmployeeId,
        f.FirstName,
        f.LastName,
        f.Gender,
        f.DateOfBirth,
        f.Aadhaar,
        f.Mobile,
        f.Email,
        f.BloodGroup,
        f.Qualification,
        f.Designation,
        f.DepartmentId,
        d.DepartmentName AS Department,
        f.JoiningDate,
        f.Experience,
        f.Username,
        f.Password,
        f.Status,
        f.PhotoPath,
        f.CreatedAt,
        f.UpdatedAt,
        f.IsDeleted
    FROM Faculties f
    LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId
    WHERE (f.IsDeleted = 0 OR f.IsDeleted IS NULL)
      AND (p_SearchTerm IS NULL OR p_SearchTerm = '' OR 
           f.FirstName LIKE CONCAT('%', p_SearchTerm, '%') OR 
           f.LastName LIKE CONCAT('%', p_SearchTerm, '%') OR 
           f.EmployeeId LIKE CONCAT('%', p_SearchTerm, '%') OR 
           f.Email LIKE CONCAT('%', p_SearchTerm, '%') OR
           f.Mobile LIKE CONCAT('%', p_SearchTerm, '%'))
      AND (p_Department IS NULL OR p_Department = '' OR d.DepartmentName = p_Department OR d.DepartmentCode = p_Department)
      AND (p_Designation IS NULL OR p_Designation = '' OR f.Designation = p_Designation)
      AND (p_Status IS NULL OR p_Status = '' OR f.Status = p_Status)
    ORDER BY 
        CASE WHEN p_SortBy = 'FirstName' AND (p_SortOrder IS NULL OR p_SortOrder = 'ASC') THEN f.FirstName END ASC,
        CASE WHEN p_SortBy = 'FirstName' AND p_SortOrder = 'DESC' THEN f.FirstName END DESC,
        CASE WHEN p_SortBy = 'LastName' AND (p_SortOrder IS NULL OR p_SortOrder = 'ASC') THEN f.LastName END ASC,
        CASE WHEN p_SortBy = 'LastName' AND p_SortOrder = 'DESC' THEN f.LastName END DESC,
        CASE WHEN p_SortBy = 'EmployeeId' AND (p_SortOrder IS NULL OR p_SortOrder = 'ASC') THEN f.EmployeeId END ASC,
        CASE WHEN p_SortBy = 'EmployeeId' AND p_SortOrder = 'DESC' THEN f.EmployeeId END DESC,
        CASE WHEN (p_SortBy IS NULL OR p_SortBy = '' OR p_SortBy = 'Id') THEN f.Id END DESC
    LIMIT p_PageSize OFFSET v_Offset;
END //
DELIMITER ;
