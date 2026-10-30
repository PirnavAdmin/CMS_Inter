-- =============================================================================
-- SCRIPT: 10E_SeedStudentTestData.sql
-- PURPOSE: Phase 8E Fresh Deterministic Student Test Data Creation
-- AUTHOR: Antigravity Team
-- DATE: 2026-08-24
-- TARGET DATABASE: u819242402_CLM_System (srv1061.hstgr.io / MariaDB 11.8+)
--
-- STATUS: PREPARED FOR REVIEW ONLY (DO NOT EXECUTE AUTOMATICALLY)
--
-- MASTER REFERENCE KEYS USED:
--   - BoardId = 1 (BIEAP - Board of Intermediate Education, Andhra Pradesh)
--   - AcademicYearId = 6 (2026-2027, Active for Board 1)
--   - AcademicLevelId = 1 (Intermediate 1st Year / INT-1), 2 (Intermediate 2nd Year / INT-2)
--   - GroupId = 34 (MPC), 35 (BIPC)
--   - SectionId = 15 (MPC - B), 16 (BIPC - A)
--
-- INSTRUCTIONS FOR MANUAL EXECUTION (MySQL Workbench):
-- 1. Open MySQL Workbench and connect to u819242402_CLM_System.
-- 2. Open this script (File -> Open SQL Script).
-- 3. Execute the entire script (Ctrl + Shift + Enter).
-- 4. Verify post-seed verification checks at the end of the script.
-- =============================================================================

USE `u819242402_CLM_System`;
SET SQL_SAFE_UPDATES = 0;

-- =============================================================================
-- STEP 1: PRE-FLIGHT CHECK
-- =============================================================================
SELECT '--- STEP 1: PRE-FLIGHT CHECK ---' AS Info;

SELECT COUNT(*) AS PreSeedStudentCount FROM `Students`;

-- =============================================================================
-- STEP 2: INSERT DETERMINISTIC CANONICAL STUDENT TEST RECORDS
-- =============================================================================
SELECT '--- STEP 2: INSERTING FRESH TEST STUDENTS ---' AS Info;

INSERT INTO `Students` (
    `AdmissionNo`,
    `RollNo`,
    `StudentName`,
    `Photo`,
    `Gender`,
    `DateOfBirth`,
    `BloodGroup`,
    `Email`,
    `MobileNumber`,
    `AadhaarNumber`,
    `Address`,
    `AddressLine1`,
    `AddressLine2`,
    `City`,
    `District`,
    `State`,
    `Pincode`,
    `Nationality`,
    `Religion`,
    `Category`,
    `BoardId`,
    `Board`,
    `AcademicYearId`,
    `AcademicLevelId`,
    `AcademicLevel`,
    `GroupId`,
    `SectionId`,
    `Section`,
    `AdmissionDate`,
    `AdmissionType`,
    `AdmissionQuota`,
    `Medium`,
    `SecondLanguage`,
    `PreviousSchool`,
    `PreviousHallTicketNumber`,
    `PreviousBoard`,
    `PreviousYearOfPassing`,
    `PreviousPercentage`,
    `StudentCategory`,
    `ScholarshipStatus`,
    `ScholarshipAmount`,
    `FatherName`,
    `FatherOccupation`,
    `FatherMobile`,
    `FatherEmail`,
    `MotherName`,
    `MotherOccupation`,
    `MotherMobile`,
    `MotherEmail`,
    `GuardianName`,
    `GuardianMobile`,
    `GuardianEmail`,
    `AnnualIncome`,
    `FeeAmount`,
    `FeePaid`,
    `FeeStatus`,
    `AttendancePercentage`,
    `PerformanceGrade`,
    `CGPA`,
    `Rank`,
    `Remarks`,
    `PasswordHash`,
    `IsFirstLogin`,
    `Status`,
    `IsActive`,
    `CreatedAt`
) VALUES
-- Student 1: Aarav Kumar (MPC, 1st Year, Section MPC-B)
(
    'ADM2026001', '26MPC001', 'Aarav Kumar', '', 'Male', '2008-04-12 00:00:00', 'O+',
    'aarav.kumar@student.com', '9876543210', '456789012345',
    '12-3-4, Main Road, Vijayawada', '12-3-4, Main Road', 'Near Bus Stand',
    'Vijayawada', 'Krishna', 'Andhra Pradesh', '520001', 'Indian', 'Hindu', 'General',
    1, 'Board of Intermediate Education, Andhra Pradesh',
    6, 1, 'Intermediate 1st Year',
    34, 15, 'MPC - B',
    '2026-06-01 00:00:00', 'Regular', 'Convenor', 'English', 'Sanskrit',
    'St. Joseph High School', 'HT2026001', 'SSC', 2026, 92.50,
    'Day Scholar', 'Not Eligible', 0.00,
    'Suresh Kumar', 'Business', '9876543211', 'suresh.kumar@example.com',
    'Lakshmi Kumar', 'Homemaker', '9876543212', 'lakshmi.kumar@example.com',
    '', '', '', 450000.00,
    50000.00, 35000.00, 'Partial', 92.50, 'A+', 9.25, 1, 'Excellent student',
    '$2a$11$qRzL5Z3hC3Kz0O7Q.x0z0eXy1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6', 1, 'Active', 1, NOW()
),
-- Student 2: Ananya Sharma (MPC, 1st Year, Section MPC-B)
(
    'ADM2026002', '26MPC002', 'Ananya Sharma', '', 'Female', '2008-09-25 00:00:00', 'B+',
    'ananya.sharma@student.com', '9876543214', '567890123456',
    '45-6-7, Gandhi Nagar, Guntur', '45-6-7, Gandhi Nagar', 'Opposite SBI',
    'Guntur', 'Guntur', 'Andhra Pradesh', '522001', 'Indian', 'Hindu', 'General',
    1, 'Board of Intermediate Education, Andhra Pradesh',
    6, 1, 'Intermediate 1st Year',
    34, 15, 'MPC - B',
    '2026-06-02 00:00:00', 'Regular', 'Management', 'English', 'Telugu',
    'Narayana High School', 'HT2026002', 'SSC', 2026, 95.00,
    'Day Scholar', 'Not Eligible', 0.00,
    'Ramesh Sharma', 'Software Engineer', '9876543215', 'ramesh.sharma@example.com',
    'Priya Sharma', 'Doctor', '9876543216', 'priya.sharma@example.com',
    '', '', '', 1200000.00,
    60000.00, 60000.00, 'Paid', 95.00, 'A+', 9.50, 1, 'Merit student',
    '$2a$11$qRzL5Z3hC3Kz0O7Q.x0z0eXy1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6', 1, 'Active', 1, NOW()
),
-- Student 3: Sai Kiran (BIPC, 1st Year, Section BIPC-A)
(
    'ADM2026003', '26BIPC001', 'Sai Kiran', '', 'Male', '2008-11-10 00:00:00', 'A+',
    'sai.kiran@student.com', '9876543217', '678901234567',
    '78-9-10, RTC Colony, Rajahmundry', '78-9-10, RTC Colony', 'Behind Park',
    'Rajahmundry', 'East Godavari', 'Andhra Pradesh', '533101', 'Indian', 'Hindu', 'BC-B',
    1, 'Board of Intermediate Education, Andhra Pradesh',
    6, 1, 'Intermediate 1st Year',
    35, 16, 'BIPC - A',
    '2026-06-03 00:00:00', 'Regular', 'Convenor', 'English', 'Sanskrit',
    'Model High School', 'HT2026003', 'SSC', 2026, 88.00,
    'Day Scholar', 'Eligible', 15000.00,
    'Venkat Rao', 'Teacher', '9876543218', 'venkat.rao@example.com',
    'Sujatha Rao', 'Homemaker', '9876543219', 'sujatha.rao@example.com',
    '', '', '', 300000.00,
    45000.00, 30000.00, 'Partial', 88.00, 'A', 8.80, 5, 'Good academic performance',
    '$2a$11$qRzL5Z3hC3Kz0O7Q.x0z0eXy1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6', 1, 'Active', 1, NOW()
),
-- Student 4: Priya Nair (BIPC, 2nd Year, Section BIPC-A)
(
    'ADM2026004', '26BIPC002', 'Priya Nair', '', 'Female', '2007-08-15 00:00:00', 'AB+',
    'priya.nair@student.com', '9876543220', '789012345678',
    '23-4-56, Beach Road, Visakhapatnam', '23-4-56, Beach Road', 'Near Harbour',
    'Visakhapatnam', 'Visakhapatnam', 'Andhra Pradesh', '530001', 'Indian', 'Hindu', 'General',
    1, 'Board of Intermediate Education, Andhra Pradesh',
    6, 2, 'Intermediate 2nd Year',
    35, 16, 'BIPC - A',
    '2026-06-04 00:00:00', 'Regular', 'Convenor', 'English', 'Hindi',
    'Bethany High School', 'HT2026004', 'SSC', 2025, 89.50,
    'Day Scholar', 'Not Eligible', 0.00,
    'Suresh Nair', 'Bank Manager', '9876543221', 'suresh.nair@example.com',
    'Deepa Nair', 'Lecturer', '9876543222', 'deepa.nair@example.com',
    '', '', '', 850000.00,
    48000.00, 48000.00, 'Paid', 91.00, 'A+', 9.10, 2, 'Sports champion',
    '$2a$11$qRzL5Z3hC3Kz0O7Q.x0z0eXy1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6', 1, 'Active', 1, NOW()
);

-- =============================================================================
-- STEP 3: POST-SEED INTEGRITY VERIFICATION
-- =============================================================================
SELECT '--- STEP 3: POST-SEED VERIFICATION ---' AS Info;

-- 1. Verify Student Count
SELECT COUNT(*) AS SeededStudentsCount FROM `Students`;

-- 2. Verify Zero Orphan FK references
SELECT 
    (SELECT COUNT(*) FROM `Students` s LEFT JOIN `Boards` b ON b.BoardId = s.BoardId WHERE b.BoardId IS NULL) AS OrphanBoards,
    (SELECT COUNT(*) FROM `Students` s LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId WHERE ay.AcademicYearId IS NULL) AS OrphanYears,
    (SELECT COUNT(*) FROM `Students` s LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId WHERE al.AcademicLevelId IS NULL) AS OrphanLevels,
    (SELECT COUNT(*) FROM `Students` s LEFT JOIN `Groups` g ON g.GroupId = s.GroupId WHERE g.GroupId IS NULL) AS OrphanGroups,
    (SELECT COUNT(*) FROM `Students` s LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId WHERE sec.SectionId IS NULL) AS OrphanSections;

-- 3. Display Seeded Students
SELECT 
    s.StudentId,
    s.AdmissionNo,
    s.RollNo,
    s.StudentName,
    b.BoardName,
    ay.AcademicYearName,
    al.LevelName,
    g.GroupName,
    sec.SectionName,
    s.Email,
    s.MobileNumber,
    s.Status,
    s.IsActive
FROM `Students` s
JOIN `Boards` b ON b.BoardId = s.BoardId
JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
JOIN `Groups` g ON g.GroupId = s.GroupId
JOIN `Sections` sec ON sec.SectionId = s.SectionId
ORDER BY s.StudentId ASC;

SELECT '10E_SeedStudentTestData.sql SEEDING COMPLETED AND VERIFIED' AS Status;
