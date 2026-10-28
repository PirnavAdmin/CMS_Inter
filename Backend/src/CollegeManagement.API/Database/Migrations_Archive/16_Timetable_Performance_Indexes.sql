-- =============================================================================
-- SCRIPT: 16_Timetable_Performance_Indexes.sql
-- DESCRIPTION: Adds high-performance composite indexes to accelerate
--              Timetable retrieval, Conflict Checking, Generation, and Exports.
-- =============================================================================

-- 1. Index for Section Timetable retrieval (eliminates filesort and provides index scan)
CREATE INDEX IF NOT EXISTS `IX_Timetables_Sec_Year_Day_Per` 
ON `Timetables` (`SectionId`, `AcademicYearId`, `DayOfWeek`, `PeriodId`);

-- 2. Index for Faculty Timetable retrieval
CREATE INDEX IF NOT EXISTS `IX_Timetables_Staff_Year_Day_Per` 
ON `Timetables` (`StaffId`, `AcademicYearId`, `DayOfWeek`, `PeriodId`);

-- 3. Index for Room Timetable retrieval
CREATE INDEX IF NOT EXISTS `IX_Timetables_Room_Year_Day_Per` 
ON `Timetables` (`RoomId`, `AcademicYearId`, `DayOfWeek`, `PeriodId`);

-- 4. Index for Consolidated Multi-Entity Conflict Checking
CREATE INDEX IF NOT EXISTS `IX_Timetables_Conflict_Lookup` 
ON `Timetables` (`AcademicYearId`, `DayOfWeek`, `PeriodId`, `SectionId`, `StaffId`, `RoomId`);

-- 5. Index for Group Timetable and Batch Section lookups
CREATE INDEX IF NOT EXISTS `IX_Timetables_Group_Year` 
ON `Timetables` (`GroupId`, `AcademicYearId`);

-- 6. Indexes for Timetable Substitutions
CREATE INDEX IF NOT EXISTS `IX_TimetableSubstitutions_Date_Section` 
ON `TimetableSubstitutions` (`SubstitutionDate`, `SectionId`);

CREATE INDEX IF NOT EXISTS `IX_TimetableSubstitutions_Date_Staff` 
ON `TimetableSubstitutions` (`SubstitutionDate`, `OriginalStaffId`, `SubstituteStaffId`);

CREATE INDEX IF NOT EXISTS `IX_TimetableSubstitutions_Leave` 
ON `TimetableSubstitutions` (`StaffLeaveRequestId`);

-- 7. Index for Periods Structure and Order
CREATE INDEX IF NOT EXISTS `IX_Periods_Structure_Order` 
ON `Periods` (`PeriodStructureId`, `DisplayOrder`, `StartTime`);

-- 8. Index for Period Structure Assignments Context Lookup
CREATE INDEX IF NOT EXISTS `IX_PeriodStructureAssignments_Context` 
ON `PeriodStructureAssignments` (`BoardId`, `AcademicLevelId`, `AcademicYearId`, `GroupId`, `IsActive`);
