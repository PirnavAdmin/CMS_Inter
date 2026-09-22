using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    public partial class CleanupAdmissionStudentDuplicatesAndPreviousHallTicket : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Final contract: StudentAdmission uses Email/MobileNumber only;
            // PreviousHallTicketNumber is not part of Student/Admission. HallTickets module remains separate.
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_CreateAdmissionV2;
DROP PROCEDURE IF EXISTS sp_UpdateAdmissionV2;
DROP PROCEDURE IF EXISTS sp_GetAllAdmissionsV2;
DROP PROCEDURE IF EXISTS sp_GetAdmissionByIdV2;
DROP PROCEDURE IF EXISTS sp_ApproveAdmissionV2;
DROP PROCEDURE IF EXISTS sp_GetAllStudents;
DROP PROCEDURE IF EXISTS sp_GetStudentById;
DROP PROCEDURE IF EXISTS sp_CreateStudent;
DROP PROCEDURE IF EXISTS sp_UpdateStudent;
", suppressTransaction: true);
            migrationBuilder.Sql(@"
ALTER TABLE `StudentAdmissions`
    ADD COLUMN IF NOT EXISTS `Email` VARCHAR(150) NULL AFTER `StudentPhoto`,
    ADD COLUMN IF NOT EXISTS `MobileNumber` VARCHAR(20) NULL AFTER `Email`;

UPDATE `StudentAdmissions`
SET `Email` = COALESCE(NULLIF(`Email`,''), NULLIF(`StudentEmail`,''), NULLIF(`ParentEmail`,'')),
    `MobileNumber` = COALESCE(NULLIF(`MobileNumber`,''), NULLIF(`StudentMobileNumber`,''), NULLIF(`ParentMobile`,''))
WHERE (`Email` IS NULL OR `Email`='') OR (`MobileNumber` IS NULL OR `MobileNumber`='');

SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='StudentAdmissions' AND COLUMN_NAME='StudentEmail')>0,'ALTER TABLE `StudentAdmissions` DROP COLUMN `StudentEmail`','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='StudentAdmissions' AND COLUMN_NAME='StudentMobileNumber')>0,'ALTER TABLE `StudentAdmissions` DROP COLUMN `StudentMobileNumber`','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='StudentAdmissions' AND COLUMN_NAME='PreviousHallTicketNumber')>0,'ALTER TABLE `StudentAdmissions` DROP COLUMN `PreviousHallTicketNumber`','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
", suppressTransaction: true);
            migrationBuilder.Sql(@"
ALTER TABLE `Students` ADD COLUMN IF NOT EXISTS `Email` VARCHAR(150) NULL, ADD COLUMN IF NOT EXISTS `MobileNumber` VARCHAR(20) NULL;
UPDATE `Students` st JOIN `StudentAdmissions` sa ON sa.AdmissionId=st.AdmissionId
SET st.Email=COALESCE(NULLIF(st.Email,''),sa.Email), st.MobileNumber=COALESCE(NULLIF(st.MobileNumber,''),sa.MobileNumber);
SET @sql := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Students' AND COLUMN_NAME='PreviousHallTicketNumber')>0,'ALTER TABLE `Students` DROP COLUMN `PreviousHallTicketNumber`','SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
", suppressTransaction: true);
            migrationBuilder.Sql(@"
CREATE PROCEDURE sp_CreateAdmissionV2(
 IN p_AdmissionNo VARCHAR(30), IN p_AdmissionDate DATETIME, IN p_AdmissionQuota VARCHAR(50),
 IN p_FirstName VARCHAR(100), IN p_LastName VARCHAR(100), IN p_Gender VARCHAR(20), IN p_DateOfBirth DATETIME,
 IN p_BloodGroup VARCHAR(10), IN p_Email VARCHAR(150), IN p_MobileNumber VARCHAR(20), IN p_RollNo VARCHAR(30), IN p_StudentPhoto VARCHAR(500),
 IN p_AadhaarNumber VARCHAR(20), IN p_Nationality VARCHAR(100), IN p_Religion VARCHAR(100), IN p_Category VARCHAR(100),
 IN p_FatherName VARCHAR(150), IN p_FatherOccupation VARCHAR(100), IN p_FatherMobile VARCHAR(20), IN p_FatherEmail VARCHAR(150),
 IN p_MotherName VARCHAR(150), IN p_MotherOccupation VARCHAR(100), IN p_MotherMobile VARCHAR(20), IN p_MotherEmail VARCHAR(150),
 IN p_GuardianName VARCHAR(150), IN p_GuardianMobile VARCHAR(20), IN p_GuardianEmail VARCHAR(150), IN p_AnnualIncome DECIMAL(18,2),
 IN p_Address VARCHAR(500), IN p_AddressLine1 VARCHAR(500), IN p_AddressLine2 VARCHAR(500), IN p_City VARCHAR(100), IN p_District VARCHAR(100), IN p_State VARCHAR(100), IN p_Pincode VARCHAR(10),
 IN p_BoardId INT, IN p_AcademicYearId INT, IN p_AcademicLevel VARCHAR(50), IN p_GroupId INT, IN p_SectionId INT,
 IN p_Medium VARCHAR(50), IN p_SecondLanguage VARCHAR(50), IN p_AdmissionType VARCHAR(50),
 IN p_PreviousSchool VARCHAR(200), IN p_PreviousYearOfPassing INT, IN p_PreviousBoard VARCHAR(100), IN p_PreviousPercentage DECIMAL(5,2), IN p_ScholarshipStatus VARCHAR(50),
 IN p_TransferCertificate VARCHAR(500), IN p_MarksMemo VARCHAR(500), IN p_AadhaarDocument VARCHAR(500), IN p_CasteCertificate VARCHAR(500), IN p_IncomeCertificate VARCHAR(500), IN p_Remarks VARCHAR(500)
)
BEGIN
 IF EXISTS(SELECT 1 FROM StudentAdmissions WHERE AdmissionNo=TRIM(p_AdmissionNo) AND IsActive=1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Admission number already exists'; END IF;
 IF NOT EXISTS(SELECT 1 FROM Boards WHERE BoardId=p_BoardId AND IsActive=1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected Board was not found or is inactive'; END IF;
 IF NOT EXISTS(SELECT 1 FROM AcademicYears WHERE AcademicYearId=p_AcademicYearId AND IsActive=1) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected Academic Year was not found or is inactive'; END IF;
 IF NOT EXISTS(SELECT 1 FROM `Groups` g WHERE g.GroupId=p_GroupId AND g.AcademicYearId=p_AcademicYearId AND g.IsActive=1 AND g.Board=(SELECT BoardName FROM Boards WHERE BoardId=p_BoardId)) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected Group is not mapped to the selected Board and Academic Year'; END IF;
 IF NOT EXISTS(SELECT 1 FROM Sections s WHERE s.SectionId=p_SectionId AND s.AcademicYearId=p_AcademicYearId AND s.IsActive=1 AND (s.GroupId=p_GroupId OR s.`Group`=(SELECT GroupName FROM `Groups` WHERE GroupId=p_GroupId))) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Selected Section is not mapped to the selected Group and Academic Year'; END IF;
 INSERT INTO StudentAdmissions(
 AdmissionNo,AdmissionDate,AdmissionQuota,FirstName,LastName,Gender,DateOfBirth,BloodGroup,StudentPhoto,Email,MobileNumber,RollNo,AadhaarNumber,Nationality,Religion,Category,
 FatherName,FatherOccupation,FatherMobile,FatherEmail,MotherName,MotherOccupation,MotherMobile,MotherEmail,GuardianName,GuardianMobile,GuardianEmail,AnnualIncome,ParentMobile,ParentEmail,Occupation,
 Address,AddressLine1,AddressLine2,City,District,State,Pincode,BoardId,AcademicYearId,AcademicLevel,GroupId,SectionId,Medium,SecondLanguage,AdmissionType,
 PreviousSchool,PreviousYearOfPassing,PreviousBoard,PreviousPercentage,ScholarshipStatus,TransferCertificate,MarksMemo,AadhaarDocument,CasteCertificate,IncomeCertificate,Remarks,Status,IsVerified,IsApproved,IsRejected,IsActive,CreatedAt)
 VALUES(
 TRIM(p_AdmissionNo),p_AdmissionDate,p_AdmissionQuota,TRIM(p_FirstName),TRIM(p_LastName),TRIM(p_Gender),p_DateOfBirth,p_BloodGroup,p_StudentPhoto,p_Email,p_MobileNumber,p_RollNo,TRIM(p_AadhaarNumber),p_Nationality,p_Religion,p_Category,
 TRIM(p_FatherName),p_FatherOccupation,TRIM(p_FatherMobile),p_FatherEmail,TRIM(p_MotherName),p_MotherOccupation,p_MotherMobile,p_MotherEmail,p_GuardianName,p_GuardianMobile,p_GuardianEmail,p_AnnualIncome,TRIM(p_FatherMobile),p_FatherEmail,p_FatherOccupation,
 COALESCE(p_Address,CONCAT_WS(', ',p_AddressLine1,p_AddressLine2)),p_AddressLine1,p_AddressLine2,p_City,p_District,p_State,p_Pincode,p_BoardId,p_AcademicYearId,TRIM(p_AcademicLevel),p_GroupId,p_SectionId,p_Medium,p_SecondLanguage,COALESCE(NULLIF(p_AdmissionType,''),'Regular'),
 p_PreviousSchool,p_PreviousYearOfPassing,p_PreviousBoard,p_PreviousPercentage,p_ScholarshipStatus,p_TransferCertificate,p_MarksMemo,p_AadhaarDocument,p_CasteCertificate,p_IncomeCertificate,p_Remarks,'Pending',0,0,0,1,UTC_TIMESTAMP());
 SELECT sa.AdmissionId, NULL AS StudentId, sa.AdmissionNo,sa.AdmissionDate,sa.AdmissionQuota,sa.FirstName,sa.LastName,sa.Gender,sa.DateOfBirth,sa.BloodGroup,sa.StudentPhoto,sa.Email,sa.MobileNumber,sa.RollNo,sa.AadhaarNumber,sa.Nationality,sa.Religion,sa.Category,
 sa.FatherName,sa.FatherOccupation,sa.FatherMobile,sa.FatherEmail,sa.MotherName,sa.MotherOccupation,sa.MotherMobile,sa.MotherEmail,sa.GuardianName,sa.GuardianMobile,sa.GuardianEmail,sa.AnnualIncome,
 sa.Address,sa.AddressLine1,sa.AddressLine2,sa.City,sa.District,sa.State,sa.Pincode,sa.BoardId,b.BoardName,sa.AcademicYearId,ay.AcademicYearName,sa.AcademicLevel,sa.GroupId,g.GroupName,sa.SectionId,s.SectionName,
 sa.Medium,sa.SecondLanguage,sa.AdmissionType,sa.PreviousSchool,sa.PreviousYearOfPassing,sa.PreviousBoard,sa.PreviousPercentage,sa.ScholarshipStatus,sa.TransferCertificate,sa.MarksMemo,sa.AadhaarDocument,sa.CasteCertificate,sa.IncomeCertificate,sa.Remarks,sa.Status,sa.IsVerified,sa.IsApproved,sa.IsRejected,sa.IsActive
 FROM StudentAdmissions sa LEFT JOIN Boards b ON b.BoardId=sa.BoardId LEFT JOIN AcademicYears ay ON ay.AcademicYearId=sa.AcademicYearId LEFT JOIN `Groups` g ON g.GroupId=sa.GroupId LEFT JOIN Sections s ON s.SectionId=sa.SectionId WHERE sa.AdmissionId=LAST_INSERT_ID();
END;
", suppressTransaction: true);
            migrationBuilder.Sql(@"
CREATE PROCEDURE sp_UpdateAdmissionV2(
 IN p_AdmissionId INT, IN p_AdmissionNo VARCHAR(30), IN p_AdmissionDate DATETIME, IN p_AdmissionQuota VARCHAR(50),
 IN p_FirstName VARCHAR(100), IN p_LastName VARCHAR(100), IN p_Gender VARCHAR(20), IN p_DateOfBirth DATETIME, IN p_BloodGroup VARCHAR(10), IN p_Email VARCHAR(150), IN p_MobileNumber VARCHAR(20), IN p_RollNo VARCHAR(30), IN p_StudentPhoto VARCHAR(500), IN p_AadhaarNumber VARCHAR(20), IN p_Nationality VARCHAR(100), IN p_Religion VARCHAR(100), IN p_Category VARCHAR(100),
 IN p_FatherName VARCHAR(150), IN p_FatherOccupation VARCHAR(100), IN p_FatherMobile VARCHAR(20), IN p_FatherEmail VARCHAR(150), IN p_MotherName VARCHAR(150), IN p_MotherOccupation VARCHAR(100), IN p_MotherMobile VARCHAR(20), IN p_MotherEmail VARCHAR(150), IN p_GuardianName VARCHAR(150), IN p_GuardianMobile VARCHAR(20), IN p_GuardianEmail VARCHAR(150), IN p_AnnualIncome DECIMAL(18,2),
 IN p_Address VARCHAR(500), IN p_AddressLine1 VARCHAR(500), IN p_AddressLine2 VARCHAR(500), IN p_City VARCHAR(100), IN p_District VARCHAR(100), IN p_State VARCHAR(100), IN p_Pincode VARCHAR(10), IN p_BoardId INT, IN p_AcademicYearId INT, IN p_AcademicLevel VARCHAR(50), IN p_GroupId INT, IN p_SectionId INT, IN p_Medium VARCHAR(50), IN p_SecondLanguage VARCHAR(50), IN p_AdmissionType VARCHAR(50), IN p_PreviousSchool VARCHAR(200), IN p_PreviousYearOfPassing INT, IN p_PreviousBoard VARCHAR(100), IN p_PreviousPercentage DECIMAL(5,2), IN p_ScholarshipStatus VARCHAR(50), IN p_TransferCertificate VARCHAR(500), IN p_MarksMemo VARCHAR(500), IN p_AadhaarDocument VARCHAR(500), IN p_CasteCertificate VARCHAR(500), IN p_IncomeCertificate VARCHAR(500), IN p_Remarks VARCHAR(500))
BEGIN
 IF NOT EXISTS(SELECT 1 FROM StudentAdmissions WHERE AdmissionId=p_AdmissionId) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Admission not found'; END IF;
 UPDATE StudentAdmissions SET AdmissionNo=TRIM(p_AdmissionNo),AdmissionDate=p_AdmissionDate,AdmissionQuota=p_AdmissionQuota,FirstName=TRIM(p_FirstName),LastName=TRIM(p_LastName),Gender=TRIM(p_Gender),DateOfBirth=p_DateOfBirth,BloodGroup=p_BloodGroup,Email=p_Email,MobileNumber=p_MobileNumber,RollNo=p_RollNo,StudentPhoto=COALESCE(p_StudentPhoto,StudentPhoto),AadhaarNumber=TRIM(p_AadhaarNumber),Nationality=p_Nationality,Religion=p_Religion,Category=p_Category,FatherName=TRIM(p_FatherName),FatherOccupation=p_FatherOccupation,FatherMobile=TRIM(p_FatherMobile),FatherEmail=p_FatherEmail,MotherName=TRIM(p_MotherName),MotherOccupation=p_MotherOccupation,MotherMobile=p_MotherMobile,MotherEmail=p_MotherEmail,GuardianName=p_GuardianName,GuardianMobile=p_GuardianMobile,GuardianEmail=p_GuardianEmail,AnnualIncome=p_AnnualIncome,ParentMobile=TRIM(p_FatherMobile),ParentEmail=p_FatherEmail,Occupation=p_FatherOccupation,Address=COALESCE(p_Address,CONCAT_WS(', ',p_AddressLine1,p_AddressLine2)),AddressLine1=p_AddressLine1,AddressLine2=p_AddressLine2,City=p_City,District=p_District,State=p_State,Pincode=p_Pincode,BoardId=p_BoardId,AcademicYearId=p_AcademicYearId,AcademicLevel=TRIM(p_AcademicLevel),GroupId=p_GroupId,SectionId=p_SectionId,Medium=p_Medium,SecondLanguage=p_SecondLanguage,AdmissionType=p_AdmissionType,PreviousSchool=p_PreviousSchool,PreviousYearOfPassing=p_PreviousYearOfPassing,PreviousBoard=p_PreviousBoard,PreviousPercentage=p_PreviousPercentage,ScholarshipStatus=p_ScholarshipStatus,TransferCertificate=COALESCE(p_TransferCertificate,TransferCertificate),MarksMemo=COALESCE(p_MarksMemo,MarksMemo),AadhaarDocument=COALESCE(p_AadhaarDocument,AadhaarDocument),CasteCertificate=COALESCE(p_CasteCertificate,CasteCertificate),IncomeCertificate=COALESCE(p_IncomeCertificate,IncomeCertificate),Remarks=p_Remarks,UpdatedAt=UTC_TIMESTAMP() WHERE AdmissionId=p_AdmissionId;
 SELECT sa.AdmissionId,st.StudentId,sa.AdmissionNo,sa.AdmissionDate,sa.AdmissionQuota,sa.FirstName,sa.LastName,sa.Gender,sa.DateOfBirth,sa.BloodGroup,sa.StudentPhoto,sa.Email,sa.MobileNumber,sa.RollNo,sa.AadhaarNumber,sa.Nationality,sa.Religion,sa.Category,sa.FatherName,sa.FatherOccupation,sa.FatherMobile,sa.FatherEmail,sa.MotherName,sa.MotherOccupation,sa.MotherMobile,sa.MotherEmail,sa.GuardianName,sa.GuardianMobile,sa.GuardianEmail,sa.AnnualIncome,sa.Address,sa.AddressLine1,sa.AddressLine2,sa.City,sa.District,sa.State,sa.Pincode,sa.BoardId,b.BoardName,sa.AcademicYearId,ay.AcademicYearName,sa.AcademicLevel,sa.GroupId,g.GroupName,sa.SectionId,s.SectionName,sa.Medium,sa.SecondLanguage,sa.AdmissionType,sa.PreviousSchool,sa.PreviousYearOfPassing,sa.PreviousBoard,sa.PreviousPercentage,sa.ScholarshipStatus,sa.TransferCertificate,sa.MarksMemo,sa.AadhaarDocument,sa.CasteCertificate,sa.IncomeCertificate,sa.Remarks,sa.Status,sa.IsVerified,sa.IsApproved,sa.IsRejected,sa.IsActive FROM StudentAdmissions sa LEFT JOIN Students st ON st.AdmissionId=sa.AdmissionId LEFT JOIN Boards b ON b.BoardId=sa.BoardId LEFT JOIN AcademicYears ay ON ay.AcademicYearId=sa.AcademicYearId LEFT JOIN `Groups` g ON g.GroupId=sa.GroupId LEFT JOIN Sections s ON s.SectionId=sa.SectionId WHERE sa.AdmissionId=p_AdmissionId;
END;
", suppressTransaction: true);
            migrationBuilder.Sql(@"
CREATE PROCEDURE sp_GetAllAdmissionsV2()
BEGIN
 SELECT sa.AdmissionId,st.StudentId,sa.AdmissionNo,sa.AdmissionDate,sa.AdmissionQuota,sa.FirstName,sa.LastName,sa.Gender,sa.DateOfBirth,sa.BloodGroup,sa.StudentPhoto,sa.Email,sa.MobileNumber,sa.RollNo,sa.AadhaarNumber,sa.Nationality,sa.Religion,sa.Category,sa.FatherName,sa.FatherOccupation,sa.FatherMobile,sa.FatherEmail,sa.MotherName,sa.MotherOccupation,sa.MotherMobile,sa.MotherEmail,sa.GuardianName,sa.GuardianMobile,sa.GuardianEmail,sa.AnnualIncome,sa.Address,sa.AddressLine1,sa.AddressLine2,sa.City,sa.District,sa.State,sa.Pincode,sa.BoardId,b.BoardName,sa.AcademicYearId,ay.AcademicYearName,sa.AcademicLevel,sa.GroupId,g.GroupName,sa.SectionId,s.SectionName,sa.Medium,sa.SecondLanguage,sa.AdmissionType,sa.PreviousSchool,sa.PreviousYearOfPassing,sa.PreviousBoard,sa.PreviousPercentage,sa.ScholarshipStatus,sa.TransferCertificate,sa.MarksMemo,sa.AadhaarDocument,sa.CasteCertificate,sa.IncomeCertificate,sa.Remarks,sa.Status,sa.IsVerified,sa.IsApproved,sa.IsRejected,sa.IsActive FROM StudentAdmissions sa LEFT JOIN Students st ON st.AdmissionId=sa.AdmissionId LEFT JOIN Boards b ON b.BoardId=sa.BoardId LEFT JOIN AcademicYears ay ON ay.AcademicYearId=sa.AcademicYearId LEFT JOIN `Groups` g ON g.GroupId=sa.GroupId LEFT JOIN Sections s ON s.SectionId=sa.SectionId ORDER BY sa.AdmissionId DESC;
END;
", suppressTransaction: true);
            migrationBuilder.Sql(@"
CREATE PROCEDURE sp_GetAdmissionByIdV2(IN p_AdmissionId INT)
BEGIN
 SELECT sa.AdmissionId,st.StudentId,sa.AdmissionNo,sa.AdmissionDate,sa.AdmissionQuota,sa.FirstName,sa.LastName,sa.Gender,sa.DateOfBirth,sa.BloodGroup,sa.StudentPhoto,sa.Email,sa.MobileNumber,sa.RollNo,sa.AadhaarNumber,sa.Nationality,sa.Religion,sa.Category,sa.FatherName,sa.FatherOccupation,sa.FatherMobile,sa.FatherEmail,sa.MotherName,sa.MotherOccupation,sa.MotherMobile,sa.MotherEmail,sa.GuardianName,sa.GuardianMobile,sa.GuardianEmail,sa.AnnualIncome,sa.Address,sa.AddressLine1,sa.AddressLine2,sa.City,sa.District,sa.State,sa.Pincode,sa.BoardId,b.BoardName,sa.AcademicYearId,ay.AcademicYearName,sa.AcademicLevel,sa.GroupId,g.GroupName,sa.SectionId,s.SectionName,sa.Medium,sa.SecondLanguage,sa.AdmissionType,sa.PreviousSchool,sa.PreviousYearOfPassing,sa.PreviousBoard,sa.PreviousPercentage,sa.ScholarshipStatus,sa.TransferCertificate,sa.MarksMemo,sa.AadhaarDocument,sa.CasteCertificate,sa.IncomeCertificate,sa.Remarks,sa.Status,sa.IsVerified,sa.IsApproved,sa.IsRejected,sa.IsActive FROM StudentAdmissions sa LEFT JOIN Students st ON st.AdmissionId=sa.AdmissionId LEFT JOIN Boards b ON b.BoardId=sa.BoardId LEFT JOIN AcademicYears ay ON ay.AcademicYearId=sa.AcademicYearId LEFT JOIN `Groups` g ON g.GroupId=sa.GroupId LEFT JOIN Sections s ON s.SectionId=sa.SectionId WHERE sa.AdmissionId=p_AdmissionId LIMIT 1;
END;
", suppressTransaction: true);
            migrationBuilder.Sql(@"
CREATE PROCEDURE sp_ApproveAdmissionV2(IN p_AdmissionId INT)
BEGIN
 DECLARE v_StudentId INT DEFAULT NULL;
 DECLARE v_RollNo VARCHAR(30);
 IF NOT EXISTS(SELECT 1 FROM StudentAdmissions WHERE AdmissionId=p_AdmissionId AND IsActive=1 AND IsRejected=0) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Admission not found or rejected'; END IF;
 SELECT StudentId INTO v_StudentId FROM Students WHERE AdmissionId=p_AdmissionId LIMIT 1;
 IF v_StudentId IS NULL THEN
  SELECT COALESCE(NULLIF(RollNo,''),CONCAT('R',LPAD(AdmissionId,5,'0'))) INTO v_RollNo FROM StudentAdmissions WHERE AdmissionId=p_AdmissionId;
  INSERT INTO Students(AdmissionId,BoardId,SectionId,AdmissionNo,RollNo,StudentName,Photo,Gender,DateOfBirth,BloodGroup,Email,MobileNumber,AadhaarNumber,Address,AddressLine1,AddressLine2,City,District,State,Pincode,Nationality,Religion,Category,Board,AcademicYearId,AcademicLevel,GroupId,Section,AdmissionDate,AdmissionType,AdmissionQuota,Medium,SecondLanguage,PreviousSchool,PreviousYearOfPassing,PreviousBoard,PreviousPercentage,StudentCategory,ScholarshipStatus,FatherName,FatherOccupation,FatherMobile,FatherEmail,MotherName,MotherOccupation,MotherMobile,MotherEmail,GuardianName,GuardianMobile,GuardianEmail,AnnualIncome,TransferCertificate,MarksMemo,AadhaarDocument,CasteCertificate,IncomeCertificate,Remarks,FeeAmount,FeePaid,ScholarshipAmount,FeeStatus,AttendancePercentage,PasswordHash,IsFirstLogin,IsActive,CreatedAt)
  SELECT sa.AdmissionId,sa.BoardId,sa.SectionId,sa.AdmissionNo,v_RollNo,CONCAT(TRIM(sa.FirstName),' ',TRIM(sa.LastName)),sa.StudentPhoto,sa.Gender,DATE(sa.DateOfBirth),sa.BloodGroup,COALESCE(NULLIF(sa.Email,''),CONCAT(sa.AdmissionNo,'@student.local')),COALESCE(NULLIF(sa.MobileNumber,''),sa.FatherMobile),sa.AadhaarNumber,COALESCE(sa.Address,CONCAT_WS(', ',sa.AddressLine1,sa.AddressLine2,sa.City,sa.District,sa.State,sa.Pincode)),sa.AddressLine1,sa.AddressLine2,sa.City,sa.District,sa.State,sa.Pincode,sa.Nationality,sa.Religion,sa.Category,b.BoardName,sa.AcademicYearId,sa.AcademicLevel,sa.GroupId,s.SectionName,DATE(sa.AdmissionDate),COALESCE(NULLIF(sa.AdmissionType,''),'Regular'),sa.AdmissionQuota,sa.Medium,sa.SecondLanguage,sa.PreviousSchool,sa.PreviousYearOfPassing,sa.PreviousBoard,sa.PreviousPercentage,sa.Category,sa.ScholarshipStatus,sa.FatherName,sa.FatherOccupation,sa.FatherMobile,sa.FatherEmail,sa.MotherName,sa.MotherOccupation,sa.MotherMobile,sa.MotherEmail,sa.GuardianName,sa.GuardianMobile,sa.GuardianEmail,sa.AnnualIncome,sa.TransferCertificate,sa.MarksMemo,sa.AadhaarDocument,sa.CasteCertificate,sa.IncomeCertificate,sa.Remarks,0,0,0,'Pending',0,'',1,1,UTC_TIMESTAMP()
  FROM StudentAdmissions sa LEFT JOIN Boards b ON b.BoardId=sa.BoardId LEFT JOIN Sections s ON s.SectionId=sa.SectionId WHERE sa.AdmissionId=p_AdmissionId;
  SET v_StudentId=LAST_INSERT_ID();
 END IF;
 UPDATE StudentAdmissions SET IsVerified=1,IsApproved=1,IsRejected=0,Status='Approved',UpdatedAt=UTC_TIMESTAMP() WHERE AdmissionId=p_AdmissionId;
 SELECT v_StudentId AS StudentId;
END;
", suppressTransaction: true);
            migrationBuilder.Sql(@"
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
", suppressTransaction: true);
            migrationBuilder.Sql(@"
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

END;
", suppressTransaction: true);
            migrationBuilder.Sql(@"
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
", suppressTransaction: true);
            migrationBuilder.Sql(@"
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
", suppressTransaction: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Intentionally do not restore removed legacy columns; this migration defines the final API contract.
        }
    }
}
