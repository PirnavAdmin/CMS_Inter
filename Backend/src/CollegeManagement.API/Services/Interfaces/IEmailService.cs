namespace CollegeManagement.API.Interfaces
{
    public interface IEmailService
    {
        Task SendEmailAsync(string toEmail, string subject, string body);
        Task SendEmailWithAttachmentAsync(string toEmail, string subject, string body, byte[] attachmentBytes, string attachmentFileName, string contentType = "application/pdf");
        Task SendEmailWithOptionsAsync(
            string toEmail,
            string subject,
            string body,
            byte[]? attachmentBytes = null,
            string? attachmentFileName = null,
            string contentType = "application/pdf",
            string? senderDisplayName = null,
            string? replyToEmail = null)
            => attachmentBytes != null && attachmentBytes.Length > 0 && !string.IsNullOrWhiteSpace(attachmentFileName)
                ? SendEmailWithAttachmentAsync(toEmail, subject, body, attachmentBytes, attachmentFileName, contentType)
                : SendEmailAsync(toEmail, subject, body);
    }
}
