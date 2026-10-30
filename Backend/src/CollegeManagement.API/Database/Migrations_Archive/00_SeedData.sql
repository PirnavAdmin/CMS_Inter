-- =============================================================================
-- DATABASE SEED DATA SCRIPT FOR ALL CREATED & NEWLY SYNCED TABLES
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

-- -----------------------------------------------------------------------------
-- 1. Roles
-- -----------------------------------------------------------------------------
INSERT INTO `Roles` (`RoleId`, `RoleName`) VALUES
(1, 'Admin'),
(2, 'Faculty'),
(3, 'Student')
ON DUPLICATE KEY UPDATE `RoleName` = VALUES(`RoleName`);

-- -----------------------------------------------------------------------------
-- 2. admins
-- -----------------------------------------------------------------------------
INSERT INTO `admins` (`id`, `Email`, `Password`, `IsActive`) VALUES
(1, 'admin@college.com', '$2a$11$qRzL5Z3hC3Kz0O7Q.x0z0eXy1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6', 1),
(2, 'principal@college.com', '$2a$11$qRzL5Z3hC3Kz0O7Q.x0z0eXy1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6', 1)
ON DUPLICATE KEY UPDATE `IsActive` = VALUES(`IsActive`);

-- -----------------------------------------------------------------------------
-- 3. Users (NEWLY SYNCED)
-- -----------------------------------------------------------------------------
INSERT INTO `Users` (`UserId`, `FullName`, `Email`, `PasswordHash`, `PhoneNumber`, `RoleId`) VALUES
(1, 'System Administrator', 'admin@college.com', '$2a$11$qRzL5Z3hC3Kz0O7Q.x0z0eXy1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6', '9876543210', 1),
(2, 'Dr. Rajesh Sharma', 'rajesh.sharma@college.com', '$2a$11$qRzL5Z3hC3Kz0O7Q.x0z0eXy1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6', '9876543211', 2),
(3, 'Aarav Kumar', 'aarav.kumar@student.com', '$2a$11$qRzL5Z3hC3Kz0O7Q.x0z0eXy1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6', '9876543212', 3)
ON DUPLICATE KEY UPDATE `Email` = VALUES(`Email`);

-- -----------------------------------------------------------------------------
-- 4. AcademicLevels (NEWLY SYNCED)
-- -----------------------------------------------------------------------------
INSERT INTO `AcademicLevels` (`AcademicLevelId`, `LevelCode`, `LevelName`, `Description`, `DisplayOrder`, `IsActive`, `CreatedAt`) VALUES
(1, 'INTER1', 'Intermediate 1st Year', 'Junior Intermediate Class', 1, 1, NOW()),
(2, 'INTER2', 'Intermediate 2nd Year', 'Senior Intermediate Class', 2, 1, NOW())
ON DUPLICATE KEY UPDATE `LevelName` = VALUES(`LevelName`);

-- -----------------------------------------------------------------------------
-- 5. Departments (NEWLY SYNCED)
-- -----------------------------------------------------------------------------
INSERT INTO `Departments` (`DepartmentId`, `DepartmentCode`, `DepartmentName`, `Description`, `IsActive`) VALUES
(1, 'DEP_MATHS', 'Mathematics', 'Department of Mathematics', 1),
(2, 'DEP_PHYS', 'Physics', 'Department of Physical Sciences', 1),
(3, 'DEP_CHEM', 'Chemistry', 'Department of Chemical Sciences', 1),
(4, 'DEP_BIO', 'Biology', 'Department of Biological Sciences', 1),
(5, 'DEP_HUM', 'Humanities & Commerce', 'Department of Commerce and Civics', 1)
ON DUPLICATE KEY UPDATE `DepartmentName` = VALUES(`DepartmentName`);

-- -----------------------------------------------------------------------------
-- 6. Students (NEWLY SYNCED)
-- -----------------------------------------------------------------------------
INSERT INTO `Students` (`StudentId`, `AdmissionId`, `AdmissionNo`, `RollNo`, `StudentName`, `Photo`, `Gender`, `DateOfBirth`, `BloodGroup`, `Email`, `MobileNumber`, `AadhaarNumber`, `Address`, `Board`, `AcademicYearId`, `AcademicLevel`, `GroupId`, `Section`, `AdmissionDate`, `AdmissionType`, `Medium`, `PreviousSchool`, `StudentCategory`, `ScholarshipStatus`, `FatherName`, `FatherMobile`, `MotherName`, `MotherMobile`, `GuardianName`, `GuardianMobile`, `FeeAmount`, `FeePaid`, `ScholarshipAmount`, `FeeStatus`, `AttendancePercentage`, `PerformanceGrade`, `CGPA`, `Rank`, `Remarks`, `PasswordHash`, `IsFirstLogin`, `IsActive`, `CreatedAt`) VALUES
(1, 1, 'ADM2025001', '250101', 'Aarav Kumar', NULL, 'Male', '2008-04-12', 'O+', 'aarav.kumar@student.com', '9876543212', '456789012345', '12-3-4, Main Road, Vijayawada', 'BIEAP', 2, 'Intermediate 1st Year', 1, 'MPC-A', '2025-05-10', 'Regular', 'English', 'St. Joseph High School', 'General', 'Eligible', 'Suresh Kumar', '9876543213', 'Lakshmi Kumar', '9876543214', NULL, NULL, 35000.00, 35000.00, 0.00, 'Paid', 92.50, 'A+', 9.50, 1, 'Excellent Student', '$2a$11$qRzL5Z3hC3Kz0O7Q.x0z0eXy1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6', b'0', b'1', NOW()),
(2, 2, 'ADM2025002', '250102', 'Ananya Sharma', NULL, 'Female', '2008-09-25', 'B+', 'ananya.sharma@student.com', '9876543215', '567890123456', '45-6-7, Gandhi Nagar, Guntur', 'BIEAP', 2, 'Intermediate 1st Year', 1, 'MPC-A', '2025-05-12', 'Regular', 'English', 'Narayana High School', 'BC-B', 'Eligible', 'Ramesh Sharma', '9876543216', 'Priya Sharma', '9876543217', NULL, NULL, 35000.00, 20000.00, 5000.00, 'Partial', 88.00, 'A', 8.80, 5, 'Good Student', '$2a$11$qRzL5Z3hC3Kz0O7Q.x0z0eXy1G2H3I4J5K6L7M8N9O0P1Q2R3S4T5U6', b'0', b'1', NOW())
ON DUPLICATE KEY UPDATE `StudentName` = VALUES(`StudentName`);

-- -----------------------------------------------------------------------------
-- 7. Assignments & AssignmentSubmissions (NEWLY SYNCED)
-- -----------------------------------------------------------------------------
INSERT INTO `Assignments` (`AssignmentId`, `Title`, `AcademicYearId`, `AcademicLevel`, `SubjectId`, `FacultyId`, `Description`, `DueDate`, `Attachment`, `MaximumMarks`) VALUES
(1, 'Integration & Calculus Problem Set', 2, 'Intermediate 1st Year', 1, 1, 'Solve exercise 5A and 5B questions.', '2025-08-20', '/attachments/math_assignment1.pdf', 100)
ON DUPLICATE KEY UPDATE `Title` = VALUES(`Title`);

INSERT INTO `AssignmentSubmissions` (`SubmissionId`, `AssignmentId`, `StudentId`, `SubmissionDate`, `FileUrl`, `Status`, `MarksObtained`, `Feedback`) VALUES
(1, 1, 1, NOW(), '/submissions/aarav_math1.pdf', 'Evaluated', 95.00, 'Excellent work!')
ON DUPLICATE KEY UPDATE `Status` = VALUES(`Status`);

-- -----------------------------------------------------------------------------
-- 8. Examinations, ExamSchedules, HallTickets, Invigilators (NEWLY SYNCED)
-- -----------------------------------------------------------------------------
INSERT INTO `Examinations` (`ExamId`, `ExamName`, `BoardId`, `AcademicYearId`, `AcademicLevelId`, `GroupId`, `AssessmentTypeId`, `StartDate`, `EndDate`, `Status`, `IsActive`, `CreatedAt`) VALUES
(1, 'Half-Yearly Examinations 2025', 1, 2, 1, 1, 3, '2025-11-10 00:00:00', '2025-11-20 00:00:00', 'Completed', 1, NOW()),
(2, 'Annual Board Examinations 2026', 1, 2, 1, 1, 5, '2026-03-01 00:00:00', '2026-03-15 00:00:00', 'Scheduled', 1, NOW())
ON DUPLICATE KEY UPDATE `ExamName` = VALUES(`ExamName`);

INSERT INTO `ExamSchedules` (`ScheduleId`, `ExamId`, `SubjectId`, `ExamDate`, `StartTime`, `EndTime`, `MaxMarks`, `PassingMarks`) VALUES
(1, 1, 1, '2025-11-10 00:00:00', '09:30:00', '12:30:00', 75.00, 27.00),
(2, 1, 2, '2025-11-12 00:00:00', '09:30:00', '12:30:00', 75.00, 27.00),
(3, 1, 3, '2025-11-14 00:00:00', '09:30:00', '12:30:00', 60.00, 21.00),
(4, 1, 4, '2025-11-16 00:00:00', '09:30:00', '12:30:00', 60.00, 21.00)
ON DUPLICATE KEY UPDATE `ExamId` = VALUES(`ExamId`);

INSERT INTO `HallTickets` (`HallTicketId`, `ExamId`, `StudentId`, `HallTicketNumber`, `IssueDate`, `Status`) VALUES
(1, 1, 1, 'HT20251101', NOW(), 'Issued'),
(2, 1, 2, 'HT20251102', NOW(), 'Issued')
ON DUPLICATE KEY UPDATE `HallTicketNumber` = VALUES(`HallTicketNumber`);

INSERT INTO `InvigilatorAssignments` (`AssignmentId`, `ScheduleId`, `FacultyId`, `RoomNumber`, `DutyDate`) VALUES
(1, 1, 1, 'Room 101', '2025-11-10 09:30:00'),
(2, 2, 2, 'Room 102', '2025-11-12 09:30:00')
ON DUPLICATE KEY UPDATE `RoomNumber` = VALUES(`RoomNumber`);

-- -----------------------------------------------------------------------------
-- 9. Marks, Results, Revaluations (NEWLY SYNCED)
-- -----------------------------------------------------------------------------
INSERT INTO `Marks` (`MarkId`, `ExamId`, `SubjectId`, `StudentId`, `MarksObtained`, `IsAbsent`, `Remarks`) VALUES
(1, 1, 1, 1, 72.00, 0, 'First Rank in Maths 1A'),
(2, 1, 2, 1, 70.00, 0, 'Passed with Distinction'),
(3, 1, 1, 2, 65.00, 0, 'Passed')
ON DUPLICATE KEY UPDATE `MarksObtained` = VALUES(`MarksObtained`);

INSERT INTO `Results` (`ResultId`, `StudentId`, `BoardId`, `AcademicYearId`, `AcademicLevelId`, `GroupId`, `ExamId`, `SubjectId`, `InternalMarks`, `PracticalMarks`, `ExternalMarks`, `TotalMarks`, `Grade`, `ResultStatus`, `Rank`, `PublishedDate`, `IsPublished`, `CreatedAt`) VALUES
(1, 1, 1, 2, 1, 1, 1, 1, 0.00, 0.00, 72.00, 72.00, 'A+', 'Pass', 1, '2025-12-01 00:00:00', 1, NOW()),
(2, 1, 1, 2, 1, 1, 1, 2, 0.00, 0.00, 70.00, 70.00, 'A+', 'Pass', 1, '2025-12-01 00:00:00', 1, NOW()),
(3, 2, 1, 2, 1, 1, 1, 1, 0.00, 0.00, 65.00, 65.00, 'A', 'Pass', 5, '2025-12-01 00:00:00', 1, NOW())
ON DUPLICATE KEY UPDATE `TotalMarks` = VALUES(`TotalMarks`);

INSERT INTO `Revaluations` (`RevaluationId`, `ResultId`, `StudentId`, `SubjectId`, `Reason`, `Status`, `AppliedDate`, `UpdatedMarks`) VALUES
(1, 3, 2, 1, 'Recounting requested for Q4', 'Completed', NOW(), 68.00)
ON DUPLICATE KEY UPDATE `Status` = VALUES(`Status`);

-- -----------------------------------------------------------------------------
-- 10. StudyMaterials & StudentFees (NEWLY SYNCED)
-- -----------------------------------------------------------------------------
INSERT INTO `StudyMaterials` (`MaterialId`, `Title`, `SubjectId`, `FacultyId`, `AcademicYearId`, `FileUrl`, `FileType`, `UploadedAt`) VALUES
(1, 'Calculus & Analytical Geometry Notes', 1, 1, 2, '/materials/calculus_ch1.pdf', 'PDF', NOW()),
(2, 'Electromagnetism Lecture Slides', 3, 2, 2, '/materials/physics_ch3.pptx', 'PPTX', NOW())
ON DUPLICATE KEY UPDATE `Title` = VALUES(`Title`);

INSERT INTO `StudentFees` (`StudentFeeId`, `StudentId`, `FeeStructureId`, `TotalAmount`, `PaidAmount`, `DueAmount`, `FeeStatus`, `CreatedAt`) VALUES
(1, 1, 1, 35000.00, 35000.00, 0.00, 'Paid', NOW()),
(2, 2, 1, 35000.00, 20000.00, 15000.00, 'Partial', NOW())
ON DUPLICATE KEY UPDATE `TotalAmount` = VALUES(`TotalAmount`);

-- -----------------------------------------------------------------------------
-- 11. Periods, Rooms, Timetables (NEWLY SYNCED TIMETABLE MODULE)
-- -----------------------------------------------------------------------------
INSERT INTO `Periods` (`PeriodId`, `PeriodName`, `StartTime`, `EndTime`, `DisplayOrder`, `IsBreak`, `IsActive`, `CreatedAt`) VALUES
(1, 'Period 1', '09:00:00', '10:00:00', 1, 0, 1, NOW()),
(2, 'Period 2', '10:00:00', '11:00:00', 2, 0, 1, NOW()),
(3, 'Tea Break', '11:00:00', '11:15:00', 3, 1, 1, NOW()),
(4, 'Period 3', '11:15:00', '12:15:00', 4, 0, 1, NOW()),
(5, 'Period 4', '12:15:00', '13:15:00', 5, 0, 1, NOW()),
(6, 'Lunch Break', '13:15:00', '14:00:00', 6, 1, 1, NOW()),
(7, 'Period 5', '14:00:00', '15:00:00', 7, 0, 1, NOW()),
(8, 'Period 6', '15:00:00', '16:00:00', 8, 0, 1, NOW())
ON DUPLICATE KEY UPDATE `PeriodName` = VALUES(`PeriodName`);

INSERT INTO `Rooms` (`RoomId`, `RoomCode`, `RoomName`, `Capacity`, `RoomType`, `Building`, `Floor`, `IsActive`, `CreatedAt`) VALUES
(1, 'R101', 'Room 101', 60, 'Classroom', 'Main Building', '1st Floor', 1, NOW()),
(2, 'R102', 'Room 102', 60, 'Classroom', 'Main Building', '1st Floor', 1, NOW()),
(3, 'R103', 'Room 103', 60, 'Classroom', 'Main Building', '1st Floor', 1, NOW()),
(4, 'LAB1', 'Science Lab 1', 40, 'Laboratory', 'Science Block', '2nd Floor', 1, NOW()),
(5, 'CLAB1', 'Computer Lab 1', 50, 'Computer Lab', 'IT Block', '2nd Floor', 1, NOW())
ON DUPLICATE KEY UPDATE `RoomName` = VALUES(`RoomName`);

INSERT INTO `Timetables` (`Id`, `BoardId`, `AcademicLevelId`, `AcademicYearId`, `GroupId`, `SectionId`, `DayOfWeek`, `PeriodId`, `SubjectId`, `FacultyId`, `RoomId`, `IsPublished`, `Remarks`, `CreatedAt`) VALUES
(1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 'Mathematics 1A Period', NOW()),
(2, 1, 1, 2, 1, 1, 1, 2, 3, 2, 1, 1, 'Physics 1 Period', NOW()),
(3, 1, 1, 2, 1, 1, 1, 4, 4, 3, 1, 1, 'Chemistry 1 Period', NOW())
ON DUPLICATE KEY UPDATE `Remarks` = VALUES(`Remarks`);
