using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Interfaces
{
    /// <summary>
    /// Service contract for exporting timetable data in various formats (PDF, Excel, etc.).
    /// </summary>
    public interface ITimetableExportService
    {
        /// <summary>
        /// Validates academic hierarchy and generates a PDF document for a specific Section timetable.
        /// </summary>
        Task<(byte[] PdfBytes, string FileName)> ExportSectionPdfAsync(
            int boardId,
            int academicLevelId,
            int academicYearId,
            int groupId,
            int programId,
            int sectionId);

        /// <summary>
        /// Validates academic hierarchy and generates an Excel workbook (.xlsx) for an entire Group,
        /// preserving Program -> Section -> Day -> Period hierarchy across multiple sheets.
        /// </summary>
        Task<(byte[] ExcelBytes, string FileName)> ExportGroupExcelAsync(
            int boardId,
            int academicLevelId,
            int academicYearId,
            int groupId);
    }
}
