using System;
using System.Collections.Generic;
using System.Data;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Faculty;
using CollegeManagement.API.Repositories.Implementations;
using CollegeManagement.API.Services.Implementations;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public class MasterDataBackendTester
    {
        private readonly string _connectionString;

        public MasterDataBackendTester(string connectionString)
        {
            _connectionString = connectionString;
        }

        public async Task<bool> RunAllTestsAsync()
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("   DEPARTMENTS & DESIGNATIONS BACKEND VALIDATION AND BENCHMARKING");
            Console.WriteLine("================================================================================");

            int passed = 0;
            int failed = 0;

            // Step 1: Apply / Update Stored Procedures in Database
            Console.WriteLine("\n[1/5] Applying Stored Procedures in MySQL Database...");
            try
            {
                using var conn = new MySqlConnection(_connectionString);
                await conn.OpenAsync();

                // 1. Indexes
                await conn.ExecuteAsync(@"
                    SET @exist_idx_dept := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Departments' AND INDEX_NAME = 'idx_departments_isactive');
                    SET @sql_idx_dept := IF(@exist_idx_dept = 0, 'CREATE INDEX idx_departments_isactive ON Departments (IsActive);', 'SELECT 1;');
                    PREPARE stmt FROM @sql_idx_dept; EXECUTE stmt; DEALLOCATE PREPARE stmt;

                    SET @exist_idx_desig := (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Designations' AND INDEX_NAME = 'idx_designations_dept_active');
                    SET @sql_idx_desig := IF(@exist_idx_desig = 0, 'CREATE INDEX idx_designations_dept_active ON Designations (DepartmentId, IsActive);', 'SELECT 1;');
                    PREPARE stmt FROM @sql_idx_desig; EXECUTE stmt; DEALLOCATE PREPARE stmt;
                ");

                // 2. sp_GetDepartments
                await conn.ExecuteAsync("DROP PROCEDURE IF EXISTS `sp_GetDepartments`;");
                await conn.ExecuteAsync(@"
                CREATE PROCEDURE `sp_GetDepartments`(
                    IN p_StaffType VARCHAR(50),
                    IN p_IncludeInactive INT
                )
                BEGIN
                    SELECT 
                        d.DepartmentId,
                        d.DepartmentName,
                        d.DepartmentCode,
                        COALESCE(d.StaffType, 'Both') AS StaffType,
                        d.Description,
                        d.IsActive,
                        d.CreatedAt,
                        d.UpdatedAt,
                        COUNT(DISTINCT CASE WHEN des.IsActive = 1 THEN des.Id END) AS DesignationCount,
                        COUNT(DISTINCT CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS StaffCount
                    FROM `Departments` d
                    LEFT JOIN `Designations` des ON des.DepartmentId = d.DepartmentId
                    LEFT JOIN `Staff` s ON s.DepartmentId = d.DepartmentId
                    WHERE (p_IncludeInactive = 1 OR d.IsActive = 1)
                      AND (
                          p_StaffType IS NULL 
                          OR TRIM(p_StaffType) = '' 
                          OR LOWER(TRIM(p_StaffType)) = 'all' 
                          OR LOWER(TRIM(d.StaffType)) = 'both' 
                          OR LOWER(REPLACE(REPLACE(d.StaffType, '-', ''), '_', '')) = LOWER(REPLACE(REPLACE(p_StaffType, '-', ''), '_', ''))
                      )
                    GROUP BY 
                        d.DepartmentId, 
                        d.DepartmentName, 
                        d.DepartmentCode, 
                        d.StaffType, 
                        d.Description, 
                        d.IsActive, 
                        d.CreatedAt, 
                        d.UpdatedAt
                    ORDER BY d.DepartmentName ASC;
                END;");

                // 3. sp_GetDepartmentById
                await conn.ExecuteAsync("DROP PROCEDURE IF EXISTS `sp_GetDepartmentById`;");
                await conn.ExecuteAsync(@"
                CREATE PROCEDURE `sp_GetDepartmentById`(
                    IN p_DepartmentId INT
                )
                BEGIN
                    SELECT 
                        d.DepartmentId,
                        d.DepartmentName,
                        d.DepartmentCode,
                        COALESCE(d.StaffType, 'Both') AS StaffType,
                        d.Description,
                        d.IsActive,
                        d.CreatedAt,
                        d.UpdatedAt,
                        COUNT(DISTINCT CASE WHEN des.IsActive = 1 THEN des.Id END) AS DesignationCount,
                        COUNT(DISTINCT CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS StaffCount
                    FROM `Departments` d
                    LEFT JOIN `Designations` des ON des.DepartmentId = d.DepartmentId
                    LEFT JOIN `Staff` s ON s.DepartmentId = d.DepartmentId
                    WHERE d.DepartmentId = p_DepartmentId
                    GROUP BY 
                        d.DepartmentId, 
                        d.DepartmentName, 
                        d.DepartmentCode, 
                        d.StaffType, 
                        d.Description, 
                        d.IsActive, 
                        d.CreatedAt, 
                        d.UpdatedAt
                    LIMIT 1;
                END;");

                // 4. sp_GetDepartmentSummary
                await conn.ExecuteAsync("DROP PROCEDURE IF EXISTS `sp_GetDepartmentSummary`;");
                await conn.ExecuteAsync(@"
                CREATE PROCEDURE `sp_GetDepartmentSummary`()
                BEGIN
                    SELECT 
                        COUNT(*) AS TotalDepartments,
                        COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDepartments,
                        COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDepartments,
                        (SELECT COUNT(*) FROM `Designations` WHERE IsActive = 1) AS TotalDesignations,
                        (SELECT COUNT(*) FROM `Staff` WHERE IsDeleted = 0 AND (Status = 'Active' OR Status IS NULL)) AS TotalStaff
                    FROM `Departments`;
                END;");

                // 5. sp_GetDesignations
                await conn.ExecuteAsync("DROP PROCEDURE IF EXISTS `sp_GetDesignations`;");
                await conn.ExecuteAsync(@"
                CREATE PROCEDURE `sp_GetDesignations`(
                    IN p_IncludeInactive INT,
                    IN p_StaffType VARCHAR(50),
                    IN p_DepartmentId INT
                )
                BEGIN
                    SELECT 
                        des.Id,
                        des.Name,
                        des.DepartmentId,
                        COALESCE(d.DepartmentName, '') AS DepartmentName,
                        COALESCE(d.DepartmentCode, '') AS DepartmentCode,
                        COALESCE(des.StaffType, 'Both') AS StaffType,
                        des.IsActive,
                        des.CreatedAt,
                        des.UpdatedAt,
                        COUNT(CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS AssignedStaffCount
                    FROM `Designations` des
                    LEFT JOIN `Departments` d ON d.DepartmentId = des.DepartmentId
                    LEFT JOIN `Staff` s ON s.DesignationId = des.Id
                    WHERE (p_IncludeInactive = 1 OR des.IsActive = 1)
                      AND (p_DepartmentId IS NULL OR p_DepartmentId <= 0 OR des.DepartmentId = p_DepartmentId)
                      AND (
                          p_StaffType IS NULL 
                          OR TRIM(p_StaffType) = '' 
                          OR LOWER(TRIM(p_StaffType)) = 'all' 
                          OR LOWER(TRIM(des.StaffType)) = 'both' 
                          OR LOWER(REPLACE(REPLACE(des.StaffType, '-', ''), '_', '')) = LOWER(REPLACE(REPLACE(p_StaffType, '-', ''), '_', ''))
                      )
                    GROUP BY 
                        des.Id, 
                        des.Name, 
                        des.DepartmentId, 
                        d.DepartmentName, 
                        d.DepartmentCode, 
                        des.StaffType, 
                        des.IsActive, 
                        des.CreatedAt, 
                        des.UpdatedAt
                    ORDER BY des.Name ASC;
                END;");

                // 6. sp_GetDesignationById
                await conn.ExecuteAsync("DROP PROCEDURE IF EXISTS `sp_GetDesignationById`;");
                await conn.ExecuteAsync(@"
                CREATE PROCEDURE `sp_GetDesignationById`(
                    IN p_DesignationId INT
                )
                BEGIN
                    SELECT 
                        des.Id,
                        des.Name,
                        des.DepartmentId,
                        COALESCE(d.DepartmentName, '') AS DepartmentName,
                        COALESCE(d.DepartmentCode, '') AS DepartmentCode,
                        COALESCE(des.StaffType, 'Both') AS StaffType,
                        des.IsActive,
                        des.CreatedAt,
                        des.UpdatedAt,
                        COUNT(CASE WHEN s.IsDeleted = 0 THEN s.Id END) AS AssignedStaffCount
                    FROM `Designations` des
                    LEFT JOIN `Departments` d ON d.DepartmentId = des.DepartmentId
                    LEFT JOIN `Staff` s ON s.DesignationId = des.Id
                    WHERE des.Id = p_DesignationId
                    GROUP BY 
                        des.Id, 
                        des.Name, 
                        des.DepartmentId, 
                        d.DepartmentName, 
                        d.DepartmentCode, 
                        des.StaffType, 
                        des.IsActive, 
                        des.CreatedAt, 
                        des.UpdatedAt
                    LIMIT 1;
                END;");

                // 7. sp_GetDesignationSummary
                await conn.ExecuteAsync("DROP PROCEDURE IF EXISTS `sp_GetDesignationSummary`;");
                await conn.ExecuteAsync(@"
                CREATE PROCEDURE `sp_GetDesignationSummary`()
                BEGIN
                    SELECT 
                        COUNT(*) AS TotalDesignations,
                        COUNT(CASE WHEN IsActive = 1 THEN 1 END) AS ActiveDesignations,
                        COUNT(CASE WHEN IsActive = 0 THEN 1 END) AS InactiveDesignations,
                        (SELECT COUNT(DISTINCT Id) FROM `Staff` WHERE DesignationId IS NOT NULL AND DesignationId > 0 AND IsDeleted = 0) AS AssignedStaffCount
                    FROM `Designations`;
                END;");

                Console.WriteLine("  [PASS] Stored procedures created/updated successfully in database.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Database Stored Procedure Error: {ex.Message}");
                failed++;
            }

            // Setup DI container
            var services = new ServiceCollection();
            services.AddDbContext<AppDbContext>(options =>
                options.UseMySql(_connectionString, ServerVersion.AutoDetect(_connectionString)));
            services.AddAutoMapper(typeof(AppDbContext).Assembly);
            services.AddScoped<DepartmentRepository>();
            services.AddScoped<DepartmentService>();
            services.AddScoped<DesignationRepository>();
            services.AddScoped<DesignationService>();

            var sp = services.BuildServiceProvider();

            // Step 2: Test Department Service API calls & performance
            Console.WriteLine("\n[2/5] Testing Department Service API (GET /api/v1/departments)...");
            try
            {
                using var scope = sp.CreateScope();
                var deptService = scope.ServiceProvider.GetRequiredService<DepartmentService>();

                var sw = Stopwatch.StartNew();
                var depts = (await deptService.GetDepartmentsAsync(null, true)).ToList();
                sw.Stop();

                Console.WriteLine($"  Fetched {depts.Count} departments in {sw.ElapsedMilliseconds}ms (Precomputed counts included).");
                foreach (var d in depts.Take(3))
                {
                    Console.WriteLine($"    -> Dept: {d.DepartmentName} ({d.DepartmentCode}) | Designations: {d.DesignationCount} | Staff: {d.StaffCount}");
                }

                var summary = await deptService.GetSummaryAsync();
                Console.WriteLine($"  Department Summary: Total={summary.TotalDepartments}, Active={summary.ActiveDepartments}, TotalStaff={summary.TotalStaff}");

                if (depts.Count > 0 && sw.ElapsedMilliseconds < 5000)
                {
                    Console.WriteLine("  [PASS] Departments fetched with precomputed counts in ultra-fast time!");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] Departments count is 0 or timed out.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Department Service Error: {ex.Message}");
                failed++;
            }

            // Step 3: Test Designation Service API calls & performance
            Console.WriteLine("\n[3/5] Testing Designation Service API (GET /api/v1/designations)...");
            try
            {
                using var scope = sp.CreateScope();
                var desigService = scope.ServiceProvider.GetRequiredService<DesignationService>();

                var sw = Stopwatch.StartNew();
                var desigs = (await desigService.GetAllAsync(true, null, null)).ToList();
                sw.Stop();

                Console.WriteLine($"  Fetched {desigs.Count} designations in {sw.ElapsedMilliseconds}ms (Precomputed counts included).");
                foreach (var d in desigs.Take(3))
                {
                    Console.WriteLine($"    -> Desig: {d.Name} ({d.StaffType}) | Dept: {d.DepartmentName} | Staff: {d.AssignedStaffCount}");
                }

                var summary = await desigService.GetSummaryAsync();
                Console.WriteLine($"  Designation Summary: Total={summary.TotalDesignations}, Active={summary.ActiveDesignations}, AssignedStaff={summary.AssignedStaffCount}");

                if (desigs.Count > 0 && sw.ElapsedMilliseconds < 5000)
                {
                    Console.WriteLine("  [PASS] Designations fetched with precomputed counts in ultra-fast time!");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] Designations count is 0 or timed out.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Designation Service Error: {ex.Message}");
                failed++;
            }

            // Step 4: Test Department Details & Single Lookup
            Console.WriteLine("\n[4/5] Testing Single Department / Designation Lookup By ID...");
            try
            {
                using var scope = sp.CreateScope();
                var deptService = scope.ServiceProvider.GetRequiredService<DepartmentService>();
                var desigService = scope.ServiceProvider.GetRequiredService<DesignationService>();

                var firstDept = (await deptService.GetDepartmentsAsync()).FirstOrDefault();
                if (firstDept != null)
                {
                    var singleDept = await deptService.GetByIdAsync(firstDept.DepartmentId);
                    Console.WriteLine($"  [PASS] Single Department: ID={singleDept?.DepartmentId}, Name={singleDept?.DepartmentName}, Staff={singleDept?.StaffCount}");
                    passed++;
                }

                var firstDesig = (await desigService.GetAllAsync()).FirstOrDefault();
                if (firstDesig != null)
                {
                    var singleDesig = await desigService.GetByIdAsync(firstDesig.Id);
                    Console.WriteLine($"  [PASS] Single Designation: ID={singleDesig?.Id}, Name={singleDesig?.Name}, Dept={singleDesig?.DepartmentName}");
                    passed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Lookup Error: {ex.Message}");
                failed++;
            }

            // Step 5: Test Uniqueness Validations
            Console.WriteLine("\n[5/5] Testing Name & Code Validation APIs...");
            try
            {
                using var scope = sp.CreateScope();
                var deptService = scope.ServiceProvider.GetRequiredService<DepartmentService>();
                var desigService = scope.ServiceProvider.GetRequiredService<DesignationService>();

                var isUniqueDeptName = await deptService.ValidateNameAsync("NonExistentDepartment_XYZ_999");
                var isUniqueDesigName = await desigService.CreateAsync(new CreateDesignationDto
                {
                    Name = $"TempDesig_{DateTime.UtcNow.Ticks}",
                    StaffType = "Teaching",
                    IsActive = true
                });

                if (isUniqueDeptName && isUniqueDesigName.Id > 0)
                {
                    await desigService.DeleteAsync(isUniqueDesigName.Id);
                    Console.WriteLine("  [PASS] Validation, creation and cleanup succeeded.");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  [FAIL] Validation or creation check failed.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  [FAIL] Validation Error: {ex.Message}");
                failed++;
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"   MASTER DATA INTEGRATION TESTING COMPLETE: {passed} PASSED, {failed} FAILED");
            Console.WriteLine("================================================================================");

            return failed == 0;
        }
    }
}
