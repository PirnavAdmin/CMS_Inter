using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    public partial class AddStudentStoredProcedures : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ============================================================
            // DROP PROCEDURE
            // ============================================================

            migrationBuilder.Sql("""
DROP PROCEDURE IF EXISTS sp_GetAllStudents;
""");

            // ============================================================
            // GET ALL STUDENTS
            // ============================================================

            migrationBuilder.Sql("""
CREATE PROCEDURE sp_GetAllStudents()
BEGIN

    SELECT

        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,

        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,

        s.Board,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.Section,
        s.AdmissionDate,

        s.AdmissionType,
        s.Medium,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.StudentCategory,
        s.ScholarshipStatus,

        s.FatherName,
        s.FatherMobile,

        s.MotherName,
        s.MotherMobile,

        s.GuardianName,
        s.GuardianMobile,

        s.FeeAmount,
        s.FeePaid,
        s.ScholarshipAmount,
        s.FeeStatus,

        s.AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.Rank,
        s.Remarks,

        s.IsFirstLogin,
        s.LastLogin,

        s.IsActive,

        CASE
            WHEN s.IsActive = 1
            THEN 'Active'
            ELSE 'Inactive'
        END AS Status,

        s.CreatedAt,
        s.UpdatedAt

    FROM Students s

    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = s.AcademicYearId

    LEFT JOIN `Groups` g
        ON g.GroupId = s.GroupId

    ORDER BY s.StudentId DESC;

END;
""");
            // ============================================================
            // DROP PROCEDURE
            // ============================================================

            migrationBuilder.Sql("""
DROP PROCEDURE IF EXISTS sp_GetStudentById;
""");

            // ============================================================
            // GET STUDENT BY ID
            // ============================================================

            migrationBuilder.Sql("""
CREATE PROCEDURE sp_GetStudentById
(
    IN p_StudentId INT
)
BEGIN

    SELECT

        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,

        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,
        s.AadhaarNumber,
        s.Address,

        s.Board,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.Section,
        s.AdmissionDate,

        s.AdmissionType,
        s.Medium,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.StudentCategory,
        s.ScholarshipStatus,

        s.FatherName,
        s.FatherMobile,

        s.MotherName,
        s.MotherMobile,

        s.GuardianName,
        s.GuardianMobile,

        s.FeeAmount,
        s.FeePaid,
        s.ScholarshipAmount,
        s.FeeStatus,

        s.AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.Rank,
        s.Remarks,

        s.IsFirstLogin,
        s.LastLogin,

        s.IsActive,

        CASE
            WHEN s.IsActive = 1
            THEN 'Active'
            ELSE 'Inactive'
        END AS Status,

        s.CreatedAt,
        s.UpdatedAt

    FROM Students s

    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = s.AcademicYearId

    LEFT JOIN `Groups` g
        ON g.GroupId = s.GroupId

    WHERE s.StudentId = p_StudentId

    LIMIT 1;

END;
""");
            // ============================================================
            // DROP PROCEDURE
            // ============================================================

            migrationBuilder.Sql("""
DROP PROCEDURE IF EXISTS sp_CreateStudent;
""");

            // ============================================================
            // CREATE STUDENT
            // ============================================================

            migrationBuilder.Sql("""
CREATE PROCEDURE sp_CreateStudent
(
    IN p_AdmissionNo VARCHAR(30),
    IN p_RollNo VARCHAR(30),
    IN p_StudentName VARCHAR(150),
    IN p_Photo VARCHAR(500),

    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATE,
    IN p_BloodGroup VARCHAR(10),
    IN p_Email VARCHAR(150),
    IN p_MobileNumber VARCHAR(20),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Address VARCHAR(500),

    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_Section VARCHAR(20),
    IN p_AdmissionDate DATE,

    IN p_AdmissionType VARCHAR(50),
    IN p_Medium VARCHAR(50),
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousHallTicketNumber VARCHAR(50),
    IN p_StudentCategory VARCHAR(50),
    IN p_ScholarshipStatus VARCHAR(50),

    IN p_FatherName VARCHAR(150),
    IN p_FatherMobile VARCHAR(20),
    IN p_MotherName VARCHAR(150),
    IN p_MotherMobile VARCHAR(20),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),

    IN p_FeeAmount DECIMAL(10,2),
    IN p_FeePaid DECIMAL(10,2),
    IN p_ScholarshipAmount DECIMAL(10,2),
    IN p_FeeStatus VARCHAR(30),

    IN p_AttendancePercentage DECIMAL(5,2),
    IN p_PerformanceGrade VARCHAR(20),
    IN p_CGPA DECIMAL(5,2),
    IN p_Rank INT,
    IN p_Remarks VARCHAR(500),

    IN p_PasswordHash VARCHAR(255),
    IN p_IsFirstLogin BOOLEAN,
    IN p_IsActive BOOLEAN
)
BEGIN

    DECLARE v_StudentId INT;

    IF p_AdmissionNo IS NULL OR TRIM(p_AdmissionNo) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Admission Number is required';
    END IF;

    IF p_RollNo IS NULL OR TRIM(p_RollNo) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Roll Number is required';
    END IF;

    IF p_StudentName IS NULL OR TRIM(p_StudentName) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student Name is required';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM Students
        WHERE AdmissionNo = p_AdmissionNo
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Admission Number already exists';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM Students
        WHERE RollNo = p_RollNo
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Roll Number already exists';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM Students
        WHERE Email = p_Email
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Email already exists';
    END IF;
        INSERT INTO Students
    (
        AdmissionNo,
        RollNo,
        StudentName,
        Photo,

        Gender,
        DateOfBirth,
        BloodGroup,
        Email,
        MobileNumber,
        AadhaarNumber,
        Address,

        Board,
        AcademicYearId,
        AcademicLevel,
        GroupId,
        Section,
        AdmissionDate,

        AdmissionType,
        Medium,
        PreviousSchool,
        PreviousHallTicketNumber,
        StudentCategory,
        ScholarshipStatus,

        FatherName,
        FatherMobile,
        MotherName,
        MotherMobile,
        GuardianName,
        GuardianMobile,

        FeeAmount,
        FeePaid,
        ScholarshipAmount,
        FeeStatus,

        AttendancePercentage,
        PerformanceGrade,
        CGPA,
        `Rank`,
        Remarks,

        PasswordHash,
        IsFirstLogin,
        IsActive,
        CreatedAt
    )
    VALUES
    (
        TRIM(p_AdmissionNo),
        TRIM(p_RollNo),
        TRIM(p_StudentName),
        p_Photo,

        p_Gender,
        p_DateOfBirth,
        p_BloodGroup,
        TRIM(p_Email),
        p_MobileNumber,
        p_AadhaarNumber,
        p_Address,

        p_Board,
        p_AcademicYearId,
        p_AcademicLevel,
        p_GroupId,
        p_Section,
        p_AdmissionDate,

        p_AdmissionType,
        p_Medium,
        p_PreviousSchool,
        p_PreviousHallTicketNumber,
        p_StudentCategory,
        p_ScholarshipStatus,

        p_FatherName,
        p_FatherMobile,
        p_MotherName,
        p_MotherMobile,
        p_GuardianName,
        p_GuardianMobile,

        p_FeeAmount,
        p_FeePaid,
        p_ScholarshipAmount,
        p_FeeStatus,

        p_AttendancePercentage,
        p_PerformanceGrade,
        p_CGPA,
        p_Rank,
        p_Remarks,

        p_PasswordHash,
        IFNULL(p_IsFirstLogin, TRUE),
        IFNULL(p_IsActive, TRUE),
        UTC_TIMESTAMP()
    );

    SET v_StudentId = LAST_INSERT_ID();
        SELECT

        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,

        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,
        s.AadhaarNumber,
        s.Address,

        s.Board,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.Section,
        s.AdmissionDate,

        s.AdmissionType,
        s.Medium,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.StudentCategory,
        s.ScholarshipStatus,

        s.FatherName,
        s.FatherMobile,

        s.MotherName,
        s.MotherMobile,

        s.GuardianName,
        s.GuardianMobile,

        s.FeeAmount,
        s.FeePaid,
        s.ScholarshipAmount,
        s.FeeStatus,

        s.AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.`Rank`,
        s.Remarks,

        s.IsFirstLogin,
        s.LastLogin,

        s.IsActive,

        CASE
            WHEN s.IsActive = 1
            THEN 'Active'
            ELSE 'Inactive'
        END AS Status,

        s.CreatedAt,
        s.UpdatedAt

    FROM Students s

    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = s.AcademicYearId

    LEFT JOIN `Groups` g
        ON g.GroupId = s.GroupId

    WHERE s.StudentId = v_StudentId;

END;
""");
            // ============================================================
            // DROP PROCEDURE
            // ============================================================

            migrationBuilder.Sql("""
DROP PROCEDURE IF EXISTS sp_UpdateStudent;
""");

            // ============================================================
            // UPDATE STUDENT
            // ============================================================

            migrationBuilder.Sql("""
CREATE PROCEDURE sp_UpdateStudent
(
    IN p_StudentId INT,

    IN p_AdmissionNo VARCHAR(30),
    IN p_RollNo VARCHAR(30),
    IN p_StudentName VARCHAR(150),
    IN p_Photo VARCHAR(500),

    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATE,
    IN p_BloodGroup VARCHAR(10),
    IN p_Email VARCHAR(150),
    IN p_MobileNumber VARCHAR(20),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Address VARCHAR(500),

    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_Section VARCHAR(20),
    IN p_AdmissionDate DATE,

    IN p_AdmissionType VARCHAR(50),
    IN p_Medium VARCHAR(50),
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousHallTicketNumber VARCHAR(50),
    IN p_StudentCategory VARCHAR(50),
    IN p_ScholarshipStatus VARCHAR(50),

    IN p_FatherName VARCHAR(150),
    IN p_FatherMobile VARCHAR(20),
    IN p_MotherName VARCHAR(150),
    IN p_MotherMobile VARCHAR(20),
    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20),

    IN p_FeeAmount DECIMAL(10,2),
    IN p_FeePaid DECIMAL(10,2),
    IN p_ScholarshipAmount DECIMAL(10,2),
    IN p_FeeStatus VARCHAR(30),

    IN p_AttendancePercentage DECIMAL(5,2),
    IN p_PerformanceGrade VARCHAR(20),
    IN p_CGPA DECIMAL(5,2),
    IN p_Rank INT,
    IN p_Remarks VARCHAR(500),

    IN p_PasswordHash VARCHAR(255),
    IN p_IsFirstLogin BOOLEAN,
    IN p_IsActive BOOLEAN
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM Students
        WHERE AdmissionNo = p_AdmissionNo
          AND StudentId <> p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Admission Number already exists';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM Students
        WHERE RollNo = p_RollNo
          AND StudentId <> p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Roll Number already exists';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM Students
        WHERE Email = p_Email
          AND StudentId <> p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Email already exists';
    END IF;
        UPDATE Students
    SET

        AdmissionNo = TRIM(p_AdmissionNo),
        RollNo = TRIM(p_RollNo),
        StudentName = TRIM(p_StudentName),
        Photo = p_Photo,

        -- Personal Information
        Gender = p_Gender,
        DateOfBirth = p_DateOfBirth,
        BloodGroup = p_BloodGroup,
        Email = TRIM(p_Email),
        MobileNumber = p_MobileNumber,
        AadhaarNumber = p_AadhaarNumber,
        Address = p_Address,

        -- Academic Information
        Board = p_Board,
        AcademicYearId = p_AcademicYearId,
        AcademicLevel = p_AcademicLevel,
        GroupId = p_GroupId,
        Section = p_Section,
        AdmissionDate = p_AdmissionDate,
        AdmissionType = p_AdmissionType,
        Medium = p_Medium,
        PreviousSchool = p_PreviousSchool,
        PreviousHallTicketNumber = p_PreviousHallTicketNumber,
        StudentCategory = p_StudentCategory,
        ScholarshipStatus = p_ScholarshipStatus,

        -- Parent Details
        FatherName = p_FatherName,
        FatherMobile = p_FatherMobile,
        MotherName = p_MotherName,
        MotherMobile = p_MotherMobile,
        GuardianName = p_GuardianName,
        GuardianMobile = p_GuardianMobile,

        -- Fee Information
        FeeAmount = p_FeeAmount,
        FeePaid = p_FeePaid,
        ScholarshipAmount = p_ScholarshipAmount,
        FeeStatus = p_FeeStatus,

        -- Performance
        AttendancePercentage = p_AttendancePercentage,
        PerformanceGrade = p_PerformanceGrade,
        CGPA = p_CGPA,
        `Rank` = p_Rank,
        Remarks = p_Remarks,

        -- Login
        PasswordHash = p_PasswordHash,
        IsFirstLogin = p_IsFirstLogin,

        -- Status
        IsActive = p_IsActive,
        UpdatedAt = UTC_TIMESTAMP()

    WHERE StudentId = p_StudentId;
        SELECT

        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,

        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,
        s.AadhaarNumber,
        s.Address,

        s.Board,

        s.AcademicYearId,
        ay.AcademicYearName,

        s.AcademicLevel,

        s.GroupId,
        g.GroupName,

        s.Section,
        s.AdmissionDate,

        s.AdmissionType,
        s.Medium,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.StudentCategory,
        s.ScholarshipStatus,

        s.FatherName,
        s.FatherMobile,

        s.MotherName,
        s.MotherMobile,

        s.GuardianName,
        s.GuardianMobile,

        s.FeeAmount,
        s.FeePaid,
        s.ScholarshipAmount,
        s.FeeStatus,

        s.AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.`Rank`,
        s.Remarks,

        s.IsFirstLogin,
        s.LastLogin,

        s.IsActive,

        CASE
            WHEN s.IsActive = 1
            THEN 'Active'
            ELSE 'Inactive'
        END AS Status,

        s.CreatedAt,
        s.UpdatedAt

    FROM Students s

    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = s.AcademicYearId

    LEFT JOIN `Groups` g
        ON g.GroupId = s.GroupId

    WHERE s.StudentId = p_StudentId;

END;
""");
            // ============================================================
            // DROP PROCEDURE
            // ============================================================

            migrationBuilder.Sql("""
DROP PROCEDURE IF EXISTS sp_DeleteStudent;
""");

            // ============================================================
            // DELETE STUDENT
            // ============================================================

            migrationBuilder.Sql("""
CREATE PROCEDURE sp_DeleteStudent
(
    IN p_StudentId INT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    DELETE
    FROM Students
    WHERE StudentId = p_StudentId;

    SELECT
        IF(ROW_COUNT() > 0, 1, 0) AS Deleted;

END;
""");
            // ============================================================
            // DROP PROCEDURE
            // ============================================================

            migrationBuilder.Sql("""
DROP PROCEDURE IF EXISTS sp_GetStudentProfile;
""");

            // ============================================================
            // GET STUDENT PROFILE
            // ============================================================

            migrationBuilder.Sql("""
CREATE PROCEDURE sp_GetStudentProfile
(
    IN p_StudentId INT
)
BEGIN

    SELECT

        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,

        -- Personal Information
        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,
        s.AadhaarNumber,
        s.Address,

        -- Academic Information
        s.Board,
        ay.AcademicYearName,
        s.AcademicLevel,
        g.GroupName,
        s.Section,
        s.AdmissionDate,
        s.AdmissionType,
        s.Medium,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.StudentCategory,
        s.ScholarshipStatus,

        -- Parent Details
        s.FatherName,
        s.FatherMobile,
        s.MotherName,
        s.MotherMobile,
        s.GuardianName,
        s.GuardianMobile,

        -- Fee Information
        s.FeeAmount,
        s.FeePaid,
        s.ScholarshipAmount,
        s.FeeStatus,

        -- Performance
        s.AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.`Rank`,
        s.Remarks,

        -- Status
        s.IsActive,

        CASE
            WHEN s.IsActive = 1
            THEN 'Active'
            ELSE 'Inactive'
        END AS Status

    FROM Students s

    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = s.AcademicYearId

    LEFT JOIN `Groups` g
        ON g.GroupId = s.GroupId

    WHERE s.StudentId = p_StudentId

    LIMIT 1;

END;
""");
            // ============================================================
            // DROP PROCEDURE
            // ============================================================

            migrationBuilder.Sql("""
DROP PROCEDURE IF EXISTS sp_UpdateStudentProfile;
""");

            // ============================================================
            // UPDATE STUDENT PROFILE
            // ============================================================

            migrationBuilder.Sql("""
CREATE PROCEDURE sp_UpdateStudentProfile
(
    IN p_StudentId INT,

    IN p_Photo VARCHAR(500),
    IN p_Email VARCHAR(150),
    IN p_MobileNumber VARCHAR(20),
    IN p_Address VARCHAR(500),

    IN p_FatherName VARCHAR(150),
    IN p_FatherMobile VARCHAR(20),

    IN p_MotherName VARCHAR(150),
    IN p_MotherMobile VARCHAR(20),

    IN p_GuardianName VARCHAR(150),
    IN p_GuardianMobile VARCHAR(20)
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    IF EXISTS
    (
        SELECT 1
        FROM Students
        WHERE Email = p_Email
          AND StudentId <> p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Email already exists';
    END IF;

    UPDATE Students
    SET
        Photo = p_Photo,
        Email = TRIM(p_Email),
        MobileNumber = p_MobileNumber,
        Address = p_Address,

        FatherName = p_FatherName,
        FatherMobile = p_FatherMobile,

        MotherName = p_MotherName,
        MotherMobile = p_MotherMobile,

        GuardianName = p_GuardianName,
        GuardianMobile = p_GuardianMobile,

        UpdatedAt = UTC_TIMESTAMP()

    WHERE StudentId = p_StudentId;

    SELECT

        s.StudentId,
        s.AdmissionNo,
        s.RollNo,
        s.StudentName,
        s.Photo,

        s.Gender,
        s.DateOfBirth,
        s.BloodGroup,
        s.Email,
        s.MobileNumber,
        s.AadhaarNumber,
        s.Address,

        s.Board,
        ay.AcademicYearName,
        s.AcademicLevel,
        g.GroupName,
        s.Section,
        s.AdmissionDate,

        s.AdmissionType,
        s.Medium,
        s.PreviousSchool,
        s.PreviousHallTicketNumber,
        s.StudentCategory,
        s.ScholarshipStatus,

        s.FatherName,
        s.FatherMobile,

        s.MotherName,
        s.MotherMobile,

        s.GuardianName,
        s.GuardianMobile,

        s.FeeAmount,
        s.FeePaid,
        s.ScholarshipAmount,
        s.FeeStatus,

        s.AttendancePercentage,
        s.PerformanceGrade,
        s.CGPA,
        s.`Rank`,
        s.Remarks,

        s.IsActive,

        CASE
            WHEN s.IsActive = 1
            THEN 'Active'
            ELSE 'Inactive'
        END AS Status

    FROM Students s

    LEFT JOIN AcademicYears ay
        ON ay.AcademicYearId = s.AcademicYearId

    LEFT JOIN `Groups` g
        ON g.GroupId = s.GroupId

    WHERE s.StudentId = p_StudentId;

END;
""");
            // ============================================================
            // DROP PROCEDURES
            // ============================================================

            migrationBuilder.Sql("""
DROP PROCEDURE IF EXISTS sp_ChangeStudentSection;
DROP PROCEDURE IF EXISTS sp_ChangeStudentGroup;
DROP PROCEDURE IF EXISTS sp_TransferStudent;
""");

            // ============================================================
            // CHANGE STUDENT SECTION
            // ============================================================

            migrationBuilder.Sql("""
CREATE PROCEDURE sp_ChangeStudentSection
(
    IN p_StudentId INT,
    IN p_Section VARCHAR(20)
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    UPDATE Students
    SET
        Section = TRIM(p_Section),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StudentId = p_StudentId;

END;
""");

            // ============================================================
            // CHANGE STUDENT GROUP
            // ============================================================

            migrationBuilder.Sql("""
CREATE PROCEDURE sp_ChangeStudentGroup
(
    IN p_StudentId INT,
    IN p_GroupId INT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    UPDATE Students
    SET
        GroupId = p_GroupId,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StudentId = p_StudentId;

END;
""");

            // ============================================================
            // TRANSFER STUDENT
            // ============================================================

            migrationBuilder.Sql("""
CREATE PROCEDURE sp_TransferStudent
(
    IN p_StudentId INT,
    IN p_Board VARCHAR(100),
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_Section VARCHAR(20)
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    UPDATE Students
    SET
        Board = p_Board,
        AcademicYearId = p_AcademicYearId,
        AcademicLevel = p_AcademicLevel,
        GroupId = p_GroupId,
        Section = p_Section,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StudentId = p_StudentId;

END;
""");
            // ============================================================
            // DROP PROCEDURES
            // ============================================================

            migrationBuilder.Sql("""
DROP PROCEDURE IF EXISTS sp_SuspendStudent;
DROP PROCEDURE IF EXISTS sp_ActivateStudent;
DROP PROCEDURE IF EXISTS sp_ResetStudentLogin;
""");

            // ============================================================
            // SUSPEND STUDENT
            // ============================================================

            migrationBuilder.Sql("""
CREATE PROCEDURE sp_SuspendStudent
(
    IN p_StudentId INT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    UPDATE Students
    SET
        IsActive = 0,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS Success;

END;
""");

            // ============================================================
            // ACTIVATE STUDENT
            // ============================================================

            migrationBuilder.Sql("""
CREATE PROCEDURE sp_ActivateStudent
(
    IN p_StudentId INT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    UPDATE Students
    SET
        IsActive = 1,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS Success;

END;
""");

            // ============================================================
            // RESET STUDENT LOGIN
            // ============================================================

            migrationBuilder.Sql("""
CREATE PROCEDURE sp_ResetStudentLogin
(
    IN p_StudentId INT
)
BEGIN

    IF NOT EXISTS
    (
        SELECT 1
        FROM Students
        WHERE StudentId = p_StudentId
    )
    THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Student not found';
    END IF;

    UPDATE Students
    SET
        PasswordHash = '',
        IsFirstLogin = 1,
        LastLogin = NULL,
        UpdatedAt = UTC_TIMESTAMP()
    WHERE StudentId = p_StudentId;

    SELECT 1 AS Success;

END;
""");
            // ============================================================
            // DROP PROCEDURE
            // ============================================================

            migrationBuilder.Sql("""
DROP PROCEDURE IF EXISTS sp_GetStudentDashboard;
""");

            // ============================================================
            // STUDENT DASHBOARD
            // ============================================================

            migrationBuilder.Sql("""
CREATE PROCEDURE sp_GetStudentDashboard
(
    IN p_StudentId INT
)
BEGIN

    SELECT

        s.StudentId,
        s.StudentName,

        s.AttendancePercentage,

        (s.FeeAmount - s.FeePaid) AS FeeDue,

        s.PerformanceGrade,

        (
            SELECT COUNT(*)
            FROM Subjects sub
            WHERE sub.GroupId = s.GroupId
        ) AS TotalSubjects,

        0 AS CompletedSubjects

    FROM Students s

    WHERE s.StudentId = p_StudentId

    LIMIT 1;

END;
""");
        }

        // ============================================================
        // DOWN
        // ============================================================

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
DROP PROCEDURE IF EXISTS sp_GetStudentDashboard;
DROP PROCEDURE IF EXISTS sp_ResetStudentLogin;
DROP PROCEDURE IF EXISTS sp_ActivateStudent;
DROP PROCEDURE IF EXISTS sp_SuspendStudent;
DROP PROCEDURE IF EXISTS sp_TransferStudent;
DROP PROCEDURE IF EXISTS sp_ChangeStudentGroup;
DROP PROCEDURE IF EXISTS sp_ChangeStudentSection;
DROP PROCEDURE IF EXISTS sp_UpdateStudentProfile;
DROP PROCEDURE IF EXISTS sp_GetStudentProfile;
DROP PROCEDURE IF EXISTS sp_DeleteStudent;
DROP PROCEDURE IF EXISTS sp_UpdateStudent;
DROP PROCEDURE IF EXISTS sp_CreateStudent;
DROP PROCEDURE IF EXISTS sp_GetStudentById;
DROP PROCEDURE IF EXISTS sp_GetAllStudents;
""");
        }
    }
}