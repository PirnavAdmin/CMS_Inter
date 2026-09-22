namespace CollegeManagement.API.Services.Implementations;

using Dapper;
using Microsoft.EntityFrameworkCore;
using CollegeManagement.API.Data;
using CollegeManagement.API.Dtos;
using CollegeManagement.API.Services.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Data;

public class StudentTransportService : IStudentTransportService
{
    private readonly AppDbContext _context;

    public StudentTransportService(AppDbContext context)
    {
        _context = context;
    }

    public Task<TransportDropdownOptionsDto> GetTransportDropdownOptionsAsync()
    {
        return Task.FromResult(new TransportDropdownOptionsDto
        {
            AcademicYears = new List<string> { "2027-28", "2026-27", "2025-26" }
        });
    }

    public async Task<StudentTransportResponseDto> GetStudentTransportDetailsAsync(int? studentId, string? academicYear = "2027-28")
    {
        int targetStudentId = studentId ?? 6;
        
        using var connection = new MySqlConnector.MySqlConnection(_context.Database.GetConnectionString());
        var result = await connection.QueryFirstOrDefaultAsync<StudentTransportResponseDto>(
            "sp_GetStudentTransportDetails",
            new { p_StudentId = targetStudentId },
            commandType: CommandType.StoredProcedure);
        
        if (result == null)
        {
            return new StudentTransportResponseDto
            {
                StudentId = targetStudentId,
                Message = "No active transport assignment found for this student.",
                HasTransportAccess = false
            };
        }
        
        return result;
    }
}
