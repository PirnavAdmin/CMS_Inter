using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Models;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using System.Net.Mail;

namespace CollegeManagement.API.Services.Implementations
{
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _settings;

        public EmailService(IOptions<EmailSettings> options)
        {
            _settings = options.Value;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            await SendEmailWithOptionsAsync(toEmail, subject, body);
        }

        public async Task SendEmailWithAttachmentAsync(string toEmail, string subject, string body, byte[] attachmentBytes, string attachmentFileName, string contentType = "application/pdf")
        {
            await SendEmailWithOptionsAsync(toEmail, subject, body, attachmentBytes, attachmentFileName, contentType);
        }

        public async Task SendEmailWithOptionsAsync(
            string toEmail,
            string subject,
            string body,
            byte[]? attachmentBytes = null,
            string? attachmentFileName = null,
            string contentType = "application/pdf",
            string? senderDisplayName = null,
            string? replyToEmail = null)
        {
            var email = new MimeMessage();

            var fromName = string.IsNullOrWhiteSpace(senderDisplayName) ? _settings.SenderName : senderDisplayName.Trim();
            email.From.Add(new MailboxAddress(fromName, _settings.SenderEmail));
            if (!string.IsNullOrWhiteSpace(replyToEmail) && MailAddress.TryCreate(replyToEmail.Trim(), out var parsedReplyTo))
            {
                email.ReplyTo.Add(MailboxAddress.Parse(parsedReplyTo.Address));
            }
            email.To.Add(MailboxAddress.Parse(toEmail));
            email.Subject = subject;

            var builder = new BodyBuilder
            {
                HtmlBody = body
            };

            if (attachmentBytes != null && attachmentBytes.Length > 0 && !string.IsNullOrWhiteSpace(attachmentFileName))
            {
                builder.Attachments.Add(attachmentFileName, attachmentBytes, ContentType.Parse(contentType));
            }

            email.Body = builder.ToMessageBody();

            using var smtp = new MailKit.Net.Smtp.SmtpClient();
            smtp.CheckCertificateRevocation = false;
            smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;
            smtp.Timeout = 15000;

            var host = _settings.SmtpServer;
            try
            {
                var ips = await System.Net.Dns.GetHostAddressesAsync(host);
                var ipv4 = System.Linq.Enumerable.FirstOrDefault(ips, ip => ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork);
                if (ipv4 != null)
                {
                    host = ipv4.ToString();
                }
            }
            catch
            {
                // Fallback to configured host name
            }

            await smtp.ConnectAsync(
                host,
                _settings.Port,
                SecureSocketOptions.StartTls);

            await smtp.AuthenticateAsync(
                _settings.SenderEmail,
                _settings.Password);

            await smtp.SendAsync(email);

            await smtp.DisconnectAsync(true);
        }
    }
}
