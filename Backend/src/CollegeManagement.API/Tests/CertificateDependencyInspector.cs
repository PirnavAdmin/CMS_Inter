using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Dapper;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public class CertificateDependencyInspector
    {
        private readonly string _connectionString;

        public CertificateDependencyInspector(string connectionString)
        {
            _connectionString = connectionString;
        }

        public async Task RunInspectionAsync()
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("   CERTIFICATES MODULE DEPENDENCY & FOREIGN KEY DEEP INSPECTION");
            Console.WriteLine("================================================================================");

            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();

            // 1. Check Foreign Keys on certificates table
            Console.WriteLine("\n[1/5] Checking Foreign Key constraints on `certificates` table:");
            var fks = await conn.QueryAsync(@"
                SELECT 
                    CONSTRAINT_NAME, 
                    TABLE_NAME, 
                    COLUMN_NAME, 
                    REFERENCED_TABLE_NAME, 
                    REFERENCED_COLUMN_NAME
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME IN ('certificates', 'Certificates')
                  AND REFERENCED_TABLE_NAME IS NOT NULL;");

            foreach (var fk in fks)
            {
                Console.WriteLine($"  FK: {fk.CONSTRAINT_NAME} | Column: {fk.COLUMN_NAME} -> {fk.REFERENCED_TABLE_NAME}({fk.REFERENCED_COLUMN_NAME})");
            }

            // 2. Check Dependent Tables (Students, Groups, AcademicYears, Sections, Staff)
            Console.WriteLine("\n[2/5] Checking Dependent Master Tables row counts & samples:");
            string[] depTables = new[] { "Students", "Groups", "AcademicYears", "Sections", "Staff" };
            foreach (var tbl in depTables)
            {
                try
                {
                    var count = await conn.ExecuteScalarAsync<int>($"SELECT COUNT(*) FROM `{tbl}`;");
                    Console.WriteLine($"  Table: {tbl,-15} | Records: {count}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  Table: {tbl,-15} | ERROR: {ex.Message}");
                }
            }

            // 3. Test Join query between Certificates, Students, Groups, AcademicYears, Sections
            Console.WriteLine("\n[3/5] Testing 5-way JOIN for Certificate Data Resolution:");
            var joinedData = await conn.QueryAsync(@"
                SELECT 
                    c.Id AS CertificateId,
                    c.CertificateNo AS CertificateNumber,
                    c.CertificateType,
                    c.Status,
                    c.StudentId,
                    s.AdmissionNo AS Student_AdmissionNo,
                    s.StudentName AS Student_StudentName,
                    g.GroupName AS Group_GroupName,
                    ay.AcademicYearName AS AcademicYear_Name,
                    s.AcademicLevel AS Student_Level,
                    sec.SectionName AS Section_Name
                FROM `certificates` c
                LEFT JOIN `Students` s ON s.StudentId = c.StudentId
                LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
                LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
                LEFT JOIN `Sections` sec ON sec.SectionId = s.SectionId
                LIMIT 5;");

            foreach (var row in joinedData)
            {
                Console.WriteLine($"  Cert: {row.CertificateNumber} ({row.CertificateType}) | Student: {row.Student_StudentName} ({row.Student_AdmissionNo}) | Group: {row.Group_GroupName} | Year: {row.AcademicYear_Name} | Section: {row.Section_Name} | Status: {row.Status}");
            }

            // 4. Check orphaned certificates (certificates with invalid StudentId)
            Console.WriteLine("\n[4/5] Checking for any orphaned certificates:");
            var orphanedCount = await conn.ExecuteScalarAsync<int>(@"
                SELECT COUNT(*) 
                FROM `certificates` c
                LEFT JOIN `Students` s ON s.StudentId = c.StudentId
                WHERE s.StudentId IS NULL;");
            Console.WriteLine($"  Orphaned certificates without valid Student match: {orphanedCount}");

            // 5. Check if all active students can be resolved by AdmissionNo
            Console.WriteLine("\n[5/5] Checking Student Dropdown resolution:");
            var students = await conn.QueryAsync(@"
                SELECT 
                    s.StudentId, s.AdmissionNo, s.StudentName, g.GroupName, ay.AcademicYearName, s.AcademicLevel
                FROM `Students` s
                LEFT JOIN `Groups` g ON g.GroupId = s.GroupId
                LEFT JOIN `AcademicYears` ay ON ay.AcademicYearId = s.AcademicYearId
                WHERE (s.IsActive = 1 OR s.IsActive IS NULL) AND s.AdmissionNo IS NOT NULL AND s.AdmissionNo <> ''
                LIMIT 5;");

            foreach (var st in students)
            {
                Console.WriteLine($"  Student: [{st.AdmissionNo}] {st.StudentName} -> Group: {st.GroupName}, Year: {st.AcademicYearName}, Level: {st.AcademicLevel}");
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine("   DEPENDENCY INSPECTION COMPLETE");
            Console.WriteLine("================================================================================");
        }
    }
}
