using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public class DuplicateDataInspector
    {
        private readonly string _connectionString;

        public DuplicateDataInspector(string connectionString)
        {
            _connectionString = connectionString;
        }

        public async Task InspectAsync()
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("   DATABASE DUPLICATE AUDIT: DEPARTMENTS, DESIGNATIONS, STAFF");
            Console.WriteLine("================================================================================");

            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();

            // 1. Audit Departments
            Console.WriteLine("\n[1] AUDITING DEPARTMENTS TABLE...");
            var totalDepts = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Departments`;");
            Console.WriteLine($"  Total Departments Rows: {totalDepts}");

            var duplicateDeptNames = (await conn.QueryAsync<dynamic>(@"
                SELECT LOWER(TRIM(DepartmentName)) AS CleanName, COUNT(*) AS Cnt, GROUP_CONCAT(DepartmentId) AS Ids, GROUP_CONCAT(DepartmentCode) AS Codes
                FROM `Departments`
                GROUP BY LOWER(TRIM(DepartmentName))
                HAVING COUNT(*) > 1
                ORDER BY Cnt DESC;")).ToList();

            if (duplicateDeptNames.Any())
            {
                Console.WriteLine($"  [!] Found {duplicateDeptNames.Count} duplicate DepartmentName groups:");
                foreach (var d in duplicateDeptNames)
                {
                    Console.WriteLine($"      - '{d.CleanName}': Count={d.Cnt}, IDs=[{d.Ids}], Codes=[{d.Codes}]");
                }
            }
            else
            {
                Console.WriteLine("  [OK] No duplicate Department Names found.");
            }

            var duplicateDeptCodes = (await conn.QueryAsync<dynamic>(@"
                SELECT LOWER(TRIM(DepartmentCode)) AS CleanCode, COUNT(*) AS Cnt, GROUP_CONCAT(DepartmentId) AS Ids, GROUP_CONCAT(DepartmentName) AS Names
                FROM `Departments`
                WHERE DepartmentCode IS NOT NULL AND TRIM(DepartmentCode) != ''
                GROUP BY LOWER(TRIM(DepartmentCode))
                HAVING COUNT(*) > 1
                ORDER BY Cnt DESC;")).ToList();

            if (duplicateDeptCodes.Any())
            {
                Console.WriteLine($"  [!] Found {duplicateDeptCodes.Count} duplicate DepartmentCode groups:");
                foreach (var d in duplicateDeptCodes)
                {
                    Console.WriteLine($"      - Code '{d.CleanCode}': Count={d.Cnt}, IDs=[{d.Ids}], Names=[{d.Names}]");
                }
            }

            // 2. Audit Designations
            Console.WriteLine("\n[2] AUDITING DESIGNATIONS TABLE...");
            var totalDesigs = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Designations`;");
            Console.WriteLine($"  Total Designations Rows: {totalDesigs}");

            var duplicateDesigNames = (await conn.QueryAsync<dynamic>(@"
                SELECT LOWER(TRIM(Name)) AS CleanName, COUNT(*) AS Cnt, GROUP_CONCAT(Id) AS Ids, GROUP_CONCAT(COALESCE(StaffType, 'NULL')) AS StaffTypes
                FROM `Designations`
                GROUP BY LOWER(TRIM(Name))
                HAVING COUNT(*) > 1
                ORDER BY Cnt DESC;")).ToList();

            if (duplicateDesigNames.Any())
            {
                Console.WriteLine($"  [!] Found {duplicateDesigNames.Count} duplicate Designation Name groups:");
                foreach (var d in duplicateDesigNames)
                {
                    Console.WriteLine($"      - '{d.CleanName}': Count={d.Cnt}, IDs=[{d.Ids}], StaffTypes=[{d.StaffTypes}]");
                }
            }
            else
            {
                Console.WriteLine("  [OK] No duplicate Designation Names found.");
            }

            // 3. Audit Staff
            Console.WriteLine("\n[3] AUDITING STAFF TABLE...");
            var totalStaff = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Staff` WHERE IsDeleted = 0 OR IsDeleted IS NULL;");
            var totalDeletedStaff = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM `Staff` WHERE IsDeleted = 1;");
            Console.WriteLine($"  Total Active Staff: {totalStaff}, Soft Deleted: {totalDeletedStaff}");

            var duplicateEmpIds = (await conn.QueryAsync<dynamic>(@"
                SELECT LOWER(TRIM(EmployeeId)) AS CleanEmpId, COUNT(*) AS Cnt, GROUP_CONCAT(Id) AS Ids, GROUP_CONCAT(CONCAT(FirstName, ' ', COALESCE(LastName, ''))) AS Names
                FROM `Staff`
                WHERE (IsDeleted = 0 OR IsDeleted IS NULL) AND EmployeeId IS NOT NULL AND TRIM(EmployeeId) != ''
                GROUP BY LOWER(TRIM(EmployeeId))
                HAVING COUNT(*) > 1
                ORDER BY Cnt DESC;")).ToList();

            if (duplicateEmpIds.Any())
            {
                Console.WriteLine($"  [!] Found {duplicateEmpIds.Count} duplicate EmployeeId groups:");
                foreach (var s in duplicateEmpIds)
                {
                    Console.WriteLine($"      - EmpId '{s.CleanEmpId}': Count={s.Cnt}, IDs=[{s.Ids}], Names=[{s.Names}]");
                }
            }
            else
            {
                Console.WriteLine("  [OK] No duplicate Employee IDs found in active staff.");
            }

            var duplicateEmails = (await conn.QueryAsync<dynamic>(@"
                SELECT LOWER(TRIM(Email)) AS CleanEmail, COUNT(*) AS Cnt, GROUP_CONCAT(Id) AS Ids, GROUP_CONCAT(EmployeeId) AS EmpIds
                FROM `Staff`
                WHERE (IsDeleted = 0 OR IsDeleted IS NULL) AND Email IS NOT NULL AND TRIM(Email) != ''
                GROUP BY LOWER(TRIM(Email))
                HAVING COUNT(*) > 1
                ORDER BY Cnt DESC;")).ToList();

            if (duplicateEmails.Any())
            {
                Console.WriteLine($"  [!] Found {duplicateEmails.Count} duplicate Email groups in active staff:");
                foreach (var s in duplicateEmails)
                {
                    Console.WriteLine($"      - Email '{s.CleanEmail}': Count={s.Cnt}, IDs=[{s.Ids}], EmpIds=[{s.EmpIds}]");
                }
            }

            var duplicatePhones = (await conn.QueryAsync<dynamic>(@"
                SELECT TRIM(Mobile) AS CleanPhone, COUNT(*) AS Cnt, GROUP_CONCAT(Id) AS Ids, GROUP_CONCAT(EmployeeId) AS EmpIds
                FROM `Staff`
                WHERE (IsDeleted = 0 OR IsDeleted IS NULL) AND Mobile IS NOT NULL AND TRIM(Mobile) != ''
                GROUP BY TRIM(Mobile)
                HAVING COUNT(*) > 1
                ORDER BY Cnt DESC;")).ToList();

            if (duplicatePhones.Any())
            {
                Console.WriteLine($"  [!] Found {duplicatePhones.Count} duplicate Phone groups in active staff:");
                foreach (var s in duplicatePhones)
                {
                    Console.WriteLine($"      - Phone '{s.CleanPhone}': Count={s.Cnt}, IDs=[{s.Ids}], EmpIds=[{s.EmpIds}]");
                }
            }

            var duplicateNames = (await conn.QueryAsync<dynamic>(@"
                SELECT LOWER(TRIM(CONCAT(FirstName, ' ', COALESCE(LastName, '')))) AS CleanName, COUNT(*) AS Cnt, GROUP_CONCAT(Id) AS Ids, GROUP_CONCAT(EmployeeId) AS EmpIds, GROUP_CONCAT(COALESCE(StaffType, 'NULL')) AS Types
                FROM `Staff`
                WHERE (IsDeleted = 0 OR IsDeleted IS NULL)
                GROUP BY LOWER(TRIM(CONCAT(FirstName, ' ', COALESCE(LastName, ''))))
                HAVING COUNT(*) > 1
                ORDER BY Cnt DESC;")).ToList();

            if (duplicateNames.Any())
            {
                Console.WriteLine($"  [!] Found {duplicateNames.Count} duplicate Name groups in active staff:");
                foreach (var s in duplicateNames)
                {
                    Console.WriteLine($"      - Name '{s.CleanName}': Count={s.Cnt}, IDs=[{s.Ids}], EmpIds=[{s.EmpIds}], Types=[{s.Types}]");
                }
            }

            // Print all staff list for visual reference
            Console.WriteLine("\n[4] ALL ACTIVE STAFF IN DATABASE:");
            var allStaffList = (await conn.QueryAsync<dynamic>(@"
                SELECT s.Id, s.EmployeeId, s.FirstName, s.LastName, s.StaffType, s.Status, s.DepartmentId, s.DesignationId, s.BoardId, s.Mobile, s.Email
                FROM `Staff` s
                WHERE s.IsDeleted = 0 OR s.IsDeleted IS NULL
                ORDER BY s.Id ASC;")).ToList();

            foreach (var s in allStaffList)
            {
                Console.WriteLine($"  ID={s.Id} | EmpId={s.EmployeeId} | Name={s.FirstName} {s.LastName} | Type={s.StaffType} | Status={s.Status} | DeptId={s.DepartmentId} | DesigId={s.DesignationId} | BoardId={s.BoardId} | Phone={s.Mobile} | Email={s.Email}");
            }

            Console.WriteLine("\n[5] ALL SOFT-DELETED STAFF IN DATABASE:");
            var deletedStaffList = (await conn.QueryAsync<dynamic>(@"
                SELECT s.Id, s.EmployeeId, s.FirstName, s.LastName, s.StaffType, s.Status, s.DepartmentId, s.DesignationId, s.BoardId, s.Mobile, s.Email
                FROM `Staff` s
                WHERE s.IsDeleted = 1
                ORDER BY s.Id ASC;")).ToList();

            foreach (var s in deletedStaffList)
            {
                Console.WriteLine($"  DELETED ID={s.Id} | EmpId={s.EmployeeId} | Name={s.FirstName} {s.LastName} | Type={s.StaffType} | Status={s.Status} | DeptId={s.DepartmentId} | DesigId={s.DesignationId} | BoardId={s.BoardId} | Phone={s.Mobile} | Email={s.Email}");
            }

            Console.WriteLine("\n[6] ALL USERS IN DATABASE:");
            var allUsers = (await conn.QueryAsync<dynamic>(@"
                SELECT UserId, FullName, Email, RoleId, IsActive, StudentId, StaffId, AdminId
                FROM `Users`
                ORDER BY UserId ASC;")).ToList();

            foreach (var u in allUsers)
            {
                Console.WriteLine($"  UserId={u.UserId} | Name={u.FullName} | Email={u.Email} | RoleId={u.RoleId} | IsActive={u.IsActive} | StudentId={u.StudentId} | StaffId={u.StaffId} | AdminId={u.AdminId}");
            }

            // Cleanup any stray test data with Id >= 1000 or UserId > 17
            var deletedTestUsers = await conn.ExecuteAsync("DELETE FROM `Users` WHERE UserId > 17;");
            var deletedTestStaff = await conn.ExecuteAsync("DELETE FROM `Staff` WHERE Id >= 1000;");
            if (deletedTestUsers > 0 || deletedTestStaff > 0)
            {
                Console.WriteLine($"\n[CLEANUP] Purged {deletedTestUsers} stray test Users and {deletedTestStaff} stray test Staff.");
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine("   DUPLICATE INSPECTION COMPLETED");
            Console.WriteLine("================================================================================");
        }
    }
}
