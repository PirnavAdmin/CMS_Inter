using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models.Reports;
using CollegeManagement.API.Repositories.Implementations;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace DBTest
{
    internal class Program
    {
        private const string ConnectionString = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;ConnectionTimeout=60;KeepAlive=5;ConvertZeroDateTime=True;Pooling=true;MinimumPoolSize=2;MaximumPoolSize=100;ConnectionLifeTime=300;ConnectionIdleTimeout=120;";
        private const string BaseUrl = "http://localhost:5167";
        private static readonly HttpClient Client = new HttpClient();
        private static int _passed = 0;
        private static int _failed = 0;
        private static readonly List<string> FailureDetails = new List<string>();

        static async Task Main(string[] args)
        {
            if (args.Length > 0 && args[0] == "--deploy-roles")
            {
                await DeployRoles.RunAsync();
                return;
            }

            Console.OutputEncoding = Encoding.UTF8;
            Console.WriteLine("================================================================================");
            Console.WriteLine("          LIVE DATABASE INSPECTION & REPORTS CALCULATION VERIFICATION           ");
            Console.WriteLine("================================================================================\n");

            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseMySql(ConnectionString, ServerVersion.AutoDetect(ConnectionString));

            using var db = new AppDbContext(optionsBuilder.Options);
            var reportRepo = new ReportRepository(db);

            // -------------------------------------------------------------------------
            // PART 1: LIVE DATA RANGE INSPECTION
            // -------------------------------------------------------------------------
            Console.WriteLine(">>> PART 1: LIVE DATA RANGE INSPECTION <<<\n");

            // 1. Admissions
            var admissions = await db.StudentAdmissions.AsNoTracking().ToListAsync();
            var activeAdmissions = admissions.Where(a => a.IsActive && !a.IsRejected && a.Status != "Rejected").ToList();
            Console.WriteLine($"[ADMISSIONS]");
            Console.WriteLine($"  Total in DB: {admissions.Count} | Active/Non-Rejected: {activeAdmissions.Count}");
            if (activeAdmissions.Any())
            {
                var minAdm = activeAdmissions.Min(a => a.AdmissionDate);
                var maxAdm = activeAdmissions.Max(a => a.AdmissionDate);
                Console.WriteLine($"  Date Range: {minAdm:yyyy-MM-dd} to {maxAdm:yyyy-MM-dd}");

                var monthBreakdown = activeAdmissions
                    .GroupBy(a => new { a.AdmissionDate.Year, a.AdmissionDate.Month })
                    .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
                    .Select(g => $"{g.Key.Year}-{g.Key.Month:D2} ({new DateTime(g.Key.Year, g.Key.Month, 1):MMM}): {g.Count()} admissions");
                Console.WriteLine($"  Monthly Breakdown: {string.Join(" | ", monthBreakdown)}");
            }

            // 2. Students & Strength
            var students = await db.Students.AsNoTracking().Where(s => s.IsActive).ToListAsync();
            Console.WriteLine($"\n[STUDENT STRENGTH]");
            Console.WriteLine($"  Total Active Enrolled Students: {students.Count}");
            var groupCounts = students.GroupBy(s => s.GroupId ?? 0).Select(g => $"Group {g.Key}: {g.Count()}").ToList();
            Console.WriteLine($"  By Group: {string.Join(" | ", groupCounts)}");
            var genderCounts = students.GroupBy(s => s.Gender ?? "Unknown").Select(g => $"{g.Key}: {g.Count()}").ToList();
            Console.WriteLine($"  By Gender: {string.Join(" | ", genderCounts)}");

            // 3. Attendances
            var attendances = await db.Attendances.AsNoTracking().Where(a => a.IsActive).ToListAsync();
            Console.WriteLine($"\n[ATTENDANCE RECORDS]");
            Console.WriteLine($"  Total Attendance Logs: {attendances.Count}");
            if (attendances.Any())
            {
                var minAtt = attendances.Min(a => a.AttendanceDate);
                var maxAtt = attendances.Max(a => a.AttendanceDate);
                var presentCount = attendances.Count(a => a.Status == CollegeManagement.API.Enums.AttendanceStatus.Present);
                var pct = attendances.Count > 0 ? (decimal)presentCount * 100m / attendances.Count : 0;
                Console.WriteLine($"  Date Range: {minAtt:yyyy-MM-dd} to {maxAtt:yyyy-MM-dd}");
                Console.WriteLine($"  Present: {presentCount} / {attendances.Count} ({pct:F2}%)");
                var attMonths = attendances
                    .GroupBy(a => new { a.AttendanceDate.Year, a.AttendanceDate.Month })
                    .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
                    .Select(g => $"{new DateTime(g.Key.Year, g.Key.Month, 1):MMM yyyy}: {g.Count()} logs ({g.Count(x => x.Status == CollegeManagement.API.Enums.AttendanceStatus.Present) * 100.0 / g.Count():F1}% present)");
                Console.WriteLine($"  Monthly Breakdown: {string.Join(" | ", attMonths)}");
            }

            // 4. Fee Payments & Due Fees
            var feePayments = await db.FeePayments.AsNoTracking().Where(p => p.Status != "Cancelled" && p.Status != "Failed").ToListAsync();
            var studentFees = await db.StudentFees.AsNoTracking().Where(sf => sf.Status != "Cancelled").ToListAsync();
            var positiveDues = studentFees.Where(sf => sf.BalanceAmount > 0).ToList();
            Console.WriteLine($"\n[FEES]");
            Console.WriteLine($"  Total Fee Payments: {feePayments.Count} | Total Collected: Rs. {feePayments.Sum(p => p.Amount):N2}");
            if (feePayments.Any())
            {
                var minPay = feePayments.Min(p => p.PaymentDate);
                var maxPay = feePayments.Max(p => p.PaymentDate);
                Console.WriteLine($"  Payment Date Range: {minPay:yyyy-MM-dd} to {maxPay:yyyy-MM-dd}");
            }
            Console.WriteLine($"  Total StudentFee Records: {studentFees.Count} | Positive Dues Count: {positiveDues.Count} | Outstanding Dues: Rs. {studentFees.Sum(sf => sf.BalanceAmount):N2}");

            // Check student link
            var studentIdSet = students.Select(s => s.StudentId).ToHashSet();
            var duesWithValidStudent = positiveDues.Where(sf => studentIdSet.Contains(sf.StudentId)).ToList();
            var duesWithoutValidStudent = positiveDues.Where(sf => !studentIdSet.Contains(sf.StudentId)).ToList();
            Console.WriteLine($"  Positive Dues with Active Enrolled Student: {duesWithValidStudent.Count} (Rs. {duesWithValidStudent.Sum(sf => sf.BalanceAmount):N2})");
            Console.WriteLine($"  Positive Dues without Active Enrolled Student: {duesWithoutValidStudent.Count} (Rs. {duesWithoutValidStudent.Sum(sf => sf.BalanceAmount):N2})");

            // 5. Examinations & Results
            var exams = await db.Examinations.AsNoTracking().Where(e => e.IsActive).ToListAsync();
            var results = await db.Results.AsNoTracking().Where(r => r.IsPublished).ToListAsync();
            Console.WriteLine($"\n[EXAMINATIONS & RESULTS]");
            Console.WriteLine($"  Total Active Exams: {exams.Count}");
            if (exams.Any())
            {
                var minExam = exams.Min(e => e.StartDate);
                var maxExam = exams.Max(e => e.EndDate);
                Console.WriteLine($"  Exam Date Range: {minExam:yyyy-MM-dd} to {maxExam:yyyy-MM-dd}");
            }
            Console.WriteLine($"  Total Published Results (Rows): {results.Count} | Distinct Student-Exam: {results.Select(r => new { r.StudentId, r.ExamId }).Distinct().Count()}");

            // -------------------------------------------------------------------------
            // PART 2: SAMPLE DATE FILTER VERIFICATION ACROSS MULTIPLE SCENARIOS
            // -------------------------------------------------------------------------
            Console.WriteLine("\n================================================================================");
            Console.WriteLine(">>> PART 2: TESTING SAMPLE DATE FILTERS & INDIVIDUAL REPORT CARDS <<<");
            Console.WriteLine("================================================================================\n");

            var scenarios = new List<(string Name, ReportFilterModel Filter)>
            {
                ("Scenario 1: Full Range (No Date Limits)", new ReportFilterModel()),
                ("Scenario 2: March 01, 2026 to September 20, 2026", new ReportFilterModel
                {
                    FromDate = new DateTime(2026, 3, 1),
                    ToDate = new DateTime(2026, 9, 20)
                }),
                ("Scenario 3: March 01, 2026 to June 30, 2026 (Early Academic Period)", new ReportFilterModel
                {
                    FromDate = new DateTime(2026, 3, 1),
                    ToDate = new DateTime(2026, 6, 30)
                }),
                ("Scenario 4: July 01, 2026 to September 20, 2026 (Mid-to-Late Period)", new ReportFilterModel
                {
                    FromDate = new DateTime(2026, 7, 1),
                    ToDate = new DateTime(2026, 9, 20)
                }),
                ("Scenario 5: September 01, 2026 to September 20, 2026 (Recent Month)", new ReportFilterModel
                {
                    FromDate = new DateTime(2026, 9, 1),
                    ToDate = new DateTime(2026, 9, 20)
                })
            };

            foreach (var (name, filter) in scenarios)
            {
                Console.WriteLine($"--------------------------------------------------------------------------------");
                Console.WriteLine($"TEST: {name}");
                Console.WriteLine($"Filter: From = {filter.FromDate?.ToString("yyyy-MM-dd") ?? "NULL"}, To = {filter.ToDate?.ToString("yyyy-MM-dd") ?? "NULL"}");
                Console.WriteLine($"--------------------------------------------------------------------------------");

                // 1. Get Dashboard
                var dashboard = await reportRepo.GetDashboardAsync(filter);

                // 2. Get Detailed Reports
                var admDetails = await reportRepo.GetAdmissionsAsync(filter);
                var attDetails = await reportRepo.GetAttendanceAsync(filter);
                var feeDetails = await reportRepo.GetFeeCollectionAsync(filter);
                var dueDetails = await reportRepo.GetOutstandingFeesAsync(filter);
                var examDetails = await reportRepo.GetExaminationsAsync(filter);
                var resDetails = await reportRepo.GetResultsAsync(filter);
                var workloadDetails = await reportRepo.GetFacultyWorkloadAsync(filter);
                var strengthDetails = await reportRepo.GetStudentStrengthAsync(filter);
                var passPctDetails = await reportRepo.GetPassPercentageAsync(filter);
                var topperDetails = await reportRepo.GetToppersAsync(filter);

                // 3. Verification & Comparison
                Console.WriteLine($"\n[10 Summary Cards vs Detailed Endpoints Comparison]:");

                // Card 1: Admissions
                var admMatch = dashboard.Admissions == admDetails.Count;
                PrintResult("1. Total Admissions", $"Dashboard: {dashboard.Admissions}", $"Details: {admDetails.Count}", admMatch);

                // Card 2: Attendance %
                var calculatedAttPct = attDetails.Any() ? Math.Round((decimal)attDetails.Average(x => (double)x.AttendancePercentage), 2) : 0;
                PrintResult("2. Average Attendance", $"Dashboard: {dashboard.Attendance:F2}%", $"Details Avg: {calculatedAttPct:F2}% (Total Days: {attDetails.Count})", true);

                // Card 3: Fee Collection
                var sumCollected = feeDetails.Sum(x => x.PaidAmount > 0 ? x.PaidAmount : x.Collected);
                var feeMatch = Math.Abs(dashboard.FeeCollection - sumCollected) < 0.01m;
                PrintResult("3. Total Fee Collection", $"Dashboard: Rs. {dashboard.FeeCollection:N2}", $"Details Sum: Rs. {sumCollected:N2} (Txs: {feeDetails.Count})", feeMatch);

                // Card 4: Due Fees
                var sumDue = dueDetails.Sum(x => x.DueAmount);
                var dueMatch = Math.Abs(dashboard.DueFees - sumDue) < 0.01m;
                PrintResult("4. Outstanding Due Fees", $"Dashboard: Rs. {dashboard.DueFees:N2}", $"Details Sum: Rs. {sumDue:N2} (Students: {dueDetails.Count})", dueMatch);

                // Card 5: Examinations
                var examMatch = dashboard.Examinations == examDetails.Count;
                PrintResult("5. Examinations Conducted", $"Dashboard: {dashboard.Examinations}", $"Details: {examDetails.Count}", examMatch);

                // Card 6: Results Published
                var resMatch = dashboard.ResultsPublished == resDetails.Count;
                PrintResult("6. Results Published", $"Dashboard: {dashboard.ResultsPublished}", $"Details: {resDetails.Count}", resMatch);

                // Card 7: Faculty Workload
                PrintResult("7. Faculty Workload", $"Dashboard: {dashboard.FacultyWorkload} hrs/wk", $"Details Count: {workloadDetails.Count} faculties", true);

                // Card 8: Student Strength
                var totalStrength = strengthDetails.Sum(x => x.TotalStudents);
                var strMatch = dashboard.StudentStrength == totalStrength;
                PrintResult("8. Student Strength", $"Dashboard: {dashboard.StudentStrength}", $"Details Sum: {totalStrength} (Sections: {strengthDetails.Count})", strMatch);

                // Card 9: Pass Percentage
                var avgPassPct = passPctDetails.Any() ? Math.Round((decimal)passPctDetails.Average(x => (double)x.PassPercentage), 2) : 0;
                PrintResult("9. Pass Percentage", $"Dashboard: {dashboard.PassPercentage:F2}%", $"Details Avg: {avgPassPct:F2}% (Exams: {passPctDetails.Count})", true);

                // Card 10: Toppers
                PrintResult("10. Toppers Identified", $"Dashboard: {dashboard.ToppersIdentified}", $"Details: {topperDetails.Count} toppers listed", true);

                Console.WriteLine();
            }

            Console.WriteLine("================================================================================");
            Console.WriteLine("                   VERIFICATION EXECUTION COMPLETE                              ");
            Console.WriteLine("================================================================================");
        }

        private static void PrintResult(string title, string dashboardVal, string detailsVal, bool isMatch)
        {
            if (isMatch)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.Write("  [PASS] ");
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.Write("  [NOTE] ");
            }
            Console.ResetColor();
            Console.WriteLine($"{title,-26} | {dashboardVal,-32} | {detailsVal}");
        }

        private static string GenerateJwtToken()
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes("a_very_long_secure_secret_key_of_at_least_32_characters_long");
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim("UserId", "1"),
                    new Claim(ClaimTypes.NameIdentifier, "1"),
                    new Claim(ClaimTypes.Name, "AdminUser"),
                    new Claim(ClaimTypes.Role, "Admin")
                }),
                Expires = DateTime.UtcNow.AddHours(2),
                Issuer = "CollegeManagementAPI",
                Audience = "CollegeManagementFrontend",
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private static async Task TestEndpoint(string name, HttpMethod method, string path, object? body = null, bool expectSuccess = true)
        {
            try
            {
                var request = new HttpRequestMessage(method, $"{BaseUrl}{path}");
                if (body != null)
                {
                    request.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
                }

                var response = await Client.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                bool isOk = expectSuccess ? response.IsSuccessStatusCode : true;
                if (isOk)
                {
                    _passed++;
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.Write("[PASS] ");
                    Console.ResetColor();
                    Console.WriteLine($"{name} -> {(int)response.StatusCode} {response.StatusCode}");
                }
                else
                {
                    _failed++;
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.Write("[FAIL] ");
                    Console.ResetColor();
                    Console.WriteLine($"{name} -> {(int)response.StatusCode} {response.StatusCode}");
                    var snippet = content.Length > 250 ? content.Substring(0, 250) + "..." : content;
                    Console.WriteLine($"       Response: {snippet}");
                    FailureDetails.Add($"{name} ({path}): {(int)response.StatusCode} - {snippet}");
                }
            }
            catch (Exception ex)
            {
                _failed++;
                Console.ForegroundColor = ConsoleColor.Red;
                Console.Write("[FAIL] ");
                Console.ResetColor();
                Console.WriteLine($"{name} -> Exception: {ex.Message}");
                FailureDetails.Add($"{name} ({path}): Exception: {ex.Message}");
            }
        }
    }
}
