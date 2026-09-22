using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddFacultyStoredProcedures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. sp_GetPagedFaculties
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetPagedFaculties;");
            migrationBuilder.Sql("""
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
                    WHERE f.IsDeleted = 0
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
                    WHERE f.IsDeleted = 0
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
                END;
            """);

            // 2. sp_CreateFaculty
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CreateFaculty;");
            migrationBuilder.Sql("""
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
                        p_EmployeeId, p_FirstName, p_LastName, p_Gender, p_DateOfBirth, p_Aadhaar, p_Mobile, p_Email, p_BloodGroup, p_Qualification, p_Designation, p_DepartmentId, p_JoiningDate, p_Experience, p_Username, p_Password, p_Status, p_PhotoPath, NOW(), 0
                    );
                    SELECT LAST_INSERT_ID() AS Id;
                END;
            """);

            // 3. sp_UpdateFaculty
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_UpdateFaculty;");
            migrationBuilder.Sql("""
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
                END;
            """);

            // 4. sp_SoftDeleteFaculty
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_SoftDeleteFaculty;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_SoftDeleteFaculty(IN p_Id INT)
                BEGIN
                    UPDATE Faculties SET IsDeleted = 1, UpdatedAt = NOW() WHERE Id = p_Id;
                END;
            """);

            // 5. sp_GetFacultyDropdown
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetFacultyDropdown;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetFacultyDropdown()
                BEGIN
                    SELECT 
                        Id,
                        EmployeeId,
                        CONCAT(FirstName, ' ', LastName) AS FullName
                    FROM Faculties
                    WHERE IsDeleted = 0 AND Status = 'Active'
                    ORDER BY FirstName ASC;
                END;
            """);

            // 6. sp_GetFacultyByEmployeeId
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetFacultyByEmployeeId;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetFacultyByEmployeeId(IN p_EmployeeId VARCHAR(50))
                BEGIN
                    SELECT f.*, d.DepartmentName AS Department 
                    FROM Faculties f 
                    LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId 
                    WHERE f.EmployeeId = p_EmployeeId AND f.IsDeleted = 0;
                END;
            """);

            // 7. sp_GetFacultyByEmail
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetFacultyByEmail;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetFacultyByEmail(IN p_Email VARCHAR(150))
                BEGIN
                    SELECT f.*, d.DepartmentName AS Department 
                    FROM Faculties f 
                    LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId 
                    WHERE f.Email = p_Email AND f.IsDeleted = 0;
                END;
            """);

            // 8. sp_GetFacultyByMobile
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetFacultyByMobile;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetFacultyByMobile(IN p_Mobile VARCHAR(15))
                BEGIN
                    SELECT f.*, d.DepartmentName AS Department 
                    FROM Faculties f 
                    LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId 
                    WHERE f.Mobile = p_Mobile AND f.IsDeleted = 0;
                END;
            """);

            // 9. sp_GetFacultyByAadhaar
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetFacultyByAadhaar;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetFacultyByAadhaar(IN p_Aadhaar VARCHAR(12))
                BEGIN
                    SELECT f.*, d.DepartmentName AS Department 
                    FROM Faculties f 
                    LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId 
                    WHERE f.Aadhaar = p_Aadhaar AND f.IsDeleted = 0;
                END;
            """);

            // 10. sp_GetFacultyByUsername
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetFacultyByUsername;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetFacultyByUsername(IN p_Username VARCHAR(100))
                BEGIN
                    SELECT f.*, d.DepartmentName AS Department 
                    FROM Faculties f 
                    LEFT JOIN Departments d ON d.DepartmentId = f.DepartmentId 
                    WHERE f.Username = p_Username AND f.IsDeleted = 0;
                END;
            """);

            // 11. sp_GetFacultyPhotoPath
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetFacultyPhotoPath;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetFacultyPhotoPath(IN p_Id INT)
                BEGIN
                    SELECT PhotoPath FROM Faculties WHERE Id = p_Id AND IsDeleted = 0;
                END;
            """);

            // 12. sp_UpdateFacultyPhotoPath
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_UpdateFacultyPhotoPath;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_UpdateFacultyPhotoPath(IN p_Id INT, IN p_PhotoPath VARCHAR(500))
                BEGIN
                    UPDATE Faculties SET PhotoPath = p_PhotoPath, UpdatedAt = NOW() WHERE Id = p_Id;
                END;
            """);

            // 13. Unique Check procedures
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CheckEmployeeIdUnique;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_CheckEmployeeIdUnique(IN p_EmployeeId VARCHAR(50), IN p_ExcludeId INT)
                BEGIN
                    SELECT COUNT(*) FROM Faculties WHERE EmployeeId = p_EmployeeId AND IsDeleted = 0 AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
                END;
            """);

            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CheckEmailUnique;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_CheckEmailUnique(IN p_Email VARCHAR(150), IN p_ExcludeId INT)
                BEGIN
                    SELECT COUNT(*) FROM Faculties WHERE Email = p_Email AND IsDeleted = 0 AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
                END;
            """);

            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CheckMobileUnique;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_CheckMobileUnique(IN p_Mobile VARCHAR(15), IN p_ExcludeId INT)
                BEGIN
                    SELECT COUNT(*) FROM Faculties WHERE Mobile = p_Mobile AND IsDeleted = 0 AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
                END;
            """);

            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CheckAadhaarUnique;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_CheckAadhaarUnique(IN p_Aadhaar VARCHAR(12), IN p_ExcludeId INT)
                BEGIN
                    SELECT COUNT(*) FROM Faculties WHERE Aadhaar = p_Aadhaar AND IsDeleted = 0 AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
                END;
            """);

            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CheckUsernameUnique;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_CheckUsernameUnique(IN p_Username VARCHAR(100), IN p_ExcludeId INT)
                BEGIN
                    SELECT COUNT(*) FROM Faculties WHERE Username = p_Username AND IsDeleted = 0 AND (p_ExcludeId IS NULL OR Id <> p_ExcludeId);
                END;
            """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetPagedFaculties;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CreateFaculty;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_UpdateFaculty;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_SoftDeleteFaculty;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetFacultyDropdown;");
        }
    }
}
