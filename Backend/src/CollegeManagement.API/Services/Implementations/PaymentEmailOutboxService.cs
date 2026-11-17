using System.Net.Mail;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Channels;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Fee;
using CollegeManagement.API.Services.Exports;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Services.Implementations;

public sealed class PaymentEmailDispatchSignal
{
    private readonly Channel<int> _channel = Channel.CreateBounded<int>(new BoundedChannelOptions(64)
    {
        FullMode = BoundedChannelFullMode.DropOldest,
        SingleReader = true,
        SingleWriter = false
    });

    public void Signal()
    {
        _channel.Writer.TryWrite(1);
    }

    public async Task WaitAsync(TimeSpan timeout, CancellationToken ct)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(timeout);
        try
        {
            await _channel.Reader.WaitToReadAsync(cts.Token);
            while (_channel.Reader.TryRead(out _)) { }
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            // Periodic poll timeout elapsed cleanly
        }
    }
}

public sealed class PaymentEmailOutboxService : IPaymentEmailOutboxService
{
    public const string TypePaymentSuccessReceipt = "PAYMENT_SUCCESS_RECEIPT";
    public const string TypePendingVerification = "PENDING_VERIFICATION";
    public const string TypePaymentRejected = "PAYMENT_REJECTED";

    private sealed record EmailRecipientCandidate(string Email, string RecipientType);

    private sealed class OutboxPayload
    {
        public string NotificationType { get; set; } = TypePaymentSuccessReceipt;
        public int StudentId { get; set; }
        public int? FeePaymentId { get; set; }
        public int? PaymentGatewayTransactionId { get; set; }
        public int? CampusId { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public string AdmissionNumber { get; set; } = string.Empty;
        public string AcademicYear { get; set; } = string.Empty;
        public string AmountPaid { get; set; } = "₹0.00";
        public string PaymentDate { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public string TransactionReference { get; set; } = string.Empty;
        public string ReceiptNumber { get; set; } = string.Empty;
        public string RemainingBalance { get; set; } = "₹0.00";
        public string PaymentStatus { get; set; } = string.Empty;
        public string? Reason { get; set; }
    }

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true
    };

    private static readonly TimeSpan[] RetryDelays =
    {
        TimeSpan.FromSeconds(30),
        TimeSpan.FromMinutes(2),
        TimeSpan.FromMinutes(10),
        TimeSpan.FromMinutes(30)
    };

    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IFeeReceiptPdfService _receiptPdfService;
    private readonly PaymentEmailDispatchSignal _signal;
    private readonly ILogger<PaymentEmailOutboxService> _logger;

    public PaymentEmailOutboxService(
        AppDbContext context,
        IEmailService emailService,
        IFeeReceiptPdfService receiptPdfService,
        PaymentEmailDispatchSignal signal,
        ILogger<PaymentEmailOutboxService> logger)
    {
        _context = context;
        _emailService = emailService;
        _receiptPdfService = receiptPdfService;
        _signal = signal;
        _logger = logger;
    }

    public async Task EnqueueSettlementReceiptEmailsInTransactionAsync(
        AppDbContext db,
        FeePayment payment,
        PaymentGatewayTransaction? gatewayTxn,
        Student? student,
        FeeReceipt? receipt,
        decimal outstandingBalance,
        CancellationToken ct = default)
    {
        if (payment.FeePaymentId <= 0)
            throw new InvalidOperationException("FeePaymentId must be generated before enqueueing email outbox.");

        student ??= await db.Students
            .AsNoTracking()
            .Include(s => s.CampusNavigation)
            .Include(s => s.AcademicYear)
            .FirstOrDefaultAsync(s => s.StudentId == payment.StudentId, ct);

        int? campusId = gatewayTxn?.CampusId ?? student?.CampusId;
        var settings = await ResolveEffectiveSettingsInternalAsync(db, campusId, ct);
        var recipients = await ResolveEligibleRecipientsAsync(db, payment.StudentId, student, settings.Delivery.Recipients, ct);

        if (recipients.Count == 0)
        {
            _logger.LogInformation(
                "No eligible student/parent email found for FeePaymentId {FeePaymentId} (StudentId {StudentId}); skipping email queue (NOT_REQUESTED).",
                payment.FeePaymentId, payment.StudentId);
            return;
        }

        string academicYearName = student?.AcademicYear?.AcademicYearName
            ?? await db.StudentFees.AsNoTracking()
                .Where(sf => sf.StudentFeeId == payment.StudentFeeId)
                .Select(sf => sf.FeeStructure != null && sf.FeeStructure.AcademicYear != null
                    ? sf.FeeStructure.AcademicYear.AcademicYearName
                    : string.Empty)
                .FirstOrDefaultAsync(ct)
            ?? "-";

        var payload = new OutboxPayload
        {
            NotificationType = TypePaymentSuccessReceipt,
            StudentId = payment.StudentId,
            FeePaymentId = payment.FeePaymentId,
            PaymentGatewayTransactionId = gatewayTxn?.Id,
            CampusId = campusId,
            StudentName = student?.StudentName ?? "Student",
            AdmissionNumber = student?.AdmissionNo ?? "-",
            AcademicYear = string.IsNullOrWhiteSpace(academicYearName) ? "-" : academicYearName,
            AmountPaid = $"₹{payment.Amount:N2}",
            PaymentDate = payment.PaymentDate.ToLocalTime().ToString("dd MMM yyyy, hh:mm tt"),
            PaymentMethod = payment.PaymentMode,
            TransactionReference = string.IsNullOrWhiteSpace(payment.TransactionReference) ? "-" : payment.TransactionReference!,
            ReceiptNumber = receipt?.ReceiptNumber ?? payment.ReceiptNumber ?? "-",
            RemainingBalance = $"₹{Math.Max(0, outstandingBalance):N2}",
            PaymentStatus = "Payment Successful"
        };

        await UpsertOutboxRowsAsync(db, TypePaymentSuccessReceipt, payment.FeePaymentId, payment.FeePaymentId, gatewayTxn?.Id, payment.StudentId, campusId, recipients, payload, ct);
        await db.SaveChangesAsync(ct);
    }

    public async Task EnqueueLifecycleNoticeAsync(
        PaymentGatewayTransaction txn,
        string notificationType,
        string? reason = null,
        CancellationToken ct = default)
    {
        if (notificationType != TypePendingVerification && notificationType != TypePaymentRejected)
            return;

        var student = await _context.Students
            .AsNoTracking()
            .Include(s => s.CampusNavigation)
            .Include(s => s.AcademicYear)
            .FirstOrDefaultAsync(s => s.StudentId == txn.StudentId, ct);

        int? campusId = txn.CampusId ?? student?.CampusId;
        var settings = await ResolveEffectiveSettingsInternalAsync(_context, campusId, ct);

        if (notificationType == TypePendingVerification && !settings.Delivery.Pending)
            return;
        if (notificationType == TypePaymentRejected && !settings.Delivery.Rejected)
            return;

        var recipients = await ResolveEligibleRecipientsAsync(_context, txn.StudentId, student, settings.Delivery.Recipients, ct);
        if (recipients.Count == 0)
            return;

        var feeAccount = await _context.StudentFees
            .AsNoTracking()
            .Where(sf => sf.StudentFeeId == txn.StudentFeeId)
            .Select(sf => new
            {
                sf.BalanceAmount,
                AcademicYearName = sf.FeeStructure != null && sf.FeeStructure.AcademicYear != null
                    ? sf.FeeStructure.AcademicYear.AcademicYearName
                    : null
            })
            .FirstOrDefaultAsync(ct);

        var payload = new OutboxPayload
        {
            NotificationType = notificationType,
            StudentId = txn.StudentId,
            FeePaymentId = txn.FeePaymentId,
            PaymentGatewayTransactionId = txn.Id,
            CampusId = campusId,
            StudentName = student?.StudentName ?? "Student",
            AdmissionNumber = student?.AdmissionNo ?? "-",
            AcademicYear = student?.AcademicYear?.AcademicYearName ?? feeAccount?.AcademicYearName ?? "-",
            AmountPaid = $"₹{txn.Amount:N2}",
            PaymentDate = (txn.PaymentDate ?? txn.SettledAt ?? txn.CreatedAt).ToLocalTime().ToString("dd MMM yyyy, hh:mm tt"),
            PaymentMethod = txn.PaymentMethod,
            TransactionReference = string.IsNullOrWhiteSpace(txn.UtrNumber)
                ? (txn.GatewayPaymentId ?? txn.OrderId)
                : txn.UtrNumber!,
            ReceiptNumber = "-",
            RemainingBalance = $"₹{Math.Max(0, feeAccount?.BalanceAmount ?? 0m):N2}",
            PaymentStatus = notificationType == TypePendingVerification ? "Pending Verification" : "Payment Rejected",
            Reason = reason
        };

        await UpsertOutboxRowsAsync(
            _context,
            notificationType,
            txn.Id,
            txn.FeePaymentId,
            txn.Id,
            txn.StudentId,
            campusId,
            recipients,
            payload,
            ct);

        await _context.SaveChangesAsync(ct);
        _signal.Signal();
    }

    public async Task<int> DispatchDueAsync(int batchSize = 20, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var dueIds = await _context.FeePaymentEmailOutboxes
            .AsNoTracking()
            .Where(o => o.Status == "QUEUED"
                && o.NextAttemptAtUtc <= now
                && (o.LockedUntilUtc == null || o.LockedUntilUtc < now))
            .OrderBy(o => o.NextAttemptAtUtc)
            .ThenBy(o => o.Id)
            .Take(Math.Clamp(batchSize, 1, 50))
            .Select(o => o.Id)
            .ToListAsync(ct);

        if (dueIds.Count == 0)
            return 0;

        int processed = 0;
        foreach (var id in dueIds)
        {
            if (ct.IsCancellationRequested) break;

            var claimTime = DateTime.UtcNow;
            var leaseExpiry = claimTime.AddMinutes(2);
            int claimed = await _context.FeePaymentEmailOutboxes
                .Where(o => o.Id == id
                    && o.Status == "QUEUED"
                    && o.NextAttemptAtUtc <= claimTime
                    && (o.LockedUntilUtc == null || o.LockedUntilUtc < claimTime))
                .ExecuteUpdateAsync(s => s
                    .SetProperty(o => o.LockedUntilUtc, leaseExpiry)
                    .SetProperty(o => o.UpdatedAtUtc, claimTime), ct);

            if (claimed == 0)
                continue;

            processed++;
            await DispatchSingleRowAsync(id, ct);
        }

        return processed;
    }

    private async Task DispatchSingleRowAsync(int outboxId, CancellationToken ct)
    {
        var existingTracked = _context.ChangeTracker.Entries<FeePaymentEmailOutbox>()
            .FirstOrDefault(e => e.Entity.Id == outboxId);
        if (existingTracked != null)
        {
            await existingTracked.ReloadAsync(ct);
        }

        var item = await _context.FeePaymentEmailOutboxes.FirstOrDefaultAsync(o => o.Id == outboxId, ct);
        if (item == null || item.Status != "QUEUED")
            return;

        try
        {
            if (item.FeePaymentId.HasValue && item.NotificationType == TypePaymentSuccessReceipt)
            {
                var paymentState = await _context.FeePayments
                    .AsNoTracking()
                    .Where(p => p.FeePaymentId == item.FeePaymentId.Value)
                    .Select(p => p.Status)
                    .FirstOrDefaultAsync(ct);

                if (!string.Equals(paymentState, "Success", StringComparison.OrdinalIgnoreCase))
                {
                    item.Status = "FAILED";
                    item.LockedUntilUtc = null;
                    item.LastAttemptAtUtc = DateTime.UtcNow;
                    item.LastError = "Payment is no longer in settled Success state; email suppressed.";
                    item.UpdatedAtUtc = DateTime.UtcNow;
                    await _context.SaveChangesAsync(ct);
                    return;
                }
            }

            var payload = string.IsNullOrWhiteSpace(item.PayloadJson)
                ? new OutboxPayload()
                : JsonSerializer.Deserialize<OutboxPayload>(item.PayloadJson, JsonOptions) ?? new OutboxPayload();

            var settings = await ResolveEffectiveSettingsInternalAsync(_context, item.CampusId, ct);
            var template = item.NotificationType switch
            {
                TypePendingVerification => settings.Emails.Pending,
                TypePaymentRejected => settings.Emails.Rejected,
                _ => settings.Emails.Successful
            };

            var context = new PaymentEmailTemplateContext(
                CollegeName: settings.Receipt.CollegeName,
                CampusName: settings.Receipt.CampusName,
                StudentName: payload.StudentName,
                AdmissionNumber: payload.AdmissionNumber,
                AcademicYear: payload.AcademicYear,
                AmountPaid: payload.AmountPaid,
                PaymentDate: payload.PaymentDate,
                PaymentMethod: payload.PaymentMethod,
                TransactionReference: payload.TransactionReference,
                ReceiptNumber: payload.ReceiptNumber,
                RemainingBalance: payload.RemainingBalance,
                PaymentStatus: payload.PaymentStatus,
                Reason: payload.Reason,
                IsTestEmail: false);

            var (subject, htmlBody) = FeeReceiptEmailTemplateBuilder.RenderEmail(template, settings.Receipt, context);

            byte[]? attachmentBytes = null;
            string? attachmentName = null;
            if (item.NotificationType == TypePaymentSuccessReceipt && settings.Delivery.AttachPdf && item.FeePaymentId.HasValue)
            {
                var generated = await _receiptPdfService.GenerateReceiptPdfAsync(item.FeePaymentId.Value);
                if (generated.HasValue && generated.Value.Bytes.Length > 0)
                {
                    attachmentBytes = generated.Value.Bytes;
                    attachmentName = generated.Value.FileName;
                }
            }

            await _emailService.SendEmailWithOptionsAsync(
                item.RecipientEmail,
                subject,
                htmlBody,
                attachmentBytes,
                attachmentName,
                "application/pdf",
                settings.Delivery.SenderName,
                settings.Delivery.ReplyTo);

            var sentAt = DateTime.UtcNow;
            item.Status = "SENT";
            item.AttemptCount += 1;
            item.SentAtUtc = sentAt;
            item.LastAttemptAtUtc = sentAt;
            item.LockedUntilUtc = null;
            item.LastError = null;
            item.UpdatedAtUtc = sentAt;
            await _context.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            var attemptTime = DateTime.UtcNow;
            item.AttemptCount += 1;
            item.LastAttemptAtUtc = attemptTime;
            item.LockedUntilUtc = null;
            item.LastError = SanitizeErrorMessage(ex);
            item.UpdatedAtUtc = attemptTime;

            if (item.AttemptCount >= item.MaxAttempts)
            {
                item.Status = "FAILED";
            }
            else
            {
                var delay = RetryDelays[Math.Min(item.AttemptCount - 1, RetryDelays.Length - 1)];
                item.Status = "QUEUED";
                item.NextAttemptAtUtc = attemptTime.Add(delay);
            }

            await _context.SaveChangesAsync(ct);
            _logger.LogWarning(ex, "Email outbox dispatch failed for OutboxId {OutboxId} (Attempt {Attempt}/{Max})",
                item.Id, item.AttemptCount, item.MaxAttempts);
        }
    }

    public async Task<PaymentNotificationStatusResponse?> GetPaymentNotificationStatusAsync(
        int feePaymentId,
        CancellationToken ct = default)
    {
        var payment = await _context.FeePayments
            .AsNoTracking()
            .Include(p => p.Receipt)
            .Include(p => p.Student)
            .Include(p => p.StudentFee)
            .FirstOrDefaultAsync(p => p.FeePaymentId == feePaymentId, ct);

        if (payment == null)
            return null;

        var gatewayTxn = await _context.PaymentGatewayTransactions
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.FeePaymentId == feePaymentId, ct);

        var outboxRows = await _context.FeePaymentEmailOutboxes
            .AsNoTracking()
            .Where(o => o.FeePaymentId == feePaymentId && o.NotificationType == TypePaymentSuccessReceipt)
            .OrderBy(o => o.Id)
            .ToListAsync(ct);

        var agg = AggregateOutboxRows(outboxRows);
        bool isSettled = string.Equals(payment.Status, "Success", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(gatewayTxn?.Status, "Reversed", StringComparison.OrdinalIgnoreCase);

        return new PaymentNotificationStatusResponse
        {
            FeePaymentId = payment.FeePaymentId,
            StudentFeeId = payment.StudentFeeId,
            CampusId = gatewayTxn?.CampusId ?? payment.Student?.CampusId,
            PaymentStatus = isSettled ? "Settled" : (gatewayTxn?.Status ?? payment.Status),
            VerificationStatus = isSettled ? "Verified" : (gatewayTxn?.Status ?? payment.Status),
            SettledAmount = payment.Amount,
            PaymentMethod = payment.PaymentMode,
            TransactionReference = payment.TransactionReference,
            PaymentDate = payment.PaymentDate,
            OutstandingBalance = payment.StudentFee?.BalanceAmount ?? 0m,
            ReceiptId = payment.Receipt?.FeeReceiptId,
            ReceiptNumber = payment.Receipt?.ReceiptNumber ?? payment.ReceiptNumber,
            ReceiptAvailable = isSettled && payment.Receipt != null,
            EmailNotificationStatus = agg.Status,
            EmailDeliveryStatus = agg.Status,
            EmailSentAt = agg.SentAt,
            EmailFailureReason = agg.FailureReason,
            Recipients = outboxRows.Select(o => new PaymentEmailOutboxItemDto
            {
                Id = o.Id,
                NotificationType = o.NotificationType,
                RecipientType = o.RecipientType,
                MaskedRecipient = MaskEmail(o.RecipientEmail),
                Status = o.Status,
                AttemptCount = o.AttemptCount,
                SentAtUtc = o.SentAtUtc,
                LastError = o.LastError
            }).ToList()
        };
    }

    public async Task<Dictionary<int, (string Status, DateTime? SentAt, string? FailureReason)>> GetAggregatedStatusByFeePaymentIdsAsync(
        IEnumerable<int> feePaymentIds,
        CancellationToken ct = default)
    {
        var ids = feePaymentIds.Where(id => id > 0).Distinct().ToList();
        if (ids.Count == 0)
            return new Dictionary<int, (string, DateTime?, string?)>();

        var rows = await _context.FeePaymentEmailOutboxes
            .AsNoTracking()
            .Where(o => o.FeePaymentId.HasValue && ids.Contains(o.FeePaymentId.Value) && o.NotificationType == TypePaymentSuccessReceipt)
            .ToListAsync(ct);

        return rows.GroupBy(r => r.FeePaymentId!.Value)
            .ToDictionary(g => g.Key, g => AggregateOutboxRows(g));
    }

    public async Task<Dictionary<int, (string Status, DateTime? SentAt, string? FailureReason)>> GetAggregatedStatusByTransactionIdsAsync(
        IEnumerable<int> txnIds,
        CancellationToken ct = default)
    {
        var ids = txnIds.Where(id => id > 0).Distinct().ToList();
        if (ids.Count == 0)
            return new Dictionary<int, (string, DateTime?, string?)>();

        var rows = await _context.FeePaymentEmailOutboxes
            .AsNoTracking()
            .Where(o => o.PaymentGatewayTransactionId.HasValue && ids.Contains(o.PaymentGatewayTransactionId.Value))
            .ToListAsync(ct);

        return rows.GroupBy(r => r.PaymentGatewayTransactionId!.Value)
            .ToDictionary(g => g.Key, g =>
            {
                var successRows = g.Where(r => r.NotificationType == TypePaymentSuccessReceipt).ToList();
                return AggregateOutboxRows(successRows.Count > 0 ? successRows : g);
            });
    }

    public async Task<RetryEmailResponse> RetryFailedEmailsAsync(int feePaymentId, CancellationToken ct = default)
    {
        var payment = await _context.FeePayments
            .Include(p => p.Receipt)
            .Include(p => p.Student)
                .ThenInclude(s => s!.CampusNavigation)
            .Include(p => p.Student)
                .ThenInclude(s => s!.AcademicYear)
            .Include(p => p.StudentFee)
            .FirstOrDefaultAsync(p => p.FeePaymentId == feePaymentId, ct);

        if (payment == null)
            throw new KeyNotFoundException($"Fee payment {feePaymentId} was not found.");

        if (!string.Equals(payment.Status, "Success", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Cannot send confirmation emails for an unsettled or reversed payment.");

        var gatewayTxn = await _context.PaymentGatewayTransactions
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.FeePaymentId == feePaymentId, ct);

        if (string.Equals(gatewayTxn?.Status, "Reversed", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Cannot send confirmation emails for a reversed payment.");

        var failedRows = await _context.FeePaymentEmailOutboxes
            .Where(o => o.FeePaymentId == feePaymentId
                && o.NotificationType == TypePaymentSuccessReceipt
                && (o.Status == "FAILED" || (o.Status == "QUEUED" && o.AttemptCount > 0)))
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        int requeued = 0;

        foreach (var row in failedRows)
        {
            row.Status = "QUEUED";
            row.AttemptCount = 0;
            row.NextAttemptAtUtc = now.AddSeconds(-2);
            row.LockedUntilUtc = null;
            _context.Entry(row).Property(r => r.LockedUntilUtc).IsModified = true;
            row.LastError = null;
            row.UpdatedAtUtc = now;
            requeued++;
        }

        // If no outbox row existed previously (or a new student/parent email was added later), enqueue missing recipients safely.
        var existingCount = await _context.FeePaymentEmailOutboxes
            .CountAsync(o => o.FeePaymentId == feePaymentId && o.NotificationType == TypePaymentSuccessReceipt, ct);

        await EnqueueSettlementReceiptEmailsInTransactionAsync(
            _context,
            payment,
            gatewayTxn,
            payment.Student,
            payment.Receipt,
            payment.StudentFee?.BalanceAmount ?? 0m,
            ct);

        await _context.SaveChangesAsync(ct);

        var postCount = await _context.FeePaymentEmailOutboxes
            .CountAsync(o => o.FeePaymentId == feePaymentId && o.NotificationType == TypePaymentSuccessReceipt, ct);
        requeued += Math.Max(0, postCount - existingCount);

        if (requeued > 0)
        {
            _signal.Signal();
        }

        var latestRows = await _context.FeePaymentEmailOutboxes
            .AsNoTracking()
            .Where(o => o.FeePaymentId == feePaymentId && o.NotificationType == TypePaymentSuccessReceipt)
            .ToListAsync(ct);

        var agg = AggregateOutboxRows(latestRows);

        return new RetryEmailResponse
        {
            Success = requeued > 0 || agg.Status == "SENT" || agg.Status == "QUEUED",
            FeePaymentId = feePaymentId,
            RequeuedCount = requeued,
            EmailNotificationStatus = agg.Status,
            EmailDeliveryStatus = agg.Status,
            Message = requeued > 0
                ? $"Queued {requeued} confirmation email(s) for delivery."
                : agg.Status == "NOT_REQUESTED"
                    ? "No registered student or parent email address is available on file."
                    : $"Current email status: {agg.Status}."
        };
    }

    public Task<PaymentCommunicationSettingsDto> GetCommunicationSettingsAsync(int? campusId, CancellationToken ct = default)
        => ResolveEffectiveSettingsInternalAsync(_context, campusId, ct);

    public async Task<PaymentCommunicationSettingsDto> UpdateCommunicationSettingsAsync(
        UpdatePaymentCommunicationSettingsRequest request,
        int? userId,
        bool canEditGlobalDefault,
        CancellationToken ct = default)
    {
        int? targetCampusId = request.SaveAsCollegeDefault ? null : request.CampusId;
        if (targetCampusId == null && !canEditGlobalDefault)
            throw new UnauthorizedAccessException("Only Super Admin / Admin can update College Default payment communication templates.");

        var entity = targetCampusId.HasValue
            ? await _context.PaymentCommunicationSettings.FirstOrDefaultAsync(x => x.CampusId == targetCampusId.Value, ct)
            : await _context.PaymentCommunicationSettings.FirstOrDefaultAsync(x => x.CampusId == null, ct);

        if (entity == null)
        {
            entity = new PaymentCommunicationSetting
            {
                CampusId = targetCampusId,
                CreatedAtUtc = DateTime.UtcNow
            };
            _context.PaymentCommunicationSettings.Add(entity);
        }

        if (request.Receipt != null)
        {
            entity.CollegeDisplayName = TrimOrNull(request.Receipt.CollegeName, 200);
            entity.CampusDisplayName = TrimOrNull(request.Receipt.CampusName, 200);
            entity.CollegeAddress = TrimOrNull(request.Receipt.Address, 500);
            entity.ContactNumber = TrimOrNull(request.Receipt.Phone, 50);
            entity.ContactEmail = TrimOrNull(request.Receipt.Email, 254);
            entity.Website = TrimOrNull(request.Receipt.Website, 300);
            entity.ReceiptTitle = TrimOrNull(request.Receipt.Title, 150);
            entity.Layout = request.Receipt.Layout == "centered" ? "centered" : "split";
            entity.AccentColor = Regex.IsMatch(request.Receipt.AccentColor ?? string.Empty, @"^#[0-9a-fA-F]{6}$")
                ? request.Receipt.AccentColor
                : "#6941a5";
            entity.FooterMessage = TrimOrNull(request.Receipt.Footer, 500);
            entity.AdditionalInstructions = TrimOrNull(request.Receipt.Instructions, 1000);
            entity.SignatureName = TrimOrNull(request.Receipt.SignatureName, 150);
            entity.SignatureDesignation = TrimOrNull(request.Receipt.SignatureDesignation, 150);
            entity.ReceiptVisibilityJson = JsonSerializer.Serialize(request.Receipt.Visibility ?? new PaymentReceiptVisibilityDto(), JsonOptions);
        }

        if (request.Delivery != null)
        {
            entity.SenderDisplayName = TrimOrNull(request.Delivery.SenderName, 150);
            entity.ReplyToEmailAddress = TrimOrNull(request.Delivery.ReplyTo, 254);
            entity.RecipientPreference = request.Delivery.Recipients is "student" or "parent" or "both"
                ? request.Delivery.Recipients
                : "both";
            entity.AttachPdfOnSuccess = request.Delivery.AttachPdf;
            entity.EnablePendingVerificationEmail = request.Delivery.Pending;
            entity.EnablePaymentRejectedEmail = request.Delivery.Rejected;
            entity.EnablePaymentReminderEmail = request.Delivery.Reminder;
        }

        if (request.Emails != null)
        {
            entity.EmailTemplatesJson = JsonSerializer.Serialize(request.Emails, JsonOptions);
        }

        entity.UpdatedByUserId = userId;
        entity.UpdatedAtUtc = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);
        return await ResolveEffectiveSettingsInternalAsync(_context, targetCampusId ?? request.CampusId, ct);
    }

    public async Task<PaymentCommunicationSettingsDto> RestoreDefaultCommunicationSettingsAsync(
        int? campusId,
        bool restoreGlobalDefault,
        int? userId,
        CancellationToken ct = default)
    {
        if (restoreGlobalDefault)
        {
            var globalRow = await _context.PaymentCommunicationSettings.FirstOrDefaultAsync(x => x.CampusId == null, ct);
            if (globalRow != null)
            {
                _context.PaymentCommunicationSettings.Remove(globalRow);
                await _context.SaveChangesAsync(ct);
            }
        }
        else if (campusId.HasValue && campusId.Value > 0)
        {
            var campusRow = await _context.PaymentCommunicationSettings.FirstOrDefaultAsync(x => x.CampusId == campusId.Value, ct);
            if (campusRow != null)
            {
                _context.PaymentCommunicationSettings.Remove(campusRow);
                await _context.SaveChangesAsync(ct);
            }
        }

        return await ResolveEffectiveSettingsInternalAsync(_context, campusId, ct);
    }

    public async Task<SendTestPaymentEmailResponse> SendTestEmailAsync(
        SendTestPaymentEmailRequest request,
        CancellationToken ct = default)
    {
        if (!IsValidEmail(request.TestRecipient))
            throw new ArgumentException("Please enter a valid test recipient email address.");

        var effective = await ResolveEffectiveSettingsInternalAsync(_context, request.CampusId, ct);

        var delivery = request.DeliveryOverride ?? effective.Delivery;
        var type = (request.TemplateType ?? "successful").Trim().ToLowerInvariant();
        var baseTemplate = type switch
        {
            "pending" => effective.Emails.Pending,
            "rejected" => effective.Emails.Rejected,
            "reminder" => effective.Emails.Reminder,
            _ => effective.Emails.Successful
        };

        var template = request.TemplateOverride ?? baseTemplate;
        var sampleContext = new PaymentEmailTemplateContext(
            CollegeName: effective.Receipt.CollegeName,
            CampusName: effective.Receipt.CampusName,
            StudentName: "Sample Student (TEST)",
            AdmissionNumber: "SAMPLE-001",
            AcademicYear: "2026-2027",
            AmountPaid: "₹17,500.00",
            PaymentDate: DateTime.Now.ToString("dd MMM yyyy, hh:mm tt"),
            PaymentMethod: "Direct UPI QR",
            TransactionReference: "SAMPLE-UTR-TEST-001",
            ReceiptNumber: "SAMPLE-RCP-001",
            RemainingBalance: "₹52,500.00",
            PaymentStatus: type switch
            {
                "pending" => "Pending Verification (TEST)",
                "rejected" => "Payment Rejected (TEST)",
                "reminder" => "Payment Reminder (TEST)",
                _ => "Payment Successful (TEST)"
            },
            Reason: "Sample rejection reason (TEST).",
            IsTestEmail: true);

        var (subject, htmlBody) = FeeReceiptEmailTemplateBuilder.RenderEmail(template, effective.Receipt, sampleContext);

        await _emailService.SendEmailWithOptionsAsync(
            request.TestRecipient.Trim(),
            subject,
            htmlBody,
            attachmentBytes: null,
            attachmentFileName: null,
            contentType: "application/pdf",
            senderDisplayName: delivery.SenderName,
            replyToEmail: delivery.ReplyTo);

        return new SendTestPaymentEmailResponse
        {
            Success = true,
            Status = "SENT",
            Message = $"Test email accepted by SMTP server for {MaskEmail(request.TestRecipient.Trim())}."
        };
    }

    private async Task<PaymentCommunicationSettingsDto> ResolveEffectiveSettingsInternalAsync(
        AppDbContext db,
        int? campusId,
        CancellationToken ct)
    {
        var campus = campusId.HasValue && campusId.Value > 0
            ? await db.Campuses.AsNoTracking().FirstOrDefaultAsync(c => c.CampusId == campusId.Value, ct)
            : null;

        var rows = await db.PaymentCommunicationSettings
            .AsNoTracking()
            .Where(x => x.CampusId == null || (campusId.HasValue && x.CampusId == campusId.Value))
            .ToListAsync(ct);

        var campusCustom = campusId.HasValue ? rows.FirstOrDefault(x => x.CampusId == campusId.Value) : null;
        var collegeDefault = rows.FirstOrDefault(x => x.CampusId == null);

        var activeRow = campusCustom ?? collegeDefault;
        var activeSource = campusCustom != null
            ? "Campus Custom"
            : collegeDefault != null
                ? "College Default"
                : "System Default";

        var defaultReceipt = FeeReceiptEmailTemplateBuilder.BuildDefaultReceiptSettings(
            "Pirnav College",
            campus?.CampusName ?? "Main Campus",
            campus?.Address,
            campus?.ContactPhone,
            campus?.Email);

        var defaultEmails = FeeReceiptEmailTemplateBuilder.BuildDefaultTemplates(
            defaultReceipt.CollegeName,
            defaultReceipt.CampusName);

        var defaultDelivery = FeeReceiptEmailTemplateBuilder.BuildDefaultDeliverySettings();

        ApplyRowToSettings(collegeDefault, ref defaultEmails, ref defaultReceipt, ref defaultDelivery);
        ApplyRowToSettings(campusCustom, ref defaultEmails, ref defaultReceipt, ref defaultDelivery);

        if (campus != null && string.IsNullOrWhiteSpace(campusCustom?.CampusDisplayName))
        {
            defaultReceipt.CampusName = campus.CampusName;
        }

        return new PaymentCommunicationSettingsDto
        {
            CampusId = campusId,
            Scope = activeSource,
            ActiveSource = activeSource,
            Emails = defaultEmails,
            Receipt = defaultReceipt,
            Delivery = defaultDelivery,
            UpdatedAt = activeRow?.UpdatedAtUtc
        };
    }

    private static void ApplyRowToSettings(
        PaymentCommunicationSetting? row,
        ref PaymentEmailTemplateSetDto emails,
        ref PaymentReceiptTemplateSettingsDto receipt,
        ref PaymentDeliverySettingsDto delivery)
    {
        if (row == null) return;

        if (!string.IsNullOrWhiteSpace(row.CollegeDisplayName)) receipt.CollegeName = row.CollegeDisplayName;
        if (!string.IsNullOrWhiteSpace(row.CampusDisplayName)) receipt.CampusName = row.CampusDisplayName;
        if (!string.IsNullOrWhiteSpace(row.CollegeAddress)) receipt.Address = row.CollegeAddress;
        if (row.ContactNumber != null) receipt.Phone = row.ContactNumber;
        if (row.ContactEmail != null) receipt.Email = row.ContactEmail;
        if (row.Website != null) receipt.Website = row.Website;
        if (!string.IsNullOrWhiteSpace(row.ReceiptTitle)) receipt.Title = row.ReceiptTitle;
        if (!string.IsNullOrWhiteSpace(row.Layout)) receipt.Layout = row.Layout;
        if (!string.IsNullOrWhiteSpace(row.AccentColor)) receipt.AccentColor = row.AccentColor;
        if (row.FooterMessage != null) receipt.Footer = row.FooterMessage;
        if (row.AdditionalInstructions != null) receipt.Instructions = row.AdditionalInstructions;
        if (!string.IsNullOrWhiteSpace(row.SignatureName)) receipt.SignatureName = row.SignatureName;
        if (!string.IsNullOrWhiteSpace(row.SignatureDesignation)) receipt.SignatureDesignation = row.SignatureDesignation;

        if (!string.IsNullOrWhiteSpace(row.ReceiptVisibilityJson))
        {
            try
            {
                var vis = JsonSerializer.Deserialize<PaymentReceiptVisibilityDto>(row.ReceiptVisibilityJson, JsonOptions);
                if (vis != null) receipt.Visibility = vis;
            }
            catch { }
        }

        if (!string.IsNullOrWhiteSpace(row.SenderDisplayName)) delivery.SenderName = row.SenderDisplayName;
        if (row.ReplyToEmailAddress != null) delivery.ReplyTo = row.ReplyToEmailAddress;
        if (!string.IsNullOrWhiteSpace(row.RecipientPreference)) delivery.Recipients = row.RecipientPreference;
        delivery.AttachPdf = row.AttachPdfOnSuccess;
        delivery.Pending = row.EnablePendingVerificationEmail;
        delivery.Rejected = row.EnablePaymentRejectedEmail;
        delivery.Reminder = row.EnablePaymentReminderEmail;

        if (!string.IsNullOrWhiteSpace(row.EmailTemplatesJson))
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<PaymentEmailTemplateSetDto>(row.EmailTemplatesJson, JsonOptions);
                if (parsed != null)
                {
                    if (!string.IsNullOrWhiteSpace(parsed.Successful?.Subject)) emails.Successful = parsed.Successful;
                    if (!string.IsNullOrWhiteSpace(parsed.Pending?.Subject)) emails.Pending = parsed.Pending;
                    if (!string.IsNullOrWhiteSpace(parsed.Rejected?.Subject)) emails.Rejected = parsed.Rejected;
                    if (!string.IsNullOrWhiteSpace(parsed.Reminder?.Subject)) emails.Reminder = parsed.Reminder;
                }
            }
            catch { }
        }
    }

    private static async Task<List<EmailRecipientCandidate>> ResolveEligibleRecipientsAsync(
        AppDbContext db,
        int studentId,
        Student? student,
        string recipientPreference,
        CancellationToken ct)
    {
        var pref = (recipientPreference ?? "both").Trim().ToLowerInvariant();
        bool includeStudent = pref is "student" or "both";
        bool includeParent = pref is "parent" or "both";

        var map = new Dictionary<string, EmailRecipientCandidate>(StringComparer.OrdinalIgnoreCase);

        void TryAdd(string? rawEmail, string type)
        {
            if (string.IsNullOrWhiteSpace(rawEmail)) return;
            var trimmed = rawEmail.Trim();
            if (!IsValidEmail(trimmed)) return;
            if (!map.ContainsKey(trimmed))
            {
                map[trimmed] = new EmailRecipientCandidate(trimmed, type);
            }
        }

        if (includeParent)
        {
            TryAdd(student?.ParentGuardianEmail, "Parent");

            var mappedParentEmails = await db.ParentStudentMappings
                .AsNoTracking()
                .Where(m => m.StudentId == studentId
                    && m.ParentUser != null
                    && m.ParentUser.IsActive
                    && !string.IsNullOrWhiteSpace(m.ParentUser.Email))
                .Select(m => m.ParentUser!.Email)
                .ToListAsync(ct);

            foreach (var email in mappedParentEmails)
                TryAdd(email, "Parent");
        }

        if (includeStudent)
        {
            TryAdd(student?.Email, "Student");

            var studentUserEmails = await db.Users
                .AsNoTracking()
                .Where(u => u.StudentId == studentId && u.IsActive && !string.IsNullOrWhiteSpace(u.Email))
                .Select(u => u.Email)
                .ToListAsync(ct);

            foreach (var email in studentUserEmails)
                TryAdd(email, "Student");
        }

        return map.Values.ToList();
    }

    private static async Task UpsertOutboxRowsAsync(
        AppDbContext db,
        string notificationType,
        int eventEntityId,
        int? feePaymentId,
        int? txnId,
        int studentId,
        int? campusId,
        List<EmailRecipientCandidate> recipients,
        OutboxPayload payload,
        CancellationToken ct)
    {
        var existingEmails = await db.FeePaymentEmailOutboxes
            .Where(o => o.NotificationType == notificationType && o.EventEntityId == eventEntityId)
            .Select(o => o.RecipientEmail)
            .ToListAsync(ct);

        var trackedEmails = db.ChangeTracker.Entries<FeePaymentEmailOutbox>()
            .Where(e => e.State != EntityState.Deleted
                && string.Equals(e.Entity.NotificationType, notificationType, StringComparison.OrdinalIgnoreCase)
                && e.Entity.EventEntityId == eventEntityId)
            .Select(e => e.Entity.RecipientEmail);

        var existingSet = new HashSet<string>(existingEmails.Concat(trackedEmails), StringComparer.OrdinalIgnoreCase);
        var serializedPayload = JsonSerializer.Serialize(payload, JsonOptions);
        var utcNow = DateTime.UtcNow;

        foreach (var recipient in recipients)
        {
            if (existingSet.Contains(recipient.Email))
                continue;

            db.FeePaymentEmailOutboxes.Add(new FeePaymentEmailOutbox
            {
                EventEntityId = eventEntityId,
                FeePaymentId = feePaymentId,
                PaymentGatewayTransactionId = txnId,
                StudentId = studentId,
                CampusId = campusId,
                RecipientEmail = recipient.Email,
                RecipientType = recipient.RecipientType,
                NotificationType = notificationType,
                Status = "QUEUED",
                AttemptCount = 0,
                MaxAttempts = 5,
                NextAttemptAtUtc = utcNow.AddSeconds(-2),
                PayloadJson = serializedPayload,
                CreatedAtUtc = utcNow,
                UpdatedAtUtc = utcNow
            });
            existingSet.Add(recipient.Email);
        }
    }

    private static (string Status, DateTime? SentAt, string? FailureReason) AggregateOutboxRows(
        IEnumerable<FeePaymentEmailOutbox> rows)
    {
        var list = rows as IList<FeePaymentEmailOutbox> ?? rows.ToList();
        if (list.Count == 0)
            return ("NOT_REQUESTED", null, null);

        if (list.Any(r => r.Status == "QUEUED"))
        {
            return ("QUEUED", list.Where(r => r.SentAtUtc.HasValue).Max(r => r.SentAtUtc), null);
        }

        if (list.Any(r => r.Status == "FAILED"))
        {
            var err = list.Where(r => r.Status == "FAILED" && !string.IsNullOrWhiteSpace(r.LastError))
                .Select(r => r.LastError)
                .FirstOrDefault() ?? "SMTP delivery failed.";
            return ("FAILED", list.Where(r => r.SentAtUtc.HasValue).Max(r => r.SentAtUtc), err);
        }

        if (list.All(r => r.Status == "SENT"))
        {
            return ("SENT", list.Max(r => r.SentAtUtc), null);
        }

        return ("NOT_REQUESTED", null, null);
    }

    private static bool IsValidEmail(string? email)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;
        try
        {
            var addr = new MailAddress(email.Trim());
            return string.Equals(addr.Address, email.Trim(), StringComparison.OrdinalIgnoreCase);
        }
        catch
        {
            return false;
        }
    }

    private static string MaskEmail(string email)
    {
        var parts = email.Split('@');
        if (parts.Length != 2) return "***";
        var local = parts[0];
        var maskedLocal = local.Length <= 2 ? new string('*', local.Length) : $"{local[0]}***{local[^1]}";
        return $"{maskedLocal}@{parts[1]}";
    }

    private static string? TrimOrNull(string? val, int maxLen)
    {
        if (string.IsNullOrWhiteSpace(val)) return null;
        var trimmed = val.Trim();
        return trimmed.Length > maxLen ? trimmed.Substring(0, maxLen) : trimmed;
    }

    private static string SanitizeErrorMessage(Exception ex)
    {
        var msg = ex.Message ?? "Email delivery failed.";
        msg = Regex.Replace(msg, @"(password|pwd|secret|token|apikey)\s*=\s*\S+", "$1=***", RegexOptions.IgnoreCase);
        if (msg.Length > 250) msg = msg.Substring(0, 250);
        return $"SMTP delivery error: {msg}";
    }
}
