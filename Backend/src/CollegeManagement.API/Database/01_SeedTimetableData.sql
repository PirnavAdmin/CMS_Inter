-- =============================================================================
-- SEED DATA FOR TIMETABLE MODULE (Periods, Rooms, Timetables)
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

-- -----------------------------------------------------------------------------
-- 1. Periods Seed Data
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
ON DUPLICATE KEY UPDATE `PeriodName` = VALUES(`PeriodName`), `StartTime` = VALUES(`StartTime`), `EndTime` = VALUES(`EndTime`);

-- -----------------------------------------------------------------------------
-- 2. Rooms Seed Data
-- -----------------------------------------------------------------------------
INSERT INTO `Rooms` (`RoomId`, `RoomCode`, `RoomName`, `Capacity`, `RoomType`, `Building`, `Floor`, `IsActive`, `CreatedAt`) VALUES
(1, 'R101', 'Room 101', 60, 'Classroom', 'Main Building', '1st Floor', 1, NOW()),
(2, 'R102', 'Room 102', 60, 'Classroom', 'Main Building', '1st Floor', 1, NOW()),
(3, 'R103', 'Room 103', 60, 'Classroom', 'Main Building', '1st Floor', 1, NOW()),
(4, 'R104', 'Room 104', 60, 'Classroom', 'Main Building', '1st Floor', 1, NOW()),
(5, 'LAB1', 'Science Lab 1', 40, 'Laboratory', 'Science Block', '2nd Floor', 1, NOW()),
(6, 'CLAB1', 'Computer Lab 1', 50, 'Computer Lab', 'IT Block', '2nd Floor', 1, NOW())
ON DUPLICATE KEY UPDATE `RoomName` = VALUES(`RoomName`), `RoomCode` = VALUES(`RoomCode`);

-- -----------------------------------------------------------------------------
-- 3. Timetables Seed Data (Weekly Schedule for MPC-A Section)
-- -----------------------------------------------------------------------------
-- DayOfWeek: 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
INSERT INTO `Timetables` (`Id`, `BoardId`, `AcademicLevelId`, `AcademicYearId`, `GroupId`, `SectionId`, `DayOfWeek`, `PeriodId`, `SubjectId`, `FacultyId`, `RoomId`, `IsPublished`, `Remarks`, `CreatedAt`) VALUES
-- Monday Schedule
(1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 'Monday Period 1 - Mathematics 1A', NOW()),
(2, 1, 1, 2, 1, 1, 1, 2, 3, 2, 1, 1, 'Monday Period 2 - Physics 1', NOW()),
(3, 1, 1, 2, 1, 1, 1, 4, 4, 3, 1, 1, 'Monday Period 3 - Chemistry 1', NOW()),
(4, 1, 1, 2, 1, 1, 1, 5, 5, 1, 1, 1, 'Monday Period 4 - English 1', NOW()),
(5, 1, 1, 2, 1, 1, 1, 7, 2, 1, 1, 1, 'Monday Period 5 - Mathematics 1B', NOW()),

-- Tuesday Schedule
(6, 1, 1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 'Tuesday Period 1 - Mathematics 1B', NOW()),
(7, 1, 1, 2, 1, 1, 2, 2, 4, 3, 1, 1, 'Tuesday Period 2 - Chemistry 1', NOW()),
(8, 1, 1, 2, 1, 1, 2, 4, 3, 2, 5, 1, 'Tuesday Period 3 - Physics Lab', NOW()),
(9, 1, 1, 2, 1, 1, 2, 5, 6, 2, 1, 1, 'Tuesday Period 4 - Sanskrit 1', NOW()),

-- Wednesday Schedule
(10, 1, 1, 2, 1, 1, 3, 1, 1, 1, 1, 1, 'Wednesday Period 1 - Mathematics 1A', NOW()),
(11, 1, 1, 2, 1, 1, 3, 2, 3, 2, 1, 1, 'Wednesday Period 2 - Physics 1', NOW()),
(12, 1, 1, 2, 1, 1, 3, 4, 4, 3, 5, 1, 'Wednesday Period 3 - Chemistry Lab', NOW()),

-- Thursday Schedule
(13, 1, 1, 2, 1, 1, 4, 1, 5, 1, 1, 1, 'Thursday Period 1 - English 1', NOW()),
(14, 1, 1, 2, 1, 1, 4, 2, 1, 1, 1, 1, 'Thursday Period 2 - Mathematics 1A', NOW()),
(15, 1, 1, 2, 1, 1, 4, 4, 2, 1, 1, 1, 'Thursday Period 3 - Mathematics 1B', NOW()),

-- Friday Schedule
(16, 1, 1, 2, 1, 1, 5, 1, 3, 2, 1, 1, 'Friday Period 1 - Physics 1', NOW()),
(17, 1, 1, 2, 1, 1, 5, 2, 4, 3, 1, 1, 'Friday Period 2 - Chemistry 1', NOW()),
(18, 1, 1, 2, 1, 1, 5, 4, 6, 2, 1, 1, 'Friday Period 3 - Sanskrit 1', NOW())
ON DUPLICATE KEY UPDATE `Remarks` = VALUES(`Remarks`), `IsPublished` = VALUES(`IsPublished`);
