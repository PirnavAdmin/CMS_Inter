using System;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using MySqlConnector;
using Dapper;

namespace CollegeManagement.API.Tests
{
    public static class ParentModuleDbDeployer
    {
        public static async Task<bool> DeployProceduresAsync(string connectionString)
        {
            Console.WriteLine("[ParentModuleDbDeployer] Connecting to MySQL...");
            using var connection = new MySqlConnection(connectionString);
            await connection.OpenAsync();

            Console.WriteLine("[ParentModuleDbDeployer] Connected successfully.");

            // 1. sp_CheckParentStudentMapping
            string spCheckMapping = @"
DROP PROCEDURE IF EXISTS `sp_CheckParentStudentMapping`;
CREATE PROCEDURE `sp_CheckParentStudentMapping`
(
    IN p_ParentUserId INT,
    IN p_StudentId INT
)
BEGIN
    SELECT COUNT(1) 
    FROM `ParentStudentMappings` 
    WHERE `ParentUserId` = p_ParentUserId AND `StudentId` = p_StudentId;
END;";

            // 2. sp_GetParentStudentMapping
            string spGetMapping = @"
DROP PROCEDURE IF EXISTS `sp_GetParentStudentMapping`;
CREATE PROCEDURE `sp_GetParentStudentMapping`
(
    IN p_ParentUserId INT,
    IN p_StudentId INT
)
BEGIN
    SELECT Id, ParentUserId, StudentId, RelationshipType, IsPrimaryContact, CreatedAt
    FROM `ParentStudentMappings`
    WHERE `ParentUserId` = p_ParentUserId AND `StudentId` = p_StudentId
    LIMIT 1;
END;";

            // 3. sp_AddOrUpdateParentStudentMapping
            string spAddMapping = @"
DROP PROCEDURE IF EXISTS `sp_AddOrUpdateParentStudentMapping`;
CREATE PROCEDURE `sp_AddOrUpdateParentStudentMapping`
(
    IN p_ParentUserId INT,
    IN p_StudentId INT,
    IN p_RelationshipType VARCHAR(50),
    IN p_IsPrimaryContact TINYINT(1)
)
BEGIN
    INSERT INTO `ParentStudentMappings` 
        (ParentUserId, StudentId, RelationshipType, IsPrimaryContact, CreatedAt)
    VALUES 
        (p_ParentUserId, p_StudentId, COALESCE(NULLIF(TRIM(p_RelationshipType), ''), 'Parent'), COALESCE(p_IsPrimaryContact, 1), CURRENT_TIMESTAMP(6))
    ON DUPLICATE KEY UPDATE 
        RelationshipType = VALUES(RelationshipType), 
        IsPrimaryContact = VALUES(IsPrimaryContact);
END;";

            // 4. sp_GetStudentsByParentUserId
            string spGetStudentsByParent = @"
DROP PROCEDURE IF EXISTS `sp_GetStudentsByParentUserId`;
CREATE PROCEDURE `sp_GetStudentsByParentUserId`
(
    IN p_ParentUserId INT
)
BEGIN
    SELECT psm.Id, psm.ParentUserId, psm.StudentId, psm.RelationshipType, psm.IsPrimaryContact, psm.CreatedAt,
           s.StudentId, s.StudentName, s.AdmissionNo, s.RollNo, s.Photo, s.Gender, s.Status, s.IsActive,
           s.CampusId, s.BoardId, s.AcademicYearId, s.AcademicLevelId, s.GroupId, s.ProgramId, s.SectionId
    FROM `ParentStudentMappings` psm
    INNER JOIN `Students` s ON s.StudentId = psm.StudentId
    WHERE psm.ParentUserId = p_ParentUserId
    ORDER BY psm.CreatedAt ASC;
END;";

            // 5. sp_GetParentUserIdsForStudents
            string spGetParentUserIds = @"
DROP PROCEDURE IF EXISTS `sp_GetParentUserIdsForStudents`;
CREATE PROCEDURE `sp_GetParentUserIdsForStudents`
(
    IN p_StudentIds TEXT
)
BEGIN
    SELECT DISTINCT psm.ParentUserId
    FROM `ParentStudentMappings` psm
    INNER JOIN `Users` u ON u.UserId = psm.ParentUserId AND u.IsActive = 1
    WHERE FIND_IN_SET(psm.StudentId, p_StudentIds) > 0;
END;";

            // 6. sp_GetParentChildren (Enhanced with campus, group, section)
            string spGetChildren = @"
DROP PROCEDURE IF EXISTS `sp_GetParentChildren`;
CREATE PROCEDURE `sp_GetParentChildren`
(
    IN p_ParentUserId INT
)
BEGIN
    SELECT 
        s.StudentId,
        s.StudentName,
        s.RollNo,
        s.AdmissionNo,
        al.LevelName AS ClassName,
        sec.SectionName,
        s.Photo AS PhotoUrl,
        s.Status,
        s.CampusId,
        s.GroupId,
        s.SectionId,
        s.AcademicYearId,
        s.DateOfBirth,
        s.Gender,
        s.FatherName,
        s.MotherName,
        s.ParentGuardianEmail
    FROM `ParentStudentMappings` psm
    INNER JOIN `Students` s ON s.StudentId = psm.StudentId
    LEFT JOIN `AcademicLevels` al ON al.AcademicLevelId = s.AcademicLevelId
    LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
    WHERE psm.ParentUserId = p_ParentUserId;
END;";

            var procedures = new (string sql, string name)[]
            {
                (spCheckMapping, "sp_CheckParentStudentMapping"),
                (spGetMapping, "sp_GetParentStudentMapping"),
                (spAddMapping, "sp_AddOrUpdateParentStudentMapping"),
                (spGetStudentsByParent, "sp_GetStudentsByParentUserId"),
                (spGetParentUserIds, "sp_GetParentUserIdsForStudents"),
                (spGetChildren, "sp_GetParentChildren")
            };

            foreach (var (sql, name) in procedures)
            {
                try
                {
                    await connection.ExecuteAsync(sql);
                    Console.WriteLine($"  [DEPLOYED] {name}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  [FAILED] {name}: {ex.Message}");
                    return false;
                }
            }

            return true;
        }
    }
}
