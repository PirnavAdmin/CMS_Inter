using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Models.Fee;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations;

/// <summary>
/// Database-backed financial audit ledger service.
/// Stores immutable Credit and Reversal records in PaymentLedgerEntries so exports
/// work identically across multi-instance / containerized deployments without local disk files.
/// </summary>
public class PaymentLedgerService : IPaymentLedgerService
{
    private readonly AppDbContext _context;
    private readonly ILogger<PaymentLedgerService> _logger;

    public PaymentLedgerService(AppDbContext context, ILogger<PaymentLedgerService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task RecordPaymentAsync(PaymentLedgerEntry entry, CancellationToken cancellationToken = default)
    {
        try
        {
            var record = new PaymentLedgerEntryRecord
            {
                PaymentGatewayTransactionId = entry.PaymentGatewayTransactionId,
                FeePaymentId = entry.FeePaymentId,
                StudentId = entry.StudentId,
                CampusId = entry.CampusId,
                AcademicYearId = entry.AcademicYearId,
                EntryType = string.IsNullOrWhiteSpace(entry.EntryType)
                    ? (entry.Amount < 0 ? "Reversal" : "Credit")
                    : entry.EntryType,
                Amount = entry.Amount,
                StudentName = entry.StudentName,
                AdmissionNo = entry.AdmissionNo,
                Course = entry.Course,
                PaymentMethod = entry.PaymentMethod,
                ReferenceNumber = entry.ReferenceNumber,
                ReceiptNumber = entry.ReceiptNumber,
                Status = entry.Status,
                Remarks = entry.Remarks,
                PaymentDateUtc = entry.PaymentDateUtc,
                CreatedAt = DateTime.UtcNow
            };

            _context.PaymentLedgerEntries.Add(record);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist payment ledger entry for Receipt={ReceiptNo}", entry.ReceiptNumber);
        }
    }

    public async Task<byte[]> GetLedgerCsvBytesAsync(int? campusId = null, int? academicYearId = null)
    {
        var ledgerQuery = _context.PaymentLedgerEntries.AsNoTracking().AsQueryable();

        if (campusId.HasValue && campusId.Value > 0)
            ledgerQuery = ledgerQuery.Where(e => e.CampusId == campusId.Value);

        if (academicYearId.HasValue && academicYearId.Value > 0)
            ledgerQuery = ledgerQuery.Where(e => e.AcademicYearId == academicYearId.Value);

        var entries = await ledgerQuery
            .OrderByDescending(e => e.CreatedAt)
            .ThenByDescending(e => e.Id)
            .ToListAsync();

        var bom = new byte[] { 0xEF, 0xBB, 0xBF };
        var sb = new StringBuilder();
        sb.AppendLine("Date (IST),Entry Type,Student Name,Admission No,Course,Amount (INR),Payment Method,Transaction Reference,Receipt No,Status,Remarks");

        var istOffset = TimeSpan.FromHours(5).Add(TimeSpan.FromMinutes(30));

        if (entries.Any())
        {
            foreach (var e in entries)
            {
                var istDate = e.PaymentDateUtc.Add(istOffset).ToString("yyyy-MM-dd HH:mm:ss");
                AppendRow(sb, istDate, e.EntryType, e.StudentName, e.AdmissionNo, e.Course, e.Amount, e.PaymentMethod, e.ReferenceNumber, e.ReceiptNumber, e.Status, e.Remarks);
            }
        }
        else
        {
            // Fallback for pre-migration historical transactions
            var txnQuery = _context.PaymentGatewayTransactions
                .AsNoTracking()
                .Include(t => t.Student)
                .Include(t => t.StudentFee)
                    .ThenInclude(sf => sf!.FeeStructure)
                        .ThenInclude(fs => fs!.Group)
                .AsQueryable();

            if (campusId.HasValue && campusId.Value > 0)
                txnQuery = txnQuery.Where(t => (t.CampusId ?? t.Student!.CampusId) == campusId.Value);

            if (academicYearId.HasValue && academicYearId.Value > 0)
                txnQuery = txnQuery.Where(t => t.StudentFee != null && t.StudentFee.FeeStructure != null && t.StudentFee.FeeStructure.AcademicYearId == academicYearId.Value);

            var list = await txnQuery
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();

            foreach (var t in list)
            {
                var istDate = t.CreatedAt.Add(istOffset).ToString("yyyy-MM-dd HH:mm:ss");
                var name = t.Student?.StudentName ?? $"Student #{t.StudentId}";
                var adm = t.Student?.AdmissionNo ?? "";
                var grp = t.StudentFee?.FeeStructure?.Group?.GroupName ?? "";
                var refNo = t.GatewayPaymentId ?? t.UtrNumber ?? t.OrderId;
                var recNo = t.ReceiptNumber ?? "N/A";
                var entryType = t.Status == "Reversed" ? "Reversal" : "Credit";
                var amt = t.Status == "Reversed" ? -t.Amount : t.Amount;

                AppendRow(sb, istDate, entryType, name, adm, grp, amt, t.PaymentMethod, refNo, recNo, t.Status, t.Remarks);
            }
        }

        return bom.Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
    }

    private static void AppendRow(
        StringBuilder sb,
        string istDate,
        string entryType,
        string studentName,
        string admissionNo,
        string course,
        decimal amount,
        string paymentMethod,
        string referenceNumber,
        string receiptNumber,
        string status,
        string? remarks)
    {
        var line = string.Join(",",
            EscapeCsv(istDate),
            EscapeCsv(entryType),
            EscapeCsv(studentName),
            EscapeCsv(admissionNo),
            EscapeCsv(course),
            amount.ToString("F2"),
            EscapeCsv(paymentMethod),
            EscapeCsv(referenceNumber),
            EscapeCsv(string.IsNullOrWhiteSpace(receiptNumber) ? "N/A" : receiptNumber),
            EscapeCsv(status),
            EscapeCsv(remarks ?? "")
        );
        sb.AppendLine(line);
    }

    private static string EscapeCsv(string value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        // Prevent CSV Formula Injection (=, +, -, @, tab, CR)
        if (value.StartsWith("=") || value.StartsWith("+") || value.StartsWith("-") ||
            value.StartsWith("@") || value.StartsWith("\t") || value.StartsWith("\r"))
        {
            value = "'" + value;
        }
        if (value.Contains(",") || value.Contains("\"") || value.Contains("\n") || value.Contains("\r"))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
    }
}
