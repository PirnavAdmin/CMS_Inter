using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Students;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IStudentExportService
    {
        Task<(byte[] PdfBytes, string FileName)> ExportStudentProfilePdfAsync(int studentId, CancellationToken ct = default);
        Task<(byte[] ExcelBytes, string FileName)> ExportStudentsToExcelAsync(StudentExportFilterDto filter, CancellationToken ct = default);
        Task<(byte[] PdfBytes, string FileName)> ExportStudentCredentialSlipPdfAsync(int studentId, CancellationToken ct = default);
    }
}
