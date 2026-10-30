namespace CollegeManagement.API.Services.Implementations;

using CollegeManagement.API.Dtos;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;

public class StudentTransportService : IStudentTransportService
{
    private readonly IStudentTransportAssignmentRepository _repository;

    public StudentTransportService(IStudentTransportAssignmentRepository repository)
    {
        _repository = repository;
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
        
        var result = await _repository.GetStudentTransportDetailsAsync(targetStudentId);
        
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
