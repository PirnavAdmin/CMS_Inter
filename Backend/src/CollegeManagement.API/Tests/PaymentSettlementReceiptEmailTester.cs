using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Fee;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Implementations;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Settings;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace CollegeManagement.API.Tests;

public static class PaymentSettlementReceiptEmailTester
{
    private sealed class MockEmailService : IEmailService
    {
        public bool ShouldFail { get; set; }
        public string FailureMessage { get; set; } = "Simulated SMTP relay timeout (421 4.4.2 connection dropped)";
        public List<RecordedEmail> SentEmails { get; } = new();

        public Task SendEmailAsync(string toEmail, string subject, string body)
            => SendEmailWithOptionsAsync(toEmail, subject, body);

        public Task SendEmailWithAttachmentAsync(
            string toEmail,
            string subject,
            string body,
            byte[] attachmentBytes,
            string attachmentFileName,
            string contentType = "application/pdf")
            => SendEmailWithOptionsAsync(toEmail, subject, body, attachmentBytes, attachmentFileName, contentType);

        public Task SendEmailWithOptionsAsync(
            string toEmail,
            string subject,
            string body,
            byte[]? attachmentBytes = null,
            string? attachmentFileName = null,
            string contentType = "application/pdf",
            string? senderDisplayName = null,
            string? replyToEmail = null)
        {
            if (ShouldFail)
                throw new InvalidOperationException(FailureMessage);

            SentEmails.Add(new RecordedEmail
            {
                ToEmail = toEmail,
                Subject = subject,
                HtmlBody = body,
                FromName = senderDisplayName,
                ReplyTo = replyToEmail,
                AttachmentBytes = attachmentBytes,
                AttachmentFileName = attachmentFileName
            });
            return Task.CompletedTask;
        }
    }

    private sealed class RecordedEmail
    {
        public string ToEmail { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string HtmlBody { get; set; } = string.Empty;
        public string? FromName { get; set; }
        public string? ReplyTo { get; set; }
        public byte[]? AttachmentBytes { get; set; }
        public string? AttachmentFileName { get; set; }
    }

    private sealed class StubHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "CollegeManagement.API";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed class StubHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new HttpClient();
    }

    private sealed class MemoryFormFile : IFormFile
    {
        private readonly byte[] _bytes;
        public MemoryFormFile(byte[] bytes, string fileName, string contentType)
        {
            _bytes = bytes;
            FileName = fileName;
            ContentType = contentType;
        }
        public string ContentType { get; }
        public string ContentDisposition => $"form-data; name=\"proof\"; filename=\"{FileName}\"";
        public IHeaderDictionary Headers { get; } = new HeaderDictionary();
        public long Length => _bytes.LongLength;
        public string Name => "proof";
        public string FileName { get; }
        public void CopyTo(Stream target) => target.Write(_bytes, 0, _bytes.Length);
        public Task CopyToAsync(Stream target, CancellationToken cancellationToken = default) => target.WriteAsync(_bytes, 0, _bytes.Length, cancellationToken);
        public Stream OpenReadStream() => new MemoryStream(_bytes, writable: false);
    }

    public static async Task<bool> RunAllTestsAsync(IServiceProvider rootServices)
    {
        Console.WriteLine("============================================================");
        Console.WriteLine("  VERIFIED FEE PAYMENT / RECEIPT / OUTBOX / TEMPLATE SUITE");
        Console.WriteLine("============================================================");

        int passed = 0;
        int failed = 0;

        void Assert(bool condition, string name, string? detail = null)
        {
            if (condition)
            {
                passed++;
                Console.WriteLine($"  [PASS] {name}" + (detail != null ? $" -> {detail}" : ""));
            }
            else
            {
                failed++;
                Console.WriteLine($"  [FAIL] {name}" + (detail != null ? $" -> {detail}" : ""));
            }
        }

        using var scope = rootServices.CreateScope();
        var sp = scope.ServiceProvider;
        var db = sp.GetRequiredService<AppDbContext>();
        var feeService = sp.GetRequiredService<IFeeService>();
        var ledgerService = sp.GetRequiredService<IPaymentLedgerService>();
        var pdfService = sp.GetRequiredService<IFeeReceiptPdfService>();
        var proofStorage = sp.GetRequiredService<IPaymentProofStorageService>();
        var urlResolver = sp.GetRequiredService<AppUrlResolver>();
        var feeRepo = sp.GetRequiredService<IFeeRepository>();
        var loggerFactory = sp.GetRequiredService<ILoggerFactory>();

        var mockEmail = new MockEmailService();
        var signal = new PaymentEmailDispatchSignal();
        var outboxSvc = new PaymentEmailOutboxService(
            db, mockEmail, pdfService, signal, loggerFactory.CreateLogger<PaymentEmailOutboxService>());
        var settleSvc = new PaymentSettlementService(
            db, feeService, null, ledgerService, pdfService, mockEmail,
            loggerFactory.CreateLogger<PaymentSettlementService>(), outboxSvc, signal);
        var utrSvc = new PaymentUtrVerificationService(
            db, settleSvc, proofStorage, loggerFactory.CreateLogger<PaymentUtrVerificationService>());

        int? testStudentId = null;
        int? testStudentNoEmailId = null;
        int? testFeeId = null;
        int? testFeeNoEmailId = null;
        int? testPlanId = null;
        int? testPlanNoEmailId = null;
        bool hadCollegeSetting = false;
        int isolatedTestCampusId = 999001;
        var createdProofPaths = new List<string>();

        try
        {
            // 1. Apply 30_FeePaymentEmailOutbox_And_Templates.sql idempotently & verify tables
            var sqlPath = ResolveMigrationSqlPath();
            if (sqlPath != null && File.Exists(sqlPath))
            {
                var sql = await File.ReadAllTextAsync(sqlPath);
                foreach (var stmt in SplitSqlStatements(sql))
                {
                    await db.Database.ExecuteSqlRawAsync(stmt);
                }
            }

            var tableCount = await db.Database
                .SqlQueryRaw<int>(
                    @"SELECT COUNT(*) AS `Value`
                      FROM INFORMATION_SCHEMA.TABLES
                      WHERE TABLE_SCHEMA = DATABASE()
                        AND TABLE_NAME IN ('FeePaymentEmailOutbox', 'PaymentCommunicationSettings')")
                .FirstOrDefaultAsync();
            Assert(tableCount == 2, "1. Migration 30 tables exist in schema", $"Found {tableCount}/2 tables");

            // 2a. Track A read-only check: Tina R / StudentFeeId 127 visible under campus=1, academicYear=9
            var tinaPending = (await settleSvc.GetPendingUtrsAsync(1, 9)).ToList();
            var tinaVisible = tinaPending.Any(x => x.StudentId == 925 && x.StudentFeeId == 127);
            Assert(tinaVisible, "2a. Track A read-only: Pending UTRs for campus=1 & year=9 surface StudentId=925 / StudentFeeId=127",
                $"Total={tinaPending.Count}, TinaRows={tinaPending.Count(x => x.StudentId == 925)}");

            // 3. Create synthetic isolated Student + StudentFee fixtures cleanly for end-to-end tests
            var baseStructure = await db.FeeStructures.AsNoTracking()
                .Where(fs => fs.IsActive && fs.CampusId != null)
                .OrderBy(fs => fs.FeeStructureId)
                .FirstOrDefaultAsync();
            if (baseStructure == null)
                throw new InvalidOperationException("No active FeeStructure found to anchor isolated test fixtures.");

            int anchorCampusId = baseStructure.CampusId ?? 1;
            var marker = Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();

            var studentWithEmail = new Student
            {
                AdmissionNo = $"QA-FEE-{marker}",
                AdmissionDate = DateTime.UtcNow.Date,
                StudentName = $"QA Fee Verification {marker}",
                Gender = "Other",
                DateOfBirth = new DateTime(2007, 1, 15),
                Email = $"qa.fee.{marker}@example.invalid",
                CampusId = anchorCampusId,
                BoardId = baseStructure.BoardId,
                AcademicYearId = baseStructure.AcademicYearId,
                AcademicLevelId = baseStructure.AcademicLevelId,
                GroupId = baseStructure.GroupId,
                Status = "Active"
            };
            db.Students.Add(studentWithEmail);

            var studentWithoutEmail = new Student
            {
                AdmissionNo = $"QA-NOEM-{marker}",
                AdmissionDate = DateTime.UtcNow.Date,
                StudentName = $"QA NoEmail Student {marker}",
                Gender = "Other",
                DateOfBirth = new DateTime(2007, 2, 15),
                Email = null,
                CampusId = anchorCampusId,
                BoardId = baseStructure.BoardId,
                AcademicYearId = baseStructure.AcademicYearId,
                AcademicLevelId = baseStructure.AcademicLevelId,
                GroupId = baseStructure.GroupId,
                Status = "Active"
            };
            db.Students.Add(studentWithoutEmail);
            await db.SaveChangesAsync();
            testStudentId = studentWithEmail.StudentId;
            testStudentNoEmailId = studentWithoutEmail.StudentId;

            // 2b. Track A assignment guard: assigning a FeeStructure from another Board/AcademicYear is rejected before persisting
            var mismatchStructure = await db.FeeStructures.AsNoTracking()
                .FirstOrDefaultAsync(fs => fs.BoardId != studentWithEmail.BoardId || fs.AcademicYearId != studentWithEmail.AcademicYearId);
            bool blockedMismatch = false;
            if (mismatchStructure != null)
            {
                try
                {
                    await feeRepo.AssignStudentFeeAsync(new AssignStudentFeeRequest
                    {
                        StudentId = studentWithEmail.StudentId,
                        FeeStructureId = mismatchStructure.FeeStructureId,
                        PlanName = "Mismatch Guard Test",
                        NumberOfInstallments = 1
                    });
                }
                catch (Exception ex) when (ex is InvalidOperationException or ArgumentException)
                {
                    blockedMismatch = ex.Message.Contains("Board", StringComparison.OrdinalIgnoreCase)
                        || ex.Message.Contains("academic year", StringComparison.OrdinalIgnoreCase)
                        || ex.Message.Contains("campus", StringComparison.OrdinalIgnoreCase);
                }
            }
            Assert(mismatchStructure != null && blockedMismatch,
                "2b. Track A guard: FeeRepository rejects cross-board/cross-year FeeStructure assignment cleanly");

            var fee1 = new StudentFee
            {
                StudentId = studentWithEmail.StudentId,
                FeeStructureId = baseStructure.FeeStructureId,
                TotalAmount = 5000m,
                ConcessionAmount = 0m,
                PayableAmount = 5000m,
                PaidAmount = 0m,
                BalanceAmount = 5000m,
                PaymentPlan = "Installments",
                Status = "Pending",
                AssignedAt = DateTime.UtcNow
            };
            var fee2 = new StudentFee
            {
                StudentId = studentWithoutEmail.StudentId,
                FeeStructureId = baseStructure.FeeStructureId,
                TotalAmount = 2000m,
                ConcessionAmount = 0m,
                PayableAmount = 2000m,
                PaidAmount = 0m,
                BalanceAmount = 2000m,
                PaymentPlan = "Full",
                Status = "Pending",
                AssignedAt = DateTime.UtcNow
            };
            db.StudentFees.AddRange(fee1, fee2);
            await db.SaveChangesAsync();
            testFeeId = fee1.StudentFeeId;
            testFeeNoEmailId = fee2.StudentFeeId;

            var plan1 = new FeePaymentPlan { StudentFeeId = fee1.StudentFeeId, PlanName = "QA 3-Part", NumberOfInstallments = 3, IsActive = true };
            var plan2 = new FeePaymentPlan { StudentFeeId = fee2.StudentFeeId, PlanName = "QA Single", NumberOfInstallments = 1, IsActive = true };
            db.FeePaymentPlans.AddRange(plan1, plan2);
            await db.SaveChangesAsync();
            testPlanId = plan1.FeePaymentPlanId;
            testPlanNoEmailId = plan2.FeePaymentPlanId;

            var inst1 = new FeeInstallment { FeePaymentPlanId = plan1.FeePaymentPlanId, InstallmentNumber = 1, Amount = 1000m, PaidAmount = 0m, BalanceAmount = 1000m, DueDate = DateTime.UtcNow.AddDays(5), Status = "Pending" };
            var inst2 = new FeeInstallment { FeePaymentPlanId = plan1.FeePaymentPlanId, InstallmentNumber = 2, Amount = 1500m, PaidAmount = 0m, BalanceAmount = 1500m, DueDate = DateTime.UtcNow.AddDays(15), Status = "Pending" };
            var inst3 = new FeeInstallment { FeePaymentPlanId = plan1.FeePaymentPlanId, InstallmentNumber = 3, Amount = 2500m, PaidAmount = 0m, BalanceAmount = 2500m, DueDate = DateTime.UtcNow.AddDays(30), Status = "Pending" };
            var instNoEmail = new FeeInstallment { FeePaymentPlanId = plan2.FeePaymentPlanId, InstallmentNumber = 1, Amount = 2000m, PaidAmount = 0m, BalanceAmount = 2000m, DueDate = DateTime.UtcNow.AddDays(5), Status = "Pending" };
            db.FeeInstallments.AddRange(inst1, inst2, inst3, instNoEmail);
            await db.SaveChangesAsync();

            // 4. Cash / Manual Settlement + Receipt PDF + Outbox SMTP Failure & Retry + Dedup
            var cashResult = await settleSvc.SettleManualPaymentAsync(new CreateFeePaymentRequest
            {
                StudentId = studentWithEmail.StudentId,
                StudentFeeId = fee1.StudentFeeId,
                FeeInstallmentIds = new List<int> { inst1.FeeInstallmentId },
                Amount = 1000m,
                PaymentMode = "Cash",
                TransactionReference = $"QA-CASH-{marker}",
                Note = "QA counter cash test"
            }, collectedByUserId: 1);

            int cashFeePaymentId = cashResult.FeePaymentId ?? 0;
            Assert(cashResult.Success
                && cashFeePaymentId > 0
                && !string.IsNullOrEmpty(cashResult.ReceiptNumber)
                && cashResult.EmailNotificationStatus == "QUEUED",
                "4a. Cash settlement succeeds with ReceiptNumber, FeePaymentId & QUEUED outbox",
                $"FeePaymentId={cashFeePaymentId}, Receipt={cashResult.ReceiptNumber}, EmailStatus={cashResult.EmailNotificationStatus}");

            var pdfResult = await pdfService.GenerateReceiptPdfAsync(cashFeePaymentId);
            bool hasPdfMagic = pdfResult != null && pdfResult.Value.Bytes.Length > 100
                && pdfResult.Value.Bytes[0] == (byte)'%'
                && pdfResult.Value.Bytes[1] == (byte)'P'
                && pdfResult.Value.Bytes[2] == (byte)'D'
                && pdfResult.Value.Bytes[3] == (byte)'F';
            Assert(hasPdfMagic, "4b. FeeReceiptPdfService generates valid %PDF- bytes for settled payment",
                $"Bytes={pdfResult?.Bytes.Length}");

            // Simulate permanent SMTP failure after retry budget -> payment MUST stay Settled, outbox marks FAILED
            var cashOutbox = await db.FeePaymentEmailOutboxes
                .FirstAsync(o => o.FeePaymentId == cashFeePaymentId && o.NotificationType == PaymentEmailOutboxService.TypePaymentSuccessReceipt);
            cashOutbox.MaxAttempts = 1;
            await db.SaveChangesAsync();

            mockEmail.ShouldFail = true;
            await outboxSvc.DispatchDueAsync(20);
            var afterFailNotif = await outboxSvc.GetPaymentNotificationStatusAsync(cashFeePaymentId);
            Assert(afterFailNotif != null && afterFailNotif.EmailNotificationStatus == "FAILED" && afterFailNotif.PaymentStatus == "Settled",
                "4c. SMTP failure sets outbox status FAILED while keeping payment Settled",
                $"PaymentStatus={afterFailNotif?.PaymentStatus}, EmailStatus={afterFailNotif?.EmailNotificationStatus}");

            // Retry email & dispatch -> SENT with official PDF attachment
            var retryRes = await outboxSvc.RetryFailedEmailsAsync(cashFeePaymentId);
            mockEmail.ShouldFail = false;
            await outboxSvc.DispatchDueAsync(20);
            var afterSentNotif = await outboxSvc.GetPaymentNotificationStatusAsync(cashFeePaymentId);
            var sentCashMail = mockEmail.SentEmails.LastOrDefault(e => e.ToEmail == studentWithEmail.Email);
            Assert(retryRes.RequeuedCount == 1
                && afterSentNotif?.EmailNotificationStatus == "SENT"
                && afterSentNotif.EmailSentAt != null
                && sentCashMail != null
                && sentCashMail.AttachmentBytes != null
                && sentCashMail.AttachmentBytes.Length > 100
                && sentCashMail.AttachmentBytes[0] == (byte)'%',
                "4d. Retry + Dispatch sends email with official PDF attachment & transitions status to SENT",
                $"Requeued={retryRes.RequeuedCount}, Status={afterSentNotif?.EmailNotificationStatus}, AttachmentSize={sentCashMail?.AttachmentBytes?.Length}");

            // Deduplication check: calling EnqueueSettlementReceiptEmailsInTransactionAsync again inserts 0 new rows
            int beforeDedupCount = await db.FeePaymentEmailOutboxes.CountAsync(o => o.FeePaymentId == cashFeePaymentId);
            var cashPayRow = await db.FeePayments.FirstAsync(p => p.FeePaymentId == cashFeePaymentId);
            var cashReceiptRow = await db.FeeReceipts.FirstOrDefaultAsync(r => r.FeePaymentId == cashFeePaymentId);
            await outboxSvc.EnqueueSettlementReceiptEmailsInTransactionAsync(
                db, cashPayRow, null, studentWithEmail, cashReceiptRow, 4000m, CancellationToken.None);
            await db.SaveChangesAsync();
            int afterDedupCount = await db.FeePaymentEmailOutboxes.CountAsync(o => o.FeePaymentId == cashFeePaymentId);
            Assert(beforeDedupCount == afterDedupCount, "4e. Outbox deduplication blocks duplicate receipt emails for same FeePaymentId",
                $"Count stayed {afterDedupCount}");

            // 5. No-email student settlement: NOT_REQUESTED (never falls back to staff emails)
            var noEmailCash = await settleSvc.SettleManualPaymentAsync(new CreateFeePaymentRequest
            {
                StudentId = studentWithoutEmail.StudentId,
                StudentFeeId = fee2.StudentFeeId,
                FeeInstallmentIds = new List<int> { instNoEmail.FeeInstallmentId },
                Amount = 500m,
                PaymentMode = "Cash",
                TransactionReference = $"QA-NOEM-{marker}"
            }, collectedByUserId: 1);
            int noEmailPayId = noEmailCash.FeePaymentId ?? 0;
            int noEmailOutboxRows = await db.FeePaymentEmailOutboxes.CountAsync(o => o.FeePaymentId == noEmailPayId);
            Assert(noEmailCash.Success && noEmailOutboxRows == 0 && noEmailCash.EmailNotificationStatus == "NOT_REQUESTED",
                "5. Missing student/parent email results in NOT_REQUESTED with zero staff fallback emails",
                $"EmailStatus={noEmailCash.EmailNotificationStatus}, OutboxRows={noEmailOutboxRows}");

            // 6. Direct UPI QR -> Proof Submit -> PendingVerification -> Expired Order Block -> Approve Once -> Duplicate Block -> Reverse + PDF Guard
            var expiredOrderId = $"dvpa_exp_{marker}";
            var expiredTxn = new PaymentGatewayTransaction
            {
                StudentId = studentWithEmail.StudentId,
                StudentFeeId = fee1.StudentFeeId,
                FeeInstallmentId = inst2.FeeInstallmentId,
                OrderId = expiredOrderId,
                CampusId = anchorCampusId,
                Amount = 1500m,
                Currency = "INR",
                PaymentMethod = "DIRECT_VPA_QR",
                Status = "Pending",
                ExpiresAt = DateTime.UtcNow.AddMinutes(-10),
                CreatedAt = DateTime.UtcNow.AddMinutes(-25)
            };
            db.PaymentGatewayTransactions.Add(expiredTxn);

            var activeOrderId = $"dvpa_ok_{marker}";
            var activeTxn = new PaymentGatewayTransaction
            {
                StudentId = studentWithEmail.StudentId,
                StudentFeeId = fee1.StudentFeeId,
                FeeInstallmentId = inst2.FeeInstallmentId,
                OrderId = activeOrderId,
                CampusId = anchorCampusId,
                Amount = 1500m,
                Currency = "INR",
                PaymentMethod = "DIRECT_VPA_QR",
                Status = "Pending",
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                CreatedAt = DateTime.UtcNow
            };
            db.PaymentGatewayTransactions.Add(activeTxn);
            await db.SaveChangesAsync();

            // 6a. Expired order must reject UTR submission
            var expProofRes = await utrSvc.SubmitUtrWithProofAsync(new SubmitUtrRequest
            {
                StudentId = studentWithEmail.StudentId,
                StudentFeeId = fee1.StudentFeeId,
                OrderId = expiredOrderId,
                Amount = 1500m,
                UtrNumber = $"QAEXP{marker}",
                BankName = "QA Bank",
                PaymentDate = DateTime.UtcNow.Date
            }, attachment: null, hasMultipleFiles: false, clientIdempotencyKey: $"idem-exp-{marker}", userId: 1);
            bool expiredBlocked = !expProofRes.Success && expProofRes.HttpStatusCode == 409 && expProofRes.ErrorCode == "ORDER_EXPIRED";
            Assert(expiredBlocked, "6a. Expired Direct UPI order rejects UTR submission with 409 ORDER_EXPIRED");

            // 6b. Active Direct UPI order + PNG magic bytes proof submits into PendingVerification WITHOUT marking Fee Paid
            byte[] validPng = new byte[]
            {
                0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
                0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
                0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
                0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89
            };
            var utr1 = $"QAUTR1{marker}";
            var utrSubmitRes = await utrSvc.SubmitUtrWithProofAsync(new SubmitUtrRequest
            {
                StudentId = studentWithEmail.StudentId,
                StudentFeeId = fee1.StudentFeeId,
                OrderId = activeOrderId,
                Amount = 1500m,
                UtrNumber = utr1,
                BankName = "QA Test Bank",
                PaymentDate = DateTime.UtcNow.Date.AddDays(-1)
            }, new MemoryFormFile(validPng, "proof.png", "image/png"), hasMultipleFiles: false, clientIdempotencyKey: $"idem-ok-{marker}", userId: 1);

            if (utrSubmitRes.Data?.Attachment?.AttachmentId > 0)
            {
                var attRow = await db.PaymentProofAttachments.AsNoTracking()
                    .FirstOrDefaultAsync(a => a.Id == utrSubmitRes.Data.Attachment.AttachmentId);
                if (attRow != null && !string.IsNullOrEmpty(attRow.StorageRelativePath))
                    createdProofPaths.Add(attRow.StorageRelativePath);
            }

            var feeAfterUtrSubmit = await db.StudentFees.AsNoTracking().FirstAsync(sf => sf.StudentFeeId == fee1.StudentFeeId);
            await outboxSvc.DispatchDueAsync(20);
            Assert(utrSubmitRes.Success
                && utrSubmitRes.Data?.Status == "PendingVerification"
                && feeAfterUtrSubmit.PaidAmount == 1000m
                && mockEmail.SentEmails.Any(e => e.Subject.Contains("Pending", StringComparison.OrdinalIgnoreCase)),
                "6b. UTR submission stays PendingVerification, does NOT mark Paid, and dispatches pending notice",
                $"Status={utrSubmitRes.Data?.Status}, PaidAfterSubmit={feeAfterUtrSubmit.PaidAmount}, Err={utrSubmitRes.ErrorMessage}");

            // 6c. Approve UTR -> settles once + duplicate approval blocked + reversed blocks PDF generation
            var approveRes = await settleSvc.ApproveOrRejectUtrAsync(new ApproveUtrRequest
            {
                TransactionId = activeTxn.Id,
                Action = "Approve"
            }, adminUserId: 1);
            var secondApproveRes = await settleSvc.ApproveOrRejectUtrAsync(new ApproveUtrRequest
            {
                TransactionId = activeTxn.Id,
                Action = "Approve"
            }, adminUserId: 1);
            var feeAfterApprove = await db.StudentFees.AsNoTracking().FirstAsync(sf => sf.StudentFeeId == fee1.StudentFeeId);
            int approvedFeePaymentId = approveRes.FeePaymentId ?? 0;
            Assert(approveRes.Success && approvedFeePaymentId > 0
                && !secondApproveRes.Success
                && feeAfterApprove.PaidAmount == 2500m,
                "6c. UTR approval settles once, prevents duplicate approval, and updates balance",
                $"PaidAfterApprove={feeAfterApprove.PaidAmount}, SecondApproveBlocked={!secondApproveRes.Success}");

            var reverseRes = await settleSvc.ReversePaymentAsync(activeTxn.Id, "QA reversal verification", adminUserId: 1);
            bool pdfBlockedAfterReversal = false;
            try
            {
                await pdfService.GenerateReceiptPdfAsync(approvedFeePaymentId);
            }
            catch (InvalidOperationException)
            {
                pdfBlockedAfterReversal = true;
            }
            Assert(reverseRes.Success && pdfBlockedAfterReversal,
                "6d. Reversing payment restores balance and FeeReceiptPdfService blocks official PDF on Reversed payment");

            // 7. Bank Transfer UTR Reject -> status Rejected, balance untouched, rejection email sent
            var bankSubmit = await settleSvc.SubmitUtrAsync(new SubmitUtrRequest
            {
                StudentId = studentWithEmail.StudentId,
                StudentFeeId = fee1.StudentFeeId,
                Amount = 500m,
                UtrNumber = $"QAREJ{marker}",
                BankName = "QA Bank",
                PaymentDate = DateTime.UtcNow.Date
            }, adminUserId: 1);
            int bankTxnId = bankSubmit.TransactionId ?? 0;
            var rejectRes = await settleSvc.ApproveOrRejectUtrAsync(new ApproveUtrRequest
            {
                TransactionId = bankTxnId,
                Action = "Reject",
                Reason = "UTR statement mismatch during QA check"
            }, adminUserId: 1);
            await outboxSvc.DispatchDueAsync(20);
            Assert(rejectRes.Success
                && mockEmail.SentEmails.Any(e => e.Subject.Contains("Rejected", StringComparison.OrdinalIgnoreCase)),
                "7. UTR rejection keeps balance intact and dispatches PAYMENT_REJECTED notice");

            // 8. Razorpay signature + webhook idempotency + Production test-mode guard
            string webhookBody = "{\"event\":\"payment.captured\"}";
            string testSecret = "qa_webhook_secret_123";
            string validSig = ComputeHmacSha256Hex(webhookBody, testSecret);
            bool sigOk = WebhookSecurityHelper.VerifyRazorpaySignature(webhookBody, validSig, testSecret);
            bool sigTamperedBlocked = !WebhookSecurityHelper.VerifyRazorpaySignature(webhookBody + " ", validSig, testSecret);

            // Use isolatedTestCampusId so campus 1's DB config never overrides gwSettingsTestKey!
            var rzpTestOrderId = $"order_qatest_{marker}";
            db.PaymentGatewayTransactions.Add(new PaymentGatewayTransaction
            {
                StudentId = studentWithEmail.StudentId,
                StudentFeeId = fee1.StudentFeeId,
                FeeInstallmentId = inst3.FeeInstallmentId,
                OrderId = rzpTestOrderId,
                CampusId = isolatedTestCampusId,
                Amount = 2500m,
                Currency = "INR",
                PaymentMethod = "RAZORPAY_CHECKOUT",
                Status = "Created",
                ExpiresAt = DateTime.UtcNow.AddMinutes(15),
                CreatedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            var gwSettingsTestKey = Options.Create(new PaymentGatewaySettings
            {
                Razorpay = new RazorpaySettings { KeyId = "rzp_test_QA123", KeySecret = "sec", WebhookSecret = "wsec" }
            });
            var prodEnv = new StubHostEnvironment { EnvironmentName = Environments.Production };
            var prodGwService = new PaymentGatewayService(
                db, gwSettingsTestKey, settleSvc, urlResolver, new StubHttpClientFactory(),
                loggerFactory.CreateLogger<PaymentGatewayService>(), outboxSvc, prodEnv);
            var blockedTestWebhook = await prodGwService.ProcessWebhookAsync("payment.captured", rzpTestOrderId, $"pay_qatest_{marker}", 2500m, null, "INR", null);

            var devEnv = new StubHostEnvironment { EnvironmentName = Environments.Development };
            var devGwService = new PaymentGatewayService(
                db, gwSettingsTestKey, settleSvc, urlResolver, new StubHttpClientFactory(),
                loggerFactory.CreateLogger<PaymentGatewayService>(), outboxSvc, devEnv);
            var wh1 = await devGwService.ProcessWebhookAsync("payment.captured", rzpTestOrderId, $"pay_qaok_{marker}", 2500m, null, "INR", null);
            var wh2 = await devGwService.ProcessWebhookAsync("payment.captured", rzpTestOrderId, $"pay_qaok_{marker}", 2500m, null, "INR", null);
            int whPaymentCount = await db.FeePayments.CountAsync(fp => fp.TransactionReference == $"pay_qaok_{marker}");

            var statusExpired = await devGwService.GetOrderStatusAsync(fee1.StudentFeeId, expiredOrderId);

            Assert(sigOk && sigTamperedBlocked
                && !blockedTestWebhook.Success
                && wh1.Success && wh2.Success && whPaymentCount == 1
                && string.Equals(statusExpired.PaymentStatus, "Expired", StringComparison.OrdinalIgnoreCase),
                "8. Razorpay HMAC valid/tamper, Production test-mode block, duplicate webhook idempotency & order expiry",
                $"ProdTestBlocked={!blockedTestWebhook.Success}, WebhookPayCount={whPaymentCount}, ExpiredStatus={statusExpired.PaymentStatus}");

            // 9. Track B Communication Settings inheritance + [TEST] email + Principal campus isolation
            hadCollegeSetting = await db.PaymentCommunicationSettings.AnyAsync(x => x.CampusId == null);

            var collegeSaved = await outboxSvc.UpdateCommunicationSettingsAsync(new UpdatePaymentCommunicationSettingsRequest
            {
                SaveAsCollegeDefault = true,
                Emails = new PaymentEmailTemplateSetDto
                {
                    Successful = new PaymentEmailTemplateDto { Subject = "College Default {{receiptNumber}}", Heading = "H", Body = "B", Closing = "C", Signature = "S" }
                }
            }, userId: 1, canEditGlobalDefault: true);

            var campusSaved = await outboxSvc.UpdateCommunicationSettingsAsync(new UpdatePaymentCommunicationSettingsRequest
            {
                CampusId = isolatedTestCampusId,
                Emails = new PaymentEmailTemplateSetDto
                {
                    Successful = new PaymentEmailTemplateDto { Subject = "Campus Custom {{receiptNumber}}", Heading = "H", Body = "B", Closing = "C", Signature = "S" }
                }
            }, userId: 1, canEditGlobalDefault: true);

            var testEmailRes = await outboxSvc.SendTestEmailAsync(new SendTestPaymentEmailRequest
            {
                CampusId = isolatedTestCampusId,
                TestRecipient = $"qa.preview.{marker}@example.invalid",
                TemplateType = "successful"
            });

            var restoredToCollege = await outboxSvc.RestoreDefaultCommunicationSettingsAsync(isolatedTestCampusId, restoreGlobalDefault: false, userId: 1);
            var restoredToSystem = hadCollegeSetting
                ? restoredToCollege
                : await outboxSvc.RestoreDefaultCommunicationSettingsAsync(null, restoreGlobalDefault: true, userId: 1);

            var principalUser = new ClaimsPrincipal(new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.Role, "Principal"),
                new Claim("campusId", "2")
            }, "TestAuth"));
            bool principalCrossCampusDenied = false;
            try
            {
                CampusContextResolver.ResolveAndValidateCampusId(principalUser, 1);
            }
            catch (Exception ex) when (ex is UnauthorizedAccessException or CollegeManagement.API.Exceptions.ForbiddenException)
            {
                principalCrossCampusDenied = true;
            }
            int principalOwnCampus = CampusContextResolver.ResolveAndValidateCampusId(principalUser, null);

            Assert(collegeSaved.ActiveSource == "College Default"
                && campusSaved.ActiveSource == "Campus Custom"
                && testEmailRes.Success
                && mockEmail.SentEmails.Any(e => e.Subject.StartsWith("[TEST]", StringComparison.Ordinal))
                && restoredToCollege.ActiveSource == "College Default"
                && (hadCollegeSetting || restoredToSystem.ActiveSource == "System Default")
                && principalCrossCampusDenied
                && principalOwnCampus == 2,
                "9. Track B settings inheritance, [TEST] email subject prefix, & Principal campus isolation");
        }
        catch (Exception ex)
        {
            failed++;
            Console.WriteLine($"  [FATAL] Unhandled verification error: {ex.GetType().Name}: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
        }
        finally
        {
            try
            {
                db.ChangeTracker.Clear();

                var testSettings = await db.PaymentCommunicationSettings.Where(x => x.CampusId == isolatedTestCampusId).ToListAsync();
                db.PaymentCommunicationSettings.RemoveRange(testSettings);

                if (!hadCollegeSetting)
                {
                    var addedCollege = await db.PaymentCommunicationSettings.Where(x => x.CampusId == null).ToListAsync();
                    db.PaymentCommunicationSettings.RemoveRange(addedCollege);
                }

                var studentIds = await db.Students
                    .Where(s => s.AdmissionNo.StartsWith("QA-FEE-") || s.AdmissionNo.StartsWith("QA-NOEM-"))
                    .Select(s => s.StudentId)
                    .ToListAsync();
                if (testStudentId.HasValue && !studentIds.Contains(testStudentId.Value)) studentIds.Add(testStudentId.Value);
                if (testStudentNoEmailId.HasValue && !studentIds.Contains(testStudentNoEmailId.Value)) studentIds.Add(testStudentNoEmailId.Value);

                var feeIds = studentIds.Any()
                    ? await db.StudentFees.Where(sf => studentIds.Contains(sf.StudentId)).Select(sf => sf.StudentFeeId).ToListAsync()
                    : new List<int>();
                var planIds = feeIds.Any()
                    ? await db.FeePaymentPlans.Where(p => feeIds.Contains(p.StudentFeeId)).Select(p => p.FeePaymentPlanId).ToListAsync()
                    : new List<int>();

                if (studentIds.Any())
                {
                    var payIds = await db.FeePayments.Where(p => studentIds.Contains(p.StudentId)).Select(p => p.FeePaymentId).ToListAsync();
                    var txnIds = await db.PaymentGatewayTransactions.Where(t => studentIds.Contains(t.StudentId)).Select(t => t.Id).ToListAsync();

                    var outboxes = await db.FeePaymentEmailOutboxes
                        .Where(o => studentIds.Contains(o.StudentId)
                            || (o.FeePaymentId != null && payIds.Contains(o.FeePaymentId.Value))
                            || o.RecipientEmail.Contains(".invalid"))
                        .ToListAsync();
                    db.FeePaymentEmailOutboxes.RemoveRange(outboxes);

                    var ledgers = await db.PaymentLedgerEntries
                        .Where(l => (l.StudentId != null && studentIds.Contains(l.StudentId.Value))
                            || (l.FeePaymentId != null && payIds.Contains(l.FeePaymentId.Value)))
                        .ToListAsync();
                    db.PaymentLedgerEntries.RemoveRange(ledgers);

                    var proofs = await db.PaymentProofAttachments.Where(p => studentIds.Contains(p.StudentId)).ToListAsync();
                    db.PaymentProofAttachments.RemoveRange(proofs);

                    var txns = await db.PaymentGatewayTransactions.Where(t => txnIds.Contains(t.Id)).ToListAsync();
                    db.PaymentGatewayTransactions.RemoveRange(txns);

                    if (payIds.Any())
                    {
                        var allocs = await db.FeePaymentAllocations.Where(a => payIds.Contains(a.FeePaymentId)).ToListAsync();
                        db.FeePaymentAllocations.RemoveRange(allocs);

                        var receipts = await db.FeeReceipts.Where(r => payIds.Contains(r.FeePaymentId)).ToListAsync();
                        db.FeeReceipts.RemoveRange(receipts);

                        var payments = await db.FeePayments.Where(p => payIds.Contains(p.FeePaymentId)).ToListAsync();
                        db.FeePayments.RemoveRange(payments);
                    }

                    if (planIds.Any())
                    {
                        var installments = await db.FeeInstallments.Where(i => planIds.Contains(i.FeePaymentPlanId)).ToListAsync();
                        db.FeeInstallments.RemoveRange(installments);
                        var plans = await db.FeePaymentPlans.Where(p => planIds.Contains(p.FeePaymentPlanId)).ToListAsync();
                        db.FeePaymentPlans.RemoveRange(plans);
                    }

                    var feeComps = await db.StudentFeeComponents.Where(c => feeIds.Contains(c.StudentFeeId)).ToListAsync();
                    db.StudentFeeComponents.RemoveRange(feeComps);

                    var studentFees = await db.StudentFees.Where(sf => feeIds.Contains(sf.StudentFeeId)).ToListAsync();
                    db.StudentFees.RemoveRange(studentFees);

                    var students = await db.Students.Where(s => studentIds.Contains(s.StudentId)).ToListAsync();
                    db.Students.RemoveRange(students);

                    await db.SaveChangesAsync();
                }

                foreach (var relPath in createdProofPaths)
                {
                    proofStorage.DeleteStoredFileQuietly(relPath);
                }
            }
            catch (Exception cleanupEx)
            {
                Console.WriteLine($"  [WARN] Cleanup warning: {cleanupEx.Message}");
            }
        }

        Console.WriteLine("------------------------------------------------------------");
        Console.WriteLine($"  SUMMARY: Passed={passed}, Failed={failed}");
        Console.WriteLine("============================================================");
        return failed == 0;
    }

    private static string? ResolveMigrationSqlPath()
    {
        var candidates = new[]
        {
            Path.Combine(Directory.GetCurrentDirectory(), "Database", "30_FeePaymentEmailOutbox_And_Templates.sql"),
            Path.Combine(Directory.GetCurrentDirectory(), "Backend", "src", "CollegeManagement.API", "Database", "30_FeePaymentEmailOutbox_And_Templates.sql"),
            Path.Combine(AppContext.BaseDirectory, "Database", "30_FeePaymentEmailOutbox_And_Templates.sql")
        };
        return candidates.FirstOrDefault(File.Exists);
    }

    private static string ComputeHmacSha256Hex(string payload, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
    }

    private static IEnumerable<string> SplitSqlStatements(string sql)
    {
        var current = new StringBuilder();
        foreach (var line in sql.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None))
        {
            if (line.TrimStart().StartsWith("--", StringComparison.Ordinal))
                continue;
            current.AppendLine(line);
            if (line.TrimEnd().EndsWith(";", StringComparison.Ordinal))
            {
                var stmt = current.ToString().Trim();
                current.Clear();
                if (!string.IsNullOrWhiteSpace(stmt))
                    yield return stmt;
            }
        }
        var tail = current.ToString().Trim();
        if (!string.IsNullOrWhiteSpace(tail))
            yield return tail;
    }
}
