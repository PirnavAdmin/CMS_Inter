using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Interfaces;

public interface IFeeReceiptPdfService
{
    /// <summary>
    /// Generates a QuestPDF official receipt PDF byte array by FeePaymentId.
    /// </summary>
    Task<(byte[] Bytes, string FileName)?> GenerateReceiptPdfAsync(int feePaymentId);
}
