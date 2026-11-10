using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations;

public class PaymentLedgerService : IPaymentLedgerService
{
    private static readonly SemaphoreSlim _fileLock = new(1, 1);
    private readonly AppDbContext _context;
    private readonly ILogger<PaymentLedgerService> _logger;
    private readonly string _storageFilePath;

    public PaymentLedgerService(AppDbContext context, ILogger<PaymentLedgerService> logger)
    {
        _context = context;
        _logger = logger;

        var storageDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Storage");
        if (!Directory.Exists(storageDir))
        {
            Directory.CreateDirectory(storageDir);
        }
        _storageFilePath = Path.Combine(storageDir, "Payments_Ledger.csv");
    }

    public async Task RecordPaymentAsync(PaymentLedgerEntry entry, CancellationToken cancellationToken = default)
    {
        await _fileLock.WaitAsync(cancellationToken);
        try
        {
            var isNewFile = !File.Exists(_storageFilePath);
            using var stream = new FileStream(_storageFilePath, FileMode.Append, FileAccess.Write, FileShare.Read);
            using var writer = new StreamWriter(stream, new UTF8Encoding(true));

            if (isNewFile)
            {
                await writer.WriteLineAsync("Date (IST),Student Name,Admission No,Course,Amount (INR),Payment Method,Transaction Reference,Receipt No,Status,Remarks");
            }

            // Convert to Indian Standard Time (UTC+5:30)
            var istOffset = TimeSpan.FromHours(5).Add(TimeSpan.FromMinutes(30));
            var istDate = entry.PaymentDateUtc.Add(istOffset).ToString("yyyy-MM-dd HH:mm:ss");

            var line = string.Join(",",
                EscapeCsv(istDate),
                EscapeCsv(entry.StudentName),
                EscapeCsv(entry.AdmissionNo),
                EscapeCsv(entry.Course),
                entry.Amount.ToString("F2"),
                EscapeCsv(entry.PaymentMethod),
                EscapeCsv(entry.ReferenceNumber),
                EscapeCsv(entry.ReceiptNumber),
                EscapeCsv(entry.Status),
                EscapeCsv(entry.Remarks ?? "")
            );

            await writer.WriteLineAsync(line);
            await writer.FlushAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to append payment ledger entry for Receipt={ReceiptNo}", entry.ReceiptNumber);
        }
        finally
        {
            _fileLock.Release();
        }
    }

    public async Task<byte[]> GetLedgerCsvBytesAsync(int? campusId = null, int? academicYearId = null)
    {
        // Query database to ensure authoritative ledger records
        var query = _context.PaymentGatewayTransactions
            .AsNoTracking()
            .Include(t => t.Student)
            .Include(t => t.StudentFee)
                .ThenInclude(sf => sf!.FeeStructure)
                    .ThenInclude(fs => fs!.Group)
            .OrderByDescending(t => t.CreatedAt);

        var list = await query.ToListAsync();

        var bom = new byte[] { 0xEF, 0xBB, 0xBF };
        var sb = new StringBuilder();
        sb.AppendLine("Date (IST),Student Name,Admission No,Course,Amount (INR),Payment Method,Transaction Reference,Receipt No,Status,Remarks");

        var istOffset = TimeSpan.FromHours(5).Add(TimeSpan.FromMinutes(30));

        foreach (var t in list)
        {
            var istDate = t.CreatedAt.Add(istOffset).ToString("yyyy-MM-dd HH:mm:ss");
            var name = EscapeCsv(t.Student?.StudentName ?? $"Student #{t.StudentId}");
            var adm = EscapeCsv(t.Student?.AdmissionNo ?? "");
            var grp = EscapeCsv(t.StudentFee?.FeeStructure?.Group?.GroupName ?? "");
            var amt = t.Amount.ToString("F2");
            var method = EscapeCsv(t.PaymentMethod);
            var refNo = EscapeCsv(t.GatewayPaymentId ?? t.UtrNumber ?? t.OrderId);
            var recNo = EscapeCsv(t.ReceiptNumber ?? "N/A");
            var status = EscapeCsv(t.Status);
            var remarks = EscapeCsv(t.Remarks ?? "");

            sb.AppendLine($"{istDate},{name},{adm},{grp},{amt},{method},{refNo},{recNo},{status},{remarks}");
        }

        return bom.Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
    }

    private static string EscapeCsv(string value)
    {
        if (string.IsNullOrEmpty(value)) return "";
        // Prevent CSV Formula Injection
        if (value.StartsWith("=") || value.StartsWith("+") || value.StartsWith("-") || value.StartsWith("@"))
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
