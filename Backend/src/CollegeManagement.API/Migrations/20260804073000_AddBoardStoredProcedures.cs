using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    public partial class AddBoardStoredProcedures : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Drop existing procedures if they exist
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_AcademicLevelExists;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_AcademicPatternExists;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_ChangeBoardStatus;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CountryExists;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CreateBoard;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_DeleteBoard;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAcademicLevels;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAcademicPatterns;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetBoardById;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetBoards;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetCountries;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetGradingSystems;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetStatesByCountry;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GradingSystemExists;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_ReplaceBoardAcademicLevels;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_StateBelongsToCountry;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_StateExists;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_UpdateBoard;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_ValidateBoardCode;", suppressTransaction: true);

            // Recreate procedures
            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_AcademicLevelExists(
                    IN p_AcademicLevelId INT
                )
                BEGIN
                    SELECT EXISTS (
                        SELECT 1 
                        FROM AcademicLevels 
                        WHERE AcademicLevelId = p_AcademicLevelId AND IsActive = 1
                    ) AS LevelExists;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_AcademicPatternExists(
                    IN p_AcademicPatternId INT
                )
                BEGIN
                    SELECT EXISTS (
                        SELECT 1 
                        FROM AcademicPatterns 
                        WHERE AcademicPatternId = p_AcademicPatternId AND IsActive = 1
                    ) AS PatternExists;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_ChangeBoardStatus(
                    IN p_BoardId INT,
                    IN p_Status BOOLEAN
                )
                BEGIN
                    DECLARE EXIT HANDLER FOR SQLEXCEPTION
                    BEGIN
                        ROLLBACK;
                        RESIGNAL;
                    END;

                    START TRANSACTION;

                    UPDATE Boards
                    SET IsActive = p_Status,
                        UpdatedAt = UTC_TIMESTAMP()
                    WHERE BoardId = p_BoardId;

                    COMMIT;
                    
                    SELECT ROW_COUNT() AS AffectedRows;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_CountryExists(
                    IN p_CountryId INT
                )
                BEGIN
                    SELECT EXISTS (
                        SELECT 1 
                        FROM Countries 
                        WHERE CountryId = p_CountryId AND IsActive = 1
                    ) AS CountryExists;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_CreateBoard(
                    IN p_BoardName VARCHAR(100),
                    IN p_BoardCode VARCHAR(30),
                    IN p_Description VARCHAR(500),
                    IN p_CountryId INT,
                    IN p_StateId INT,
                    IN p_AcademicPatternId INT,
                    IN p_GradingSystemId INT,
                    IN p_InternalAssessment BOOLEAN,
                    IN p_PracticalExams BOOLEAN,
                    IN p_BoardExams BOOLEAN,
                    IN p_PassPercentage DECIMAL(5,2),
                    IN p_RankCalculation BOOLEAN,
                    IN p_IsActive BOOLEAN
                )
                BEGIN
                    DECLARE v_BoardId INT;
                    DECLARE EXIT HANDLER FOR SQLEXCEPTION
                    BEGIN
                        ROLLBACK;
                        RESIGNAL;
                    END;

                    START TRANSACTION;

                    INSERT INTO Boards (
                        BoardName, BoardCode, Description, CountryId, StateId, AcademicPatternId, GradingSystemId, 
                        InternalAssessment, PracticalExams, BoardExams, PassPercentage, RankCalculation, IsActive, CreatedAt
                    ) VALUES (
                        p_BoardName, TRIM(p_BoardCode), p_Description, p_CountryId, p_StateId, p_AcademicPatternId, p_GradingSystemId,
                        p_InternalAssessment, p_PracticalExams, p_BoardExams, p_PassPercentage, p_RankCalculation, IFNULL(p_IsActive, 1), UTC_TIMESTAMP()
                    );
                    
                    SET v_BoardId = LAST_INSERT_ID();

                    COMMIT;
                    
                    SELECT 
                        b.BoardId, b.BoardCode, b.BoardName, b.Description, b.InternalAssessment, b.PracticalExams, b.BoardExams, b.PassPercentage, b.RankCalculation, b.IsActive, b.CreatedAt, b.UpdatedAt,
                        c.CountryId, c.CountryCode, c.CountryName,
                        s.StateId, s.StateCode, s.StateName,
                        ap.AcademicPatternId, ap.PatternCode, ap.PatternName,
                        gs.GradingSystemId, gs.GradingSystemCode, gs.GradingSystemName
                    FROM Boards b
                    INNER JOIN Countries c ON b.CountryId = c.CountryId
                    LEFT JOIN States s ON b.StateId = s.StateId
                    INNER JOIN AcademicPatterns ap ON b.AcademicPatternId = ap.AcademicPatternId
                    INNER JOIN GradingSystems gs ON b.GradingSystemId = gs.GradingSystemId
                    WHERE b.BoardId = v_BoardId;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_DeleteBoard(
                    IN p_BoardId INT
                )
                BEGIN
                    DECLARE EXIT HANDLER FOR SQLEXCEPTION
                    BEGIN
                        ROLLBACK;
                        RESIGNAL;
                    END;

                    START TRANSACTION;

                    UPDATE Boards
                    SET IsActive = 0,
                        UpdatedAt = UTC_TIMESTAMP()
                    WHERE BoardId = p_BoardId;

                    COMMIT;
                    
                    SELECT ROW_COUNT() AS AffectedRows;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_GetAcademicLevels()
                BEGIN
                    SELECT AcademicLevelId, LevelCode, LevelName, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt
                    FROM AcademicLevels
                    WHERE IsActive = 1
                    ORDER BY DisplayOrder ASC, LevelName ASC;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_GetAcademicPatterns()
                BEGIN
                    SELECT AcademicPatternId, PatternCode, PatternName, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt
                    FROM AcademicPatterns
                    WHERE IsActive = 1
                    ORDER BY DisplayOrder ASC, PatternName ASC;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_GetBoardById(
                    IN p_BoardId INT
                )
                BEGIN
                    SELECT 
                        b.BoardId, b.BoardCode, b.BoardName, b.Description, b.InternalAssessment, b.PracticalExams, b.BoardExams, b.PassPercentage, b.RankCalculation, b.IsActive, b.CreatedAt, b.UpdatedAt,
                        c.CountryId, c.CountryCode, c.CountryName,
                        s.StateId, s.StateCode, s.StateName,
                        ap.AcademicPatternId, ap.PatternCode, ap.PatternName,
                        gs.GradingSystemId, gs.GradingSystemCode, gs.GradingSystemName
                    FROM Boards b
                    INNER JOIN Countries c ON b.CountryId = c.CountryId
                    LEFT JOIN States s ON b.StateId = s.StateId
                    INNER JOIN AcademicPatterns ap ON b.AcademicPatternId = ap.AcademicPatternId
                    INNER JOIN GradingSystems gs ON b.GradingSystemId = gs.GradingSystemId
                    WHERE b.BoardId = p_BoardId;

                    SELECT 
                        bal.BoardAcademicLevelId, bal.BoardId, bal.IsActive, bal.CreatedAt, bal.UpdatedAt,
                        al.AcademicLevelId, al.LevelCode, al.LevelName
                    FROM BoardAcademicLevels bal
                    INNER JOIN AcademicLevels al ON bal.AcademicLevelId = al.AcademicLevelId
                    WHERE bal.BoardId = p_BoardId;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_GetBoards(
                    IN p_BoardName VARCHAR(100),
                    IN p_BoardCode VARCHAR(30),
                    IN p_CountryId INT,
                    IN p_StateId INT,
                    IN p_Status BOOLEAN
                )
                BEGIN
                    SELECT 
                        b.BoardId, b.BoardCode, b.BoardName, b.Description, b.InternalAssessment, b.PracticalExams, b.BoardExams, b.PassPercentage, b.RankCalculation, b.IsActive, b.CreatedAt, b.UpdatedAt,
                        c.CountryId, c.CountryCode, c.CountryName,
                        s.StateId, s.StateCode, s.StateName,
                        ap.AcademicPatternId, ap.PatternCode, ap.PatternName,
                        gs.GradingSystemId, gs.GradingSystemCode, gs.GradingSystemName
                    FROM Boards b
                    INNER JOIN Countries c ON b.CountryId = c.CountryId
                    LEFT JOIN States s ON b.StateId = s.StateId
                    INNER JOIN AcademicPatterns ap ON b.AcademicPatternId = ap.AcademicPatternId
                    INNER JOIN GradingSystems gs ON b.GradingSystemId = gs.GradingSystemId
                    WHERE (p_BoardName IS NULL OR TRIM(p_BoardName) = '' OR b.BoardName LIKE CONCAT('%', TRIM(p_BoardName), '%'))
                      AND (p_BoardCode IS NULL OR TRIM(p_BoardCode) = '' OR b.BoardCode LIKE CONCAT('%', TRIM(p_BoardCode), '%'))
                      AND (p_CountryId IS NULL OR b.CountryId = p_CountryId)
                      AND (p_StateId IS NULL OR b.StateId = p_StateId)
                      AND (p_Status IS NULL OR b.IsActive = p_Status)
                    ORDER BY b.BoardName ASC;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_GetCountries()
                BEGIN
                    SELECT CountryId, CountryCode, CountryName, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt
                    FROM Countries
                    WHERE IsActive = 1
                    ORDER BY DisplayOrder ASC;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_GetGradingSystems()
                BEGIN
                    SELECT GradingSystemId, GradingSystemCode, GradingSystemName, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt
                    FROM GradingSystems
                    WHERE IsActive = 1
                    ORDER BY DisplayOrder ASC, GradingSystemName ASC;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_GetStatesByCountry(
                    IN p_CountryId INT
                )
                BEGIN
                    SELECT StateId, StateCode, StateName, CountryId, Description, DisplayOrder, IsActive, CreatedAt, UpdatedAt
                    FROM States
                    WHERE CountryId = p_CountryId AND IsActive = 1
                    ORDER BY DisplayOrder ASC, StateName ASC;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_GradingSystemExists(
                    IN p_GradingSystemId INT
                )
                BEGIN
                    SELECT EXISTS (
                        SELECT 1 
                        FROM GradingSystems 
                        WHERE GradingSystemId = p_GradingSystemId AND IsActive = 1
                    ) AS SystemExists;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_ReplaceBoardAcademicLevels(
                    IN p_BoardId INT,
                    IN p_AcademicLevelIds TEXT
                )
                BEGIN
                    DECLARE v_IdString TEXT;
                    DECLARE v_IdVal INT;
                    DECLARE EXIT HANDLER FOR SQLEXCEPTION
                    BEGIN
                        ROLLBACK;
                        RESIGNAL;
                    END;

                    START TRANSACTION;

                    DELETE FROM BoardAcademicLevels 
                    WHERE BoardId = p_BoardId;

                    IF p_AcademicLevelIds IS NOT NULL AND TRIM(p_AcademicLevelIds) != '' THEN
                        SET v_IdString = p_AcademicLevelIds;
                        WHILE LOCATE(',', v_IdString) > 0 DO
                            SET v_IdVal = CAST(SUBSTRING_INDEX(v_IdString, ',', 1) AS SIGNED);
                            SET v_IdString = SUBSTRING(v_IdString, LOCATE(',', v_IdString) + 1);
                            
                            INSERT INTO BoardAcademicLevels (BoardId, AcademicLevelId, IsActive, CreatedAt)
                            VALUES (p_BoardId, v_IdVal, 1, UTC_TIMESTAMP());
                        END WHILE;
                        
                        IF TRIM(v_IdString) != '' THEN
                            SET v_IdVal = CAST(v_IdString AS SIGNED);
                            INSERT INTO BoardAcademicLevels (BoardId, AcademicLevelId, IsActive, CreatedAt)
                            VALUES (p_BoardId, v_IdVal, 1, UTC_TIMESTAMP());
                        END IF;
                    END IF;

                    COMMIT;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_StateBelongsToCountry(
                    IN p_StateId INT,
                    IN p_CountryId INT
                )
                BEGIN
                    SELECT EXISTS (
                        SELECT 1 
                        FROM States 
                        WHERE StateId = p_StateId AND CountryId = p_CountryId AND IsActive = 1
                    ) AS Belongs;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_StateExists(
                    IN p_StateId INT
                )
                BEGIN
                    SELECT EXISTS (
                        SELECT 1 
                        FROM States 
                        WHERE StateId = p_StateId AND IsActive = 1
                    ) AS StateExists;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_UpdateBoard(
                    IN p_BoardId INT,
                    IN p_BoardName VARCHAR(100),
                    IN p_BoardCode VARCHAR(30),
                    IN p_Description VARCHAR(500),
                    IN p_CountryId INT,
                    IN p_StateId INT,
                    IN p_AcademicPatternId INT,
                    IN p_GradingSystemId INT,
                    IN p_InternalAssessment BOOLEAN,
                    IN p_PracticalExams BOOLEAN,
                    IN p_BoardExams BOOLEAN,
                    IN p_PassPercentage DECIMAL(5,2),
                    IN p_RankCalculation BOOLEAN,
                    IN p_IsActive BOOLEAN
                )
                BEGIN
                    DECLARE EXIT HANDLER FOR SQLEXCEPTION
                    BEGIN
                        ROLLBACK;
                        RESIGNAL;
                    END;

                    START TRANSACTION;

                    UPDATE Boards
                    SET
                        BoardName = p_BoardName,
                        BoardCode = TRIM(p_BoardCode),
                        Description = p_Description,
                        CountryId = p_CountryId,
                        StateId = p_StateId,
                        AcademicPatternId = p_AcademicPatternId,
                        GradingSystemId = p_GradingSystemId,
                        InternalAssessment = p_InternalAssessment,
                        PracticalExams = p_PracticalExams,
                        BoardExams = p_BoardExams,
                        PassPercentage = p_PassPercentage,
                        RankCalculation = p_RankCalculation,
                        IsActive = p_IsActive,
                        UpdatedAt = UTC_TIMESTAMP()
                    WHERE BoardId = p_BoardId;

                    COMMIT;
                    
                    SELECT 
                        b.BoardId, b.BoardCode, b.BoardName, b.Description, b.InternalAssessment, b.PracticalExams, b.BoardExams, b.PassPercentage, b.RankCalculation, b.IsActive, b.CreatedAt, b.UpdatedAt,
                        c.CountryId, c.CountryCode, c.CountryName,
                        s.StateId, s.StateCode, s.StateName,
                        ap.AcademicPatternId, ap.PatternCode, ap.PatternName,
                        gs.GradingSystemId, gs.GradingSystemCode, gs.GradingSystemName
                    FROM Boards b
                    INNER JOIN Countries c ON b.CountryId = c.CountryId
                    LEFT JOIN States s ON b.StateId = s.StateId
                    INNER JOIN AcademicPatterns ap ON b.AcademicPatternId = ap.AcademicPatternId
                    INNER JOIN GradingSystems gs ON b.GradingSystemId = gs.GradingSystemId
                    WHERE b.BoardId = p_BoardId;
                END;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE PROCEDURE sp_ValidateBoardCode(
                    IN p_BoardCode VARCHAR(30),
                    IN p_ExcludeBoardId INT
                )
                BEGIN
                    SELECT EXISTS (
                        SELECT 1 
                        FROM Boards 
                        WHERE BoardCode = TRIM(p_BoardCode)
                          AND (p_ExcludeBoardId IS NULL OR BoardId <> p_ExcludeBoardId)
                    ) AS CodeExists;
                END;
                """,
                suppressTransaction: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_ValidateBoardCode;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_UpdateBoard;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_StateExists;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_StateBelongsToCountry;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_ReplaceBoardAcademicLevels;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GradingSystemExists;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetStatesByCountry;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetGradingSystems;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetCountries;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetBoards;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetBoardById;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAcademicPatterns;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAcademicLevels;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_DeleteBoard;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CreateBoard;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CountryExists;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_ChangeBoardStatus;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_AcademicPatternExists;", suppressTransaction: true);
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_AcademicLevelExists;", suppressTransaction: true);
        }
    }
}
