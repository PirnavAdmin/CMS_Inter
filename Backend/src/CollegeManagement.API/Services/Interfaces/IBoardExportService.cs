using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Services.Interfaces
{
    /// <summary>
    /// Service interface for generating CSV/Excel files from board collections.
    /// </summary>
    public interface IBoardExportService
    {
        /// <summary>
        /// Generates a UTF-8 CSV with BOM for a list of boards.
        /// </summary>
        Task<byte[]> GenerateCsvAsync(IEnumerable<Board> boards);

        /// <summary>
        /// Generates an Excel workbook for a list of boards using MiniExcel.
        /// </summary>
        Task<byte[]> GenerateExcelAsync(IEnumerable<Board> boards);

        /// <summary>
        /// Generates a PDF report for a list of boards using QuestPDF.
        /// </summary>
        Task<byte[]> GeneratePdfAsync(IEnumerable<Board> boards);
    }
}
