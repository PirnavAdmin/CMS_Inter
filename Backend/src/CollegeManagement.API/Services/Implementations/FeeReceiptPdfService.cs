using System;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.Services.Exports;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
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
        try
        {
            var payment = await _context.FeePayments
                .AsNoTracking()
                .Include(p => p.Student)
                .Include(p => p.StudentFee)
                    .ThenInclude(sf => sf!.FeeStructure)
                        .ThenInclude(fs => fs!.Group)
                .Include(p => p.Receipt)
                .FirstOrDefaultAsync(p => p.FeePaymentId == feePaymentId);

            if (payment == null)
            {
                _logger.LogWarning("FeePayment not found for ID={FeePaymentId}", feePaymentId);
                return null;
            }

            var student = payment.Student;
            var studentFee = payment.StudentFee;
            var receiptNo = payment.Receipt?.ReceiptNumber ?? payment.ReceiptNumber ?? $"REC-{payment.FeePaymentId:D6}";

            var model = new FeeReceiptPdfModel
            {
                InstitutionName = "PIRNAV EDUCATIONAL GROUP",
                InstitutionAddress = "Campus Administration & Accounts Division",
                ReceiptNumber = receiptNo,
                ReceiptDate = payment.Receipt?.ReceiptDate ?? payment.PaymentDate,
                StudentName = !string.IsNullOrWhiteSpace(student?.StudentName) ? student.StudentName : $"Student #{payment.StudentId}",
                AdmissionNo = student?.AdmissionNo ?? "",
                Course = studentFee?.FeeStructure?.Group?.GroupName ?? "Degree Course",
                Section = "",
                AmountPaid = payment.Amount,
                TotalPayable = studentFee?.PayableAmount ?? payment.Amount,
                RemainingBalance = studentFee?.BalanceAmount ?? 0,
                PaymentMethod = payment.PaymentMode ?? "Online Payment",
                TransactionReference = payment.TransactionReference ?? "-",
                Remarks = payment.Remarks
            };

            var document = new FeeReceiptPdfDocument(model);
            var bytes = document.GeneratePdf();
            var fileName = $"Receipt_{receiptNo}.pdf";

            return (bytes, fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate QuestPDF receipt for FeePaymentId={FeePaymentId}", feePaymentId);
            return null;
        }
    }
}
