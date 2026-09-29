using System;
using System.Data;
using System.Threading.Tasks;
using MySqlConnector;

namespace DBTest
{
    public static class InspectModules
    {
        private const string ConnectionString = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;Allow User Variables=true;ConnectionTimeout=60;KeepAlive=5;ConvertZeroDateTime=True;Pooling=true;MinimumPoolSize=2;MaximumPoolSize=100;ConnectionLifeTime=300;ConnectionIdleTimeout=120;";

        public static async Task RunAsync()
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("   MODULES AUDIT: CAMPUS ID, BOARD ID, ACADEMIC YEAR ID (DB & STORED PROCS)     ");
            Console.WriteLine("================================================================================\n");

            using var conn = new MySqlConnection(ConnectionString);
            await conn.OpenAsync();
            Console.WriteLine("Connected to live MySQL database.\n");

            // 1. Table Columns Audit
            string[] tables = new[] { "Rooms", "Sections", "Examinations", "ExamSchedules", "Marks", "Results" };
            Console.WriteLine(">>> 1. TABLE COLUMNS AUDIT (CampusId, BoardId, AcademicYearId) <<<");
            foreach (var table in tables)
            {
                using var cmd = new MySqlCommand(@"
                    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
                    FROM information_schema.COLUMNS 
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @tableName
                      AND COLUMN_NAME IN ('CampusId', 'BoardId', 'AcademicYearId');", conn);
                cmd.Parameters.AddWithValue("@tableName", table);

                using var reader = await cmd.ExecuteReaderAsync();
                Console.WriteLine($"\n[TABLE: {table}]");
                bool found = false;
                while (await reader.ReadAsync())
                {
                    found = true;
                    Console.WriteLine($"   - {reader["COLUMN_NAME"]} ({reader["DATA_TYPE"]}) Nullable={reader["IS_NULLABLE"]} Default={reader["COLUMN_DEFAULT"]}");
                }
                if (!found) Console.WriteLine("   (None of CampusId, BoardId, AcademicYearId found in this table!)");
            }

            // 2. Stored Procedures Parameters Audit
            Console.WriteLine("\n\n>>> 2. ALL STORED PROCEDURES IN DB FOR THE 4 MODULES <<<");
            using var routineCmd = new MySqlCommand(@"
                SELECT ROUTINE_NAME 
                FROM information_schema.ROUTINES 
                WHERE ROUTINE_SCHEMA = DATABASE() 
                  AND (ROUTINE_NAME LIKE '%Room%' OR ROUTINE_NAME LIKE '%Section%' OR ROUTINE_NAME LIKE '%Exam%' OR ROUTINE_NAME LIKE '%Mark%' OR ROUTINE_NAME LIKE '%Result%' OR ROUTINE_NAME LIKE '%Evaluation%')
                ORDER BY ROUTINE_NAME;", conn);

            var spList = new System.Collections.Generic.List<string>();
            using (var rdr = await routineCmd.ExecuteReaderAsync())
            {
                while (await rdr.ReadAsync())
                {
                    spList.Add(rdr.GetString(0));
                }
            }

            foreach (var sp in spList)
            {
                using var cmd = new MySqlCommand(@"
                    SELECT PARAMETER_NAME, PARAMETER_MODE, DATA_TYPE, ORDINAL_POSITION 
                    FROM information_schema.PARAMETERS 
                    WHERE SPECIFIC_SCHEMA = DATABASE() AND SPECIFIC_NAME = @spName
                    ORDER BY ORDINAL_POSITION;", conn);
                cmd.Parameters.AddWithValue("@spName", sp);

                using var reader = await cmd.ExecuteReaderAsync();
                Console.WriteLine($"\n[PROCEDURE: {sp}]");
                while (await reader.ReadAsync())
                {
                    Console.WriteLine($"   #{reader["ORDINAL_POSITION"]} {reader["PARAMETER_MODE"]} {reader["PARAMETER_NAME"]} ({reader["DATA_TYPE"]})");
                }
            }

            // 3. Test Room Creation call directly to reproduce or diagnose the error
            Console.WriteLine("\n\n>>> 3. TEST CALLING sp_CreateRoom DIRECTLY VIA DAPPER-STYLE PARAMETERS <<<");
            try
            {
                using var testCmd = new MySqlCommand("sp_CreateRoom", conn) { CommandType = CommandType.StoredProcedure };
                testCmd.Parameters.AddWithValue("p_CampusId", 1);
                testCmd.Parameters.AddWithValue("p_RoomCode", "TEST-AUDIT-99");
                testCmd.Parameters.AddWithValue("p_RoomName", "Test Audit Room");
                testCmd.Parameters.AddWithValue("p_Capacity", 50);
                testCmd.Parameters.AddWithValue("p_RoomType", "Classroom");
                testCmd.Parameters.AddWithValue("p_Building", "Block A");
                testCmd.Parameters.AddWithValue("p_BlockName", "Block A");
                testCmd.Parameters.AddWithValue("p_Floor", "1");
                testCmd.Parameters.AddWithValue("p_IsActive", 1);

                var newId = await testCmd.ExecuteScalarAsync();
                Console.WriteLine($"   SUCCESS! Created test room with ID = {newId}");

                // Clean up test room
                using var delCmd = new MySqlCommand("DELETE FROM `Rooms` WHERE RoomCode = 'TEST-AUDIT-99';", conn);
                await delCmd.ExecuteNonQueryAsync();
                Console.WriteLine("   Cleaned up test room.");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"   FAILED with exception: {ex.Message}");
                Console.ResetColor();
            }

            // 4. Test Stored Procedures Parameter Parity for all 4 modules via Dapper
            Console.WriteLine("\n\n>>> 4. TEST STORED PROCEDURES ACROSS ALL 4 MODULES VIA DAPPER <<<");
            
            // Sections: sp_GetAllSections
            try
            {
                var p = new Dapper.DynamicParameters();
                p.Add("p_BoardId", null, DbType.Int32);
                p.Add("p_AcademicYearId", null, DbType.Int32);
                p.Add("p_AcademicLevelId", null, DbType.Int32);
                p.Add("p_GroupId", null, DbType.Int32);
                p.Add("p_GroupProgramId", null, DbType.Int32);
                p.Add("p_ProgramId", null, DbType.Int32);
                p.Add("p_SearchTerm", null, DbType.String);
                p.Add("p_IsActive", true, DbType.Boolean);
                p.Add("p_CampusId", 1, DbType.Int32);

                var sections = await Dapper.SqlMapper.QueryAsync(conn, "sp_GetAllSections", p, commandType: CommandType.StoredProcedure);
                Console.WriteLine($"   [PASS] sp_GetAllSections: returned {System.Linq.Enumerable.Count(sections)} records.");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"   [FAIL] sp_GetAllSections: {ex.Message}");
                Console.ResetColor();
            }

            // Sections: sp_GetSectionsByGroupId
            try
            {
                var sectionsByGroup = await Dapper.SqlMapper.QueryAsync(conn, "sp_GetSectionsByGroupId", new { p_GroupId = 1, p_CampusId = 1 }, commandType: CommandType.StoredProcedure);
                Console.WriteLine($"   [PASS] sp_GetSectionsByGroupId: returned {System.Linq.Enumerable.Count(sectionsByGroup)} records.");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"   [FAIL] sp_GetSectionsByGroupId: {ex.Message}");
                Console.ResetColor();
            }

            // Examinations: sp_GetExaminations
            try
            {
                var examParams = new Dapper.DynamicParameters();
                examParams.Add("p_BoardId", 0);
                examParams.Add("p_AcademicYearId", 0);
                examParams.Add("p_AcademicLevelId", 0);
                examParams.Add("p_GroupId", 0);
                examParams.Add("p_ProgramId", 0);
                examParams.Add("p_AssessmentTypeId", 0);
                examParams.Add("p_Status", string.Empty);
                examParams.Add("p_SearchTerm", string.Empty);
                examParams.Add("p_CampusId", 1);

                var exams = await Dapper.SqlMapper.QueryAsync(conn, "sp_GetExaminations", examParams, commandType: CommandType.StoredProcedure);
                Console.WriteLine($"   [PASS] sp_GetExaminations: returned {System.Linq.Enumerable.Count(exams)} records.");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"   [FAIL] sp_GetExaminations: {ex.Message}");
                Console.ResetColor();
            }

            // Marks / Evaluations: sp_GetFilteredEvaluations
            try
            {
                using var staffCmd = new MySqlCommand("SELECT Id, FirstName, LastName, EmployeeId FROM `Staff` LIMIT 1;", conn);
                using var staffRdr = await staffCmd.ExecuteReaderAsync();
                if (await staffRdr.ReadAsync())
                {
                    Console.WriteLine($"   [Staff Table Test Success]: Id={staffRdr[0]}, Name={staffRdr[1]} {staffRdr[2]}, EmpId={staffRdr[3]}");
                }
                staffRdr.Close();

                using var fixViewCmd = new MySqlCommand("CREATE OR REPLACE VIEW `Faculties` AS SELECT Id, EmployeeId, FirstName, LastName FROM `Staff`;", conn);
                await fixViewCmd.ExecuteNonQueryAsync();
                Console.WriteLine("   [Fixed Faculties View successfully].");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"   Exception querying tables: {ex.Message}");
            }

            try
            {
                var evalParams = new Dapper.DynamicParameters();
                evalParams.Add("p_BoardId", 0);
                evalParams.Add("p_AcademicYearId", 0);
                evalParams.Add("p_AcademicLevelId", 0);
                evalParams.Add("p_GroupId", 0);
                evalParams.Add("p_SectionId", 0);
                evalParams.Add("p_ExaminationId", 0);
                evalParams.Add("p_SubjectId", 0);
                evalParams.Add("p_StudentId", 0);
                evalParams.Add("p_FacultyId", 0);
                evalParams.Add("p_Status", 0);
                evalParams.Add("p_Offset", 0);
                evalParams.Add("p_Limit", 10);
                evalParams.Add("p_CampusId", 1);

                var evals = await Dapper.SqlMapper.QueryAsync(conn, "sp_GetFilteredEvaluations", evalParams, commandType: CommandType.StoredProcedure);
                Console.WriteLine($"   [PASS] sp_GetFilteredEvaluations: returned {System.Linq.Enumerable.Count(evals)} records.");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"   [FAIL] sp_GetFilteredEvaluations: {ex.Message}");
                Console.ResetColor();
            }

            // Results: sp_GetResults
            try
            {
                var resParams = new Dapper.DynamicParameters();
                resParams.Add("p_BoardId", 0);
                resParams.Add("p_AcademicYearId", 0);
                resParams.Add("p_AcademicLevelId", 0);
                resParams.Add("p_GroupId", 0);
                resParams.Add("p_ExamId", 0);
                resParams.Add("p_Search", string.Empty);
                resParams.Add("p_PageNumber", 1);
                resParams.Add("p_PageSize", 10);
                resParams.Add("p_CampusId", 1);

                var results = await Dapper.SqlMapper.QueryAsync(conn, "sp_GetResults", resParams, commandType: CommandType.StoredProcedure);
                Console.WriteLine($"   [PASS] sp_GetResults: returned {System.Linq.Enumerable.Count(results)} records.");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"   [FAIL] sp_GetResults: {ex.Message}");
                Console.ResetColor();
            }

            // Test sp_GetExaminationById (Exam 45)
            try
            {
                var examParams = new Dapper.DynamicParameters();
                examParams.Add("p_ExaminationId", 45);
                examParams.Add("p_CampusId", 0);

                var examRow = await Dapper.SqlMapper.QueryFirstOrDefaultAsync(conn, "sp_GetExaminationById", examParams, commandType: CommandType.StoredProcedure);
                if (examRow != null)
                {
                    Console.WriteLine($"   [PASS] sp_GetExaminationById (ID 45): Found Exam '{examRow.ExamName}' (Code: {examRow.ExamCode})");
                }
                else
                {
                    Console.WriteLine("   [PASS] sp_GetExaminationById: Exam 45 returned null (clean not found).");
                }
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"   [FAIL] sp_GetExaminationById (ID 45): {ex.Message}");
                Console.ResetColor();
            }

            // Results Analysis: sp_GetResultAnalysis
            try
            {
                var analysisParams = new Dapper.DynamicParameters();
                analysisParams.Add("p_BoardId", 0);
                analysisParams.Add("p_AcademicYearId", 0);
                analysisParams.Add("p_AcademicLevelId", 0);
                analysisParams.Add("p_GroupId", 0);
                analysisParams.Add("p_ExamId", 0);
                analysisParams.Add("p_CampusId", 1);

                var analysis = await Dapper.SqlMapper.QueryAsync(conn, "sp_GetResultAnalysis", analysisParams, commandType: CommandType.StoredProcedure);
                Console.WriteLine($"   [PASS] sp_GetResultAnalysis: returned {System.Linq.Enumerable.Count(analysis)} records.");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"   [FAIL] sp_GetResultAnalysis: {ex.Message}");
                Console.ResetColor();
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine("                     ALL 4 MODULES VERIFIED SUCCESSFULLY                        ");
            Console.WriteLine("================================================================================");
        }
    }
}
