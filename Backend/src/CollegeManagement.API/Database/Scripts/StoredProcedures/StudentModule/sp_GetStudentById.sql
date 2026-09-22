DROP PROCEDURE IF EXISTS sp_GetStudentById;
DELIMITER //
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
END //
DELIMITER ;
