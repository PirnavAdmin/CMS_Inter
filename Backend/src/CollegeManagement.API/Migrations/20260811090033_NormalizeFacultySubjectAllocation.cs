using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeFacultySubjectAllocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Cleanup leftover validation procedures from earlier failed runs if present
            migrationBuilder.Sql(@"
                DROP PROCEDURE IF EXISTS sp_Validate_FacultySubjectAllocation_Migration;
                DROP PROCEDURE IF EXISTS sp_Validate_FacultySubjectAllocation_Staging;
            ");

            // 2. Backup / Refresh Backup Snapshot
            migrationBuilder.Sql(@"
                DROP TABLE IF EXISTS FacultySubjectAllocations_Backup;
                CREATE TABLE FacultySubjectAllocations_Backup LIKE FacultySubjectAllocations;
                INSERT INTO FacultySubjectAllocations_Backup SELECT * FROM FacultySubjectAllocations;
            ");

            // 3. Create Temporary Stored Procedure for Clean Pre-Validation (NO DELIMITER keyword used)
            migrationBuilder.Sql(@"
                CREATE PROCEDURE sp_Validate_FacultySubjectAllocation_Migration()
                BEGIN
                    -- Validation 1: Verify all FacultyId values exist in Faculties table
                    IF EXISTS (
                        SELECT 1 FROM FacultySubjectAllocations fsa 
                        LEFT JOIN Faculties f ON f.Id = fsa.FacultyId 
                        WHERE f.Id IS NULL
                    ) THEN
                        SIGNAL SQLSTATE '45000' 
                        SET MESSAGE_TEXT = 'Migration Failed: Orphan FacultyId found in FacultySubjectAllocations table.';
                    END IF;

                    -- Validation 2: Verify all SubjectId values are > 0 and exist in Subjects table
                    IF EXISTS (
                        SELECT 1 FROM FacultySubjectAllocations fsa 
                        LEFT JOIN Subjects sub ON sub.SubjectId = fsa.SubjectId 
                        WHERE fsa.SubjectId IS NULL OR fsa.SubjectId <= 0 OR sub.SubjectId IS NULL
                    ) THEN
                        SIGNAL SQLSTATE '45000' 
                        SET MESSAGE_TEXT = 'Migration Failed: Invalid or missing SubjectId found in FacultySubjectAllocations table.';
                    END IF;

                    -- Validation 3: Verify no duplicate (FacultyId, SubjectId) pairs exist
                    IF EXISTS (
                        SELECT 1 FROM FacultySubjectAllocations 
                        GROUP BY FacultyId, SubjectId 
                        HAVING COUNT(*) > 1
                    ) THEN
                        SIGNAL SQLSTATE '45000' 
                        SET MESSAGE_TEXT = 'Migration Failed: Duplicate (FacultyId, SubjectId) allocation found.';
                    END IF;
                END;
            ");

            // 4. Call Pre-Migration Validation Procedure & Drop Procedure Immediately
            migrationBuilder.Sql(@"
                CALL sp_Validate_FacultySubjectAllocation_Migration();
                DROP PROCEDURE IF EXISTS sp_Validate_FacultySubjectAllocation_Migration;
            ");

            // 5. Staging Table Setup & Direct Data Copy from live schema
            migrationBuilder.Sql(@"
                DROP TABLE IF EXISTS FacultySubjectAllocations_Staging;
                CREATE TABLE FacultySubjectAllocations_Staging (
                    Id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                    FacultyId INT NOT NULL,
                    SubjectId INT NOT NULL,
                    CreatedAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    UpdatedAt DATETIME(6) NULL,
                    CONSTRAINT uq_Faculty_Subject UNIQUE (FacultyId, SubjectId),
                    CONSTRAINT fk_fsa_faculty FOREIGN KEY (FacultyId) REFERENCES Faculties(Id) ON DELETE CASCADE,
                    CONSTRAINT fk_fsa_subject FOREIGN KEY (SubjectId) REFERENCES Subjects(SubjectId) ON DELETE RESTRICT
                );

                INSERT INTO FacultySubjectAllocations_Staging (Id, FacultyId, SubjectId, CreatedAt, UpdatedAt)
                SELECT 
                    Id,
                    FacultyId,
                    SubjectId,
                    CreatedAt,
                    UpdatedAt
                FROM FacultySubjectAllocations;
            ");

            // 6. Create & Execute Staging Count Validation Procedure
            migrationBuilder.Sql(@"
                CREATE PROCEDURE sp_Validate_FacultySubjectAllocation_Staging()
                BEGIN
                    IF (SELECT COUNT(*) FROM FacultySubjectAllocations_Staging) <> (SELECT COUNT(*) FROM FacultySubjectAllocations) THEN
                        SIGNAL SQLSTATE '45000'
                        SET MESSAGE_TEXT = 'Migration Failed: Staging row count does not match source row count.';
                    END IF;
                END;
            ");

            migrationBuilder.Sql(@"
                CALL sp_Validate_FacultySubjectAllocation_Staging();
                DROP PROCEDURE IF EXISTS sp_Validate_FacultySubjectAllocation_Staging;
            ");

            // 7. Atomic Table Swap (Preserves original live table as FacultySubjectAllocations_Old)
            migrationBuilder.Sql(@"
                RENAME TABLE FacultySubjectAllocations TO FacultySubjectAllocations_Old,
                             FacultySubjectAllocations_Staging TO FacultySubjectAllocations;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                DROP TABLE IF EXISTS FacultySubjectAllocations;
                RENAME TABLE FacultySubjectAllocations_Old TO FacultySubjectAllocations;
            ");
        }
    }
}
