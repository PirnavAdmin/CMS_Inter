-- ===================================================================================
-- COLLEGE MANAGEMENT SYSTEM: EXAMINATIONS & RESULTS SEED DATA SCRIPT
-- Compatible with MySQL 8.0+ / Hostinger phpMyAdmin
-- ===================================================================================

-- 1. Ensure Master Assessment Types
INSERT INTO `AssessmentTypes` (`AssessmentTypeId`, `AssessmentTypeName`, `IsActive`, `CreatedAt`)
VALUES
(1, 'Unit Test', 1, NOW()),
(2, 'Quarterly Exam', 1, NOW()),
(3, 'Half-Yearly Exam', 1, NOW()),
(4, 'Pre-Final Exam', 1, NOW()),
(5, 'Annual Board Exam', 1, NOW())
ON DUPLICATE KEY UPDATE `AssessmentTypeName` = VALUES(`AssessmentTypeName`), `IsActive` = 1;

-- 2. Ensure Academic Patterns
INSERT INTO `AcademicPatterns` (`AcademicPatternId`, `PatternCode`, `PatternName`, `Description`, `DisplayOrder`, `IsActive`, `CreatedAt`)
VALUES
(1, 'SEM', 'Semester / Annual System', 'Semester-wise grading pattern', 1, 1, NOW()),
(2, 'ANN', 'Yearly System', 'Yearly comprehensive board pattern', 2, 1, NOW())
ON DUPLICATE KEY UPDATE `PatternName` = VALUES(`PatternName`), `IsActive` = 1;

-- ===================================================================================
-- 3. INSERT 3 EXAMINATIONS (DRAFT, SCHEDULED, COMPLETED)
-- Linked to BoardId=1 (BIEAP), YearId=6 (2026-2027), LevelId=1 (INT-1), GroupId=34 (MPC)
-- ===================================================================================

-- [A] DRAFT EXAMINATION
INSERT INTO `Examinations` (
    `ExamCode`, `ExamName`, `BoardId`, `AcademicYearId`, `AcademicLevelId`, `GroupId`, `ProgramId`,
    `AssessmentTypeId`, `StartDate`, `EndDate`, `ExamPattern`, `TotalMarks`, `PassPercentage`,
    `Description`, `Status`, `IsActive`, `CreatedAt`
)
VALUES (
    'UT1-2026', 'Unit Test 1 (2026-27)', 1, 6, 1, 34, 1,
    1, '2026-09-01', '2026-09-05', 'REGULAR_ACADEMIC', 150, 35.00,
    'Initial draft unit test for Intermediate 1st Year MPC students.', 'DRAFT', 1, NOW()
)
ON DUPLICATE KEY UPDATE
    `ExamName` = VALUES(`ExamName`), `Status` = 'DRAFT', `ExamPattern` = 'REGULAR_ACADEMIC',
    `AssessmentTypeId` = 1, `TotalMarks` = 150, `PassPercentage` = 35.00, `IsActive` = 1;

-- [B] SCHEDULED EXAMINATION
INSERT INTO `Examinations` (
    `ExamCode`, `ExamName`, `BoardId`, `AcademicYearId`, `AcademicLevelId`, `GroupId`, `ProgramId`,
    `AssessmentTypeId`, `StartDate`, `EndDate`, `ExamPattern`, `TotalMarks`, `PassPercentage`,
    `Description`, `Status`, `IsActive`, `CreatedAt`
)
VALUES (
    'QE-2026', 'Quarterly Examination 2026-27', 1, 6, 1, 34, 1,
    2, '2026-10-10', '2026-10-18', 'REGULAR_ACADEMIC', 300, 35.00,
    'Quarterly examination scheduled across all sections with room & invigilator allocations.', 'SCHEDULED', 1, NOW()
)
ON DUPLICATE KEY UPDATE
    `ExamName` = VALUES(`ExamName`), `Status` = 'SCHEDULED', `ExamPattern` = 'REGULAR_ACADEMIC',
    `AssessmentTypeId` = 2, `TotalMarks` = 300, `PassPercentage` = 35.00, `IsActive` = 1;

-- [C] COMPLETED EXAMINATION
INSERT INTO `Examinations` (
    `ExamCode`, `ExamName`, `BoardId`, `AcademicYearId`, `AcademicLevelId`, `GroupId`, `ProgramId`,
    `AssessmentTypeId`, `StartDate`, `EndDate`, `ExamPattern`, `TotalMarks`, `PassPercentage`,
    `Description`, `Status`, `IsActive`, `CreatedAt`
)
VALUES (
    'HYE-2026', 'Half Yearly Examination 2026-27', 1, 6, 1, 34, 1,
    3, '2026-12-05', '2026-12-15', 'REGULAR_ACADEMIC', 300, 35.00,
    'Half-Yearly examination completed with marks evaluated and published.', 'COMPLETED', 1, NOW()
)
ON DUPLICATE KEY UPDATE
    `ExamName` = VALUES(`ExamName`), `Status` = 'COMPLETED', `ExamPattern` = 'REGULAR_ACADEMIC',
    `AssessmentTypeId` = 3, `TotalMarks` = 300, `PassPercentage` = 35.00, `IsActive` = 1;

-- ===================================================================================
-- 4. INSERT EXAM SCHEDULES FOR SCHEDULED & COMPLETED EXAMINATIONS
-- ===================================================================================

-- Schedules for SCHEDULED Examination (QE-2026)
SET @SchedExamId = (SELECT `ExamId` FROM `Examinations` WHERE `ExamCode` = 'QE-2026' LIMIT 1);

INSERT INTO `ExamSchedules` (`ExamId`, `SubjectId`, `ExamDate`, `StartTime`, `EndTime`, `Hall`, `Invigilator`, `MaxMarks`, `PassingMarks`, `ExamMode`, `ScheduleMode`, `IsActive`, `CreatedAt`)
SELECT @SchedExamId, 11, '2026-10-10', '09:30:00', '12:30:00', 'Hall-101', 'Tharun Kumar', 100.00, 35.00, 'Written', 'SUBJECT_WISE', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `ExamSchedules` WHERE `ExamId` = @SchedExamId AND `SubjectId` = 11);

INSERT INTO `ExamSchedules` (`ExamId`, `SubjectId`, `ExamDate`, `StartTime`, `EndTime`, `Hall`, `Invigilator`, `MaxMarks`, `PassingMarks`, `ExamMode`, `ScheduleMode`, `IsActive`, `CreatedAt`)
SELECT @SchedExamId, 13, '2026-10-12', '09:30:00', '12:30:00', 'Hall-102', 'Vikas Sharma', 100.00, 35.00, 'Written', 'SUBJECT_WISE', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `ExamSchedules` WHERE `ExamId` = @SchedExamId AND `SubjectId` = 13);

INSERT INTO `ExamSchedules` (`ExamId`, `SubjectId`, `ExamDate`, `StartTime`, `EndTime`, `Hall`, `Invigilator`, `MaxMarks`, `PassingMarks`, `ExamMode`, `ScheduleMode`, `IsActive`, `CreatedAt`)
SELECT @SchedExamId, 14, '2026-10-14', '09:30:00', '12:30:00', 'Hall-103', 'Adithya Rao', 100.00, 35.00, 'Written', 'SUBJECT_WISE', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `ExamSchedules` WHERE `ExamId` = @SchedExamId AND `SubjectId` = 14);

-- Schedules for COMPLETED Examination (HYE-2026)
SET @CompExamId = (SELECT `ExamId` FROM `Examinations` WHERE `ExamCode` = 'HYE-2026' LIMIT 1);

INSERT INTO `ExamSchedules` (`ExamId`, `SubjectId`, `ExamDate`, `StartTime`, `EndTime`, `Hall`, `Invigilator`, `MaxMarks`, `PassingMarks`, `ExamMode`, `ScheduleMode`, `IsActive`, `CreatedAt`)
SELECT @CompExamId, 11, '2026-12-05', '09:30:00', '12:30:00', 'Hall-201', 'Tharun Kumar', 100.00, 35.00, 'Written', 'SUBJECT_WISE', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `ExamSchedules` WHERE `ExamId` = @CompExamId AND `SubjectId` = 11);

INSERT INTO `ExamSchedules` (`ExamId`, `SubjectId`, `ExamDate`, `StartTime`, `EndTime`, `Hall`, `Invigilator`, `MaxMarks`, `PassingMarks`, `ExamMode`, `ScheduleMode`, `IsActive`, `CreatedAt`)
SELECT @CompExamId, 13, '2026-12-07', '09:30:00', '12:30:00', 'Hall-202', 'Vikas Sharma', 100.00, 35.00, 'Written', 'SUBJECT_WISE', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `ExamSchedules` WHERE `ExamId` = @CompExamId AND `SubjectId` = 13);

INSERT INTO `ExamSchedules` (`ExamId`, `SubjectId`, `ExamDate`, `StartTime`, `EndTime`, `Hall`, `Invigilator`, `MaxMarks`, `PassingMarks`, `ExamMode`, `ScheduleMode`, `IsActive`, `CreatedAt`)
SELECT @CompExamId, 14, '2026-12-09', '09:30:00', '12:30:00', 'Hall-203', 'Adithya Rao', 100.00, 35.00, 'Written', 'SUBJECT_WISE', 1, NOW()
WHERE NOT EXISTS (SELECT 1 FROM `ExamSchedules` WHERE `ExamId` = @CompExamId AND `SubjectId` = 14);

-- ===================================================================================
-- Verification Select Queries
-- ===================================================================================
SELECT `ExamId`, `ExamCode`, `ExamName`, `Status`, `ExamPattern`, `AssessmentTypeId`, `TotalMarks`, `PassPercentage` 
FROM `Examinations` 
WHERE `ExamCode` IN ('UT1-2026', 'QE-2026', 'HYE-2026');
