using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using CollegeManagement.API.DTOs.Fees;

namespace CollegeManagement.API.Services.Exports;

public sealed record PaymentEmailTemplateContext(
    string CollegeName,
    string CampusName,
    string StudentName,
    string AdmissionNumber,
    string AcademicYear,
    string AmountPaid,
    string PaymentDate,
    string PaymentMethod,
    string TransactionReference,
    string ReceiptNumber,
    string RemainingBalance,
    string PaymentStatus,
    string? Reason = null,
    bool IsTestEmail = false
);

public static class FeeReceiptEmailTemplateBuilder
{
    private static readonly Regex TokenRegex = new(@"\{\{(\w+)\}\}", RegexOptions.Compiled);
    private static readonly Regex InlineFormatRegex = new(@"(\*\*[^*]+\*\*|\*[^*]+\*)", RegexOptions.Compiled);

    private static readonly HashSet<string> AllowedTokens = new(StringComparer.OrdinalIgnoreCase)
    {
        "collegeName",
        "campusName",
        "studentName",
        "admissionNumber",
        "academicYear",
        "amountPaid",
        "paymentDate",
        "paymentMethod",
        "transactionReference",
        "receiptNumber",
        "remainingBalance",
        "paymentStatus",
        "reason"
    };

    public static PaymentEmailTemplateSetDto BuildDefaultTemplates(string? collegeName = null, string? campusName = null)
    {
        return new PaymentEmailTemplateSetDto
        {
            Successful = new PaymentEmailTemplateDto
            {
                Subject = "Payment Successful - {{collegeName}} ({{receiptNumber}})",
                Heading = "Payment Successful",
                Body = "Dear {{studentName}},\n\nWe have received your fee payment of {{amountPaid}} for academic year {{academicYear}}.\n\n- Receipt Number: {{receiptNumber}}\n- Payment Method: {{paymentMethod}}\n- Transaction Reference: {{transactionReference}}\n- Remaining Balance: {{remainingBalance}}",
                Closing = "Thank you. Please contact the accounts department if you need help.",
                Signature = "Accounts Department\n{{collegeName}}"
            },
            Pending = new PaymentEmailTemplateDto
            {
                Subject = "Pending Verification - {{collegeName}}",
                Heading = "Pending Verification",
                Body = "Dear {{studentName}},\n\nYour payment submission of {{amountPaid}} for academic year {{academicYear}} has been received for verification. No fee credit has been applied yet.\n\n- Payment Method: {{paymentMethod}}\n- Transaction Reference: {{transactionReference}}",
                Closing = "You will receive an official receipt once an authorized accounts officer completes verification.",
                Signature = "Accounts Department\n{{collegeName}}"
            },
            Rejected = new PaymentEmailTemplateDto
            {
                Subject = "Payment Rejected - {{collegeName}}",
                Heading = "Payment Rejected",
                Body = "Dear {{studentName}},\n\nYour payment verification request of {{amountPaid}} (Reference: {{transactionReference}}) was rejected.\n\nReason: {{reason}}",
                Closing = "Please verify your bank transaction details and contact the accounts department for assistance.",
                Signature = "Accounts Department\n{{collegeName}}"
            },
            Reminder = new PaymentEmailTemplateDto
            {
                Subject = "Payment Reminder - {{collegeName}}",
                Heading = "Payment Reminder",
                Body = "Dear {{studentName}},\n\nThis is a reminder about your fee balance of {{remainingBalance}} for academic year {{academicYear}}. Please contact the accounts department for assistance.",
                Closing = "Thank you.",
                Signature = "Accounts Department\n{{collegeName}}"
            }
        };
    }

    public static PaymentReceiptTemplateSettingsDto BuildDefaultReceiptSettings(
        string? collegeName = null,
        string? campusName = null,
        string? address = null,
        string? phone = null,
        string? email = null)
    {
        return new PaymentReceiptTemplateSettingsDto
        {
            CollegeName = string.IsNullOrWhiteSpace(collegeName) ? "Pirnav College" : collegeName.Trim(),
            CampusName = string.IsNullOrWhiteSpace(campusName) ? "Main Campus" : campusName.Trim(),
            Address = string.IsNullOrWhiteSpace(address) ? "Campus Administration & Accounts Division" : address.Trim(),
            Phone = phone?.Trim() ?? string.Empty,
            Email = email?.Trim() ?? string.Empty,
            Website = string.Empty,
            Title = "FEE PAYMENT RECEIPT",
            Layout = "split",
            AccentColor = "#6941a5",
            Footer = "Thank you for your payment.",
            Instructions = string.Empty,
            SignatureName = "Accounts Department",
            SignatureDesignation = "Authorized Signatory",
            Visibility = new PaymentReceiptVisibilityDto()
        };
    }

    public static PaymentDeliverySettingsDto BuildDefaultDeliverySettings() => new()
    {
        SenderName = "Accounts Department",
        ReplyTo = string.Empty,
        Recipients = "both",
        AttachPdf = true,
        Pending = true,
        Rejected = true,
        Reminder = false
    };

    public static (string Subject, string HtmlBody) RenderEmail(
        PaymentEmailTemplateDto template,
        PaymentReceiptTemplateSettingsDto receiptSettings,
        PaymentEmailTemplateContext ctx)
    {
        var tokenMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["collegeName"] = ctx.CollegeName,
            ["campusName"] = ctx.CampusName,
            ["studentName"] = ctx.StudentName,
            ["admissionNumber"] = ctx.AdmissionNumber,
            ["academicYear"] = ctx.AcademicYear,
            ["amountPaid"] = ctx.AmountPaid,
            ["paymentDate"] = ctx.PaymentDate,
            ["paymentMethod"] = ctx.PaymentMethod,
            ["transactionReference"] = ctx.TransactionReference,
            ["receiptNumber"] = ctx.ReceiptNumber,
            ["remainingBalance"] = ctx.RemainingBalance,
            ["paymentStatus"] = ctx.PaymentStatus,
            ["reason"] = string.IsNullOrWhiteSpace(ctx.Reason) ? "Verification details did not match bank records." : ctx.Reason!
        };

        var subjectRaw = ReplaceTokens(template.Subject, tokenMap, htmlEncodeValues: false);
        var subject = SanitizeSubject(subjectRaw);
        if (ctx.IsTestEmail && !subject.StartsWith("[TEST]", StringComparison.OrdinalIgnoreCase))
        {
            subject = $"[TEST] {subject}";
        }

        var accent = Regex.IsMatch(receiptSettings.AccentColor ?? string.Empty, @"^#[0-9a-fA-F]{6}$")
            ? receiptSettings.AccentColor!
            : "#6941a5";

        var headingHtml = WebUtility.HtmlEncode(ReplaceTokens(template.Heading, tokenMap, htmlEncodeValues: false));
        var bodyHtml = RenderSafeMarkdownBlock(ReplaceTokens(template.Body, tokenMap, htmlEncodeValues: false));
        var closingHtml = RenderSafeMarkdownBlock(ReplaceTokens(template.Closing, tokenMap, htmlEncodeValues: false));
        var signatureHtml = RenderSafeMarkdownBlock(ReplaceTokens(template.Signature, tokenMap, htmlEncodeValues: false));
        var footerHtml = WebUtility.HtmlEncode(receiptSettings.Footer ?? string.Empty);

        var sb = new StringBuilder();
        sb.Append("<!DOCTYPE html><html><body style=\"margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1e293b;\">");
        sb.Append("<div style=\"max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;\">");

        if (ctx.IsTestEmail)
        {
            sb.Append("<div style=\"background:#fef3c7;color:#92400e;padding:10px 20px;font-size:12px;font-weight:700;text-align:center;border-bottom:1px solid #fde68a;\">");
            sb.Append("TEST EMAIL — SAMPLE TEMPLATE PREVIEW DATA ONLY (NOT AN OFFICIAL FEE RECEIPT)");
            sb.Append("</div>");
        }

        sb.Append($"<div style=\"background:{accent};color:#ffffff;padding:20px 24px;\">");
        sb.Append($"<div style=\"font-size:12px;opacity:0.9;margin-bottom:4px;\">{WebUtility.HtmlEncode(ctx.CollegeName)} · {WebUtility.HtmlEncode(ctx.CampusName)}</div>");
        sb.Append($"<h1 style=\"margin:0;font-size:20px;line-height:1.3;\">{headingHtml}</h1>");
        sb.Append("</div>");

        sb.Append("<div style=\"padding:24px;font-size:14px;line-height:1.6;\">");
        sb.Append(bodyHtml);

        sb.Append("<table style=\"width:100%;border-collapse:collapse;margin:18px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;\">");
        AppendRow(sb, "Student", $"{ctx.StudentName} ({ctx.AdmissionNumber})");
        AppendRow(sb, "Status", ctx.PaymentStatus);
        AppendRow(sb, "Amount", ctx.AmountPaid);
        AppendRow(sb, "Payment Method", ctx.PaymentMethod);
        AppendRow(sb, "Payment Date", ctx.PaymentDate);
        if (!string.IsNullOrWhiteSpace(ctx.TransactionReference) && ctx.TransactionReference != "-")
            AppendRow(sb, "Transaction Ref", ctx.TransactionReference);
        if (!string.IsNullOrWhiteSpace(ctx.ReceiptNumber) && ctx.ReceiptNumber != "-")
            AppendRow(sb, "Receipt Number", ctx.ReceiptNumber);
        AppendRow(sb, "Remaining Balance", ctx.RemainingBalance);
        sb.Append("</table>");

        if (!string.IsNullOrEmpty(closingHtml))
        {
            sb.Append($"<div style=\"margin-top:16px;\">{closingHtml}</div>");
        }
        if (!string.IsNullOrEmpty(signatureHtml))
        {
            sb.Append($"<div style=\"margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;color:#475569;\">{signatureHtml}</div>");
        }

        sb.Append("</div>");
        if (!string.IsNullOrWhiteSpace(footerHtml))
        {
            sb.Append($"<div style=\"background:#f1f5f9;padding:12px 24px;font-size:12px;color:#64748b;text-align:center;\">{footerHtml}</div>");
        }
        sb.Append("</div></body></html>");

        return (subject, sb.ToString());
    }

    private static void AppendRow(StringBuilder sb, string label, string value)
    {
        sb.Append("<tr>");
        sb.Append($"<td style=\"padding:8px 12px;font-size:12px;color:#64748b;border-bottom:1px solid #e2e8f0;width:38%;\">{WebUtility.HtmlEncode(label)}</td>");
        sb.Append($"<td style=\"padding:8px 12px;font-size:13px;font-weight:600;color:#0f172a;border-bottom:1px solid #e2e8f0;\">{WebUtility.HtmlEncode(value)}</td>");
        sb.Append("</tr>");
    }

    private static string ReplaceTokens(string? input, Dictionary<string, string> tokenMap, bool htmlEncodeValues)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;
        return TokenRegex.Replace(input, match =>
        {
            var key = match.Groups[1].Value;
            if (!AllowedTokens.Contains(key) || !tokenMap.TryGetValue(key, out var val))
                return match.Value;
            return htmlEncodeValues ? WebUtility.HtmlEncode(val) : val;
        });
    }

    private static string SanitizeSubject(string? subject)
    {
        if (string.IsNullOrWhiteSpace(subject)) return "Fee Payment Notification";
        return subject.Replace("\r", " ").Replace("\n", " ").Trim();
    }

    private static string RenderSafeMarkdownBlock(string? text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;

        var lines = text.Replace("\r\n", "\n").Split('\n');
        var sb = new StringBuilder();
        bool inList = false;

        foreach (var rawLine in lines)
        {
            var line = rawLine.TrimEnd();
            if (line.StartsWith("- "))
            {
                if (!inList)
                {
                    sb.Append("<ul style=\"margin:8px 0 12px 18px;padding:0;\">");
                    inList = true;
                }
                sb.Append($"<li style=\"margin:4px 0;\">{FormatInline(line.Substring(2))}</li>");
            }
            else
            {
                if (inList)
                {
                    sb.Append("</ul>");
                    inList = false;
                }
                if (string.IsNullOrWhiteSpace(line))
                {
                    sb.Append("<div style=\"height:8px;\"></div>");
                }
                else
                {
                    sb.Append($"<p style=\"margin:0 0 8px 0;\">{FormatInline(line)}</p>");
                }
            }
        }

        if (inList) sb.Append("</ul>");
        return sb.ToString();
    }

    private static string FormatInline(string text)
    {
        var sb = new StringBuilder();
        int lastIdx = 0;
        foreach (Match m in InlineFormatRegex.Matches(text))
        {
            if (m.Index > lastIdx)
            {
                sb.Append(WebUtility.HtmlEncode(text.Substring(lastIdx, m.Index - lastIdx)));
            }

            var val = m.Value;
            if (val.StartsWith("**") && val.EndsWith("**") && val.Length > 4)
            {
                sb.Append($"<strong>{WebUtility.HtmlEncode(val.Substring(2, val.Length - 4))}</strong>");
            }
            else if (val.StartsWith("*") && val.EndsWith("*") && val.Length > 2)
            {
                sb.Append($"<em>{WebUtility.HtmlEncode(val.Substring(1, val.Length - 2))}</em>");
            }
            else
            {
                sb.Append(WebUtility.HtmlEncode(val));
            }
            lastIdx = m.Index + m.Length;
        }
        if (lastIdx < text.Length)
        {
            sb.Append(WebUtility.HtmlEncode(text.Substring(lastIdx)));
        }
        return sb.ToString();
    }
}
