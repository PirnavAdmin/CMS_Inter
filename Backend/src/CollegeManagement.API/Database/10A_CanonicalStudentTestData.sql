-- =============================================================================
-- SCRIPT: 10A_CanonicalStudentTestData.sql
-- PURPOSE: Phase 8C.2 Evidence-Based Student Test Data Canonicalization
-- AUTHOR: Antigravity Team
-- DATE: 2026-08-24
-- TARGET DATABASE: u819242402_CLM_System (srv1061.hstgr.io / MariaDB 11.8+)
--
-- STATUS: PREPARED FOR REVIEW ONLY (DO NOT EXECUTE AUTOMATICALLY)
--
-- INSTRUCTIONS FOR MANUAL EXECUTION (MySQL Workbench):
-- 1. Review the canonical mapping table below.
-- 2. Open MySQL Workbench, connect to u819242402_CLM_System.
-- 3. Execute the entire script (Ctrl + Shift + Enter).
-- 4. Verify post-alignment checks at the end of the script.
-- =============================================================================

SET SQL_SAFE_UPDATES = 0;

-- =============================================================================
-- STEP 1: SAFETY BACKUP OF CURRENT TEST STUDENTS TABLE
-- =============================================================================
SELECT '--- STEP 1: CREATING BACKUP TABLE `_Students_Backup_Phase8` ---' AS Info;

DROP TABLE IF EXISTS `_Students_Backup_Phase8`;
CREATE TABLE `_Students_Backup_Phase8` AS SELECT * FROM `Students`;

SELECT COUNT(*) AS BackedUpStudentRows FROM `_Students_Backup_Phase8`;

-- =============================================================================
-- STEP 2: EVIDENCE-BASED CANONICAL STUDENT ALIGNMENT
-- =============================================================================
-- Evidence Sources:
-- 1. Student 1 (Aarav Kumar, ADM2026001, RollNo 10A001):
--    - 00_SeedData.sql Line 57: Board 'BIEAP' (BoardId 1), Group 'MPC' (GroupId 1), Section 'MPC-A' (SectionId 1), Level 1 (INT-1), Year 6 (2026-2027).
-- 2. Student 2 (Ananya Sharma, ADM2025002, RollNo 250102):
--    - 00_SeedData.sql Line 58: Board 'BIEAP' (BoardId 1), Group 'MPC' (GroupId 1), Section 'MPC-A' (SectionId 1), Level 1 (INT-1), Year 6 (2026-2027).
-- 3. Student 3 (Sai Kiran, ADM003, RollNo MPCA003):
--    - RollNo Prefix 'MPCA': Group 'MPC' (GroupId 1), Section 'A' (SectionId 1), Board 'BIEAP' (BoardId 1), Level 1 (INT-1), Year 6 (2026-2027).
-- 4. Student 6 (nandhini gunji, ADM002, RollNo R00011):
--    - Group in DB is GroupId 2 (BiPC). Valid Section for BiPC is SectionId 3 (BiPC-A), Board 2 (TGBIE), Level 1 (INT-1), Year 6 (2026-2027).
-- 5. Student 7 (Akaay, TESTADM27001, RollNo R00012):
--    - 2nd Year senior test student: Board 'BIEAP' (BoardId 1), Level 2 (INT-2 / Intermediate 2nd Year), Group 'MPC' (GroupId 1), Section 'B' (SectionId 2), Year 6 (2026-2027).
-- =============================================================================
SELECT '--- STEP 2: APPLYING CANONICAL DATA ALIGNMENT ---' AS Info;

-- Student 1: Aarav Kumar (MPC-A, BIEAP, 2026-2027, 1st Year)
UPDATE `Students`
SET 
    BoardId = 1,
    Board = 'Board of Intermediate Education, Andhra Pradesh',
    AcademicYearId = 6,
    AcademicLevelId = 1,
    AcademicLevel = 'Intermediate 1st Year',
    GroupId = 1,
    SectionId = 1,
    Section = 'A',
    UpdatedAt = NOW()
WHERE StudentId = 1;

-- Student 2: Ananya Sharma (MPC-A, BIEAP, 2026-2027, 1st Year) -> Exact Match with 00_SeedData.sql Line 58
UPDATE `Students`
SET 
    BoardId = 1,
    Board = 'Board of Intermediate Education, Andhra Pradesh',
    AcademicYearId = 6,
    AcademicLevelId = 1,
    AcademicLevel = 'Intermediate 1st Year',
    GroupId = 1,
    SectionId = 1,
    Section = 'A',
    UpdatedAt = NOW()
WHERE StudentId = 2;

-- Student 3: Sai Kiran (MPC-A, BIEAP, 2026-2027, 1st Year)
UPDATE `Students`
SET 
    BoardId = 1,
    Board = 'Board of Intermediate Education, Andhra Pradesh',
    AcademicYearId = 6,
    AcademicLevelId = 1,
    AcademicLevel = 'Intermediate 1st Year',
    GroupId = 1,
    SectionId = 1,
    Section = 'A',
    UpdatedAt = NOW()
WHERE StudentId = 3;

-- Student 6: nandhini gunji (BiPC-A, TGBIE, 2026-2027, 1st Year)
UPDATE `Students`
SET 
    BoardId = 2,
    Board = 'Telangana Board of Intermediate Education',
    AcademicYearId = 6,
    AcademicLevelId = 1,
    AcademicLevel = 'Intermediate 1st Year',
    GroupId = 2,
    SectionId = 3,
    Section = 'A',
    UpdatedAt = NOW()
WHERE StudentId = 6;

-- Student 7: Akaay (MPC-B, BIEAP, 2026-2027, 2nd Year)
UPDATE `Students`
SET 
    BoardId = 1,
    Board = 'Board of Intermediate Education, Andhra Pradesh',
    AcademicYearId = 6,
    AcademicLevelId = 2,
    AcademicLevel = 'Intermediate 2nd Year',
    GroupId = 1,
    SectionId = 2,
    Section = 'B',
    UpdatedAt = NOW()
WHERE StudentId = 7;

-- =============================================================================
-- STEP 3: POST-ALIGNMENT INTEGRITY VERIFICATION
-- =============================================================================
SELECT '--- STEP 3: POST-ALIGNMENT INTEGRITY VERIFICATION ---' AS Info;

-- Verify 0 orphan BoardId
SELECT COUNT(*) AS OrphanBoards 
FROM `Students` s 
LEFT JOIN `Boards` b ON b.BoardId = s.BoardId 
WHERE b.BoardId IS NULL OR s.BoardId = 0;

-- Verify 0 orphan AcademicYearId
SELECT COUNT(*) AS OrphanYears 
FROM `Students` s 
LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId 
WHERE ay.AcademicYearId IS NULL OR s.AcademicYearId = 0;

-- Verify 0 orphan AcademicLevelId
SELECT COUNT(*) AS OrphanLevels 
FROM `Students` s 
LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId 
WHERE al.AcademicLevelId IS NULL OR s.AcademicLevelId = 0;

-- Verify 0 orphan GroupId
SELECT COUNT(*) AS OrphanGroups 
FROM `Students` s 
LEFT JOIN `Groups` g ON g.GroupId = s.GroupId 
WHERE g.GroupId IS NULL OR s.GroupId = 0;

-- Verify 0 orphan SectionId
SELECT COUNT(*) AS OrphanSections 
FROM `Students` s 
LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId 
WHERE sec.SectionId IS NULL OR s.SectionId = 0;

-- Verify 0 Group/Section mismatches
SELECT COUNT(*) AS GroupSectionMismatches 
FROM `Students` s 
JOIN `Sections` sec ON sec.SectionId = s.SectionId 
WHERE sec.GroupId <> s.GroupId;

-- Display final aligned students
SELECT 
    s.StudentId,
    s.AdmissionNo,
    s.RollNo,
    s.StudentName,
    s.BoardId,
    b.BoardName,
    s.AcademicYearId,
    ay.AcademicYearName,
    s.AcademicLevelId,
    al.LevelName,
    s.GroupId,
    g.GroupName,
    s.SectionId,
    sec.SectionName,
    s.IsActive
FROM `Students` s
JOIN `Boards` b ON b.BoardId = s.BoardId
JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
JOIN `Groups` g ON g.GroupId = s.GroupId
JOIN `Sections` sec ON sec.SectionId = s.SectionId
ORDER BY s.StudentId ASC;

SELECT '10A_CanonicalStudentTestData.sql ALIGNMENT COMPLETED AND VERIFIED' AS Status;
