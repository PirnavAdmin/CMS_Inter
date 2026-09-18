-- =============================================================================
-- MODULE: HOSTEL MANAGEMENT COMPLETE SCHEMA & STORED PROCEDURES
-- DATABASE: u819242402_CLM_System
-- 100% NON-DESTRUCTIVE - SAFE TO EXECUTE IN MYSQL WORKBENCH
-- =============================================================================

USE `u819242402_CLM_System`;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_SAFE_UPDATES = 0;

-- -----------------------------------------------------------------------------
-- 1. TABLE DEFINITIONS (HOSTEL MODULE ONLY)
-- -----------------------------------------------------------------------------

-- 1.1 hostel_blocks
CREATE TABLE IF NOT EXISTS `hostel_blocks` (
    `HostelId` INT AUTO_INCREMENT PRIMARY KEY,
    `HostelName` VARCHAR(150) NOT NULL,
    `HostelCode` VARCHAR(50) NOT NULL UNIQUE,
    `HostelType` VARCHAR(20) NOT NULL,
    `TotalFloors` INT NOT NULL DEFAULT 1,
    `WardenId` INT NULL,
    `PrimaryMobileNumber` VARCHAR(20) NULL,
    `Email` VARCHAR(150) NULL,
    `Address` VARCHAR(500) NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Active',
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.2 room_type_configs
CREATE TABLE IF NOT EXISTS `room_type_configs` (
    `RoomTypeId` INT AUTO_INCREMENT PRIMARY KEY,
    `RoomTypeSpecification` VARCHAR(150) NOT NULL UNIQUE,
    `BedCapacity` INT NOT NULL DEFAULT 1,
    `AcType` VARCHAR(20) NOT NULL DEFAULT 'Non-AC',
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Active',
    `Description` VARCHAR(500) NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.3 room_masters
CREATE TABLE IF NOT EXISTS `room_masters` (
    `RoomId` INT AUTO_INCREMENT PRIMARY KEY,
    `HostelId` INT NOT NULL,
    `RoomTypeId` INT NOT NULL,
    `FloorLevel` VARCHAR(50) NOT NULL,
    `RoomNumber` VARCHAR(50) NOT NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Active',
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_hostel_room` (`HostelId`, `RoomNumber`),
    CONSTRAINT `fk_room_hostel` FOREIGN KEY (`HostelId`) REFERENCES `hostel_blocks`(`HostelId`) ON DELETE CASCADE,
    CONSTRAINT `fk_room_type` FOREIGN KEY (`RoomTypeId`) REFERENCES `room_type_configs`(`RoomTypeId`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.4 hostel_beds
CREATE TABLE IF NOT EXISTS `hostel_beds` (
    `BedId` INT AUTO_INCREMENT PRIMARY KEY,
    `RoomId` INT NOT NULL,
    `BedNumber` VARCHAR(50) NOT NULL,
    `BedStatus` VARCHAR(20) NOT NULL DEFAULT 'Available',
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Active',
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_room_bed` (`RoomId`, `BedNumber`),
    CONSTRAINT `fk_bed_room` FOREIGN KEY (`RoomId`) REFERENCES `room_masters`(`RoomId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.5 hostel_warden_assignments
CREATE TABLE IF NOT EXISTS `hostel_warden_assignments` (
    `WardenAssignmentId` INT AUTO_INCREMENT PRIMARY KEY,
    `StaffId` INT NOT NULL,
    `HostelId` INT NOT NULL,
    `AssignmentDate` DATETIME NOT NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Active',
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_warden_hostel` FOREIGN KEY (`HostelId`) REFERENCES `hostel_blocks`(`HostelId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.6 hostel_student_allocations
CREATE TABLE IF NOT EXISTS `hostel_student_allocations` (
    `AllocationId` INT AUTO_INCREMENT PRIMARY KEY,
    `StudentId` INT NOT NULL,
    `HostelId` INT NOT NULL,
    `RoomId` INT NOT NULL,
    `BedId` INT NOT NULL,
    `WardenAssignmentId` INT NULL,
    `JoiningDate` DATETIME NOT NULL,
    `Status` VARCHAR(20) NOT NULL DEFAULT 'Active',
    `Remarks` VARCHAR(500) NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_alloc_hostel` FOREIGN KEY (`HostelId`) REFERENCES `hostel_blocks`(`HostelId`) ON DELETE CASCADE,
    CONSTRAINT `fk_alloc_room` FOREIGN KEY (`RoomId`) REFERENCES `room_masters`(`RoomId`) ON DELETE CASCADE,
    CONSTRAINT `fk_alloc_bed` FOREIGN KEY (`BedId`) REFERENCES `hostel_beds`(`BedId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.7 hostel_attendance
CREATE TABLE IF NOT EXISTS `hostel_attendance` (
    `AttendanceId` INT AUTO_INCREMENT PRIMARY KEY,
    `StudentId` INT NOT NULL,
    `HostelId` INT NOT NULL,
    `RoomId` INT NOT NULL,
    `BedId` INT NOT NULL,
    `WardenAssignmentId` INT NULL,
    `AttendanceDate` DATETIME NOT NULL,
    `Session` VARCHAR(20) NOT NULL,
    `AttendanceStatus` VARCHAR(20) NOT NULL,
    `Remarks` VARCHAR(500) NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.8 hostel_outpass_leave
CREATE TABLE IF NOT EXISTS `hostel_outpass_leave` (
    `RequestId` INT AUTO_INCREMENT PRIMARY KEY,
    `StudentId` INT NOT NULL,
    `HostelId` INT NOT NULL,
    `RoomId` INT NOT NULL,
    `BedId` INT NOT NULL,
    `WardenAssignmentId` INT NULL,
    `RequestType` VARCHAR(20) NOT NULL,
    `FromDateTime` DATETIME NOT NULL,
    `ToDateTime` DATETIME NOT NULL,
    `Reason` VARCHAR(500) NOT NULL,
    `Destination` VARCHAR(250) NULL,
    `ApprovalStatus` VARCHAR(20) NOT NULL DEFAULT 'Pending',
    `ApprovalRemarks` VARCHAR(500) NULL,
    `ApprovedAt` DATETIME NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 1.9 hostel_transfer_vacate
CREATE TABLE IF NOT EXISTS `hostel_transfer_vacate` (
    `RequestId` INT AUTO_INCREMENT PRIMARY KEY,
    `AllocationId` INT NOT NULL,
    `StudentId` INT NOT NULL,
    `RequestType` VARCHAR(20) NOT NULL,
    `FromHostelId` INT NOT NULL,
    `FromRoomId` INT NOT NULL,
    `FromBedId` INT NOT NULL,
    `ToHostelId` INT NULL,
    `ToRoomId` INT NULL,
    `ToBedId` INT NULL,
    `WardenAssignmentId` INT NULL,
    `RequestDate` DATETIME NOT NULL,
    `EffectiveDate` DATETIME NULL,
    `Reason` VARCHAR(500) NOT NULL,
    `ApprovalStatus` VARCHAR(20) NOT NULL DEFAULT 'Pending',
    `ApprovalRemarks` VARCHAR(500) NULL,
    `ApprovedAt` DATETIME NULL,
    `FeeSettlementStatus` VARCHAR(20) NOT NULL DEFAULT 'Pending',
    `RefundAmount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `AdditionalChargeAmount` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    `SettlementRemarks` VARCHAR(500) NULL,
    `CompletedAt` DATETIME NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `UpdatedAt` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -----------------------------------------------------------------------------
-- 2. STORED PROCEDURES (HOSTEL MODULE ONLY)
-- -----------------------------------------------------------------------------

-- 2.1 sp_GetHostelDashboard
DROP PROCEDURE IF EXISTS `sp_GetHostelDashboard`;
DELIMITER $$
CREATE PROCEDURE `sp_GetHostelDashboard`(IN p_HostelId INT)
BEGIN
    SELECT 
        COUNT(DISTINCT hb.HostelId) AS TotalHostels,
        COUNT(DISTINCT rm.RoomId) AS TotalRooms,
        COUNT(DISTINCT b.BedId) AS TotalBeds,
        COUNT(DISTINCT CASE WHEN b.BedStatus = 'Occupied' THEN b.BedId END) AS OccupiedBeds,
        COUNT(DISTINCT CASE WHEN b.BedStatus = 'Available' THEN b.BedId END) AS AvailableBeds,
        COUNT(DISTINCT hsa.StudentId) AS ActiveStudents,
        COUNT(DISTINCT hwa.StaffId) AS ActiveWardens,
        CASE 
            WHEN COUNT(DISTINCT b.BedId) > 0 
            THEN ROUND((COUNT(DISTINCT CASE WHEN b.BedStatus = 'Occupied' THEN b.BedId END) / COUNT(DISTINCT b.BedId)) * 100, 2)
            ELSE 0.00 
        END AS OccupancyPercentage
    FROM hostel_blocks hb
    LEFT JOIN room_masters rm ON hb.HostelId = rm.HostelId AND rm.Status = 'Active'
    LEFT JOIN hostel_beds b ON rm.RoomId = b.RoomId AND b.Status = 'Active'
    LEFT JOIN hostel_student_allocations hsa ON hb.HostelId = hsa.HostelId AND hsa.Status = 'Active'
    LEFT JOIN hostel_warden_assignments hwa ON hb.HostelId = hwa.HostelId AND hwa.Status = 'Active'
    WHERE (p_HostelId IS NULL OR hb.HostelId = p_HostelId);

    SELECT 
        hb.HostelId,
        hb.HostelName,
        hb.HostelCode,
        hb.HostelType,
        COUNT(DISTINCT rm.RoomId) AS TotalRooms,
        COUNT(DISTINCT b.BedId) AS TotalBeds,
        COUNT(DISTINCT CASE WHEN b.BedStatus = 'Occupied' THEN b.BedId END) AS OccupiedBeds,
        COUNT(DISTINCT CASE WHEN b.BedStatus = 'Available' THEN b.BedId END) AS AvailableBeds,
        COUNT(DISTINCT hsa.StudentId) AS ActiveStudents,
        COUNT(DISTINCT hwa.StaffId) AS ActiveWardens,
        CASE 
            WHEN COUNT(DISTINCT b.BedId) > 0 
            THEN ROUND((COUNT(DISTINCT CASE WHEN b.BedStatus = 'Occupied' THEN b.BedId END) / COUNT(DISTINCT b.BedId)) * 100, 2)
            ELSE 0.00 
        END AS OccupancyPercentage
    FROM hostel_blocks hb
    LEFT JOIN room_masters rm ON hb.HostelId = rm.HostelId AND rm.Status = 'Active'
    LEFT JOIN hostel_beds b ON rm.RoomId = b.RoomId AND b.Status = 'Active'
    LEFT JOIN hostel_student_allocations hsa ON hb.HostelId = hsa.HostelId AND hsa.Status = 'Active'
    LEFT JOIN hostel_warden_assignments hwa ON hb.HostelId = hwa.HostelId AND hwa.Status = 'Active'
    WHERE (p_HostelId IS NULL OR hb.HostelId = p_HostelId)
    GROUP BY hb.HostelId, hb.HostelName, hb.HostelCode, hb.HostelType
    ORDER BY hb.HostelName;
END$$
DELIMITER ;

-- 2.2 sp_GetHostelOccupancyReport
DROP PROCEDURE IF EXISTS `sp_GetHostelOccupancyReport`;
DELIMITER $$
CREATE PROCEDURE `sp_GetHostelOccupancyReport`(IN p_HostelId INT)
BEGIN
    SELECT 
        hb.HostelId,
        hb.HostelName,
        hb.HostelCode,
        hb.HostelType,
        COUNT(DISTINCT rm.RoomId) AS TotalRooms,
        COUNT(DISTINCT b.BedId) AS TotalBeds,
        COUNT(DISTINCT CASE WHEN b.BedStatus = 'Occupied' THEN b.BedId END) AS OccupiedBeds,
        COUNT(DISTINCT CASE WHEN b.BedStatus = 'Available' THEN b.BedId END) AS AvailableBeds,
        COUNT(DISTINCT hsa.StudentId) AS ActiveStudents,
        CASE 
            WHEN COUNT(DISTINCT b.BedId) > 0 
            THEN ROUND((COUNT(DISTINCT CASE WHEN b.BedStatus = 'Occupied' THEN b.BedId END) / COUNT(DISTINCT b.BedId)) * 100, 2)
            ELSE 0.00 
        END AS OccupancyPercentage
    FROM hostel_blocks hb
    LEFT JOIN room_masters rm ON hb.HostelId = rm.HostelId AND rm.Status = 'Active'
    LEFT JOIN hostel_beds b ON rm.RoomId = b.RoomId AND b.Status = 'Active'
    LEFT JOIN hostel_student_allocations hsa ON hb.HostelId = hsa.HostelId AND hsa.Status = 'Active'
    WHERE (p_HostelId IS NULL OR hb.HostelId = p_HostelId)
    GROUP BY hb.HostelId, hb.HostelName, hb.HostelCode, hb.HostelType
    ORDER BY hb.HostelName;
END$$
DELIMITER ;

-- 2.3 sp_GetHostelStudentReport
DROP PROCEDURE IF EXISTS `sp_GetHostelStudentReport`;
DELIMITER $$
CREATE PROCEDURE `sp_GetHostelStudentReport`(IN p_HostelId INT, IN p_Status VARCHAR(20), IN p_Search VARCHAR(100))
BEGIN
    SELECT 
        hsa.AllocationId,
        hsa.StudentId,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        COALESCE(s.StudentName, 'Student') AS StudentName,
        hb.HostelId,
        hb.HostelName,
        hb.HostelCode,
        rm.RoomId,
        rm.RoomNumber,
        b.BedId,
        b.BedNumber,
        hsa.JoiningDate,
        hsa.Status,
        COALESCE(CONCAT_WS(' ', st.FirstName, NULLIF(st.MiddleName, ''), st.LastName), '') AS WardenName
    FROM hostel_student_allocations hsa
    INNER JOIN hostel_blocks hb ON hsa.HostelId = hb.HostelId
    INNER JOIN room_masters rm ON hsa.RoomId = rm.RoomId
    INNER JOIN hostel_beds b ON hsa.BedId = b.BedId
    LEFT JOIN Students s ON hsa.StudentId = s.StudentId
    LEFT JOIN hostel_warden_assignments hwa ON hsa.WardenAssignmentId = hwa.WardenAssignmentId
    LEFT JOIN Staff st ON hwa.StaffId = st.Id
    WHERE (p_HostelId IS NULL OR hsa.HostelId = p_HostelId)
      AND (p_Status IS NULL OR hsa.Status = p_Status)
      AND (p_Search IS NULL OR s.StudentName LIKE CONCAT('%', p_Search, '%') OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%'))
    ORDER BY hsa.JoiningDate DESC;
END$$
DELIMITER ;

-- 2.4 sp_GetHostelAttendanceReport
DROP PROCEDURE IF EXISTS `sp_GetHostelAttendanceReport`;
DELIMITER $$
CREATE PROCEDURE `sp_GetHostelAttendanceReport`(
    IN p_HostelId INT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_Session VARCHAR(20),
    IN p_AttendanceStatus VARCHAR(20),
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        ha.AttendanceId,
        ha.StudentId,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        COALESCE(s.StudentName, 'Student') AS StudentName,
        hb.HostelName,
        rm.RoomNumber,
        b.BedNumber,
        ha.AttendanceDate,
        ha.Session,
        ha.AttendanceStatus,
        COALESCE(CONCAT_WS(' ', st.FirstName, NULLIF(st.MiddleName, ''), st.LastName), '') AS WardenName
    FROM hostel_attendance ha
    INNER JOIN hostel_blocks hb ON ha.HostelId = hb.HostelId
    INNER JOIN room_masters rm ON ha.RoomId = rm.RoomId
    INNER JOIN hostel_beds b ON ha.BedId = b.BedId
    LEFT JOIN Students s ON ha.StudentId = s.StudentId
    LEFT JOIN hostel_warden_assignments hwa ON ha.WardenAssignmentId = hwa.WardenAssignmentId
    LEFT JOIN Staff st ON hwa.StaffId = st.Id
    WHERE (p_HostelId IS NULL OR ha.HostelId = p_HostelId)
      AND (p_FromDate IS NULL OR ha.AttendanceDate >= p_FromDate)
      AND (p_ToDate IS NULL OR ha.AttendanceDate <= p_ToDate)
      AND (p_Session IS NULL OR ha.Session = p_Session)
      AND (p_AttendanceStatus IS NULL OR ha.AttendanceStatus = p_AttendanceStatus)
      AND (p_Search IS NULL OR s.StudentName LIKE CONCAT('%', p_Search, '%') OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%'))
    ORDER BY ha.AttendanceDate DESC;
END$$
DELIMITER ;

-- 2.5 sp_GetHostelOutpassLeaveReport
DROP PROCEDURE IF EXISTS `sp_GetHostelOutpassLeaveReport`;
DELIMITER $$
CREATE PROCEDURE `sp_GetHostelOutpassLeaveReport`(
    IN p_HostelId INT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_RequestType VARCHAR(20),
    IN p_ApprovalStatus VARCHAR(20),
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        hol.RequestId,
        hol.StudentId,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        COALESCE(s.StudentName, 'Student') AS StudentName,
        hb.HostelName,
        rm.RoomNumber,
        hol.RequestType,
        hol.FromDateTime,
        hol.ToDateTime,
        hol.Reason,
        hol.Destination,
        hol.ApprovalStatus,
        COALESCE(CONCAT_WS(' ', st.FirstName, NULLIF(st.MiddleName, ''), st.LastName), '') AS WardenName
    FROM hostel_outpass_leave hol
    INNER JOIN hostel_blocks hb ON hol.HostelId = hb.HostelId
    INNER JOIN room_masters rm ON hol.RoomId = rm.RoomId
    LEFT JOIN Students s ON hol.StudentId = s.StudentId
    LEFT JOIN hostel_warden_assignments hwa ON hol.WardenAssignmentId = hwa.WardenAssignmentId
    LEFT JOIN Staff st ON hwa.StaffId = st.Id
    WHERE (p_HostelId IS NULL OR hol.HostelId = p_HostelId)
      AND (p_FromDate IS NULL OR hol.FromDateTime >= p_FromDate)
      AND (p_ToDate IS NULL OR hol.ToDateTime <= p_ToDate)
      AND (p_RequestType IS NULL OR hol.RequestType = p_RequestType)
      AND (p_ApprovalStatus IS NULL OR hol.ApprovalStatus = p_ApprovalStatus)
      AND (p_Search IS NULL OR s.StudentName LIKE CONCAT('%', p_Search, '%') OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%'))
    ORDER BY hol.CreatedAt DESC;
END$$
DELIMITER ;

-- 2.6 sp_GetHostelTransferVacateReport
DROP PROCEDURE IF EXISTS `sp_GetHostelTransferVacateReport`;
DELIMITER $$
CREATE PROCEDURE `sp_GetHostelTransferVacateReport`(
    IN p_StudentId INT,
    IN p_FromDate DATE,
    IN p_ToDate DATE,
    IN p_RequestType VARCHAR(20),
    IN p_ApprovalStatus VARCHAR(20),
    IN p_FeeSettlementStatus VARCHAR(20),
    IN p_Search VARCHAR(100)
)
BEGIN
    SELECT 
        htv.RequestId,
        htv.AllocationId,
        htv.StudentId,
        COALESCE(s.AdmissionNo, '') AS AdmissionNo,
        COALESCE(s.RollNo, '') AS RollNo,
        COALESCE(s.StudentName, 'Student') AS StudentName,
        htv.RequestType,
        from_hb.HostelName AS FromHostelName,
        from_rm.RoomNumber AS FromRoomNumber,
        from_b.BedNumber AS FromBedNumber,
        to_hb.HostelName AS ToHostelName,
        to_rm.RoomNumber AS ToRoomNumber,
        to_b.BedNumber AS ToBedNumber,
        htv.RequestDate,
        htv.EffectiveDate,
        htv.ApprovalStatus,
        htv.FeeSettlementStatus,
        htv.RefundAmount,
        htv.AdditionalChargeAmount,
        htv.CompletedAt
    FROM hostel_transfer_vacate htv
    INNER JOIN hostel_blocks from_hb ON htv.FromHostelId = from_hb.HostelId
    INNER JOIN room_masters from_rm ON htv.FromRoomId = from_rm.RoomId
    INNER JOIN hostel_beds from_b ON htv.FromBedId = from_b.BedId
    LEFT JOIN hostel_blocks to_hb ON htv.ToHostelId = to_hb.HostelId
    LEFT JOIN room_masters to_rm ON htv.ToRoomId = to_rm.RoomId
    LEFT JOIN hostel_beds to_b ON htv.ToBedId = to_b.BedId
    LEFT JOIN Students s ON htv.StudentId = s.StudentId
    WHERE (p_StudentId IS NULL OR htv.StudentId = p_StudentId)
      AND (p_FromDate IS NULL OR htv.RequestDate >= p_FromDate)
      AND (p_ToDate IS NULL OR htv.RequestDate <= p_ToDate)
      AND (p_RequestType IS NULL OR htv.RequestType = p_RequestType)
      AND (p_ApprovalStatus IS NULL OR htv.ApprovalStatus = p_ApprovalStatus)
      AND (p_FeeSettlementStatus IS NULL OR htv.FeeSettlementStatus = p_FeeSettlementStatus)
      AND (p_Search IS NULL OR s.StudentName LIKE CONCAT('%', p_Search, '%') OR s.AdmissionNo LIKE CONCAT('%', p_Search, '%'))
    ORDER BY htv.CreatedAt DESC;
END$$
DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
SET SQL_SAFE_UPDATES = 1;
