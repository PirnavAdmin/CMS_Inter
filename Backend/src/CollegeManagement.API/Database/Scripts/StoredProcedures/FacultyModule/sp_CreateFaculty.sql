DROP PROCEDURE IF EXISTS sp_CreateFaculty;
DELIMITER //
CREATE PROCEDURE sp_CreateFaculty(
    IN p_EmployeeId VARCHAR(50),
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
    IN p_Username VARCHAR(100),
    IN p_Password VARCHAR(255),
    IN p_Status VARCHAR(20),
    IN p_PhotoPath VARCHAR(500)
)
BEGIN
    INSERT INTO Faculties (
        EmployeeId, FirstName, LastName, Gender, DateOfBirth, Aadhaar, Mobile, Email, BloodGroup, Qualification, Designation, DepartmentId, JoiningDate, Experience, Username, Password, Status, PhotoPath, CreatedAt, IsDeleted
    ) VALUES (
        p_EmployeeId, p_FirstName, p_LastName, p_Gender, p_DateOfBirth, p_Aadhaar, p_Mobile, p_Email, p_BloodGroup, p_Qualification, p_Designation, p_DepartmentId, p_JoiningDate, p_Experience, p_Username, p_Password, IFNULL(p_Status, 'Active'), p_PhotoPath, NOW(), 0
    );
    SELECT LAST_INSERT_ID() AS Id;
END //
DELIMITER ;
