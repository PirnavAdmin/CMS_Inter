namespace CollegeManagement.API.Services.Interfaces;

using CollegeManagement.API.Dtos;
using System.Threading.Tasks;

public interface IStudentTransportService
{
    Task<TransportDropdownOptionsDto> GetTransportDropdownOptionsAsync();
    Task<StudentTransportResponseDto> GetStudentTransportDetailsAsync(int? studentId, string? academicYear = "2027-28");
}

