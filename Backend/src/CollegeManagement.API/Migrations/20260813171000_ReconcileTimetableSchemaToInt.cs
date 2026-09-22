using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class ReconcileTimetableSchemaToInt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Cleanup leftover validation procedures from earlier runs if present
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS sp_Validate_Timetable_Schema_Migration;
                DROP PROCEDURE IF EXISTS sp_Validate_Timetable_Staging;
            ");

            // 2. Preserve existing live table backup
            migrationBuilder.Sql(@"
                DROP TABLE IF EXISTS Timetables_Backup_Legacy;
                CREATE TABLE Timetables_Backup_Legacy LIKE Timetables;
                INSERT INTO Timetables_Backup_Legacy SELECT * FROM Timetables;
            ");

            // 3. Create Pre-Migration Validation Procedure for String-to-Int Safe Cast Check (Handles both 'TimetableId' and 'Id')
            migrationBuilder.Sql(@"
                CREATE PROCEDURE sp_Validate_Timetable_Schema_Migration()
                BEGIN
                    DECLARE pk_col VARCHAR(50);
                    DECLARE invalid_cnt INT DEFAULT 0;

                    -- Dynamically detect primary key column name ('TimetableId' or 'Id')
                    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Timetables' AND COLUMN_NAME = 'TimetableId') THEN
                        SET pk_col = 'TimetableId';
                    ELSE
                        SET pk_col = 'Id';
                    END IF;

                    -- Validation 1: Verify Primary Key values are numeric strings
                    SET @v_sql = CONCAT('SELECT COUNT(*) INTO @invalid_cnt FROM Timetables WHERE `', pk_col, '` REGEXP ''^[0-9]+$'' = 0');
                    PREPARE stmt FROM @v_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
                    IF @invalid_cnt > 0 THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric Primary Key found in Timetables table.';
                    END IF;

                    -- Validation 2: Verify all BoardId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE BoardId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric BoardId found in Timetables table.';
                    END IF;

                    -- Validation 3: Verify all AcademicLevelId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE AcademicLevelId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric AcademicLevelId found in Timetables table.';
                    END IF;

                    -- Validation 4: Verify all AcademicYearId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE AcademicYearId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric AcademicYearId found in Timetables table.';
                    END IF;

                    -- Validation 5: Verify all GroupId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE GroupId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric GroupId found in Timetables table.';
                    END IF;

                    -- Validation 6: Verify all SectionId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE SectionId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric SectionId found in Timetables table.';
                    END IF;

                    -- Validation 7: Verify all DayOfWeek values are numeric or valid day names
                    IF EXISTS (
                        SELECT 1 FROM Timetables 
                        WHERE DayOfWeek REGEXP '^[0-9]+$' = 0 
                          AND LOWER(TRIM(DayOfWeek)) NOT IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday','mon','tue','wed','thu','fri','sat','sun')
                    ) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Invalid DayOfWeek text value found in Timetables table.';
                    END IF;

                    -- Validation 8: Verify all PeriodId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE PeriodId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric PeriodId found in Timetables table.';
                    END IF;

                    -- Validation 9: Verify all SubjectId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE SubjectId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric SubjectId found in Timetables table.';
                    END IF;

                    -- Validation 10: Verify all FacultyId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE FacultyId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric FacultyId found in Timetables table.';
                    END IF;

                    -- Validation 11: Verify all RoomId values are numeric strings
                    IF EXISTS (SELECT 1 FROM Timetables WHERE RoomId REGEXP '^[0-9]+$' = 0) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Non-numeric RoomId found in Timetables table.';
                    END IF;

                    -- Validation 12: Verify no orphan SectionId values exist
                    IF EXISTS (
                        SELECT 1 FROM Timetables t
                        LEFT JOIN Sections s ON s.SectionId = CAST(t.SectionId AS SIGNED)
                        WHERE s.SectionId IS NULL
                    ) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Orphan SectionId found in Timetables table.';
                    END IF;

                    -- Validation 13: Verify no orphan SubjectId values exist
                    IF EXISTS (
                        SELECT 1 FROM Timetables t
                        LEFT JOIN Subjects sub ON sub.SubjectId = CAST(t.SubjectId AS SIGNED)
                        WHERE sub.SubjectId IS NULL
                    ) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Orphan SubjectId found in Timetables table.';
                    END IF;

                    -- Validation 14: Verify no orphan FacultyId values exist
                    IF EXISTS (
                        SELECT 1 FROM Timetables t
                        LEFT JOIN Faculties f ON f.Id = CAST(t.FacultyId AS SIGNED)
                        WHERE f.Id IS NULL
                    ) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Orphan FacultyId found in Timetables table.';
                    END IF;

                    -- Validation 15: Verify no orphan PeriodId values exist
                    IF EXISTS (
                        SELECT 1 FROM Timetables t
                        LEFT JOIN Periods p ON p.PeriodId = CAST(t.PeriodId AS SIGNED)
                        WHERE p.PeriodId IS NULL
                    ) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Orphan PeriodId found in Timetables table.';
                    END IF;

                    -- Validation 16: Verify no orphan RoomId values exist
                    IF EXISTS (
                        SELECT 1 FROM Timetables t
                        LEFT JOIN Rooms r ON r.RoomId = CAST(t.RoomId AS SIGNED)
                        WHERE r.RoomId IS NULL
                    ) THEN
                        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration Failed: Orphan RoomId found in Timetables table.';
                    END IF;
                END;
            ");

            // 4. Call Validation Procedure & Drop Procedure Immediately
            migrationBuilder.Sql(@"
                CALL sp_Validate_Timetable_Schema_Migration();
                DROP PROCEDURE IF EXISTS sp_Validate_Timetable_Schema_Migration;
            ");

            // 5. Create Staging Table with clean INT schema matching EF Core Snapshot
            migrationBuilder.Sql(@"
                DROP TABLE IF EXISTS Timetables_Staging;
                CREATE TABLE Timetables_Staging (
                    Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    BoardId INT NOT NULL,
                    AcademicLevelId INT NOT NULL,
                    AcademicYearId INT NOT NULL,
                    GroupId INT NOT NULL,
                    SectionId INT NOT NULL,
                    DayOfWeek INT NOT NULL,
                    PeriodId INT NOT NULL,
                    SubjectId INT NOT NULL,
                    FacultyId INT NOT NULL,
                    RoomId INT NOT NULL,
                    IsPublished TINYINT(1) NOT NULL DEFAULT 0,
                    Remarks VARCHAR(250) NULL,
                    CreatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    UpdatedAt DATETIME(6) NULL,
                    KEY IX_Timetables_BoardId (BoardId),
                    KEY IX_Timetables_AcademicYearId (AcademicYearId),
                    KEY IX_Timetables_SectionId (SectionId),
                    KEY IX_Timetables_PeriodId (PeriodId),
                    KEY IX_Timetables_FacultyId (FacultyId),
                    KEY IX_Timetables_RoomId (RoomId),
                    CONSTRAINT fk_timetable_board FOREIGN KEY (BoardId) REFERENCES Boards(BoardId) ON DELETE RESTRICT,
                    CONSTRAINT fk_timetable_academiclevel FOREIGN KEY (AcademicLevelId) REFERENCES AcademicLevels(AcademicLevelId) ON DELETE RESTRICT,
                    CONSTRAINT fk_timetable_academicyear FOREIGN KEY (AcademicYearId) REFERENCES AcademicYears(AcademicYearId) ON DELETE RESTRICT,
                    CONSTRAINT fk_timetable_group FOREIGN KEY (GroupId) REFERENCES `Groups`(GroupId) ON DELETE RESTRICT,
                    CONSTRAINT fk_timetable_section FOREIGN KEY (SectionId) REFERENCES Sections(SectionId) ON DELETE CASCADE,
                    CONSTRAINT fk_timetable_period FOREIGN KEY (PeriodId) REFERENCES Periods(PeriodId) ON DELETE RESTRICT,
                    CONSTRAINT fk_timetable_subject FOREIGN KEY (SubjectId) REFERENCES Subjects(SubjectId) ON DELETE RESTRICT,
                    CONSTRAINT fk_timetable_faculty FOREIGN KEY (FacultyId) REFERENCES Faculties(Id) ON DELETE RESTRICT,
                    CONSTRAINT fk_timetable_room FOREIGN KEY (RoomId) REFERENCES Rooms(RoomId) ON DELETE RESTRICT
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

                -- Dynamically select primary key column ('TimetableId' or 'Id') and map DayOfWeek safely
                SET @pk_col := IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Timetables' AND COLUMN_NAME = 'TimetableId') > 0, 'TimetableId', 'Id');
                SET @insert_sql := CONCAT('
                    INSERT INTO Timetables_Staging (
                        Id, BoardId, AcademicLevelId, AcademicYearId, GroupId,
                        SectionId, DayOfWeek, PeriodId, SubjectId, FacultyId,
                        RoomId, IsPublished, Remarks, CreatedAt, UpdatedAt
                    )
                    SELECT 
                        CAST(`', @pk_col, '` AS SIGNED),
                        CAST(BoardId AS SIGNED),
                        CAST(AcademicLevelId AS SIGNED),
                        CAST(AcademicYearId AS SIGNED),
                        CAST(GroupId AS SIGNED),
                        CAST(SectionId AS SIGNED),
                        CASE LOWER(TRIM(DayOfWeek))
                            WHEN ''monday'' THEN 1
                            WHEN ''tuesday'' THEN 2
                            WHEN ''wednesday'' THEN 3
                            WHEN ''thursday'' THEN 4
                            WHEN ''friday'' THEN 5
                            WHEN ''saturday'' THEN 6
                            WHEN ''sunday'' THEN 7
                            WHEN ''mon'' THEN 1
                            WHEN ''tue'' THEN 2
                            WHEN ''wed'' THEN 3
                            WHEN ''thu'' THEN 4
                            WHEN ''fri'' THEN 5
                            WHEN ''sat'' THEN 6
                            WHEN ''sun'' THEN 7
                            ELSE CAST(DayOfWeek AS SIGNED)
                        END,
                        CAST(PeriodId AS SIGNED),
                        CAST(SubjectId AS SIGNED),
                        CAST(FacultyId AS SIGNED),
                        CAST(RoomId AS SIGNED),
                        IsPublished,
                        Remarks,
                        CreatedAt,
                        UpdatedAt
                    FROM Timetables;
                ');
                PREPARE stmt FROM @insert_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
            ");

            // 6. Staging Data Integrity Validation Procedure
            migrationBuilder.Sql(@"
                CREATE PROCEDURE sp_Validate_Timetable_Staging()
                BEGIN
                    IF (SELECT COUNT(*) FROM Timetables_Staging) <> (SELECT COUNT(*) FROM Timetables) THEN
                        SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = 'Migration Failed: Staging row count does not match source row count.';
                    END IF;

                    IF EXISTS (
                        SELECT 1 FROM Timetables_Staging
                        WHERE BoardId IS NULL OR AcademicLevelId IS NULL OR AcademicYearId IS NULL
                           OR GroupId IS NULL OR SectionId IS NULL OR PeriodId IS NULL
                           OR SubjectId IS NULL OR FacultyId IS NULL OR RoomId IS NULL
                           OR DayOfWeek IS NULL
                    ) THEN
                        SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = 'Migration Failed: NULL values found in required staging columns.';
                    END IF;
                END;
            ");

            migrationBuilder.Sql(@"
                CALL sp_Validate_Timetable_Staging();
                DROP PROCEDURE IF EXISTS sp_Validate_Timetable_Staging;
            ");

            // 7. Atomic Table Swap & Dynamic AUTO_INCREMENT Alignment
            migrationBuilder.Sql(@"
                RENAME TABLE Timetables TO Timetables_Old_Legacy,
                             Timetables_Staging TO Timetables;

                SET @max_id := (SELECT COALESCE(MAX(Id), 0) + 1 FROM Timetables);
                SET @alter_stmt := CONCAT('ALTER TABLE Timetables AUTO_INCREMENT = ', @max_id);
                PREPARE stmt FROM @alter_stmt;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DROP TABLE IF EXISTS Timetables;
                RENAME TABLE Timetables_Old_Legacy TO Timetables;
            ");
        }
    }
}
