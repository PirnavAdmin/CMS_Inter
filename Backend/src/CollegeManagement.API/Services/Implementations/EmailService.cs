using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Models;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

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
            await SendEmailWithAttachmentAsync(toEmail, subject, body, null!, null!);
        }

        public async Task SendEmailWithAttachmentAsync(string toEmail, string subject, string body, byte[] attachmentBytes, string attachmentFileName, string contentType = "application/pdf")
        {
            var email = new MimeMessage();

            email.From.Add(new MailboxAddress(_settings.SenderName, _settings.SenderEmail));
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

            using var smtp = new SmtpClient();
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