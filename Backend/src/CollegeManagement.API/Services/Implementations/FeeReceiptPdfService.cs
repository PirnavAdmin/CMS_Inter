using System.Text.RegularExpressions;
using CollegeManagement.API.Data;
using CollegeManagement.API.Services.Exports;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;

namespace CollegeManagement.API.Services.Implementations;

public class FeeReceiptPdfService : IFeeReceiptPdfService
{
    private readonly AppDbContext _context;
    private readonly ILogger<FeeReceiptPdfService> _logger;

    public FeeReceiptPdfService(AppDbContext context, ILogger<FeeReceiptPdfService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<(byte[] Bytes, string FileName)?> GenerateReceiptPdfAsync(int feePaymentId)
    {
        var payment = await _context.FeePayments
            .AsNoTracking()
            .Include(p => p.Student)
                .ThenInclude(s => s!.CampusNavigation)
            .Include(p => p.Student)
                .ThenInclude(s => s!.AcademicYear)
            .Include(p => p.Student)
                .ThenInclude(s => s!.SectionNavigation)
            .Include(p => p.StudentFee)
                .ThenInclude(sf => sf!.FeeStructure)
                    .ThenInclude(fs => fs!.Group)
            .Include(p => p.StudentFee)
                .ThenInclude(sf => sf!.FeeStructure)
                    .ThenInclude(fs => fs!.AcademicYear)
            .Include(p => p.Receipt)
            .FirstOrDefaultAsync(p => p.FeePaymentId == feePaymentId);

        if (payment == null)
            return null;

        var gatewayTxn = await _context.PaymentGatewayTransactions
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.FeePaymentId == feePaymentId);

        if (!string.Equals(payment.Status, "Success", StringComparison.OrdinalIgnoreCase)
            || string.Equals(gatewayTxn?.Status, "Reversed", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Official PDF receipts are only available for verified, settled payments.");
        }

        try
        {
            var student = payment.Student;
            var studentFee = payment.StudentFee;
            var receiptNo = payment.Receipt?.ReceiptNumber ?? payment.ReceiptNumber ?? $"REC-{payment.FeePaymentId}";
            int? campusId = gatewayTxn?.CampusId ?? student?.CampusId;

            var commRows = await _context.PaymentCommunicationSettings
                .AsNoTracking()
                .Where(c => c.CampusId == null || (campusId.HasValue && c.CampusId == campusId.Value))
                .ToListAsync();

            var campusCustom = campusId.HasValue ? commRows.FirstOrDefault(x => x.CampusId == campusId.Value) : null;
            var collegeDefault = commRows.FirstOrDefault(x => x.CampusId == null);

            string institutionName = FirstNonEmpty(
                campusCustom?.CollegeDisplayName,
                collegeDefault?.CollegeDisplayName,
                "Pirnav College");

            string? campusName = FirstNonEmptyOrNull(
                campusCustom?.CampusDisplayName,
                collegeDefault?.CampusDisplayName,
                student?.CampusNavigation?.CampusName);

            string address = FirstNonEmpty(
                campusCustom?.CollegeAddress,
                collegeDefault?.CollegeAddress,
                student?.CampusNavigation?.Address,
                "Campus Administration & Accounts Division");

            var contactParts = new List<string>();
            if (!string.IsNullOrWhiteSpace(campusName)) contactParts.Add(campusName);
            contactParts.Add(address);
            var phone = FirstNonEmptyOrNull(campusCustom?.ContactNumber, collegeDefault?.ContactNumber, student?.CampusNavigation?.ContactPhone);
            var email = FirstNonEmptyOrNull(campusCustom?.ContactEmail, collegeDefault?.ContactEmail, student?.CampusNavigation?.Email);
            if (!string.IsNullOrWhiteSpace(phone)) contactParts.Add($"Ph: {phone}");
            if (!string.IsNullOrWhiteSpace(email)) contactParts.Add(email);

            var academicYearName = studentFee?.FeeStructure?.AcademicYear?.AcademicYearName
                ?? student?.AcademicYear?.AcademicYearName;

            var remarkParts = new List<string>();
            if (!string.IsNullOrWhiteSpace(academicYearName)) remarkParts.Add($"Academic Year: {academicYearName}");
            if (!string.IsNullOrWhiteSpace(studentFee?.FeeStructure?.StructureName)) remarkParts.Add($"Fee Plan: {studentFee.FeeStructure.StructureName}");
            if (!string.IsNullOrWhiteSpace(payment.Remarks)) remarkParts.Add(payment.Remarks);
            var footerMsg = FirstNonEmptyOrNull(campusCustom?.FooterMessage, collegeDefault?.FooterMessage);
            if (!string.IsNullOrWhiteSpace(footerMsg)) remarkParts.Add(footerMsg);

            var model = new FeeReceiptPdfModel
            {
                InstitutionName = institutionName,
                InstitutionAddress = string.Join(" · ", contactParts),
                ReceiptNumber = receiptNo,
                ReceiptDate = payment.Receipt?.ReceiptDate ?? payment.PaymentDate,
                StudentName = !string.IsNullOrWhiteSpace(student?.StudentName) ? student.StudentName : $"Student #{payment.StudentId}",
                AdmissionNo = student?.AdmissionNo ?? "-",
                Course = studentFee?.FeeStructure?.Group?.GroupName ?? "Academic Program",
                Section = student?.SectionNavigation?.SectionName ?? "General",
                AmountPaid = payment.Amount,
                TotalPayable = studentFee?.PayableAmount ?? payment.Amount,
                RemainingBalance = studentFee?.BalanceAmount ?? 0,
                PaymentMethod = payment.PaymentMode,
                TransactionReference = string.IsNullOrWhiteSpace(payment.TransactionReference) ? receiptNo : payment.TransactionReference,
                Remarks = remarkParts.Count > 0 ? string.Join(" | ", remarkParts) : null
            };

            var document = new FeeReceiptPdfDocument(model);
            var pdfBytes = document.GeneratePdf();
            var safeReceipt = Regex.Replace(receiptNo, @"[^A-Za-z0-9\-_]", "_");
            return (pdfBytes, $"Receipt_{safeReceipt}.pdf");
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate QuestPDF receipt for FeePaymentId={FeePaymentId}", feePaymentId);
            return null;
        }
    }

    private static string FirstNonEmpty(params string?[] candidates)
    {
        foreach (var c in candidates)
        {
            if (!string.IsNullOrWhiteSpace(c)) return c.Trim();
        }
        return string.Empty;
    }

    private static string? FirstNonEmptyOrNull(params string?[] candidates)
    {
        foreach (var c in candidates)
        {
            if (!string.IsNullOrWhiteSpace(c)) return c.Trim();
        }
        return null;
    }
}
