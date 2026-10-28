-- =============================================================================
-- SEED DATA SCRIPT FOR ROOMS TABLE (EXACT SCHEMA MATCH)
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

INSERT INTO `Rooms` (`RoomId`, `RoomNumber`, `BuildingName`, `Floor`, `Capacity`, `RoomType`, `IsActive`, `CreatedAt`) VALUES
(1, 'Room 101', 'Main Academic Building', 1, 60, 'Classroom', 1, NOW()),
(2, 'Room 102', 'Main Academic Building', 1, 60, 'Classroom', 1, NOW()),
(3, 'Room 103', 'Main Academic Building', 1, 60, 'Classroom', 1, NOW()),
(4, 'Room 104', 'Main Academic Building', 1, 60, 'Classroom', 1, NOW()),
(5, 'Room 201', 'Main Academic Building', 2, 60, 'Classroom', 1, NOW()),
(6, 'Room 202', 'Main Academic Building', 2, 60, 'Classroom', 1, NOW()),
(7, 'Science Lab 1', 'Science Block', 2, 40, 'Laboratory', 1, NOW()),
(8, 'Physics Lab 1', 'Science Block', 2, 40, 'Laboratory', 1, NOW()),
(9, 'Chemistry Lab 1', 'Science Block', 3, 40, 'Laboratory', 1, NOW()),
(10, 'Computer Lab 1', 'IT Block', 1, 50, 'Computer Lab', 1, NOW()),
(11, 'Seminar Hall 1', 'Auditorium Block', 1, 150, 'Seminar Hall', 1, NOW())
ON DUPLICATE KEY UPDATE 
    `RoomNumber` = VALUES(`RoomNumber`), 
    `BuildingName` = VALUES(`BuildingName`), 
    `Floor` = VALUES(`Floor`), 
    `Capacity` = VALUES(`Capacity`), 
    `RoomType` = VALUES(`RoomType`),
    `IsActive` = VALUES(`IsActive`);
