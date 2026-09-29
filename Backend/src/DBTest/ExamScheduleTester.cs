using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.IdentityModel.Tokens;

namespace DBTest
{
    public static class ExamScheduleTester
    {
        private const string BaseUrl = "http://localhost:5167";
        private static readonly HttpClient Client = new HttpClient();

        public static string GenerateAdminToken()
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

        public static async Task RunTestsAsync()
        {
            var token = GenerateAdminToken();
            Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            Console.WriteLine("================================================================================");
            Console.WriteLine("          EXAMINATION SCHEDULING VALIDATION DIAGNOSTICS TEST SUITE              ");
            Console.WriteLine("================================================================================\n");

            // Test 1: Empty Schedule Array
            Console.WriteLine("--> Test 1: Empty Schedule Array (Expecting 400 Bad Request with structured errors)");
            await PostScheduleAsync("/api/v1/examinations/45/schedules", "[]");

            // Test 2: Invalid JSON format (malformed date/time)
            Console.WriteLine("\n--> Test 2: Malformed Time String (Expecting 400 Bad Request with format error)");
            var malformedPayload = "[{ \"subjectId\": 10, \"examDate\": \"2026-10-15\", \"startTime\": \"not_a_time\", \"endTime\": \"12:00:00\" }]";
            await PostScheduleAsync("/api/v1/examinations/45/schedules", malformedPayload);

            // Test 3: Business Rule Failure - End Time <= Start Time
            Console.WriteLine("\n--> Test 3: End Time earlier than Start Time (Expecting 400 Bad Request with timing rule error)");
            var timingPayload = "[{ \"subjectId\": 10, \"examDate\": \"2026-10-15\", \"startTime\": \"12:00:00\", \"endTime\": \"09:00:00\" }]";
            await PostScheduleAsync("/api/v1/examinations/45/schedules", timingPayload);

            // Test 4: Missing Required Subject ID (subjectId = 0)
            Console.WriteLine("\n--> Test 4: Subject ID missing / 0 (Expecting 400 Bad Request with subject requirement error)");
            var missingSubjectPayload = "[{ \"subjectId\": 0, \"examDate\": \"2026-10-15\", \"startTime\": \"09:00:00\", \"endTime\": \"12:00:00\" }]";
            await PostScheduleAsync("/api/v1/examinations/45/schedules", missingSubjectPayload);

            // Test 5: Route Examination ID <= 0
            Console.WriteLine("\n--> Test 5: Examination ID <= 0 (Expecting 400 Bad Request)");
            var validItemPayload = "[{ \"subjectId\": 10, \"examDate\": \"2026-10-15\", \"startTime\": \"09:00:00\", \"endTime\": \"12:00:00\" }]";
            await PostScheduleAsync("/api/v1/examinations/0/schedules", validItemPayload);

            // Test 6: Flexible Time Format ("09:00" without seconds) with non-existent exam ID 999999
            Console.WriteLine("\n--> Test 6: Flexible Time Format without seconds (\"09:00\") (Expecting deserialization to succeed and fail at Exam existence check)");
            var flexibleTimePayload = "[{ \"subjectId\": 10, \"examDate\": \"2026-10-15\", \"startTime\": \"09:00\", \"endTime\": \"12:00\" }]";
            await PostScheduleAsync("/api/v1/examinations/999999/schedules", flexibleTimePayload);

            // Test 7: User's exact payload for examination 114
            Console.WriteLine("\n--> Test 7: Real User Request Payload for Examination 114");
            var userRealPayload = @"[
  { ""examinationId"": 114, ""campusId"": 1, ""groupId"": 37, ""academicLevelId"": 1, ""subjectId"": 9, ""scheduleDate"": ""2026-11-02"", ""examDate"": ""2026-11-02"", ""date"": ""2026-11-02"", ""startTime"": ""09:00:00"", ""endTime"": ""12:00:00"", ""scheduleMode"": ""SUBJECT_WISE"", ""examMode"": ""Written"", ""mode"": ""Written"", ""sessionId"": null, ""patternName"": null, ""examinationPatternId"": null, ""roomId"": 16, ""hall"": ""112"", ""roomNumber"": ""112"", ""invigilatorId"": 1055, ""invigilator"": ""devaa g"", ""invigilatorName"": ""devaa g"", ""maxMarks"": 100, ""totalMarks"": 100, ""passingMarks"": 35, ""passPercentage"": 35, ""includedSubjectIds"": null, ""subjectIds"": null, ""hallAssignments"": [ { ""hallId"": 16, ""roomId"": 16, ""hallName"": ""112"", ""roomName"": ""112"", ""roomNumber"": ""112"", ""candidateCount"": 49, ""invigilatorIds"": [ 1055 ] } ] },
  { ""examinationId"": 114, ""campusId"": 1, ""groupId"": 37, ""academicLevelId"": 1, ""subjectId"": 10, ""scheduleDate"": ""2026-11-03"", ""examDate"": ""2026-11-03"", ""date"": ""2026-11-03"", ""startTime"": ""09:00:00"", ""endTime"": ""12:00:00"", ""scheduleMode"": ""SUBJECT_WISE"", ""examMode"": ""Written"", ""mode"": ""Written"", ""sessionId"": null, ""patternName"": null, ""examinationPatternId"": null, ""roomId"": 13, ""hall"": ""108"", ""roomNumber"": ""108"", ""invigilatorId"": 1057, ""invigilator"": ""Devendra Kumar"", ""invigilatorName"": ""Devendra Kumar"", ""maxMarks"": 100, ""totalMarks"": 100, ""passingMarks"": 35, ""passPercentage"": 35, ""includedSubjectIds"": null, ""subjectIds"": null, ""hallAssignments"": [ { ""hallId"": 13, ""roomId"": 13, ""hallName"": ""108"", ""roomName"": ""108"", ""roomNumber"": ""108"", ""candidateCount"": 49, ""invigilatorIds"": [ 1057 ] } ] }
]";
            await PostScheduleAsync("/api/v1/examinations/114/schedules", userRealPayload);

            Console.WriteLine("\n================================================================================");
            Console.WriteLine("          EXAMINATION SCHEDULING TESTS COMPLETED                                ");
            Console.WriteLine("================================================================================");
        }

        private static async Task PostScheduleAsync(string path, string jsonContent)
        {
            try
            {
                var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");
                var response = await Client.PostAsync($"{BaseUrl}{path}", content);
                var body = await response.Content.ReadAsStringAsync();

                Console.WriteLine($"Status: {(int)response.StatusCode} {response.StatusCode}");
                Console.WriteLine($"Response: {body}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"HTTP Exception: {ex.Message}");
            }
        }
    }
}
