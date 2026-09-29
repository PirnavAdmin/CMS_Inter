using System;
using System.Threading.Tasks;
using MySqlConnector;

namespace DBTest
{
    public static class DeploySectionProcs
    {
        private const string ConnectionString = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;Allow User Variables=true;ConnectionTimeout=60;KeepAlive=5;ConvertZeroDateTime=True;Pooling=true;MinimumPoolSize=2;MaximumPoolSize=100;ConnectionLifeTime=300;ConnectionIdleTimeout=120;";

        public static async Task RunAsync()
        {
            Console.WriteLine("Deploying updated sp_CreateSection and sp_UpdateSection to live database...");
            using var conn = new MySqlConnection(ConnectionString);
            await conn.OpenAsync();

            string dropCreate = "DROP PROCEDURE IF EXISTS `sp_CreateSection`;";
            using (var cmd = new MySqlCommand(dropCreate, conn)) await cmd.ExecuteNonQueryAsync();

            string createSp = @"
CREATE PROCEDURE `sp_CreateSection`(
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_GroupProgramId INT,
    IN p_ProgramId INT,
    IN p_SectionName VARCHAR(50),
    IN p_RoomId INT,
    IN p_InchargeId INT,
    IN p_MaximumStrength INT,
    IN p_IsActive TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    DECLARE v_GroupId INT;
    DECLARE v_ProgramId INT;
    DECLARE v_GroupProgramId INT;

    SET v_GroupId = p_GroupId;
    SET v_ProgramId = p_ProgramId;
    SET v_GroupProgramId = p_GroupProgramId;

    -- If GroupProgramId is provided, resolve GroupId and ProgramId
    IF v_GroupProgramId IS NOT NULL AND v_GroupProgramId > 0 THEN
        SELECT GroupId, ProgramId INTO v_GroupId, v_ProgramId
        FROM `GroupPrograms`
        WHERE GroupProgramId = v_GroupProgramId LIMIT 1;
    END IF;

    -- If GroupProgramId is not provided, resolve from GroupId & ProgramId
    IF (v_GroupProgramId IS NULL OR v_GroupProgramId = 0) AND v_GroupId IS NOT NULL AND v_ProgramId IS NOT NULL THEN
        SELECT GroupProgramId INTO v_GroupProgramId
        FROM `GroupPrograms`
        WHERE GroupId = v_GroupId AND ProgramId = v_ProgramId LIMIT 1;
    END IF;

    INSERT INTO `Sections` (
        CampusId,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        GroupProgramId,
        ProgramId,
        SectionName,
        RoomId,
        InchargeId,
        MaximumStrength,
        IsActive,
        CreatedAt
    ) VALUES (
        IFNULL(p_CampusId, 1),
        p_BoardId,
        p_AcademicYearId,
        p_AcademicLevelId,
        v_GroupId,
        v_GroupProgramId,
        v_ProgramId,
        TRIM(p_SectionName),
        p_RoomId,
        p_InchargeId,
        IFNULL(p_MaximumStrength, 40),
        IFNULL(p_IsActive, 1),
        UTC_TIMESTAMP()
    );

    SELECT LAST_INSERT_ID() AS SectionId;
END;";

            using (var cmd = new MySqlCommand(createSp, conn)) await cmd.ExecuteNonQueryAsync();
            Console.WriteLine("sp_CreateSection deployed successfully.");

            string dropUpdate = "DROP PROCEDURE IF EXISTS `sp_UpdateSection`;";
            using (var cmd = new MySqlCommand(dropUpdate, conn)) await cmd.ExecuteNonQueryAsync();

            string updateSp = @"
CREATE PROCEDURE `sp_UpdateSection`(
    IN p_SectionId INT,
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_GroupProgramId INT,
    IN p_ProgramId INT,
    IN p_SectionName VARCHAR(50),
    IN p_RoomId INT,
    IN p_InchargeId INT,
    IN p_MaximumStrength INT,
    IN p_IsActive TINYINT(1),
    IN p_CampusId INT
)
BEGIN
    DECLARE v_GroupId INT;
    DECLARE v_ProgramId INT;
    DECLARE v_GroupProgramId INT;

    SET v_GroupId = p_GroupId;
    SET v_ProgramId = p_ProgramId;
    SET v_GroupProgramId = p_GroupProgramId;

    -- If GroupProgramId is provided, resolve GroupId and ProgramId
    IF v_GroupProgramId IS NOT NULL AND v_GroupProgramId > 0 THEN
        SELECT GroupId, ProgramId INTO v_GroupId, v_ProgramId
        FROM `GroupPrograms`
        WHERE GroupProgramId = v_GroupProgramId LIMIT 1;
    END IF;

    -- If GroupProgramId is not provided, resolve from GroupId & ProgramId
    IF (v_GroupProgramId IS NULL OR v_GroupProgramId = 0) AND v_GroupId IS NOT NULL AND v_ProgramId IS NOT NULL THEN
        SELECT GroupProgramId INTO v_GroupProgramId
        FROM `GroupPrograms`
        WHERE GroupId = v_GroupId AND ProgramId = v_ProgramId LIMIT 1;
    END IF;

    UPDATE `Sections` SET
        CampusId = IFNULL(p_CampusId, CampusId),
        BoardId = p_BoardId,
        AcademicYearId = p_AcademicYearId,
        AcademicLevelId = p_AcademicLevelId,
        GroupId = v_GroupId,
        GroupProgramId = v_GroupProgramId,
        ProgramId = v_ProgramId,
        SectionName = TRIM(p_SectionName),
        RoomId = p_RoomId,
        InchargeId = p_InchargeId,
        MaximumStrength = IFNULL(p_MaximumStrength, 40),
        IsActive = IFNULL(p_IsActive, 1),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE SectionId = p_SectionId;

    SELECT ROW_COUNT() AS AffectedRows;
END;";

            using (var cmd = new MySqlCommand(updateSp, conn)) await cmd.ExecuteNonQueryAsync();
            Console.WriteLine("sp_UpdateSection deployed successfully.");

            await DeployExamProcsAsync(conn);
        }

        private static async Task DeployExamProcsAsync(MySqlConnection conn)
        {
            Console.WriteLine("Deploying corrected sp_CreateExamination and sp_UpdateExamination to live database...");

            string dropCreate = "DROP PROCEDURE IF EXISTS `sp_CreateExamination`;";
            using (var cmd = new MySqlCommand(dropCreate, conn)) await cmd.ExecuteNonQueryAsync();

            string createSp = @"
CREATE PROCEDURE `sp_CreateExamination`(
    IN p_ExamCode VARCHAR(50),
    IN p_ExamName VARCHAR(150),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_AssessmentTypeId INT,
    IN p_StartDate DATETIME,
    IN p_EndDate DATETIME,
    IN p_Description VARCHAR(500),
    IN p_ExamPattern VARCHAR(50),
    IN p_TotalMarks INT,
    IN p_PassPercentage DECIMAL(5,2),
    IN p_Status VARCHAR(50),
    IN p_CampusId INT
)
BEGIN
    INSERT INTO `Examinations` (
        CampusId,
        ExamCode,
        ExamName,
        BoardId,
        AcademicYearId,
        AcademicLevelId,
        GroupId,
        ProgramId,
        AssessmentTypeId,
        StartDate,
        EndDate,
        Description,
        ExamPattern,
        TotalMarks,
        PassPercentage,
        Status,
        IsActive,
        CreatedAt,
        UpdatedAt
    ) VALUES (
        IFNULL(p_CampusId, 1),
        p_ExamCode,
        p_ExamName,
        p_BoardId,
        p_AcademicYearId,
        p_AcademicLevelId,
        p_GroupId,
        p_ProgramId,
        p_AssessmentTypeId,
        p_StartDate,
        p_EndDate,
        p_Description,
        COALESCE(p_ExamPattern, 'REGULAR_ACADEMIC'),
        p_TotalMarks,
        p_PassPercentage,
        COALESCE(p_Status, 'DRAFT'),
        1,
        UTC_TIMESTAMP(),
        NULL
    );

    SELECT LAST_INSERT_ID() AS ExamId;
END;";

            using (var cmd = new MySqlCommand(createSp, conn)) await cmd.ExecuteNonQueryAsync();
            Console.WriteLine("sp_CreateExamination deployed successfully.");

            string dropUpdate = "DROP PROCEDURE IF EXISTS `sp_UpdateExamination`;";
            using (var cmd = new MySqlCommand(dropUpdate, conn)) await cmd.ExecuteNonQueryAsync();

            string updateSp = @"
CREATE PROCEDURE `sp_UpdateExamination`(
    IN p_ExamId INT,
    IN p_ExamName VARCHAR(150),
    IN p_BoardId INT,
    IN p_AcademicYearId INT,
    IN p_AcademicLevelId INT,
    IN p_GroupId INT,
    IN p_ProgramId INT,
    IN p_AssessmentTypeId INT,
    IN p_StartDate DATETIME,
    IN p_EndDate DATETIME,
    IN p_Description VARCHAR(500),
    IN p_ExamPattern VARCHAR(50),
    IN p_TotalMarks INT,
    IN p_PassPercentage DECIMAL(5,2),
    IN p_Status VARCHAR(50),
    IN p_CampusId INT
)
BEGIN
    UPDATE `Examinations` SET 
        CampusId = COALESCE(p_CampusId, CampusId),
        ExamName = COALESCE(p_ExamName, ExamName),
        BoardId = COALESCE(p_BoardId, BoardId),
        AcademicYearId = COALESCE(p_AcademicYearId, AcademicYearId),
        AcademicLevelId = COALESCE(p_AcademicLevelId, AcademicLevelId),
        GroupId = COALESCE(p_GroupId, GroupId),
        ProgramId = p_ProgramId,
        AssessmentTypeId = COALESCE(p_AssessmentTypeId, AssessmentTypeId),
        StartDate = COALESCE(p_StartDate, StartDate),
        EndDate = COALESCE(p_EndDate, EndDate),
        Description = p_Description,
        ExamPattern = COALESCE(p_ExamPattern, ExamPattern),
        TotalMarks = p_TotalMarks,
        PassPercentage = p_PassPercentage,
        Status = COALESCE(p_Status, Status),
        UpdatedAt = UTC_TIMESTAMP()
    WHERE ExamId = p_ExamId;
END;";

            using (var cmd = new MySqlCommand(updateSp, conn)) await cmd.ExecuteNonQueryAsync();
            Console.WriteLine("sp_UpdateExamination deployed successfully.");

            await DeployGroupSectionProcsAsync(conn);
        }

        private static async Task DeployGroupSectionProcsAsync(MySqlConnection conn)
        {
            Console.WriteLine("Deploying corrected sp_GetSectionsByGroupId and sp_GetSectionsByGroupProgramId to live database...");

            string dropGroup = "DROP PROCEDURE IF EXISTS `sp_GetSectionsByGroupId`;";
            using (var cmd = new MySqlCommand(dropGroup, conn)) await cmd.ExecuteNonQueryAsync();

            string spGroup = @"
CREATE PROCEDURE `sp_GetSectionsByGroupId`(
    IN p_GroupId INT,
    IN p_CampusId INT
)
BEGIN
    CALL sp_GetAllSections(NULL, NULL, NULL, p_GroupId, NULL, NULL, NULL, 1, p_CampusId);
END;";
            using (var cmd = new MySqlCommand(spGroup, conn)) await cmd.ExecuteNonQueryAsync();
            Console.WriteLine("sp_GetSectionsByGroupId deployed successfully.");

            string dropProg = "DROP PROCEDURE IF EXISTS `sp_GetSectionsByGroupProgramId`;";
            using (var cmd = new MySqlCommand(dropProg, conn)) await cmd.ExecuteNonQueryAsync();

            string spProg = @"
CREATE PROCEDURE `sp_GetSectionsByGroupProgramId`(
    IN p_GroupProgramId INT,
    IN p_CampusId INT
)
BEGIN
    CALL sp_GetAllSections(NULL, NULL, NULL, NULL, p_GroupProgramId, NULL, NULL, 1, p_CampusId);
END;";
            using (var cmd = new MySqlCommand(spProg, conn)) await cmd.ExecuteNonQueryAsync();
            Console.WriteLine("sp_GetSectionsByGroupProgramId deployed successfully.");

            string fixView = "CREATE OR REPLACE VIEW `Faculties` AS SELECT Id, EmployeeId, FirstName, LastName FROM `Staff`;";
            using (var cmd = new MySqlCommand(fixView, conn)) await cmd.ExecuteNonQueryAsync();
            Console.WriteLine("Faculties view deployed successfully.");
        }
    }
}
