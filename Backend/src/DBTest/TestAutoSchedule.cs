using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Dapper;
using MySqlConnector;

namespace DBTest
{
    public static class TestAutoSchedule
    {
        private const string ConnectionString = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;ConnectionTimeout=60;KeepAlive=5;ConvertZeroDateTime=True;Pooling=true;MinimumPoolSize=2;MaximumPoolSize=100;ConnectionLifeTime=300;ConnectionIdleTimeout=120;";

        public static async Task RunAsync()
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("          LIVE DATABASE INSPECTION: EXAM & SCHEDULE STATUS                     ");
            Console.WriteLine("================================================================================\n");

            using var conn = new MySqlConnection(ConnectionString);
            await conn.OpenAsync();

            // 1. Inspect recent exams
            Console.WriteLine(">>> 1. RECENT EXAMINATIONS IN DB:");
            var examDescs = await conn.QueryAsync(@"
                SELECT ExamId, ExamName, ExamCode, CampusId, GroupId, ProgramId, AcademicLevelId, TotalMarks, PassPercentage, ExamPattern, Status, Description
                FROM Examinations
                WHERE ExamId IN (128, 141, 148) OR ExamId >= 135
                ORDER BY ExamId DESC;
            ");
            foreach (var ex in examDescs)
            {
                Console.WriteLine($"   ExamId={ex.ExamId}, Name='{ex.ExamName}', Code='{ex.ExamCode}', CampusId={ex.CampusId}, GroupId={ex.GroupId}, ProgramId={ex.ProgramId}, LevelId={ex.AcademicLevelId}, TotalMarks={ex.TotalMarks}, PassPct={ex.PassPercentage}, Status='{ex.Status}', Pattern='{ex.ExamPattern}'");
            }

            // 1b. Programs & GroupPrograms
            Console.WriteLine("\n>>> 1b. GROUP PROGRAMS FOR GROUP 37:");
            var gps = await conn.QueryAsync(@"
                SELECT gp.GroupId, gp.ProgramId, p.ProgramName, gp.IsActive
                FROM GroupPrograms gp
                JOIN Programs p ON gp.ProgramId = p.ProgramId
                WHERE gp.GroupId = 37;
            ");
            foreach (var gp in gps)
            {
                Console.WriteLine($"   GroupId={gp.GroupId}, ProgramId={gp.ProgramId}, ProgramName='{gp.ProgramName}', Active={gp.IsActive}");
            }

            Console.WriteLine("\n>>> 1c. ROOMS CAPACITIES:");
            var rms = await conn.QueryAsync(@"
                SELECT RoomId, RoomNumber, RoomName, Capacity, CampusId
                FROM Rooms
                WHERE RoomId IN (2, 4, 5, 6, 26, 65) OR Capacity >= 50
                ORDER BY Capacity DESC;
            ");
            foreach (var r in rms)
            {
                Console.WriteLine($"   RoomId={r.RoomId}, Number='{r.RoomNumber}', Name='{r.RoomName}', Capacity={r.Capacity}, CampusId={r.CampusId}");
            }

            // 1c. Fix ProgramId, TotalMarks, PassPercentage for Exams 128 & 141
            Console.WriteLine("\n>>> 1c. UPDATING PROGRAMID, TOTALMARKS, PASSPERCENTAGE FOR EXAMS 128 & 141:");
            var rowsUpdated = await conn.ExecuteAsync(@"
                UPDATE Examinations
                SET ProgramId = NULL, TotalMarks = 100, PassPercentage = 35.00
                WHERE ExamId IN (128, 141);
            ");
            Console.WriteLine($"   Updated {rowsUpdated} examinations to ProgramId = NULL (All Programs), TotalMarks = 100, PassPercentage = 35.");

            var schedRowsUpdated = await conn.ExecuteAsync(@"
                UPDATE ExamSchedules
                SET MaxMarks = 100.00, PassingMarks = 35.00
                WHERE ExamId IN (128, 141) AND IsActive = 1;
            ");
            Console.WriteLine($"   Updated {schedRowsUpdated} schedules to MaxMarks = 100, PassingMarks = 35.");

            // 3. Students in Group 37
            Console.WriteLine("\n>>> 3. STUDENTS COUNT BREAKDOWN:");
            var studentCounts = await conn.QueryAsync(@"
                SELECT StudentId, StudentName, RollNo, AdmissionNo, CampusId, GroupId, ProgramId, AcademicLevelId, IsActive, Status
                FROM Students
                WHERE GroupId = 37;
            ");
            foreach (var sc in studentCounts)
            {
                Console.WriteLine($"   StudentId={sc.StudentId}, Name='{sc.StudentName}', Roll={sc.RollNo}, Adm={sc.AdmissionNo}, Campus={sc.CampusId}, Group={sc.GroupId}, Program={sc.ProgramId}, Level={sc.AcademicLevelId}, Active={sc.IsActive}, Status={sc.Status}");
            }

            Console.WriteLine("\n>>> 3b. STUDENT ADMISSIONS COUNT FOR GROUP 37:");
            var admCounts = await conn.QueryAsync(@"
                SELECT *
                FROM StudentAdmissions
                WHERE GroupId = 37;
            ");
            Console.WriteLine($"   Total admissions for Group 37: {admCounts.Count()}");
            Console.WriteLine("\n>>> 2. CHECK SUBJECTS FOR GROUP 37:");
            var subs = await conn.QueryAsync(@"
                SELECT SubjectId, SubjectCode, SubjectName, GroupId, AcademicLevelId, BoardId, IsActive, Language, Practical
                FROM Subjects
                WHERE GroupId = 37
                ORDER BY SubjectId;
            ");
            Console.WriteLine($"   Total subjects for Group 37: {subs.Count()}");
            foreach (var sb in subs)
            {
                Console.WriteLine($"   SubjectId={sb.SubjectId}, Code='{sb.SubjectCode}', Name='{sb.SubjectName}', Level={sb.AcademicLevelId}, Board={sb.BoardId}, Active={sb.IsActive}, Lang={sb.Language}");
            }

            // 4. Schedules for Exam 128
            Console.WriteLine("\n>>> 4. CURRENT SCHEDULES FOR EXAM 128:");
            var scheds = await conn.QueryAsync(@"
                SELECT s.ScheduleId, s.SubjectId, sub.SubjectName, s.ExamDate, s.StartTime, s.EndTime, s.MaxMarks, s.PassingMarks, s.Hall, s.Invigilator, s.InvigilatorId
                FROM ExamSchedules s
                LEFT JOIN Subjects sub ON s.SubjectId = sub.SubjectId
                WHERE s.ExamId = 128;
            ");
            foreach (var sch in scheds)
            {
                Console.WriteLine($"   SchedId={sch.ScheduleId}, Subject='{sch.SubjectName}' (ID {sch.SubjectId}), MaxMarks={sch.MaxMarks}, PassMarks={sch.PassingMarks}, Hall='{sch.Hall}', Inv='{sch.Invigilator}' (ID {sch.InvigilatorId})");
            }

            // 5. Invigilator Assignments for Exam 128
            Console.WriteLine("\n>>> 5. INVIGILATOR ASSIGNMENTS FOR EXAM 128:");
            var invs = await conn.QueryAsync(@"
                SELECT ia.InvigilatorAssignmentId, ia.ExamScheduleId, ia.InvigilatorId, ia.HallNumber,
                       st.FirstName, st.LastName
                FROM InvigilatorAssignments ia
                JOIN ExamSchedules s ON ia.ExamScheduleId = s.ScheduleId
                LEFT JOIN Staffs st ON ia.InvigilatorId = st.Id
                WHERE s.ExamId = 128;
            ");
            foreach (var inv in invs)
            {
                Console.WriteLine($"   AssignId={inv.InvigilatorAssignmentId}, SchedId={inv.ExamScheduleId}, InvId={inv.InvigilatorId} ('{inv.FirstName} {inv.LastName}'), Hall='{inv.HallNumber}'");
            }

            Console.WriteLine("\n>>> 5b. CURRENT SCHEDULES FOR EXAM 148:");
            var scheds148 = await conn.QueryAsync(@"
                SELECT s.ScheduleId, s.SubjectId, sub.SubjectName, s.ExamDate, s.StartTime, s.EndTime, s.MaxMarks, s.PassingMarks, s.Hall, s.Invigilator, s.InvigilatorId, s.CreatedAt, s.RoomId, s.IsActive
                FROM ExamSchedules s
                LEFT JOIN Subjects sub ON s.SubjectId = sub.SubjectId
                WHERE s.ExamId = 148
                ORDER BY s.ScheduleId;
            ");
            foreach (var sch in scheds148)
            {
                Console.WriteLine($"   SchedId={sch.ScheduleId}, Subject='{sch.SubjectName}' (ID {sch.SubjectId}), Date={sch.ExamDate:yyyy-MM-dd}, Hall='{sch.Hall}' (RoomId {sch.RoomId}), Inv='{sch.Invigilator}' (ID {sch.InvigilatorId}), CreatedAt={sch.CreatedAt:yyyy-MM-dd HH:mm:ss.fff}");
            }

            var invs148 = await conn.QueryAsync(@"
                SELECT ia.InvigilatorAssignmentId, ia.ExamScheduleId, ia.InvigilatorId, ia.HallNumber,
                       st.FirstName, st.LastName
                FROM InvigilatorAssignments ia
                JOIN ExamSchedules s ON ia.ExamScheduleId = s.ScheduleId
                LEFT JOIN Staffs st ON ia.InvigilatorId = st.Id
                WHERE s.ExamId = 148;
            ");
            Console.WriteLine($"\n>>> 5c. INVIGILATOR ASSIGNMENTS FOR EXAM 148 (Total: {invs148.Count()}):");
            foreach (var inv in invs148)
            {
                Console.WriteLine($"   AssignId={inv.InvigilatorAssignmentId}, SchedId={inv.ExamScheduleId}, InvId={inv.InvigilatorId} ('{inv.FirstName} {inv.LastName}'), Hall='{inv.HallNumber}'");
            }

            // 6. Test Auto-Schedule Endpoint for Exam 128 with Updated Logic
            Console.WriteLine("\n>>> 6. TESTING AUTO-SCHEDULE ENDPOINT FOR EXAM 128:");
            var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            var key = System.Text.Encoding.UTF8.GetBytes("a_very_long_secure_secret_key_of_at_least_32_characters_long");
            var tokenDescriptor = new Microsoft.IdentityModel.Tokens.SecurityTokenDescriptor
            {
                Subject = new System.Security.Claims.ClaimsIdentity(new[]
                {
                    new System.Security.Claims.Claim("UserId", "1"),
                    new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.NameIdentifier, "1"),
                    new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Name, "AdminUser"),
                    new System.Security.Claims.Claim(System.Security.Claims.ClaimTypes.Role, "Admin"),
                    new System.Security.Claims.Claim("CampusId", "1")
                }),
                Expires = DateTime.UtcNow.AddHours(2),
                Issuer = "CollegeManagementAPI",
                Audience = "CollegeManagementFrontend",
                SigningCredentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key), Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            string jwt = tokenHandler.WriteToken(token);

            using var httpClient = new System.Net.Http.HttpClient();
            httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", jwt);

            Console.WriteLine("   Calling GET http://localhost:5167/api/v1/examinations/128/schedules ...");
            var resp128 = await httpClient.GetAsync("http://localhost:5167/api/v1/examinations/128/schedules");
            var body128 = await resp128.Content.ReadAsStringAsync();
            Console.WriteLine($"   GET 128 Status: {(int)resp128.StatusCode} {resp128.StatusCode}");
            if (resp128.IsSuccessStatusCode)
            {
                using var doc = System.Text.Json.JsonDocument.Parse(body128);
                var elem = doc.RootElement;
                if (elem.ValueKind == System.Text.Json.JsonValueKind.Object && elem.TryGetProperty("data", out var d)) elem = d;
                foreach (var item in elem.EnumerateArray())
                {
                    Console.WriteLine($"   ScheduleId={item.GetProperty("examScheduleId")} | Subject={item.GetProperty("subjectName")} | CandidateCount={item.GetProperty("candidateCount")} | MaxMarks={item.GetProperty("maxMarks")} | PassMarks={item.GetProperty("passingMarks")} | Hall={item.GetProperty("hall")} | Invigilator={item.GetProperty("invigilatorName")}");
                    if (item.TryGetProperty("hallAssignments", out var has) && has.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        foreach (var ha in has.EnumerateArray())
                        {
                            Console.WriteLine($"      -> HallAssignment: Hall={ha.GetProperty("hallName")}, Candidates={ha.GetProperty("candidateCount")}, Invigilator={ha.GetProperty("invigilatorName")}");
                        }
                    }
                }
            }
            else
            {
                Console.WriteLine($"   Error: {body128}");
            }

            // 6b. Test Auto-Schedule Endpoint for Exam 148 with Batched Logic
            Console.WriteLine("\n>>> 6b. TESTING AUTO-SCHEDULE ENDPOINT FOR EXAM 148 (BATCHED & ATOMIC):");
            await conn.ExecuteAsync("UPDATE Examinations SET IsActive = 1 WHERE ExamId = 148;");
            var sw = System.Diagnostics.Stopwatch.StartNew();
            var autoSchedPayload = new
            {
                examinationId = 148,
                groupId = 37,
                academicLevelId = 1,
                totalMarks = 100m,
                passingMarks = 35m,
                scheduleMode = "SUBJECT_WISE",
                defaultStartTime = "09:00:00",
                defaultEndTime = "12:00:00",
                skipSundays = true,
                replaceExisting = true
            };
            var content148 = new StringContent(System.Text.Json.JsonSerializer.Serialize(autoSchedPayload), System.Text.Encoding.UTF8, "application/json");
            var postResp148 = await httpClient.PostAsync("http://localhost:5167/api/v1/examinations/148/auto-schedule", content148);
            sw.Stop();
            var postBody148 = await postResp148.Content.ReadAsStringAsync();
            Console.WriteLine($"   POST 148 Status: {(int)postResp148.StatusCode} {postResp148.StatusCode} in {sw.ElapsedMilliseconds} ms");

            if (postResp148.IsSuccessStatusCode)
            {
                Console.WriteLine("   Auto-schedule succeeded! Inspecting returned items:");
                using var doc = System.Text.Json.JsonDocument.Parse(postBody148);
                var elem = doc.RootElement;
                if (elem.ValueKind == System.Text.Json.JsonValueKind.Object && elem.TryGetProperty("data", out var d)) elem = d;
                int count = 0;
                foreach (var item in elem.EnumerateArray())
                {
                    count++;
                    Console.WriteLine($"   [{count}] ScheduleId={item.GetProperty("examScheduleId")} | Subject='{item.GetProperty("subjectName")}' | Date={item.GetProperty("examDate")} | Candidates={item.GetProperty("candidateCount")} | Marks={item.GetProperty("maxMarks")}/Pass={item.GetProperty("passingMarks")} | Hall='{item.GetProperty("hall")}' | Invigilator='{item.GetProperty("invigilatorName")}'");
                    if (item.TryGetProperty("hallAssignments", out var has) && has.ValueKind == System.Text.Json.JsonValueKind.Array)
                    {
                        foreach (var ha in has.EnumerateArray())
                        {
                            Console.WriteLine($"      -> HallAssignment: Hall={ha.GetProperty("hallName")}, Candidates={ha.GetProperty("candidateCount")}, Invigilator={ha.GetProperty("invigilatorName")}");
                        }
                    }
                }
                Console.WriteLine($"   Total schedules returned for Exam 148: {count} (Expected: 6)");
            }
            else
            {
                Console.WriteLine($"   Error: {postBody148}");
            }

            // 7. Verify Schedules in DB for Exam 148
            Console.WriteLine("\n>>> 7. VERIFIED SCHEDULES IN DB FOR EXAM 148 AFTER AUTO-SCHEDULE:");
            var newScheds148 = await conn.QueryAsync(@"
                SELECT s.ScheduleId, s.SubjectId, sub.SubjectName, s.ExamDate, s.StartTime, s.EndTime, s.MaxMarks, s.PassingMarks, s.Hall, s.Invigilator, s.InvigilatorId
                FROM ExamSchedules s
                LEFT JOIN Subjects sub ON s.SubjectId = sub.SubjectId
                WHERE s.ExamId = 148 AND s.IsActive = 1
                ORDER BY s.ExamDate;
            ");
            int dbCount = 0;
            foreach (var ns in newScheds148)
            {
                dbCount++;
                Console.WriteLine($"   [{dbCount}] SchedId={ns.ScheduleId} | Subject='{ns.SubjectName}' (ID {ns.SubjectId}) | Date={ns.ExamDate:yyyy-MM-dd} | Marks={ns.MaxMarks}/Pass={ns.PassingMarks} | Hall='{ns.Hall}' | Invigilator='{ns.Invigilator}' (ID {ns.InvigilatorId})");
            }
            Console.WriteLine($"   Total schedules in DB for Exam 148: {dbCount} (Expected: 6)");

            Console.WriteLine("\n================================================================================");
            Console.WriteLine("                   LIVE DB INSPECTION COMPLETE                                  ");
            Console.WriteLine("================================================================================");
        }
    }
}
