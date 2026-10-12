using System;
using System.Data;
using System.Threading.Tasks;
using MySqlConnector;

namespace DBTest
{
    public static class DeployRoleModules
    {
        private const string ConnectionString = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;Allow User Variables=true;";

        public static async Task RunAsync()
        {
            Console.WriteLine("=========================================================");
            Console.WriteLine("  DEPLOYING ROLE MODULES & PROCEDURES (TARGETED RUNNER)   ");
            Console.WriteLine("=========================================================");

            using var conn = new MySqlConnection(ConnectionString);
            await conn.OpenAsync();
            Console.WriteLine("Connected to database.");

            // 1. Ensure Table
            string createTableSql = @"
CREATE TABLE IF NOT EXISTS `RoleModules` (
    `RoleModuleId` INT NOT NULL AUTO_INCREMENT,
    `RoleId` INT NOT NULL,
    `ModuleKey` VARCHAR(100) NOT NULL,
    `SubModule` VARCHAR(100) NOT NULL,
    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`RoleModuleId`),
    UNIQUE KEY `UQ_RoleModules_Role_SubModule` (`RoleId`, `SubModule`),
    INDEX `IX_RoleModules_RoleId` (`RoleId`),
    INDEX `IX_RoleModules_ModuleKey` (`ModuleKey`),
    CONSTRAINT `FK_RoleModules_Roles` FOREIGN KEY (`RoleId`) REFERENCES `Roles` (`RoleId`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";
            using (var cmd = new MySqlCommand(createTableSql, conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }
            using (var cmd = new MySqlCommand("ALTER TABLE `RoleModules` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci;", conn))
            {
                await cmd.ExecuteNonQueryAsync();
            }
            Console.WriteLine("1. RoleModules table verified and collation aligned to utf8mb4_uca1400_ai_ci.");

            // 2. Canonical Seeding for Super Admin (1) & Admin (2) -> all 28 modules
            string seedSuperAdminAndAdmin = @"
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`, `CreatedAt`)
SELECT 1, 
       LOWER(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(p.SubModule), '&', ''), '/', '-'), '  ', ' '), ' ', '-')), 
       p.SubModule, 
       UTC_TIMESTAMP()
FROM (SELECT DISTINCT SubModule FROM `Permissions`) p;

INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`, `CreatedAt`)
SELECT 2, 
       LOWER(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(p.SubModule), '&', ''), '/', '-'), '  ', ' '), ' ', '-')), 
       p.SubModule, 
       UTC_TIMESTAMP()
FROM (SELECT DISTINCT SubModule FROM `Permissions`) p;
";
            using (var cmd = new MySqlCommand(seedSuperAdminAndAdmin, conn))
            {
                int rows = await cmd.ExecuteNonQueryAsync();
                Console.WriteLine($"2. Super Admin & Admin seeded. Rows affected: {rows}");
            }

            // 3. Ensure Dashboard is in all applicable roles
            string seedDashboard = @"
INSERT IGNORE INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`, `CreatedAt`)
SELECT r.RoleId, 'dashboard', 'Dashboard', UTC_TIMESTAMP()
FROM `Roles` r
WHERE r.RoleId IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15);
";
            using (var cmd = new MySqlCommand(seedDashboard, conn))
            {
                int rows = await cmd.ExecuteNonQueryAsync();
                Console.WriteLine($"3. Dashboard ensured across canonical roles. Rows affected: {rows}");
            }

            // 4. Stored Procedure: sp_GetRoleModules
            Console.WriteLine("4. Deploying sp_GetRoleModules...");
            using (var cmd = new MySqlCommand("DROP PROCEDURE IF EXISTS `sp_GetRoleModules`;", conn)) await cmd.ExecuteNonQueryAsync();
            string spGetRoleModules = @"
CREATE PROCEDURE `sp_GetRoleModules`(
    IN p_RoleId INT
)
BEGIN
    SELECT 
        rm.ModuleKey AS Id,
        rm.SubModule AS Name,
        rm.SubModule,
        COALESCE(p.Module, 'General') AS Module,
        COALESCE(p.CategoryLabel, p.Module, 'General') AS Section,
        MIN(COALESCE(p.DisplayOrder, 999)) AS DisplayOrder,
        CASE rm.ModuleKey
            WHEN 'dashboard' THEN '/dashboard'
            WHEN 'group-management' THEN '/dashboard/courses'
            WHEN 'subject-management' THEN '/dashboard/subjects'
            WHEN 'section-room' THEN '/dashboard/sections'
            WHEN 'timetable' THEN '/dashboard/timetable'
            WHEN 'holiday-management' THEN '/dashboard/holidays'
            WHEN 'student-admission' THEN '/dashboard/admission'
            WHEN 'student-management' THEN '/dashboard/students'
            WHEN 'section-allocation' THEN '/dashboard/section-allocation'
            WHEN 'attendance' THEN '/dashboard/attendance/student'
            WHEN 'promotion' THEN '/dashboard/promotion'
            WHEN 'transport' THEN '/dashboard/transport'
            WHEN 'staff-management' THEN '/dashboard/staff'
            WHEN 'department-designation' THEN '/dashboard/departments'
            WHEN 'staff-attendance' THEN '/dashboard/attendance/staff'
            WHEN 'staff-leave-management' THEN '/dashboard/staff/leaves'
            WHEN 'examination' THEN '/dashboard/examinations'
            WHEN 'marks-evaluation' THEN '/dashboard/marks'
            WHEN 'results' THEN '/dashboard/results'
            WHEN 'fee-management' THEN '/dashboard/fees'
            WHEN 'payroll' THEN '/dashboard/payroll'
            WHEN 'certificates' THEN '/dashboard/certificates'
            WHEN 'reports-analytics' THEN '/dashboard/reports'
            WHEN 'hostel-management' THEN '/dashboard/hostel'
            WHEN 'library' THEN '/dashboard/library'
            WHEN 'placement' THEN '/dashboard/placement'
            WHEN 'settings' THEN '/dashboard/settings'
            WHEN 'roles-permissions' THEN '/dashboard/roles'
            ELSE CONCAT('/dashboard/', rm.ModuleKey)
        END AS Route
    FROM `RoleModules` rm
    LEFT JOIN `Permissions` p ON LOWER(p.SubModule) = LOWER(rm.SubModule)
    WHERE rm.RoleId = p_RoleId
    GROUP BY rm.ModuleKey, rm.SubModule, p.Module, p.CategoryLabel
    ORDER BY DisplayOrder ASC, rm.SubModule ASC;
END;";
            using (var cmd = new MySqlCommand(spGetRoleModules, conn)) await cmd.ExecuteNonQueryAsync();

            // 5. Stored Procedure: sp_SetRoleModules
            Console.WriteLine("5. Deploying sp_SetRoleModules...");
            using (var cmd = new MySqlCommand("DROP PROCEDURE IF EXISTS `sp_SetRoleModules`;", conn)) await cmd.ExecuteNonQueryAsync();
            string spSetRoleModules = @"
CREATE PROCEDURE `sp_SetRoleModules`(
    IN p_RoleId INT,
    IN p_ModulesJson LONGTEXT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    CREATE TEMPORARY TABLE IF NOT EXISTS tmp_set_modules (
        ModuleKey VARCHAR(100),
        SubModule VARCHAR(100)
    );
    TRUNCATE TABLE tmp_set_modules;

    INSERT INTO tmp_set_modules (ModuleKey, SubModule)
    SELECT 
        LOWER(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(jt.ModuleKey), '&', ''), '/', '-'), '  ', ' '), ' ', '-')),
        jt.SubModule
    FROM JSON_TABLE(
        p_ModulesJson,
        '$[*]' COLUMNS(
            ModuleKey VARCHAR(100) PATH '$.ModuleKey',
            SubModule VARCHAR(100) PATH '$.SubModule'
        )
    ) jt;

    DELETE FROM `RoleModules` WHERE `RoleId` = p_RoleId;

    INSERT INTO `RoleModules` (`RoleId`, `ModuleKey`, `SubModule`, `CreatedAt`)
    SELECT DISTINCT p_RoleId, t.ModuleKey, t.SubModule, UTC_TIMESTAMP()
    FROM tmp_set_modules t
    WHERE t.SubModule IS NOT NULL AND t.SubModule != '';

    DELETE rp FROM `RolePermissions` rp
    INNER JOIN `Permissions` p ON p.PermissionId = rp.PermissionId
    WHERE rp.RoleId = p_RoleId
      AND NOT EXISTS (
          SELECT 1 FROM `RoleModules` rm 
          WHERE rm.RoleId = p_RoleId AND LOWER(rm.SubModule) = LOWER(p.SubModule)
      );

    UPDATE `Roles` SET `UpdatedAt` = UTC_TIMESTAMP() WHERE `RoleId` = p_RoleId;

    DROP TEMPORARY TABLE IF EXISTS tmp_set_modules;

    COMMIT;
END;";
            using (var cmd = new MySqlCommand(spSetRoleModules, conn)) await cmd.ExecuteNonQueryAsync();

            // 6. Stored Procedure: sp_GetRolePermissionMatrix
            Console.WriteLine("6. Deploying sp_GetRolePermissionMatrix...");
            using (var cmd = new MySqlCommand("DROP PROCEDURE IF EXISTS `sp_GetRolePermissionMatrix`;", conn)) await cmd.ExecuteNonQueryAsync();
            string spGetRolePermissionMatrix = @"
CREATE PROCEDURE `sp_GetRolePermissionMatrix`(
    IN p_RoleId INT,
    IN p_UserId INT
)
BEGIN
    DECLARE v_RoleId INT DEFAULT p_RoleId;
    IF (v_RoleId IS NULL OR v_RoleId = 0) AND p_UserId IS NOT NULL THEN
        SELECT RoleId INTO v_RoleId FROM `Users` WHERE UserId = p_UserId LIMIT 1;
    END IF;

    IF EXISTS (SELECT 1 FROM `RoleModules` WHERE RoleId = v_RoleId) THEN
        SELECT 
            COALESCE(p.Module, 'General') AS Module,
            rm.SubModule,
            COALESCE(p.CategoryLabel, p.Module, 'General') AS CategoryLabel,
            MIN(COALESCE(p.DisplayOrder, 999)) AS DisplayOrder,
            MAX(CASE WHEN p.Action = 'View' THEN 
                CASE 
                    WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                    WHEN rp.PermissionId IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE 0 END) AS CanView,
            MAX(CASE WHEN p.Action = 'Add' THEN 
                CASE 
                    WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                    WHEN rp.PermissionId IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE 0 END) AS CanAdd,
            MAX(CASE WHEN p.Action = 'Edit' THEN 
                CASE 
                    WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                    WHEN rp.PermissionId IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE 0 END) AS CanEdit,
            MAX(CASE WHEN p.Action = 'Delete' THEN 
                CASE 
                    WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                    WHEN rp.PermissionId IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE 0 END) AS CanDelete,
            MAX(CASE WHEN p_UserId IS NOT NULL AND up.UserPermissionId IS NOT NULL THEN 1 ELSE 0 END) AS HasMemberOverride
        FROM `RoleModules` rm
        LEFT JOIN `Permissions` p ON LOWER(p.SubModule) = LOWER(rm.SubModule)
        LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = v_RoleId
        LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = p_UserId
        WHERE rm.RoleId = v_RoleId
        GROUP BY p.Module, rm.SubModule, p.CategoryLabel
        ORDER BY DisplayOrder ASC, rm.SubModule ASC;
    ELSE
        SELECT 
            p.Module,
            p.SubModule,
            p.CategoryLabel,
            MIN(p.DisplayOrder) AS DisplayOrder,
            MAX(CASE WHEN p.Action = 'View' THEN 
                CASE 
                    WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                    WHEN rp.PermissionId IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE 0 END) AS CanView,
            MAX(CASE WHEN p.Action = 'Add' THEN 
                CASE 
                    WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                    WHEN rp.PermissionId IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE 0 END) AS CanAdd,
            MAX(CASE WHEN p.Action = 'Edit' THEN 
                CASE 
                    WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                    WHEN rp.PermissionId IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE 0 END) AS CanEdit,
            MAX(CASE WHEN p.Action = 'Delete' THEN 
                CASE 
                    WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                    WHEN rp.PermissionId IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE 0 END) AS CanDelete,
            MAX(CASE WHEN p_UserId IS NOT NULL AND up.UserPermissionId IS NOT NULL THEN 1 ELSE 0 END) AS HasMemberOverride
        FROM `Permissions` p
        LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = v_RoleId
        LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = p_UserId
        GROUP BY p.Module, p.SubModule, p.CategoryLabel
        ORDER BY DisplayOrder ASC, p.SubModule ASC;
    END IF;
END;";
            using (var cmd = new MySqlCommand(spGetRolePermissionMatrix, conn)) await cmd.ExecuteNonQueryAsync();

            // 7. Stored Procedure: sp_UpdateRolePermissions
            Console.WriteLine("7. Deploying sp_UpdateRolePermissions...");
            using (var cmd = new MySqlCommand("DROP PROCEDURE IF EXISTS `sp_UpdateRolePermissions`;", conn)) await cmd.ExecuteNonQueryAsync();
            string spUpdateRolePermissions = @"
CREATE PROCEDURE `sp_UpdateRolePermissions`(
    IN p_RoleId INT,
    IN p_PermissionsJson LONGTEXT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    CREATE TEMPORARY TABLE IF NOT EXISTS tmp_module_updates (
        SubModule VARCHAR(100),
        CanView TINYINT(1),
        CanAdd TINYINT(1),
        CanEdit TINYINT(1),
        CanDelete TINYINT(1)
    );
    TRUNCATE TABLE tmp_module_updates;

    INSERT INTO tmp_module_updates (SubModule, CanView, CanAdd, CanEdit, CanDelete)
    SELECT 
        jt.SubModule,
        IF(jt.CanAdd = 1 OR jt.CanEdit = 1 OR jt.CanDelete = 1, 1, IF(jt.CanView = 1, 1, 0)) AS CanView,
        IF(IF(jt.CanAdd = 1 OR jt.CanEdit = 1 OR jt.CanDelete = 1, 1, IF(jt.CanView = 1, 1, 0)) = 1 AND jt.CanAdd = 1, 1, 0) AS CanAdd,
        IF(IF(jt.CanAdd = 1 OR jt.CanEdit = 1 OR jt.CanDelete = 1, 1, IF(jt.CanView = 1, 1, 0)) = 1 AND jt.CanEdit = 1, 1, 0) AS CanEdit,
        IF(IF(jt.CanAdd = 1 OR jt.CanEdit = 1 OR jt.CanDelete = 1, 1, IF(jt.CanView = 1, 1, 0)) = 1 AND jt.CanDelete = 1, 1, 0) AS CanDelete
    FROM JSON_TABLE(
        p_PermissionsJson,
        '$[*]' COLUMNS(
            SubModule VARCHAR(100) PATH '$.SubModule',
            CanView INT PATH '$.CanView',
            CanAdd INT PATH '$.CanAdd',
            CanEdit INT PATH '$.CanEdit',
            CanDelete INT PATH '$.CanDelete'
        )
    ) jt;

    DELETE rp FROM `RolePermissions` rp
    INNER JOIN `Permissions` p ON p.PermissionId = rp.PermissionId
    INNER JOIN tmp_module_updates t ON LOWER(t.SubModule) = LOWER(p.SubModule)
    WHERE rp.RoleId = p_RoleId
      AND (
          NOT EXISTS (SELECT 1 FROM `RoleModules` rm WHERE rm.RoleId = p_RoleId)
          OR EXISTS (SELECT 1 FROM `RoleModules` rm WHERE rm.RoleId = p_RoleId AND LOWER(rm.SubModule) = LOWER(p.SubModule))
      );

    INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
    SELECT p_RoleId, p.PermissionId, UTC_TIMESTAMP()
    FROM `Permissions` p
    INNER JOIN tmp_module_updates t ON LOWER(t.SubModule) = LOWER(p.SubModule)
    WHERE (
            NOT EXISTS (SELECT 1 FROM `RoleModules` rm WHERE rm.RoleId = p_RoleId)
            OR EXISTS (SELECT 1 FROM `RoleModules` rm WHERE rm.RoleId = p_RoleId AND LOWER(rm.SubModule) = LOWER(p.SubModule))
          )
      AND (
          (p.Action = 'View' AND t.CanView = 1)
       OR (p.Action = 'Add' AND t.CanAdd = 1)
       OR (p.Action = 'Edit' AND t.CanEdit = 1)
       OR (p.Action = 'Delete' AND t.CanDelete = 1)
      );

    UPDATE `Roles` SET `UpdatedAt` = UTC_TIMESTAMP() WHERE `RoleId` = p_RoleId;

    DROP TEMPORARY TABLE IF EXISTS tmp_module_updates;

    COMMIT;
END;";
            using (var cmd = new MySqlCommand(spUpdateRolePermissions, conn)) await cmd.ExecuteNonQueryAsync();

            // 8. Stored Procedure: sp_CheckUserPermission
            Console.WriteLine("8. Deploying sp_CheckUserPermission...");
            using (var cmd = new MySqlCommand("DROP PROCEDURE IF EXISTS `sp_CheckUserPermission`;", conn)) await cmd.ExecuteNonQueryAsync();
            string spCheckUserPermission = @"
CREATE PROCEDURE `sp_CheckUserPermission`(
    IN p_UserId INT,
    IN p_PermissionCode VARCHAR(100)
)
BEGIN
    SELECT 
        CASE 
            WHEN u.RoleId = 1 THEN 1
            WHEN up.IsGranted IS NOT NULL THEN up.IsGranted
            WHEN rp.PermissionId IS NOT NULL THEN 1
            ELSE 0
        END AS HasPermission
    FROM `Users` u
    INNER JOIN `Permissions` p ON p.PermissionCode = p_PermissionCode
    LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = u.RoleId
    LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = u.UserId
    WHERE u.UserId = p_UserId
    LIMIT 1;
END;";
            using (var cmd = new MySqlCommand(spCheckUserPermission, conn)) await cmd.ExecuteNonQueryAsync();

            // 9. Stored Procedure: sp_CheckUserModuleAction
            Console.WriteLine("9. Deploying sp_CheckUserModuleAction...");
            using (var cmd = new MySqlCommand("DROP PROCEDURE IF EXISTS `sp_CheckUserModuleAction`;", conn)) await cmd.ExecuteNonQueryAsync();
            string spCheckUserModuleAction = @"
CREATE PROCEDURE `sp_CheckUserModuleAction`(
    IN p_UserId INT,
    IN p_ModuleIdentifier VARCHAR(100),
    IN p_Action VARCHAR(50)
)
BEGIN
    DECLARE v_NormAction VARCHAR(50);
    SET v_NormAction = CASE LOWER(TRIM(p_Action))
        WHEN 'create' THEN 'Add'
        WHEN 'add' THEN 'Add'
        WHEN 'edit' THEN 'Edit'
        WHEN 'update' THEN 'Edit'
        WHEN 'delete' THEN 'Delete'
        ELSE 'View'
    END;

    SELECT 
        CASE 
            WHEN u.RoleId = 1 THEN 1
            WHEN up.IsGranted IS NOT NULL THEN up.IsGranted
            WHEN rp.PermissionId IS NOT NULL THEN 1
            ELSE 0
        END AS HasPermission
    FROM `Users` u
    INNER JOIN `Permissions` p ON (
        LOWER(p.SubModule) = LOWER(TRIM(p_ModuleIdentifier))
        OR LOWER(p.Module) = LOWER(TRIM(p_ModuleIdentifier))
        OR LOWER(REPLACE(REPLACE(REPLACE(REPLACE(TRIM(p.SubModule), '&', ''), '/', '-'), '  ', ' '), ' ', '-')) = LOWER(TRIM(p_ModuleIdentifier))
    ) AND LOWER(p.Action) = LOWER(v_NormAction)
    LEFT JOIN `RoleModules` rm ON rm.RoleId = u.RoleId AND LOWER(rm.SubModule) = LOWER(p.SubModule)
    LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = u.RoleId
    LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = u.UserId
    WHERE u.UserId = p_UserId
      AND (u.RoleId = 1 OR rm.RoleModuleId IS NOT NULL OR NOT EXISTS (SELECT 1 FROM `RoleModules` WHERE RoleId = u.RoleId))
    LIMIT 1;
END;";
            using (var cmd = new MySqlCommand(spCheckUserModuleAction, conn)) await cmd.ExecuteNonQueryAsync();

            Console.WriteLine("\nAll procedures deployed cleanly!");

            // 10. Verification Output
            using (var cmd = new MySqlCommand(@"
SELECT r.RoleId, r.RoleName, COUNT(rm.RoleModuleId) AS ModuleCount,
       GROUP_CONCAT(rm.SubModule ORDER BY rm.SubModule SEPARATOR ', ') AS Modules
FROM Roles r
LEFT JOIN RoleModules rm ON rm.RoleId = r.RoleId
GROUP BY r.RoleId, r.RoleName
ORDER BY r.RoleId;", conn))
            using (var reader = await cmd.ExecuteReaderAsync())
            {
                Console.WriteLine("\n--- VERIFIED ROLE MODULES IN DATABASE ---");
                while (await reader.ReadAsync())
                {
                    Console.WriteLine($"{reader[0]} | {reader[1]} | Modules:{reader[2]} | List:{reader[3]}");
                }
            }
        }
    }
}
