DROP PROCEDURE IF EXISTS sp_UpdateFaculty;
DELIMITER //
CREATE PROCEDURE sp_UpdateFaculty(
    IN p_Id INT,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME(6),
    IN p_Aadhaar VARCHAR(12),
    IN p_Mobile VARCHAR(15),
    IN p_Email VARCHAR(150),
    IN p_BloodGroup VARCHAR(10),
    IN p_Qualification VARCHAR(100),
    IN p_Designation VARCHAR(100),
    IN p_DepartmentId INT,
    IN p_JoiningDate DATETIME(6),
    IN p_Experience DECIMAL(65,30),
    IN p_Status VARCHAR(20),
    IN p_PhotoPath VARCHAR(500)
)
BEGIN
    UPDATE Faculties SET
        FirstName = p_FirstName,
        LastName = p_LastName,
        Gender = p_Gender,
        DateOfBirth = p_DateOfBirth,
        Aadhaar = p_Aadhaar,
        Mobile = p_Mobile,
        Email = p_Email,
        BloodGroup = p_BloodGroup,
        Qualification = p_Qualification,
        Designation = p_Designation,
        DepartmentId = p_DepartmentId,
        JoiningDate = p_JoiningDate,
        Experience = p_Experience,
        Status = p_Status,
        PhotoPath = p_PhotoPath,
        UpdatedAt = NOW()
    WHERE Id = p_Id;
END //
DELIMITER ;
