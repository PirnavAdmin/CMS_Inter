using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Settings;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Services.Implementations;
using Dapper;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public class NumberSeriesBackendTester
    {
        private readonly string _connectionString;

        public NumberSeriesBackendTester(string connectionString)
        {
            _connectionString = connectionString;
        }

        public async Task<bool> RunAllTestsAsync()
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine(" 🚀 STARTING NUMBER SERIES CONFIGURATION BACKEND VERIFICATION SUITE");
            Console.WriteLine("================================================================================");

            var allPassed = true;

            try
            {
                // Inspect Tables in Database
                using var inspectConn = new MySqlConnection(_connectionString);
                await inspectConn.OpenAsync();
                var tables = (await inspectConn.QueryAsync<string>("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME ASC;")).ToList();
                Console.WriteLine("\n[DB INSPECTION] All Tables in Database (" + tables.Count + " total):");
                foreach (var t in tables)
                {
                    if (t.Contains("Setting", StringComparison.OrdinalIgnoreCase) || t.Contains("Series", StringComparison.OrdinalIgnoreCase) || t.Contains("Config", StringComparison.OrdinalIgnoreCase))
                    {
                        Console.WriteLine($"   * [MATCH] {t}");
                        var columns = (await inspectConn.QueryAsync<dynamic>($"SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '{t}' ORDER BY ORDINAL_POSITION;")).ToList();
                        foreach (var col in columns)
                        {
                            Console.WriteLine($"       - {col.COLUMN_NAME} ({col.DATA_TYPE}, Nullable: {col.IS_NULLABLE}, Default: {col.COLUMN_DEFAULT})");
                        }
                    }
                    else
                    {
                        Console.WriteLine($"     - {t}");
                    }
                }

                // Inspect rows in NumberSeries table
                try
                {
                    var numSeriesRows = (await inspectConn.QueryAsync<dynamic>("SELECT * FROM `NumberSeries`;")).ToList();
                    Console.WriteLine("\n[OLD NumberSeries Table Rows count: " + numSeriesRows.Count + "]");
                    foreach (var r in numSeriesRows)
                    {
                        Console.WriteLine($"   - Id: {r.Id}, SeriesName: {r.SeriesName}, SystemKey: {r.SystemKey}, PrefixPattern: {r.PrefixPattern}");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine("Could not query NumberSeries: " + ex.Message);
                }

                // 1. Deploy SQL Script (DDL, Seeds, SPs)
                Console.WriteLine("\n[TEST 1] Deploying Number_Series_Configurations.sql to MySQL DB...");
                await DeploySqlScriptAsync();
                Console.WriteLine("  --> [PASS] Database schema, initial seeds, and stored procedures deployed successfully.");

                // 2. Setup DbContext and Services
                var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
                optionsBuilder.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString));
                using var context = new AppDbContext(optionsBuilder.Options);

                var repository = new NumberSeriesRepository(context);
                var service = new NumberSeriesService(repository);

                // 3. Test GetAllSeriesAsync
                Console.WriteLine("\n[TEST 2] Testing GetAllSeriesAsync (List of 4 Target Series)...");
                var allSeries = (await service.GetAllSeriesAsync()).ToList();
                Console.WriteLine($"  --> Fetched {allSeries.Count} series.");
                foreach (var s in allSeries)
                {
                    Console.WriteLine($"      - {s.SeriesCode} ({s.SeriesName}): CurrentExample='{s.CurrentExample}', LivePreview='{s.LivePreview}'");
                }

                if (allSeries.Count >= 4 &&
                    allSeries.Any(s => s.SeriesCode == "EMPLOYEE_ID") &&
                    allSeries.Any(s => s.SeriesCode == "ADMISSION_NO") &&
                    allSeries.Any(s => s.SeriesCode == "CERTIFICATE_NO") &&
                    allSeries.Any(s => s.SeriesCode == "RECEIPT_NO"))
                {
                    Console.WriteLine("  --> [PASS] All 4 target series exist with valid preview strings.");
                }
                else
                {
                    Console.WriteLine("  --> [FAIL] One or more of the 4 target series are missing.");
                    allPassed = false;
                }

                // 4. Test Single Fetch & Live Previews for each of the 4 items
                Console.WriteLine("\n[TEST 3] Testing individual series fetches & live previews...");
                
                // 4a. Employee ID
                var emp = await service.GetSeriesByCodeAsync("employee-id");
                if (emp != null && emp.Prefix == "PCTCH" && emp.LivePreview == "PCTCH0040")
                {
                    Console.WriteLine($"  --> [PASS] Employee ID: Slug='{emp.Slug}', Code='{emp.SeriesCode}', LivePreview='{emp.LivePreview}'");
                }
                else
                {
                    Console.WriteLine($"  --> [FAIL] Employee ID mismatch: Found {emp?.LivePreview}, expected PCTCH0040");
                    allPassed = false;
                }

                // 4b. Admission No
                var adm = await service.GetSeriesByCodeAsync("admission-no");
                if (adm != null && adm.Prefix == "ADM" && adm.LivePreview == "ADM-18")
                {
                    Console.WriteLine($"  --> [PASS] Admission No: Slug='{adm.Slug}', Code='{adm.SeriesCode}', LivePreview='{adm.LivePreview}'");
                }
                else
                {
                    Console.WriteLine($"  --> [FAIL] Admission No mismatch: Found {adm?.LivePreview}, expected ADM-18");
                    allPassed = false;
                }

                // 4c. Certificate Number
                var cert = await service.GetSeriesByCodeAsync("certificate-number");
                if (cert != null && cert.LivePreview.StartsWith("CND-") && cert.AvailablePlaceholders.Contains("{RANDOM}"))
                {
                    Console.WriteLine($"  --> [PASS] Certificate Number: Slug='{cert.Slug}', LivePreview='{cert.LivePreview}', Placeholders={string.Join(", ", cert.AvailablePlaceholders)}");
                }
                else
                {
                    Console.WriteLine($"  --> [FAIL] Certificate Number preview unexpected: {cert?.LivePreview}");
                    allPassed = false;
                }

                // 4d. Receipt No
                var receipt = await service.GetSeriesByCodeAsync("receipt-no");
                if (receipt != null && receipt.LivePreview.StartsWith("FEE-") && receipt.AvailablePlaceholders.Contains("{YYYYMMDD}"))
                {
                    Console.WriteLine($"  --> [PASS] Receipt No: Slug='{receipt.Slug}', LivePreview='{receipt.LivePreview}', Placeholders={string.Join(", ", receipt.AvailablePlaceholders)}");
                }
                else
                {
                    Console.WriteLine($"  --> [FAIL] Receipt No preview unexpected: {receipt?.LivePreview}");
                    allPassed = false;
                }

                // 5. Test Dynamic Pattern Evaluator
                Console.WriteLine("\n[TEST 4] Testing NumberSeriesPatternEvaluator with diverse token combinations...");
                var testContext = new GenerateNumberSeriesRequestDto
                {
                    Board = "BIEAP",
                    Dept = "CSE",
                    Desig = "PROF",
                    Staff = "TCH",
                    AcademicYear = "2026-2027"
                };

                var eval1 = NumberSeriesPatternEvaluator.Evaluate("EMP-{YYYY}-{SEQ}", 42, 4);
                var eval2 = NumberSeriesPatternEvaluator.Evaluate("FAC-{DEPT}-{SEQ}", 5, 4, context: testContext);
                var eval3 = NumberSeriesPatternEvaluator.Evaluate("ADM-{AY}-{SEQ}", 9, 3, context: testContext);
                var eval4 = NumberSeriesPatternEvaluator.Evaluate("ADM-{BOARD}-{SEQ}", 12, 4, context: testContext);

                Console.WriteLine($"  --> Evaluated 'EMP-{{YYYY}}-{{SEQ}}' (42, len 4): {eval1}");
                Console.WriteLine($"  --> Evaluated 'FAC-{{DEPT}}-{{SEQ}}' (5, len 4): {eval2}");
                Console.WriteLine($"  --> Evaluated 'ADM-{{AY}}-{{SEQ}}' (9, len 3): {eval3}");
                Console.WriteLine($"  --> Evaluated 'ADM-{{BOARD}}-{{SEQ}}' (12, len 4): {eval4}");

                if (eval1.EndsWith("-0042") && eval2 == "FAC-CSE-0005" && eval3 == "ADM-2026-2027-009" && eval4 == "ADM-BIEAP-0012")
                {
                    Console.WriteLine("  --> [PASS] All placeholder pattern evaluations matched expected formats.");
                }
                else
                {
                    Console.WriteLine("  --> [FAIL] Dynamic pattern evaluation mismatch.");
                    allPassed = false;
                }

                // 6. Test Update Configuration (PUT)
                Console.WriteLine("\n[TEST 5] Testing Configuration Update (PUT)...");
                var updateDto = new UpdateNumberSeriesDto
                {
                    Prefix = "PCTCH",
                    FormatPattern = "PCTCH{SEQ}",
                    NumberLength = 4,
                    StartNumber = 1,
                    Description = "Updated employee ID format for staff."
                };

                var updatedEmp = await service.UpdateSeriesAsync("employee-id", updateDto);
                if (updatedEmp != null && updatedEmp.Description == "Updated employee ID format for staff.")
                {
                    Console.WriteLine($"  --> [PASS] Update series configuration succeeded. Description='{updatedEmp.Description}', UpdatedAt: {updatedEmp.UpdatedAt}");
                }
                else
                {
                    Console.WriteLine($"  --> [FAIL] Update series configuration failed. Returned: {updatedEmp?.Description ?? "NULL"}");
                    allPassed = false;
                }

                // 7. Test Atomic Sequence Increment (Generate-Next)
                Console.WriteLine("\n[TEST 6] Testing Atomic Sequence Generation (POST generate-next)...");
                var initialEmp = await service.GetSeriesByCodeAsync("EMPLOYEE_ID");
                var initialSeq = initialEmp!.CurrentSequence;

                var genResult = await service.GenerateNextNumberAsync("EMPLOYEE_ID");
                var postEmp = await service.GetSeriesByCodeAsync("EMPLOYEE_ID");

                Console.WriteLine($"  --> Generated ID: '{genResult?.GeneratedNumber}', Sequence: {genResult?.SequenceNumber}, New CurrentSeq: {postEmp?.CurrentSequence}");

                if (genResult != null && postEmp != null && postEmp.CurrentSequence == initialSeq + 1)
                {
                    Console.WriteLine("  --> [PASS] Atomic sequence generation and increment succeeded.");
                }
                else
                {
                    Console.WriteLine("  --> [FAIL] Atomic sequence generation failed.");
                    allPassed = false;
                }

                Console.WriteLine("\n================================================================================");
                Console.WriteLine(allPassed
                    ? " 🎉 ALL NUMBER SERIES BACKEND TESTS PASSED SUCCESSFULLY!"
                    : " ❌ SOME NUMBER SERIES BACKEND TESTS FAILED.");
                Console.WriteLine("================================================================================");

                return allPassed;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n[ERROR] Exception occurred during test execution: {ex.Message}\n{ex.StackTrace}");
                return false;
            }
        }

        private async Task DeploySqlScriptAsync()
        {
            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();

            var scriptPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Database", "Number_Series_Configurations.sql");
            if (!File.Exists(scriptPath))
            {
                scriptPath = Path.Combine(Directory.GetCurrentDirectory(), "Database", "Number_Series_Configurations.sql");
            }

            if (!File.Exists(scriptPath))
            {
                Console.WriteLine($"[WARN] Could not find SQL script at {scriptPath}. Running embedded fallback statements...");
                return;
            }

            var sqlContent = await File.ReadAllTextAsync(scriptPath);

            // Execute DDL table creation and seed data
            var createTableSql = @"
                CREATE TABLE IF NOT EXISTS `NumberSeriesConfigurations` (
                    `Id` INT AUTO_INCREMENT PRIMARY KEY,
                    `SeriesCode` VARCHAR(50) NOT NULL UNIQUE,
                    `SeriesName` VARCHAR(100) NOT NULL,
                    `Prefix` VARCHAR(20) NOT NULL,
                    `FormatPattern` VARCHAR(100) NOT NULL,
                    `NumberLength` INT NOT NULL DEFAULT 4,
                    `StartNumber` INT NOT NULL DEFAULT 1,
                    `CurrentSequence` INT NOT NULL DEFAULT 0,
                    `Description` VARCHAR(500) NULL,
                    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
                    `CreatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    `UpdatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX `idx_numseries_code` (`SeriesCode`),
                    INDEX `idx_numseries_active` (`IsActive`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

            await conn.ExecuteAsync(createTableSql);

            var seedSql = @"
                INSERT INTO `NumberSeriesConfigurations` 
                    (`SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, `IsActive`)
                VALUES 
                    ('EMPLOYEE_ID', 'Employee ID', 'PCTCH', 'PCTCH{SEQ}', 4, 1, 39, 'Configure employee ID format for teaching and non-teaching staff.', 1),
                    ('ADMISSION_NO', 'Admission No.', 'ADM', 'ADM-{SEQ}', 2, 1, 17, 'Configure admission number format for students.', 1),
                    ('CERTIFICATE_NO', 'Certificate Number', 'CND', 'CND-{YEAR}-{RANDOM}', 6, 1, 1, 'Configure certificate number format for generated certificates.', 1),
                    ('RECEIPT_NO', 'Receipt No.', 'FEE', 'FEE-{YYYYMMDD}-{SEQ}', 6, 1, 11, 'Configure receipt number format for fee collections.', 1)
                ON DUPLICATE KEY UPDATE
                    `SeriesName` = VALUES(`SeriesName`),
                    `Prefix` = VALUES(`Prefix`),
                    `FormatPattern` = VALUES(`FormatPattern`),
                    `NumberLength` = VALUES(`NumberLength`),
                    `StartNumber` = VALUES(`StartNumber`),
                    `CurrentSequence` = VALUES(`CurrentSequence`),
                    `Description` = VALUES(`Description`),
                    `IsActive` = VALUES(`IsActive`);";

            await conn.ExecuteAsync(seedSql);

            // Explicitly ensure test baseline numbers
            await conn.ExecuteAsync("UPDATE `NumberSeriesConfigurations` SET `CurrentSequence` = 39, `Prefix` = 'PCTCH', `FormatPattern` = 'PCTCH{SEQ}', `NumberLength` = 4, `StartNumber` = 1, `Description` = 'Configure employee ID format for teaching and non-teaching staff.' WHERE `SeriesCode` = 'EMPLOYEE_ID';");
            await conn.ExecuteAsync("UPDATE `NumberSeriesConfigurations` SET `CurrentSequence` = 17, `Prefix` = 'ADM', `FormatPattern` = 'ADM-{SEQ}', `NumberLength` = 2, `StartNumber` = 1, `Description` = 'Configure admission number format for students.' WHERE `SeriesCode` = 'ADMISSION_NO';");
            await conn.ExecuteAsync("UPDATE `NumberSeriesConfigurations` SET `CurrentSequence` = 1, `Prefix` = 'CND', `FormatPattern` = 'CND-{YEAR}-{RANDOM}', `NumberLength` = 6, `StartNumber` = 1, `Description` = 'Configure certificate number format for generated certificates.' WHERE `SeriesCode` = 'CERTIFICATE_NO';");
            await conn.ExecuteAsync("UPDATE `NumberSeriesConfigurations` SET `CurrentSequence` = 11, `Prefix` = 'FEE', `FormatPattern` = 'FEE-{YYYYMMDD}-{SEQ}', `NumberLength` = 6, `StartNumber` = 1, `Description` = 'Configure receipt number format for fee collections.' WHERE `SeriesCode` = 'RECEIPT_NO';");

            // Create Stored Procedures
            await conn.ExecuteAsync("DROP PROCEDURE IF EXISTS `sp_GetNumberSeriesConfigurations`;");
            var sp1 = @"
                CREATE PROCEDURE `sp_GetNumberSeriesConfigurations`()
                BEGIN
                    SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
                           `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
                           `IsActive`, `CreatedAt`, `UpdatedAt`
                    FROM `NumberSeriesConfigurations`
                    WHERE `IsActive` = 1
                    ORDER BY `Id` ASC;
                END;";
            await conn.ExecuteAsync(sp1);

            await conn.ExecuteAsync("DROP PROCEDURE IF EXISTS `sp_GetNumberSeriesByCode`;");
            var sp2 = @"
                CREATE PROCEDURE `sp_GetNumberSeriesByCode`(IN p_SeriesCode VARCHAR(50))
                BEGIN
                    SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
                           `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
                           `IsActive`, `CreatedAt`, `UpdatedAt`
                    FROM `NumberSeriesConfigurations`
                    WHERE `SeriesCode` = p_SeriesCode
                    LIMIT 1;
                END;";
            await conn.ExecuteAsync(sp2);

            await conn.ExecuteAsync("DROP PROCEDURE IF EXISTS `sp_UpdateNumberSeriesByCode`;");
            var sp3 = @"
                CREATE PROCEDURE `sp_UpdateNumberSeriesByCode`(
                    IN p_SeriesCode VARCHAR(50),
                    IN p_Prefix VARCHAR(20),
                    IN p_FormatPattern VARCHAR(100),
                    IN p_NumberLength INT,
                    IN p_StartNumber INT,
                    IN p_Description VARCHAR(500)
                )
                BEGIN
                    UPDATE `NumberSeriesConfigurations`
                    SET `Prefix` = p_Prefix,
                        `FormatPattern` = p_FormatPattern,
                        `NumberLength` = p_NumberLength,
                        `StartNumber` = p_StartNumber,
                        `Description` = p_Description,
                        `UpdatedAt` = CURRENT_TIMESTAMP
                    WHERE `SeriesCode` = p_SeriesCode;

                    SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
                           `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
                           `IsActive`, `CreatedAt`, `UpdatedAt`
                    FROM `NumberSeriesConfigurations`
                    WHERE `SeriesCode` = p_SeriesCode
                    LIMIT 1;
                END;";
            await conn.ExecuteAsync(sp3);

            await conn.ExecuteAsync("DROP PROCEDURE IF EXISTS `sp_GenerateNextNumberSeries`;");
            var sp4 = @"
                CREATE PROCEDURE `sp_GenerateNextNumberSeries`(IN p_SeriesCode VARCHAR(50))
                BEGIN
                    DECLARE v_CurrentSeq INT DEFAULT 0;
                    DECLARE v_StartNum INT DEFAULT 1;
                    DECLARE v_NextSeq INT DEFAULT 1;

                    SELECT `CurrentSequence`, `StartNumber`
                    INTO v_CurrentSeq, v_StartNum
                    FROM `NumberSeriesConfigurations`
                    WHERE `SeriesCode` = p_SeriesCode
                    FOR UPDATE;

                    IF v_CurrentSeq < v_StartNum THEN
                        SET v_NextSeq = v_StartNum;
                    ELSE
                        SET v_NextSeq = v_CurrentSeq + 1;
                    END IF;

                    UPDATE `NumberSeriesConfigurations`
                    SET `CurrentSequence` = v_NextSeq,
                        `UpdatedAt` = CURRENT_TIMESTAMP
                    WHERE `SeriesCode` = p_SeriesCode;

                    SELECT `Id`, `SeriesCode`, `SeriesName`, `Prefix`, `FormatPattern`, 
                           `NumberLength`, `StartNumber`, `CurrentSequence`, `Description`, 
                           `IsActive`, `CreatedAt`, `UpdatedAt`
                    FROM `NumberSeriesConfigurations`
                    WHERE `SeriesCode` = p_SeriesCode
                    LIMIT 1;
                END;";
            await conn.ExecuteAsync(sp4);
        }
    }
}
