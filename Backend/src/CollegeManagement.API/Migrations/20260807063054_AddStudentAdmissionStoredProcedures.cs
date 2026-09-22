using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    public partial class AddStudentAdmissionStoredProcedures : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // NOTE:
            // This template contains the procedure drop statements and a complete
            // sp_CreateAdmission implementation.
            // Add the remaining procedures below using migrationBuilder.Sql(...)
            //   sp_GetAllAdmissions
            //   sp_GetAdmissionById
            //   sp_UpdateAdmission
            //   sp_DeleteAdmission
            //   sp_VerifyAdmission
            //   sp_ApproveAdmission
            //   sp_RejectAdmission
            //   sp_GenerateAdmissionNumber

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_CreateAdmission;

CREATE PROCEDURE sp_CreateAdmission
(
    IN p_AdmissionNo VARCHAR(30),
    IN p_AdmissionDate DATETIME,
    IN p_FirstName VARCHAR(100),
    IN p_LastName VARCHAR(100),
    IN p_Gender VARCHAR(20),
    IN p_DateOfBirth DATETIME,
    IN p_BloodGroup VARCHAR(10),
    IN p_StudentPhoto VARCHAR(500),
    IN p_AadhaarNumber VARCHAR(20),
    IN p_Nationality VARCHAR(100),
    IN p_Religion VARCHAR(100),
    IN p_Category VARCHAR(100),
    IN p_FatherName VARCHAR(150),
    IN p_MotherName VARCHAR(150),
    IN p_GuardianName VARCHAR(150),
    IN p_ParentMobile VARCHAR(15),
    IN p_ParentEmail VARCHAR(150),
    IN p_Occupation VARCHAR(100),
    IN p_AnnualIncome DECIMAL(18,2),
    IN p_Address VARCHAR(500),
    IN p_City VARCHAR(100),
    IN p_District VARCHAR(100),
    IN p_State VARCHAR(100),
    IN p_Pincode VARCHAR(10),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevel VARCHAR(50),
    IN p_GroupId INT,
    IN p_SectionId INT,
    IN p_PreviousSchool VARCHAR(200),
    IN p_PreviousBoard VARCHAR(100),
    IN p_PreviousPercentage DECIMAL(5,2),
    IN p_BirthCertificate VARCHAR(500),
    IN p_TransferCertificate VARCHAR(500),
    IN p_StudyCertificate VARCHAR(500),
    IN p_AadhaarDocument VARCHAR(500),
    IN p_CommunityCertificate VARCHAR(500),
    IN p_IncomeCertificate VARCHAR(500),
    IN p_PassportPhoto VARCHAR(500)
)
BEGIN
INSERT INTO StudentAdmissions
(
AdmissionNo,AdmissionDate,FirstName,LastName,Gender,DateOfBirth,BloodGroup,StudentPhoto,
AadhaarNumber,Nationality,Religion,Category,FatherName,MotherName,GuardianName,
ParentMobile,ParentEmail,Occupation,AnnualIncome,Address,City,District,State,Pincode,
BoardId,AcademicYearId,AcademicLevel,GroupId,SectionId,PreviousSchool,PreviousBoard,
PreviousPercentage,BirthCertificate,TransferCertificate,StudyCertificate,AadhaarDocument,
CommunityCertificate,IncomeCertificate,PassportPhoto,Status,IsVerified,IsApproved,
IsRejected,IsActive,CreatedAt)
VALUES
(
p_AdmissionNo,p_AdmissionDate,p_FirstName,p_LastName,p_Gender,p_DateOfBirth,p_BloodGroup,p_StudentPhoto,
p_AadhaarNumber,p_Nationality,p_Religion,p_Category,p_FatherName,p_MotherName,p_GuardianName,
p_ParentMobile,p_ParentEmail,p_Occupation,p_AnnualIncome,p_Address,p_City,p_District,p_State,p_Pincode,
p_BoardId,p_AcademicYearId,p_AcademicLevel,p_GroupId,p_SectionId,p_PreviousSchool,p_PreviousBoard,
p_PreviousPercentage,p_BirthCertificate,p_TransferCertificate,p_StudyCertificate,p_AadhaarDocument,
p_CommunityCertificate,p_IncomeCertificate,p_PassportPhoto,'Pending',FALSE,FALSE,FALSE,TRUE,NOW());

SELECT sa.*, b.BoardName, ay.AcademicYearName, g.GroupName, s.SectionName
FROM StudentAdmissions sa
JOIN Boards b ON sa.BoardId=b.BoardId
JOIN AcademicYears ay ON sa.AcademicYearId=ay.AcademicYearId
JOIN Groups g ON sa.GroupId=g.GroupId
JOIN Sections s ON sa.SectionId=s.SectionId
WHERE sa.AdmissionId=LAST_INSERT_ID();

END;
");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CreateAdmission;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAllAdmissions;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAdmissionById;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_UpdateAdmission;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_DeleteAdmission;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_VerifyAdmission;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_ApproveAdmission;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_RejectAdmission;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GenerateAdmissionNumber;");
        }
    }
}
