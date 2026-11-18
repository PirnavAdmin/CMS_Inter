using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;

class Program
{
    static async Task Main()
    {
        string secret = "a_very_long_secure_secret_key_of_at_least_32_characters_long";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, "1064"),
            new Claim(ClaimTypes.Email, "mukeshyedida1@gmail.com"),
            new Claim(ClaimTypes.Role, "Admin"),
            new Claim("CollegeId", "8"),
            new Claim("collegeId", "8"),
            new Claim("AdminId", "1064")
        };

        var tokenDescriptor = new JwtSecurityToken(
            issuer: "CollegeManagementAPI",
            audience: "CollegeManagementFrontend",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(2),
            signingCredentials: creds
        );

        string token = new JwtSecurityTokenHandler().WriteToken(tokenDescriptor);
        Console.WriteLine($"Generated token for Mukesh Kumar (CollegeId: 8)");

        using var client = new HttpClient();
        client.BaseAddress = new Uri("http://localhost:5167");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        Console.WriteLine("\n=== 1. GET /api/v1/dashboard/summary?campusId=999999999 ===");
        var dashRes = await client.GetAsync("/api/v1/dashboard/summary?campusId=999999999");
        var dashBody = await dashRes.Content.ReadAsStringAsync();
        Console.WriteLine($"Dashboard status: {dashRes.StatusCode}");
        Console.WriteLine($"Dashboard body: {dashBody}");

        Console.WriteLine("\n=== 2. GET /api/v1/groups?boardId=1 ===");
        var groupsRes = await client.GetAsync("/api/v1/groups?boardId=1");
        var groupsBody = await groupsRes.Content.ReadAsStringAsync();
        Console.WriteLine($"Groups status: {groupsRes.StatusCode}");
        Console.WriteLine($"Groups response: {groupsBody}");

        Console.WriteLine("\n=== 3. GET /api/v1/groups/board/1 ===");
        var boardGroupsRes = await client.GetAsync("/api/v1/groups/board/1");
        var boardGroupsBody = await boardGroupsRes.Content.ReadAsStringAsync();
        Console.WriteLine($"Board Groups status: {boardGroupsRes.StatusCode}");
        Console.WriteLine($"Board Groups response: {boardGroupsBody}");

        Console.WriteLine("\n=== 4. GET /api/v1/subjects/context?boardId=1&groupId=39&academicLevelId=1 ===");
        var subjRes = await client.GetAsync("/api/v1/subjects/context?boardId=1&groupId=39&academicLevelId=1");
        var subjBody = await subjRes.Content.ReadAsStringAsync();
        Console.WriteLine($"Subjects context status: {subjRes.StatusCode}");
        Console.WriteLine($"Subjects context response: {subjBody}");

        Console.WriteLine("\n=== 5. GET /api/v1/subjects?boardId=1 ===");
        var allSubjRes = await client.GetAsync("/api/v1/subjects?boardId=1");
        var allSubjBody = await allSubjRes.Content.ReadAsStringAsync();
        Console.WriteLine($"All subjects status: {allSubjRes.StatusCode}");
        Console.WriteLine($"All subjects response: {allSubjBody}");

        Console.WriteLine("\n=== 6. GET /api/v1/subjects/active ===");
        var activeSubjRes = await client.GetAsync("/api/v1/subjects/active");
        var activeSubjBody = await activeSubjRes.Content.ReadAsStringAsync();
        Console.WriteLine($"Active subjects status: {activeSubjRes.StatusCode}");
        Console.WriteLine($"Active subjects response: {activeSubjBody}");
    }
}
