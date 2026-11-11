using System;
using System.Threading;
using System.Threading.Tasks;

namespace CollegeManagement.API.Services.Interfaces;

public class PaymentLedgerEntry
{
    public int? PaymentGatewayTransactionId { get; set; }
    public int? FeePaymentId { get; set; }
    public int? StudentId { get; set; }
    public int? CampusId { get; set; }
    public int? AcademicYearId { get; set; }
    public string EntryType { get; set; } = "Credit";
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
    /// Persists an immutable payment ledger entry into the database.
    /// </summary>
    Task RecordPaymentAsync(PaymentLedgerEntry entry, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates an Excel-safe UTF-8 BOM CSV export from persisted database ledger records,
    /// dynamically filtered by campus and academic year.
    /// </summary>
    Task<byte[]> GetLedgerCsvBytesAsync(int? campusId = null, int? academicYearId = null);
}
