using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Students;
using Microsoft.AspNetCore.Http;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IStudentImportService
    {
        Task<byte[]> GenerateCredentialsPdfAsync(StudentCredentialPdfFilterDto? filter = null, CancellationToken ct = default);
        Task<byte[]> GenerateTemplateAsync(CancellationToken ct = default);
        Task<StudentImportResultDto> ValidateExcelAsync(IFormFile file, CancellationToken ct = default);
        Task<StudentImportResultDto> ImportExcelAsync(IFormFile file, bool allowPartial = false, CancellationToken ct = default);
    }
}