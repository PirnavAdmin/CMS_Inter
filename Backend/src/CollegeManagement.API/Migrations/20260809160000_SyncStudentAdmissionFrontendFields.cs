using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    [Migration("20260809160000_SyncStudentAdmissionFrontendFields")]
    public partial class SyncStudentAdmissionFrontendFields : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The migration is deliberately SQL-first and idempotent. This is important
            // for Hostinger/MySQL databases that already contain some of the legacy columns.
            migrationBuilder.Sql(@"
ALTER TABLE `StudentAdmissions`
    ADD COLUMN IF NOT EXISTS `AdmissionQuota` VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS `RollNo` VARCHAR(30) NULL,
    ADD COLUMN IF NOT EXISTS `FatherOccupation` VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS `FatherMobile` VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS `FatherEmail` VARCHAR(150) NULL,
    ADD COLUMN IF NOT EXISTS `MotherOccupation` VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS `MotherMobile` VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS `MotherEmail` VARCHAR(150) NULL,
    ADD COLUMN IF NOT EXISTS `GuardianMobile` VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS `GuardianEmail` VARCHAR(150) NULL,
    ADD COLUMN IF NOT EXISTS `AddressLine1` VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS `AddressLine2` VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS `Medium` VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS `SecondLanguage` VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS `PreviousYearOfPassing` INT NULL,
    ADD COLUMN IF NOT EXISTS `MarksMemo` VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS `CasteCertificate` VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS `Remarks` VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS `StudentEmail` VARCHAR(150) NULL,
    ADD COLUMN IF NOT EXISTS `StudentMobileNumber` VARCHAR(20) NULL;
", suppressTransaction: true);

            migrationBuilder.Sql(@"
ALTER TABLE `Students`
    ADD COLUMN IF NOT EXISTS `AdmissionQuota` VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS `AddressLine1` VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS `AddressLine2` VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS `City` VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS `District` VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS `State` VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS `Pincode` VARCHAR(10) NULL,
    ADD COLUMN IF NOT EXISTS `Nationality` VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS `Religion` VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS `Category` VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS `SecondLanguage` VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS `PreviousYearOfPassing` INT NULL,
    ADD COLUMN IF NOT EXISTS `PreviousBoard` VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS `PreviousPercentage` DECIMAL(5,2) NULL,
    ADD COLUMN IF NOT EXISTS `FatherOccupation` VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS `FatherEmail` VARCHAR(150) NULL,
    ADD COLUMN IF NOT EXISTS `MotherOccupation` VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS `MotherEmail` VARCHAR(150) NULL,
    ADD COLUMN IF NOT EXISTS `GuardianEmail` VARCHAR(150) NULL,
    ADD COLUMN IF NOT EXISTS `AnnualIncome` DECIMAL(18,2) NULL,
    ADD COLUMN IF NOT EXISTS `TransferCertificate` VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS `MarksMemo` VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS `AadhaarDocument` VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS `CasteCertificate` VARCHAR(500) NULL,
    ADD COLUMN IF NOT EXISTS `IncomeCertificate` VARCHAR(500) NULL;
", suppressTransaction: true);

            migrationBuilder.Sql(@"
UPDATE Students st
JOIN StudentAdmissions sa ON sa.AdmissionId = st.AdmissionId
SET
    st.AdmissionQuota = sa.AdmissionQuota,
    st.RollNo = COALESCE(NULLIF(sa.RollNo,''), st.RollNo),
    st.AddressLine1 = COALESCE(sa.AddressLine1, st.AddressLine1),
    st.AddressLine2 = COALESCE(sa.AddressLine2, st.AddressLine2),
    st.City = COALESCE(sa.City, st.City),
    st.District = COALESCE(sa.District, st.District),
    st.State = COALESCE(sa.State, st.State),
    st.Pincode = COALESCE(sa.Pincode, st.Pincode),
    st.Religion = COALESCE(sa.Religion, st.Religion),
    st.Category = COALESCE(sa.Category, st.Category),
    st.Nationality = COALESCE(sa.Nationality, st.Nationality),
    st.Medium = COALESCE(sa.Medium, st.Medium),
    st.SecondLanguage = COALESCE(sa.SecondLanguage, st.SecondLanguage),
    st.PreviousYearOfPassing = COALESCE(sa.PreviousYearOfPassing, st.PreviousYearOfPassing),
    st.PreviousBoard = COALESCE(sa.PreviousBoard, st.PreviousBoard),
    st.PreviousPercentage = COALESCE(sa.PreviousPercentage, st.PreviousPercentage),
    st.FatherOccupation = COALESCE(sa.FatherOccupation, st.FatherOccupation),
    st.FatherMobile = COALESCE(sa.FatherMobile, st.FatherMobile),
    st.FatherEmail = COALESCE(sa.FatherEmail, st.FatherEmail),
    st.MotherOccupation = COALESCE(sa.MotherOccupation, st.MotherOccupation),
    st.MotherMobile = COALESCE(sa.MotherMobile, st.MotherMobile),
    st.MotherEmail = COALESCE(sa.MotherEmail, st.MotherEmail),
    st.GuardianMobile = COALESCE(sa.GuardianMobile, st.GuardianMobile),
    st.GuardianEmail = COALESCE(sa.GuardianEmail, st.GuardianEmail),
    st.AnnualIncome = COALESCE(sa.AnnualIncome, st.AnnualIncome),
    st.TransferCertificate = COALESCE(sa.TransferCertificate, st.TransferCertificate),
    st.MarksMemo = COALESCE(sa.MarksMemo, st.MarksMemo),
    st.AadhaarDocument = COALESCE(sa.AadhaarDocument, st.AadhaarDocument),
    st.CasteCertificate = COALESCE(sa.CasteCertificate, st.CasteCertificate),
    st.IncomeCertificate = COALESCE(sa.IncomeCertificate, st.IncomeCertificate),
    st.Remarks = COALESCE(sa.Remarks, st.Remarks),
    st.Email = COALESCE(NULLIF(sa.StudentEmail,''), st.Email),
    st.MobileNumber = COALESCE(NULLIF(sa.StudentMobileNumber,''), st.MobileNumber),
    st.Photo = COALESCE(sa.StudentPhoto, st.Photo),
    st.BoardId = COALESCE(st.BoardId, sa.BoardId),
    st.SectionId = COALESCE(st.SectionId, sa.SectionId),
    st.UpdatedAt = UTC_TIMESTAMP();
", suppressTransaction: true);

            // Final subject/group relationship contract: GroupId is the source of truth.
            migrationBuilder.Sql(@"
UPDATE Subjects s
JOIN `Groups` g ON g.GroupId=s.GroupId
SET s.Board=g.Board,
    s.`Group`=g.GroupName,
    s.AcademicYearId=g.AcademicYearId,
    s.AcademicLevel=g.AcademicLevel
WHERE s.GroupId IS NOT NULL;
", suppressTransaction: true);

            // -------------------- Admission procedures --------------------
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_CreateAdmissionV2;
CREATE PROCEDURE sp_CreateAdmissionV2(
 IN p_AdmissionNo VARCHAR(30), IN p_AdmissionDate DATETIME, IN p_AdmissionQuota VARCHAR(50),
 IN p_FirstName VARCHAR(100), IN p_LastName VARCHAR(100), IN p_Gender VARCHAR(20), IN p_DateOfBirth DATETIME,
 IN p_BloodGroup VARCHAR(10), IN p_StudentEmail VARCHAR(150), IN p_StudentMobileNumber VARCHAR(20), IN p_RollNo VARCHAR(30), IN p_StudentPhoto VARCHAR(500),
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
 AdmissionNo,AdmissionDate,AdmissionQuota,FirstName,LastName,Gender,DateOfBirth,BloodGroup,StudentPhoto,StudentEmail,StudentMobileNumber,RollNo,AadhaarNumber,Nationality,Religion,Category,
 FatherName,FatherOccupation,FatherMobile,FatherEmail,MotherName,MotherOccupation,MotherMobile,MotherEmail,GuardianName,GuardianMobile,GuardianEmail,AnnualIncome,ParentMobile,ParentEmail,Occupation,
 Address,AddressLine1,AddressLine2,City,District,State,Pincode,BoardId,AcademicYearId,AcademicLevel,GroupId,SectionId,Medium,SecondLanguage,AdmissionType,
 PreviousSchool,PreviousYearOfPassing,PreviousBoard,PreviousPercentage,ScholarshipStatus,TransferCertificate,MarksMemo,AadhaarDocument,CasteCertificate,IncomeCertificate,Remarks,Status,IsVerified,IsApproved,IsRejected,IsActive,CreatedAt)
 VALUES(
 TRIM(p_AdmissionNo),p_AdmissionDate,p_AdmissionQuota,TRIM(p_FirstName),TRIM(p_LastName),TRIM(p_Gender),p_DateOfBirth,p_BloodGroup,p_StudentPhoto,p_StudentEmail,p_StudentMobileNumber,p_RollNo,TRIM(p_AadhaarNumber),p_Nationality,p_Religion,p_Category,
 TRIM(p_FatherName),p_FatherOccupation,TRIM(p_FatherMobile),p_FatherEmail,TRIM(p_MotherName),p_MotherOccupation,p_MotherMobile,p_MotherEmail,p_GuardianName,p_GuardianMobile,p_GuardianEmail,p_AnnualIncome,TRIM(p_FatherMobile),p_FatherEmail,p_FatherOccupation,
 COALESCE(p_Address,CONCAT_WS(', ',p_AddressLine1,p_AddressLine2)),p_AddressLine1,p_AddressLine2,p_City,p_District,p_State,p_Pincode,p_BoardId,p_AcademicYearId,TRIM(p_AcademicLevel),p_GroupId,p_SectionId,p_Medium,p_SecondLanguage,COALESCE(NULLIF(p_AdmissionType,''),'Regular'),
 p_PreviousSchool,p_PreviousYearOfPassing,p_PreviousBoard,p_PreviousPercentage,p_ScholarshipStatus,p_TransferCertificate,p_MarksMemo,p_AadhaarDocument,p_CasteCertificate,p_IncomeCertificate,p_Remarks,'Pending',0,0,0,1,UTC_TIMESTAMP());
 SELECT sa.AdmissionId, NULL AS StudentId, sa.AdmissionNo,sa.AdmissionDate,sa.AdmissionQuota,sa.FirstName,sa.LastName,sa.Gender,sa.DateOfBirth,sa.BloodGroup,sa.StudentPhoto,sa.StudentEmail,sa.StudentMobileNumber,sa.StudentEmail AS Email,sa.StudentMobileNumber AS MobileNumber,sa.RollNo,sa.AadhaarNumber,sa.Nationality,sa.Religion,sa.Category,
 sa.FatherName,sa.FatherOccupation,sa.FatherMobile,sa.FatherEmail,sa.MotherName,sa.MotherOccupation,sa.MotherMobile,sa.MotherEmail,sa.GuardianName,sa.GuardianMobile,sa.GuardianEmail,sa.AnnualIncome,
 sa.Address,sa.AddressLine1,sa.AddressLine2,sa.City,sa.District,sa.State,sa.Pincode,sa.BoardId,b.BoardName,sa.AcademicYearId,ay.AcademicYearName,sa.AcademicLevel,sa.GroupId,g.GroupName,sa.SectionId,s.SectionName,
 sa.Medium,sa.SecondLanguage,sa.AdmissionType,sa.PreviousSchool,sa.PreviousYearOfPassing,sa.PreviousBoard,sa.PreviousPercentage,sa.ScholarshipStatus,sa.TransferCertificate,sa.MarksMemo,sa.AadhaarDocument,sa.CasteCertificate,sa.IncomeCertificate,sa.Remarks,sa.Status,sa.IsVerified,sa.IsApproved,sa.IsRejected,sa.IsActive
 FROM StudentAdmissions sa LEFT JOIN Boards b ON b.BoardId=sa.BoardId LEFT JOIN AcademicYears ay ON ay.AcademicYearId=sa.AcademicYearId LEFT JOIN `Groups` g ON g.GroupId=sa.GroupId LEFT JOIN Sections s ON s.SectionId=sa.SectionId WHERE sa.AdmissionId=LAST_INSERT_ID();
END;
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_UpdateAdmissionV2;
CREATE PROCEDURE sp_UpdateAdmissionV2(
 IN p_AdmissionId INT, IN p_AdmissionNo VARCHAR(30), IN p_AdmissionDate DATETIME, IN p_AdmissionQuota VARCHAR(50),
 IN p_FirstName VARCHAR(100), IN p_LastName VARCHAR(100), IN p_Gender VARCHAR(20), IN p_DateOfBirth DATETIME, IN p_BloodGroup VARCHAR(10), IN p_StudentEmail VARCHAR(150), IN p_StudentMobileNumber VARCHAR(20), IN p_RollNo VARCHAR(30), IN p_StudentPhoto VARCHAR(500), IN p_AadhaarNumber VARCHAR(20), IN p_Nationality VARCHAR(100), IN p_Religion VARCHAR(100), IN p_Category VARCHAR(100),
 IN p_FatherName VARCHAR(150), IN p_FatherOccupation VARCHAR(100), IN p_FatherMobile VARCHAR(20), IN p_FatherEmail VARCHAR(150), IN p_MotherName VARCHAR(150), IN p_MotherOccupation VARCHAR(100), IN p_MotherMobile VARCHAR(20), IN p_MotherEmail VARCHAR(150), IN p_GuardianName VARCHAR(150), IN p_GuardianMobile VARCHAR(20), IN p_GuardianEmail VARCHAR(150), IN p_AnnualIncome DECIMAL(18,2),
 IN p_Address VARCHAR(500), IN p_AddressLine1 VARCHAR(500), IN p_AddressLine2 VARCHAR(500), IN p_City VARCHAR(100), IN p_District VARCHAR(100), IN p_State VARCHAR(100), IN p_Pincode VARCHAR(10), IN p_BoardId INT, IN p_AcademicYearId INT, IN p_AcademicLevel VARCHAR(50), IN p_GroupId INT, IN p_SectionId INT, IN p_Medium VARCHAR(50), IN p_SecondLanguage VARCHAR(50), IN p_AdmissionType VARCHAR(50), IN p_PreviousSchool VARCHAR(200), IN p_PreviousYearOfPassing INT, IN p_PreviousBoard VARCHAR(100), IN p_PreviousPercentage DECIMAL(5,2), IN p_ScholarshipStatus VARCHAR(50), IN p_TransferCertificate VARCHAR(500), IN p_MarksMemo VARCHAR(500), IN p_AadhaarDocument VARCHAR(500), IN p_CasteCertificate VARCHAR(500), IN p_IncomeCertificate VARCHAR(500), IN p_Remarks VARCHAR(500))
BEGIN
 IF NOT EXISTS(SELECT 1 FROM StudentAdmissions WHERE AdmissionId=p_AdmissionId) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Admission not found'; END IF;
 UPDATE StudentAdmissions SET AdmissionNo=TRIM(p_AdmissionNo),AdmissionDate=p_AdmissionDate,AdmissionQuota=p_AdmissionQuota,FirstName=TRIM(p_FirstName),LastName=TRIM(p_LastName),Gender=TRIM(p_Gender),DateOfBirth=p_DateOfBirth,BloodGroup=p_BloodGroup,StudentEmail=p_StudentEmail,StudentMobileNumber=p_StudentMobileNumber,RollNo=p_RollNo,StudentPhoto=COALESCE(p_StudentPhoto,StudentPhoto),AadhaarNumber=TRIM(p_AadhaarNumber),Nationality=p_Nationality,Religion=p_Religion,Category=p_Category,FatherName=TRIM(p_FatherName),FatherOccupation=p_FatherOccupation,FatherMobile=TRIM(p_FatherMobile),FatherEmail=p_FatherEmail,MotherName=TRIM(p_MotherName),MotherOccupation=p_MotherOccupation,MotherMobile=p_MotherMobile,MotherEmail=p_MotherEmail,GuardianName=p_GuardianName,GuardianMobile=p_GuardianMobile,GuardianEmail=p_GuardianEmail,AnnualIncome=p_AnnualIncome,ParentMobile=TRIM(p_FatherMobile),ParentEmail=p_FatherEmail,Occupation=p_FatherOccupation,Address=COALESCE(p_Address,CONCAT_WS(', ',p_AddressLine1,p_AddressLine2)),AddressLine1=p_AddressLine1,AddressLine2=p_AddressLine2,City=p_City,District=p_District,State=p_State,Pincode=p_Pincode,BoardId=p_BoardId,AcademicYearId=p_AcademicYearId,AcademicLevel=TRIM(p_AcademicLevel),GroupId=p_GroupId,SectionId=p_SectionId,Medium=p_Medium,SecondLanguage=p_SecondLanguage,AdmissionType=p_AdmissionType,PreviousSchool=p_PreviousSchool,PreviousYearOfPassing=p_PreviousYearOfPassing,PreviousBoard=p_PreviousBoard,PreviousPercentage=p_PreviousPercentage,ScholarshipStatus=p_ScholarshipStatus,TransferCertificate=COALESCE(p_TransferCertificate,TransferCertificate),MarksMemo=COALESCE(p_MarksMemo,MarksMemo),AadhaarDocument=COALESCE(p_AadhaarDocument,AadhaarDocument),CasteCertificate=COALESCE(p_CasteCertificate,CasteCertificate),IncomeCertificate=COALESCE(p_IncomeCertificate,IncomeCertificate),Remarks=p_Remarks,UpdatedAt=UTC_TIMESTAMP() WHERE AdmissionId=p_AdmissionId;
 SELECT sa.AdmissionId,st.StudentId,sa.AdmissionNo,sa.AdmissionDate,sa.AdmissionQuota,sa.FirstName,sa.LastName,sa.Gender,sa.DateOfBirth,sa.BloodGroup,sa.StudentPhoto,sa.StudentEmail,sa.StudentMobileNumber,sa.StudentEmail AS Email,sa.StudentMobileNumber AS MobileNumber,sa.RollNo,sa.AadhaarNumber,sa.Nationality,sa.Religion,sa.Category,sa.FatherName,sa.FatherOccupation,sa.FatherMobile,sa.FatherEmail,sa.MotherName,sa.MotherOccupation,sa.MotherMobile,sa.MotherEmail,sa.GuardianName,sa.GuardianMobile,sa.GuardianEmail,sa.AnnualIncome,sa.Address,sa.AddressLine1,sa.AddressLine2,sa.City,sa.District,sa.State,sa.Pincode,sa.BoardId,b.BoardName,sa.AcademicYearId,ay.AcademicYearName,sa.AcademicLevel,sa.GroupId,g.GroupName,sa.SectionId,s.SectionName,sa.Medium,sa.SecondLanguage,sa.AdmissionType,sa.PreviousSchool,sa.PreviousYearOfPassing,sa.PreviousBoard,sa.PreviousPercentage,sa.ScholarshipStatus,sa.TransferCertificate,sa.MarksMemo,sa.AadhaarDocument,sa.CasteCertificate,sa.IncomeCertificate,sa.Remarks,sa.Status,sa.IsVerified,sa.IsApproved,sa.IsRejected,sa.IsActive FROM StudentAdmissions sa LEFT JOIN Students st ON st.AdmissionId=sa.AdmissionId LEFT JOIN Boards b ON b.BoardId=sa.BoardId LEFT JOIN AcademicYears ay ON ay.AcademicYearId=sa.AcademicYearId LEFT JOIN `Groups` g ON g.GroupId=sa.GroupId LEFT JOIN Sections s ON s.SectionId=sa.SectionId WHERE sa.AdmissionId=p_AdmissionId;
END;
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetAllAdmissionsV2;
CREATE PROCEDURE sp_GetAllAdmissionsV2()
BEGIN
 SELECT sa.AdmissionId,st.StudentId,sa.AdmissionNo,sa.AdmissionDate,sa.AdmissionQuota,sa.FirstName,sa.LastName,sa.Gender,sa.DateOfBirth,sa.BloodGroup,sa.StudentPhoto,sa.StudentEmail,sa.StudentMobileNumber,sa.StudentEmail AS Email,sa.StudentMobileNumber AS MobileNumber,sa.RollNo,sa.AadhaarNumber,sa.Nationality,sa.Religion,sa.Category,sa.FatherName,sa.FatherOccupation,sa.FatherMobile,sa.FatherEmail,sa.MotherName,sa.MotherOccupation,sa.MotherMobile,sa.MotherEmail,sa.GuardianName,sa.GuardianMobile,sa.GuardianEmail,sa.AnnualIncome,sa.Address,sa.AddressLine1,sa.AddressLine2,sa.City,sa.District,sa.State,sa.Pincode,sa.BoardId,b.BoardName,sa.AcademicYearId,ay.AcademicYearName,sa.AcademicLevel,sa.GroupId,g.GroupName,sa.SectionId,s.SectionName,sa.Medium,sa.SecondLanguage,sa.AdmissionType,sa.PreviousSchool,sa.PreviousYearOfPassing,sa.PreviousBoard,sa.PreviousPercentage,sa.ScholarshipStatus,sa.TransferCertificate,sa.MarksMemo,sa.AadhaarDocument,sa.CasteCertificate,sa.IncomeCertificate,sa.Remarks,sa.Status,sa.IsVerified,sa.IsApproved,sa.IsRejected,sa.IsActive FROM StudentAdmissions sa LEFT JOIN Students st ON st.AdmissionId=sa.AdmissionId LEFT JOIN Boards b ON b.BoardId=sa.BoardId LEFT JOIN AcademicYears ay ON ay.AcademicYearId=sa.AcademicYearId LEFT JOIN `Groups` g ON g.GroupId=sa.GroupId LEFT JOIN Sections s ON s.SectionId=sa.SectionId ORDER BY sa.AdmissionId DESC;
END;
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetAdmissionByIdV2;
CREATE PROCEDURE sp_GetAdmissionByIdV2(IN p_AdmissionId INT)
BEGIN
 SELECT sa.AdmissionId,st.StudentId,sa.AdmissionNo,sa.AdmissionDate,sa.AdmissionQuota,sa.FirstName,sa.LastName,sa.Gender,sa.DateOfBirth,sa.BloodGroup,sa.StudentPhoto,sa.StudentEmail,sa.StudentMobileNumber,sa.StudentEmail AS Email,sa.StudentMobileNumber AS MobileNumber,sa.RollNo,sa.AadhaarNumber,sa.Nationality,sa.Religion,sa.Category,sa.FatherName,sa.FatherOccupation,sa.FatherMobile,sa.FatherEmail,sa.MotherName,sa.MotherOccupation,sa.MotherMobile,sa.MotherEmail,sa.GuardianName,sa.GuardianMobile,sa.GuardianEmail,sa.AnnualIncome,sa.Address,sa.AddressLine1,sa.AddressLine2,sa.City,sa.District,sa.State,sa.Pincode,sa.BoardId,b.BoardName,sa.AcademicYearId,ay.AcademicYearName,sa.AcademicLevel,sa.GroupId,g.GroupName,sa.SectionId,s.SectionName,sa.Medium,sa.SecondLanguage,sa.AdmissionType,sa.PreviousSchool,sa.PreviousYearOfPassing,sa.PreviousBoard,sa.PreviousPercentage,sa.ScholarshipStatus,sa.TransferCertificate,sa.MarksMemo,sa.AadhaarDocument,sa.CasteCertificate,sa.IncomeCertificate,sa.Remarks,sa.Status,sa.IsVerified,sa.IsApproved,sa.IsRejected,sa.IsActive FROM StudentAdmissions sa LEFT JOIN Students st ON st.AdmissionId=sa.AdmissionId LEFT JOIN Boards b ON b.BoardId=sa.BoardId LEFT JOIN AcademicYears ay ON ay.AcademicYearId=sa.AcademicYearId LEFT JOIN `Groups` g ON g.GroupId=sa.GroupId LEFT JOIN Sections s ON s.SectionId=sa.SectionId WHERE sa.AdmissionId=p_AdmissionId LIMIT 1;
END;
", suppressTransaction: true);

            // -------------------- Approval: Admission -> Student exactly once --------------------
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_ApproveAdmissionV2;
CREATE PROCEDURE sp_ApproveAdmissionV2(IN p_AdmissionId INT)
BEGIN
 DECLARE v_StudentId INT DEFAULT NULL;
 DECLARE v_RollNo VARCHAR(30);
 IF NOT EXISTS(SELECT 1 FROM StudentAdmissions WHERE AdmissionId=p_AdmissionId AND IsActive=1 AND IsRejected=0) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Admission not found or rejected'; END IF;
 SELECT StudentId INTO v_StudentId FROM Students WHERE AdmissionId=p_AdmissionId LIMIT 1;
 IF v_StudentId IS NULL THEN
  SELECT COALESCE(NULLIF(RollNo,''),CONCAT('R',LPAD(AdmissionId,5,'0'))) INTO v_RollNo FROM StudentAdmissions WHERE AdmissionId=p_AdmissionId;
  INSERT INTO Students(AdmissionId,BoardId,SectionId,AdmissionNo,RollNo,StudentName,Photo,Gender,DateOfBirth,BloodGroup,Email,MobileNumber,AadhaarNumber,Address,AddressLine1,AddressLine2,City,District,State,Pincode,Nationality,Religion,Category,Board,AcademicYearId,AcademicLevel,GroupId,Section,AdmissionDate,AdmissionType,AdmissionQuota,Medium,SecondLanguage,PreviousSchool,PreviousYearOfPassing,PreviousBoard,PreviousPercentage,StudentCategory,ScholarshipStatus,FatherName,FatherOccupation,FatherMobile,FatherEmail,MotherName,MotherOccupation,MotherMobile,MotherEmail,GuardianName,GuardianMobile,GuardianEmail,AnnualIncome,TransferCertificate,MarksMemo,AadhaarDocument,CasteCertificate,IncomeCertificate,Remarks,FeeAmount,FeePaid,ScholarshipAmount,FeeStatus,AttendancePercentage,PasswordHash,IsFirstLogin,IsActive,CreatedAt)
  SELECT sa.AdmissionId,sa.BoardId,sa.SectionId,sa.AdmissionNo,v_RollNo,CONCAT(TRIM(sa.FirstName),' ',TRIM(sa.LastName)),sa.StudentPhoto,sa.Gender,DATE(sa.DateOfBirth),sa.BloodGroup,COALESCE(NULLIF(sa.StudentEmail,''),CONCAT(sa.AdmissionNo,'@student.local')),COALESCE(NULLIF(sa.StudentMobileNumber,''),sa.FatherMobile),sa.AadhaarNumber,COALESCE(sa.Address,CONCAT_WS(', ',sa.AddressLine1,sa.AddressLine2,sa.City,sa.District,sa.State,sa.Pincode)),sa.AddressLine1,sa.AddressLine2,sa.City,sa.District,sa.State,sa.Pincode,sa.Nationality,sa.Religion,sa.Category,b.BoardName,sa.AcademicYearId,sa.AcademicLevel,sa.GroupId,s.SectionName,DATE(sa.AdmissionDate),COALESCE(NULLIF(sa.AdmissionType,''),'Regular'),sa.AdmissionQuota,sa.Medium,sa.SecondLanguage,sa.PreviousSchool,sa.PreviousYearOfPassing,sa.PreviousBoard,sa.PreviousPercentage,sa.Category,sa.ScholarshipStatus,sa.FatherName,sa.FatherOccupation,sa.FatherMobile,sa.FatherEmail,sa.MotherName,sa.MotherOccupation,sa.MotherMobile,sa.MotherEmail,sa.GuardianName,sa.GuardianMobile,sa.GuardianEmail,sa.AnnualIncome,sa.TransferCertificate,sa.MarksMemo,sa.AadhaarDocument,sa.CasteCertificate,sa.IncomeCertificate,sa.Remarks,0,0,0,'Pending',0,'',1,1,UTC_TIMESTAMP()
  FROM StudentAdmissions sa LEFT JOIN Boards b ON b.BoardId=sa.BoardId LEFT JOIN Sections s ON s.SectionId=sa.SectionId WHERE sa.AdmissionId=p_AdmissionId;
  SET v_StudentId=LAST_INSERT_ID();
 END IF;
 UPDATE StudentAdmissions SET IsVerified=1,IsApproved=1,IsRejected=0,Status='Approved',UpdatedAt=UTC_TIMESTAMP() WHERE AdmissionId=p_AdmissionId;
 SELECT v_StudentId AS StudentId;
END;
", suppressTransaction: true);

            // -------------------- Student profile/read procedures --------------------
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_GetStudentProfileV2;
CREATE PROCEDURE sp_GetStudentProfileV2(IN p_StudentId INT)
BEGIN
 SELECT s.StudentId,s.AdmissionNo,s.RollNo,s.StudentName,s.Photo,s.Gender,s.DateOfBirth,s.BloodGroup,s.Email,s.MobileNumber,s.AadhaarNumber,s.Address,s.AddressLine1,s.AddressLine2,s.City,s.District,s.State,s.Pincode,s.Religion,s.Category,s.Board,ay.AcademicYearName,s.AcademicLevel,g.GroupName,s.GroupId,s.Section,s.AdmissionDate,s.AdmissionType,s.AdmissionQuota,s.Medium,s.SecondLanguage,s.PreviousSchool,s.PreviousYearOfPassing,s.PreviousBoard,s.PreviousPercentage,s.StudentCategory,s.ScholarshipStatus,s.FatherName,s.FatherOccupation,s.FatherMobile,s.FatherEmail,s.MotherName,s.MotherOccupation,s.MotherMobile,s.MotherEmail,s.GuardianName,s.GuardianMobile,s.GuardianEmail,s.AnnualIncome,s.FeeAmount,s.FeePaid,s.ScholarshipAmount,s.FeeStatus,s.AttendancePercentage,s.PerformanceGrade,s.CGPA,s.`Rank`,s.Remarks,s.IsActive,CASE WHEN s.IsActive=1 THEN 'Active' ELSE 'Inactive' END AS Status FROM Students s LEFT JOIN AcademicYears ay ON ay.AcademicYearId=s.AcademicYearId LEFT JOIN `Groups` g ON g.GroupId=s.GroupId WHERE s.StudentId=p_StudentId LIMIT 1;
END;
", suppressTransaction: true);

            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_UpdateStudentProfileV2;
CREATE PROCEDURE sp_UpdateStudentProfileV2(IN p_StudentId INT,IN p_Photo VARCHAR(500),IN p_Email VARCHAR(150),IN p_MobileNumber VARCHAR(20),IN p_Address VARCHAR(500),IN p_AddressLine1 VARCHAR(500),IN p_AddressLine2 VARCHAR(500),IN p_City VARCHAR(100),IN p_District VARCHAR(100),IN p_State VARCHAR(100),IN p_Pincode VARCHAR(10),IN p_FatherName VARCHAR(150),IN p_FatherOccupation VARCHAR(100),IN p_FatherMobile VARCHAR(20),IN p_FatherEmail VARCHAR(150),IN p_MotherName VARCHAR(150),IN p_MotherOccupation VARCHAR(100),IN p_MotherMobile VARCHAR(20),IN p_MotherEmail VARCHAR(150),IN p_GuardianName VARCHAR(150),IN p_GuardianMobile VARCHAR(20),IN p_GuardianEmail VARCHAR(150),IN p_AnnualIncome DECIMAL(18,2),IN p_Religion VARCHAR(100),IN p_Category VARCHAR(100),IN p_Remarks VARCHAR(500))
BEGIN
 IF NOT EXISTS(SELECT 1 FROM Students WHERE StudentId=p_StudentId) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Student not found'; END IF;
 UPDATE Students SET Photo=COALESCE(p_Photo,Photo),Email=TRIM(p_Email),MobileNumber=p_MobileNumber,Address=COALESCE(p_Address,CONCAT_WS(', ',p_AddressLine1,p_AddressLine2,p_City,p_District,p_State,p_Pincode)),AddressLine1=p_AddressLine1,AddressLine2=p_AddressLine2,City=p_City,District=p_District,State=p_State,Pincode=p_Pincode,FatherName=p_FatherName,FatherOccupation=p_FatherOccupation,FatherMobile=p_FatherMobile,FatherEmail=p_FatherEmail,MotherName=p_MotherName,MotherOccupation=p_MotherOccupation,MotherMobile=p_MotherMobile,MotherEmail=p_MotherEmail,GuardianName=p_GuardianName,GuardianMobile=p_GuardianMobile,GuardianEmail=p_GuardianEmail,AnnualIncome=p_AnnualIncome,Religion=p_Religion,Category=p_Category,Remarks=p_Remarks,UpdatedAt=UTC_TIMESTAMP() WHERE StudentId=p_StudentId;
 CALL sp_GetStudentProfileV2(p_StudentId);
END;
", suppressTransaction: true);

            // The existing CRUD procedures remain available. These V2 read/profile procedures
            // are the contract used by the current Student Management screen.
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DROP PROCEDURE IF EXISTS sp_CreateAdmissionV2;
DROP PROCEDURE IF EXISTS sp_UpdateAdmissionV2;
DROP PROCEDURE IF EXISTS sp_GetAllAdmissionsV2;
DROP PROCEDURE IF EXISTS sp_GetAdmissionByIdV2;
DROP PROCEDURE IF EXISTS sp_ApproveAdmissionV2;
DROP PROCEDURE IF EXISTS sp_GetStudentProfileV2;
DROP PROCEDURE IF EXISTS sp_UpdateStudentProfileV2;
", suppressTransaction: true);
        }
    }
}
