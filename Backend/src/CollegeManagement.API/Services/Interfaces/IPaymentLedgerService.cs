using System;
using System.Threading;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Interfaces;

public class PaymentLedgerEntry
{
    public DateTime PaymentDateUtc { get; set; } = DateTime.UtcNow;
    public string StudentName { get; set; } = string.Empty;
    public string AdmissionNo { get; set; } = string.Empty;
    public string Course { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string ReferenceNumber { get; set; } = string.Empty;
    public string ReceiptNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "Captured";
    public string? Remarks { get; set; }
}

public interface IPaymentLedgerService
{
    /// <summary>
    /// Thread-safe real-time append to persistent Payments_Ledger.csv.
    /// Converts timestamps to Indian Standard Time (IST / Asia/Kolkata).
    /// </summary>
    Task RecordPaymentAsync(PaymentLedgerEntry entry, CancellationToken cancellationToken = default);

    /// <summary>
    /// Reads or generates the ledger file with UTF-8 BOM encoding for Excel compatibility.
    /// </summary>
    Task<byte[]> GetLedgerCsvBytesAsync(int? campusId = null, int? academicYearId = null);
}
