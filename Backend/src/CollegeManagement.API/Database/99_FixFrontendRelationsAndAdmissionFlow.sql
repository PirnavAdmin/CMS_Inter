/*
  FINAL DATABASE PATCH
  ====================
  The supported way to apply this patch is:
      Update-Database

  EF migration:
      20260809160000_SyncStudentAdmissionFrontendFields

  This file is kept as a reference/manual recovery script. It is intentionally
  aligned with the final migration contract: StudentAdmission -> Student and
  Board/AcademicYear/Group -> Subject relations.
*/

ALTER TABLE `StudentAdmissions`
    ADD COLUMN IF NOT EXISTS `Email` VARCHAR(150) NULL AFTER `StudentPhoto`,
    ADD COLUMN IF NOT EXISTS `MobileNumber` VARCHAR(20) NULL AFTER `Email`,
    ADD COLUMN IF NOT EXISTS `AdmissionType` VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS `Medium` VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS `ScholarshipStatus` VARCHAR(50) NULL;

ALTER TABLE `Subjects`
    ADD COLUMN IF NOT EXISTS `BoardId` INT NULL AFTER `SubjectId`,
    ADD COLUMN IF NOT EXISTS `AcademicYearId` INT NULL AFTER `BoardId`,
    ADD COLUMN IF NOT EXISTS `GroupId` INT NULL AFTER `AcademicYearId`,
    ADD COLUMN IF NOT EXISTS `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS `UpdatedAt` DATETIME(6) NULL;

ALTER TABLE `Students`
    ADD COLUMN IF NOT EXISTS `BoardId` INT NULL AFTER `AdmissionId`,
    ADD COLUMN IF NOT EXISTS `SectionId` INT NULL AFTER `BoardId`;

ALTER TABLE `Sections`
    ADD COLUMN IF NOT EXISTS `BoardId` INT NULL AFTER `SectionId`,
    ADD COLUMN IF NOT EXISTS `GroupId` INT NULL AFTER `AcademicYearId`;

UPDATE `Students` st
JOIN `StudentAdmissions` sa ON sa.AdmissionId = st.AdmissionId
SET st.BoardId = sa.BoardId,
    st.SectionId = sa.SectionId
WHERE st.AdmissionId IS NOT NULL;

UPDATE `Subjects` s
JOIN `Boards` b ON b.BoardName = s.Board
SET s.BoardId = b.BoardId
WHERE s.BoardId IS NULL;

UPDATE `Subjects` s
JOIN `Groups` g ON g.GroupName = s.`Group` AND g.Board = s.Board
SET s.GroupId = g.GroupId,
    s.AcademicYearId = g.AcademicYearId
WHERE s.GroupId IS NULL;

UPDATE `Sections` s
JOIN `Boards` b ON b.BoardName = s.Board
SET s.BoardId = b.BoardId
WHERE s.BoardId IS NULL;

UPDATE `Sections` s
JOIN `Groups` g
  ON g.GroupName = s.`Group`
 AND g.Board = s.Board
 AND g.AcademicYearId = s.AcademicYearId
 AND g.AcademicLevel = s.AcademicLevel
SET s.GroupId = g.GroupId
WHERE s.GroupId IS NULL;

/*
  Stored procedures are installed by the EF migration. Do not paste an older
  copy of sp_ApproveAdmission or the old Subject procedures over the final ones.
*/
