using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using MySqlConnector;

namespace CollegeManagement.API.Tests
{
    public class CertificateDbInspector
    {
        private readonly string _connectionString;

        public CertificateDbInspector(string connectionString)
        {
            _connectionString = connectionString;
        }

        public async Task InspectAsync()
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("   CERTIFICATES MODULE DATABASE DEEP INSPECTION");
            Console.WriteLine("================================================================================");

            using var conn = new MySqlConnection(_connectionString);
            await conn.OpenAsync();
            var dbName = await conn.ExecuteScalarAsync<string>("SELECT DATABASE();");
            Console.WriteLine($"Connected to Database: {dbName}\n");

            // 1. Check Tables
            Console.WriteLine("--- TABLE CHECK ---");
            var tables = await conn.QueryAsync<string>(@"
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = DATABASE() AND table_name IN ('Certificates', 'certificates', 'Students', 'students', 'StudentAdmissions', 'studentadmissions', 'Groups', 'groups', 'AcademicYears', 'academicyears', 'AuditLogs', 'auditlogs');");
            foreach (var t in tables)
            {
                var count = await conn.ExecuteScalarAsync<int>($"SELECT COUNT(*) FROM `{t}`;");
                Console.WriteLine($"Table: {t,-20} | Row Count: {count}");
            }

            // 2. Check Certificates Columns
            Console.WriteLine("\n--- CERTIFICATES TABLE COLUMNS ---");
            var certCols = await conn.QueryAsync(@"
                SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name IN ('Certificates', 'certificates')
                ORDER BY ordinal_position;");
            foreach (var c in certCols)
            {
                Console.WriteLine($"  {c.column_name,-22} | {c.data_type,-12} | Nullable: {c.is_nullable,-4} | Default: {c.column_default}");
            }

            // 3. Check Existing Certificates
            Console.WriteLine("\n--- EXISTING CERTIFICATES ---");
            var existingCerts = await conn.QueryAsync(@"
                SELECT *
                FROM `certificates`
                ORDER BY 1 DESC
                LIMIT 10;");
            foreach (IDictionary<string, object> row in existingCerts)
            {
                Console.WriteLine(string.Join(" | ", row.Select(kv => $"{kv.Key}: {kv.Value}")));
            }

            // 4. Check Stored Procedures
            Console.WriteLine("\n--- CERTIFICATE STORED PROCEDURES IN DATABASE ---");
            var procs = (await conn.QueryAsync<string>(@"
                SELECT routine_name FROM information_schema.routines 
                WHERE routine_schema = DATABASE() AND (routine_name LIKE '%Certificate%' OR routine_name LIKE '%Scholarship%');")).ToList();
            foreach (var p in procs)
            {
                Console.WriteLine($"  Procedure: {p}");
            }

            // 5. Inspect Stored Procedure Definitions
            Console.WriteLine("\n--- STORED PROCEDURE DEFINITIONS ---");
            foreach (var p in procs)
            {
                try
                {
                    var spRow = await conn.QueryFirstOrDefaultAsync<dynamic>($"SHOW CREATE PROCEDURE `{p}`;");
                    if (spRow != null)
                    {
                        var dict = (IDictionary<string, object>)spRow;
                        var createSql = dict.ContainsKey("Create Procedure") ? dict["Create Procedure"] : dict.Values.LastOrDefault();
                        Console.WriteLine($"\n=== SP: {p} ===");
                        Console.WriteLine(createSql);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Could not get definition for {p}: {ex.Message}");
                }
            }

            Console.WriteLine("\n================================================================================");
        }
    }
}
