using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CollegeManagement.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMissingBoardProcedures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // sp_GetBoards
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetBoards;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetBoards(
                    IN p_BoardName VARCHAR(100),
                    IN p_BoardCode VARCHAR(30),
                    IN p_CountryId INT,
                    IN p_StateId INT,
                    IN p_Status VARCHAR(20)
                )
                BEGIN
                    SELECT 
                        b.BoardId, b.BoardCode, b.BoardName, b.Description, b.PassPercentage, b.IsActive, b.CreatedAt, b.UpdatedAt,
                        c.CountryId, c.CountryCode, c.CountryName,
                        s.StateId, s.StateCode, s.StateName,
                        ap.AcademicPatternId, ap.PatternCode, ap.PatternName,
                        gs.GradingSystemId, gs.GradingSystemCode, gs.GradingSystemName
                    FROM Boards b
                    LEFT JOIN Countries c ON c.CountryId = b.CountryId
                    LEFT JOIN States s ON s.StateId = b.StateId
                    LEFT JOIN AcademicPatterns ap ON ap.AcademicPatternId = b.AcademicPatternId
                    LEFT JOIN GradingSystems gs ON gs.GradingSystemId = b.GradingSystemId
                    WHERE (p_BoardName IS NULL OR p_BoardName = '' OR b.BoardName LIKE CONCAT('%', p_BoardName, '%'))
                      AND (p_BoardCode IS NULL OR p_BoardCode = '' OR b.BoardCode LIKE CONCAT('%', p_BoardCode, '%'))
                      AND (p_CountryId IS NULL OR p_CountryId = 0 OR b.CountryId = p_CountryId)
                      AND (p_StateId IS NULL OR p_StateId = 0 OR b.StateId = p_StateId)
                      AND (p_Status IS NULL OR p_Status = '' OR (p_Status = 'Active' AND b.IsActive = 1) OR (p_Status = 'Inactive' AND b.IsActive = 0));
                END;
            """);

            // sp_GetBoardById
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetBoardById;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetBoardById(IN p_BoardId INT)
                BEGIN
                    SELECT 
                        b.BoardId, b.BoardCode, b.BoardName, b.Description, b.PassPercentage, b.IsActive, b.CreatedAt, b.UpdatedAt,
                        c.CountryId, c.CountryCode, c.CountryName,
                        s.StateId, s.StateCode, s.StateName,
                        ap.AcademicPatternId, ap.PatternCode, ap.PatternName,
                        gs.GradingSystemId, gs.GradingSystemCode, gs.GradingSystemName
                    FROM Boards b
                    LEFT JOIN Countries c ON c.CountryId = b.CountryId
                    LEFT JOIN States s ON s.StateId = b.StateId
                    LEFT JOIN AcademicPatterns ap ON ap.AcademicPatternId = b.AcademicPatternId
                    LEFT JOIN GradingSystems gs ON gs.GradingSystemId = b.GradingSystemId
                    WHERE b.BoardId = p_BoardId;

                    SELECT 
                        bal.BoardAcademicLevelId, bal.BoardId, bal.AcademicLevelId, bal.IsActive, bal.CreatedAt, bal.UpdatedAt,
                        al.AcademicLevelId, al.LevelCode, al.LevelName
                    FROM BoardAcademicLevels bal
                    INNER JOIN AcademicLevels al ON al.AcademicLevelId = bal.AcademicLevelId
                    WHERE bal.BoardId = p_BoardId;
                END;
            """);

            // Helper lookup procedures
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetCountries;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetCountries()
                BEGIN
                    SELECT * FROM Countries WHERE IsActive = 1 ORDER BY CountryName ASC;
                END;
            """);

            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetStatesByCountry;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetStatesByCountry(IN p_CountryId INT)
                BEGIN
                    SELECT * FROM States WHERE CountryId = p_CountryId AND IsActive = 1 ORDER BY StateName ASC;
                END;
            """);

            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAcademicPatterns;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetAcademicPatterns()
                BEGIN
                    SELECT * FROM AcademicPatterns WHERE IsActive = 1 ORDER BY PatternName ASC;
                END;
            """);

            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetAcademicLevels;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetAcademicLevels()
                BEGIN
                    SELECT * FROM AcademicLevels WHERE IsActive = 1 ORDER BY DisplayOrder ASC, LevelName ASC;
                END;
            """);

            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetGradingSystems;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GetGradingSystems()
                BEGIN
                    SELECT * FROM GradingSystems WHERE IsActive = 1 ORDER BY GradingSystemName ASC;
                END;
            """);

            // Validation procedures
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_AcademicLevelExists;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_AcademicLevelExists(IN p_AcademicLevelId INT)
                BEGIN
                    SELECT COUNT(*) FROM AcademicLevels WHERE AcademicLevelId = p_AcademicLevelId AND IsActive = 1;
                END;
            """);

            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_CountryExists;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_CountryExists(IN p_CountryId INT)
                BEGIN
                    SELECT COUNT(*) FROM Countries WHERE CountryId = p_CountryId AND IsActive = 1;
                END;
            """);

            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_StateExists;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_StateExists(IN p_StateId INT)
                BEGIN
                    SELECT COUNT(*) FROM States WHERE StateId = p_StateId AND IsActive = 1;
                END;
            """);

            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_AcademicPatternExists;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_AcademicPatternExists(IN p_AcademicPatternId INT)
                BEGIN
                    SELECT COUNT(*) FROM AcademicPatterns WHERE AcademicPatternId = p_AcademicPatternId AND IsActive = 1;
                END;
            """);

            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GradingSystemExists;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_GradingSystemExists(IN p_AcademicPatternId INT)
                BEGIN
                    SELECT COUNT(*) FROM GradingSystems WHERE GradingSystemId = p_AcademicPatternId AND IsActive = 1;
                END;
            """);

            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_StateBelongsToCountry;");
            migrationBuilder.Sql("""
                CREATE PROCEDURE sp_StateBelongsToCountry(IN p_StateId INT, IN p_CountryId INT)
                BEGIN
                    SELECT COUNT(*) FROM States WHERE StateId = p_StateId AND CountryId = p_CountryId AND IsActive = 1;
                END;
            """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetBoards;");
            migrationBuilder.Sql("DROP PROCEDURE IF EXISTS sp_GetBoardById;");
        }
    }
}
