using System;
using System.Text.Encodings.Web;

namespace CollegeManagement.API.Helpers
{
    public static class StudentCredentialHelper
    {
        /// <summary>
        /// Builds the official, responsive HTML initial credential delivery email for newly provisioned Student accounts.
        /// </summary>
        public static string BuildInitialCredentialEmailHtml(
            string studentName,
            string email,
            string temporaryPassword,
            string portalUrl,
            string institutionName)
        {
            var safeName = HtmlEncoder.Default.Encode(studentName);
            var safeEmail = HtmlEncoder.Default.Encode(email);
            var safePassword = HtmlEncoder.Default.Encode(temporaryPassword);
            var safePortalUrl = HtmlEncoder.Default.Encode(string.IsNullOrWhiteSpace(portalUrl) ? "http://localhost:5173" : portalUrl);
            var safeInstitution = HtmlEncoder.Default.Encode(string.IsNullOrWhiteSpace(institutionName) ? "College Management System" : institutionName);

            return $@"
            <div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);"">
                <div style=""background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; padding: 28px 24px; text-align: center;"">
                    <h2 style=""margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;"">{safeInstitution}</h2>
                    <p style=""margin: 6px 0 0 0; font-size: 14px; opacity: 0.95; color: #e0e7ff;"">Student Portal Account Activation &amp; Login Credentials</p>
                </div>
                <div style=""padding: 28px 24px; color: #1e293b; line-height: 1.6;"">
                    <p style=""font-size: 16px; margin-top: 0;"">Dear <strong>{safeName}</strong>,</p>
                    <p style=""font-size: 14px; color: #334155; margin: 12px 0 20px 0;"">
                        Welcome to {safeInstitution}! Your official student portal account has been created. You can use these credentials to access your academic dashboard, timetables, fee invoices, attendance, and exam marks.
                    </p>
                    
                    <div style=""background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 24px 0;"">
                        <div style=""font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #2563eb; margin-bottom: 12px;"">Your Login Credentials</div>
                        <table style=""width: 100%; border-collapse: collapse; font-size: 14px;"">
                            <tr>
                                <td style=""padding: 6px 0; color: #64748b; width: 140px;"">Username / Email:</td>
                                <td style=""padding: 6px 0; font-weight: 600; color: #0f172a;""><code>{safeEmail}</code></td>
                            </tr>
                            <tr>
                                <td style=""padding: 6px 0; color: #64748b;"">Temporary Password:</td>
                                <td style=""padding: 6px 0; font-weight: 700; color: #1e3a8a;""><code style=""background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 15px;"">{safePassword}</code></td>
                            </tr>
                        </table>
                    </div>

                    <div style=""text-align: center; margin: 28px 0;"">
                        <a href=""{safePortalUrl}"" style=""background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 32px; font-weight: 600; border-radius: 8px; display: inline-block; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);"">Log in to Student Portal</a>
                    </div>

                    <div style=""background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 14px; margin-top: 20px;"">
                        <p style=""font-size: 12.5px; color: #92400e; margin: 0; line-height: 1.5;"">
                            🔒 <strong>Security Notice:</strong> For your protection, this temporary password must be changed immediately upon your first login. Do not share your login credentials with anyone.
                        </p>
                    </div>

                    <hr style=""border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;"">
                    <p style=""font-size: 12px; color: #94a3b8; margin-bottom: 0;"">
                        Regards,<br><strong style=""color: #475569;"">{safeInstitution} Administration</strong>
                    </p>
                </div>
            </div>";
        }
    }
}

