using System;
using MySqlConnector;

class Program
{
    static void Main()
    {
        var builder = new MySqlConnectionStringBuilder
        {
            Server = "collegemanagementdb-mysql-3069cc62-manikesandeep-1393.g.aivencloud.com",
            Port = 19182,
            Database = "CollegeManagement",
            UserID = "avnadmin",
            Password = "AVNS_jgPZED4pphZib4tvJID",
            SslMode = MySqlSslMode.Required,
            AllowUserVariables = true,
            ConnectionTimeout = 30
        };

        using var conn = new MySqlConnection(builder.ConnectionString);
        conn.Open();

        // 1. Add CollegeId to Boards if not exists
        Console.WriteLine("Adding CollegeId to Boards table...");
        try
        {
            using var cmd = new MySqlCommand(@"
                SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS 
                                    WHERE TABLE_SCHEMA = 'CollegeManagement' AND TABLE_NAME = 'Boards' AND COLUMN_NAME = 'CollegeId');
                SET @sql := IF(@col_exists = 0, 'ALTER TABLE `Boards` ADD COLUMN `CollegeId` INT NULL DEFAULT 1 AFTER `BoardId`, ADD INDEX `idx_boards_collegeid` (`CollegeId`);', 'SELECT 1;');
                PREPARE stmt FROM @sql;
                EXECUTE stmt;
                DEALLOCATE PREPARE stmt;", conn);
            cmd.ExecuteNonQuery();
            Console.WriteLine("CollegeId column added/verified on Boards.");
        }
        catch (Exception ex) { Console.WriteLine("Add CollegeId to Boards: " + ex.Message); }

        // 2. Update sp_ValidateBoardCode with CollegeId scoping
        Console.WriteLine("\nUpdating sp_ValidateBoardCode with CollegeId parameter...");
        try
        {
            using var cmd = new MySqlCommand(@"
DROP PROCEDURE IF EXISTS `sp_ValidateBoardCode`;
CREATE PROCEDURE `sp_ValidateBoardCode`(
    IN p_BoardCode VARCHAR(30),
    IN p_ExcludeBoardId INT,
    IN p_CollegeId INT
)
BEGIN
    SELECT COUNT(1) AS CodeExists
    FROM `Boards`
    WHERE LOWER(TRIM(BoardCode)) = LOWER(TRIM(p_BoardCode))
      AND (
          p_CollegeId IS NULL 
          OR CollegeId = p_CollegeId
      )
      AND (p_ExcludeBoardId IS NULL OR p_ExcludeBoardId <= 0 OR BoardId <> p_ExcludeBoardId);
END;", conn);
            cmd.ExecuteNonQuery();
            Console.WriteLine("sp_ValidateBoardCode updated.");
        }
        catch (Exception ex) { Console.WriteLine("sp_ValidateBoardCode: " + ex.Message); }
    }
}
