using System;
using System.Text.Encodings.Web;

namespace CollegeManagement.API.Helpers
{
    public static class ParentCredentialHelper
    {
        /// <summary>
        /// Builds the official, responsive HTML initial credential delivery email for newly provisioned Parent/Guardian accounts.
        /// </summary>
        public static string BuildInitialCredentialEmailHtml(
            string parentName,
            string parentEmail,
            string temporaryPassword,
            string childName,
            string admissionNo,
            string? portalUrl = null,
            string? institutionName = null)
        {
            var safeParentName = HtmlEncoder.Default.Encode(string.IsNullOrWhiteSpace(parentName) ? "Parent / Guardian" : parentName);
            var safeEmail = HtmlEncoder.Default.Encode(parentEmail);
            var safePassword = HtmlEncoder.Default.Encode(temporaryPassword);
            var safeChildName = HtmlEncoder.Default.Encode(childName);
            var safeAdmissionNo = HtmlEncoder.Default.Encode(admissionNo);
            var safePortalUrl = HtmlEncoder.Default.Encode(string.IsNullOrWhiteSpace(portalUrl) ? "http://localhost:5173" : portalUrl);
            var safeInstitution = HtmlEncoder.Default.Encode(string.IsNullOrWhiteSpace(institutionName) ? "College Management System" : institutionName);

            return $@"
            <div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);"">
                <div style=""background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); color: #ffffff; padding: 28px 24px; text-align: center;"">
                    <h2 style=""margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;"">{safeInstitution}</h2>
                    <p style=""margin: 6px 0 0 0; font-size: 14px; opacity: 0.95; color: #ccfbf1;"">Parent Portal Account Activation &amp; Login Credentials</p>
                </div>
                <div style=""padding: 28px 24px; color: #1e293b; line-height: 1.6;"">
                    <p style=""font-size: 16px; margin-top: 0;"">Dear <strong>{safeParentName}</strong>,</p>
                    <p style=""font-size: 14px; color: #334155; margin: 12px 0 20px 0;"">
                        Welcome to {safeInstitution}! Your official Parent Portal account has been created in connection with your child's admission.
                    </p>

                    <div style=""background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin: 20px 0;"">
                        <div style=""font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #15803d; margin-bottom: 6px;"">Enrolled Student Details</div>
                        <div style=""font-size: 14px; color: #166534;"">
                            <strong>Student Name:</strong> {safeChildName}<br>
                            <strong>Admission No:</strong> <code>{safeAdmissionNo}</code>
                        </div>
                    </div>
                    
                    <div style=""background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 24px 0;"">
                        <div style=""font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #0d9488; margin-bottom: 12px;"">Your Login Credentials</div>
                        <table style=""width: 100%; border-collapse: collapse; font-size: 14px;"">
                            <tr>
                                <td style=""padding: 6px 0; color: #64748b; width: 140px;"">Parent Email / User:</td>
                                <td style=""padding: 6px 0; font-weight: 600; color: #0f172a;""><code>{safeEmail}</code></td>
                            </tr>
                            <tr>
                                <td style=""padding: 6px 0; color: #64748b;"">Temporary Password:</td>
                                <td style=""padding: 6px 0; font-weight: 700; color: #0f766e;""><code style=""background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 15px;"">{safePassword}</code></td>
                            </tr>
                        </table>
                    </div>

                    <div style=""text-align: center; margin: 28px 0;"">
                        <a href=""{safePortalUrl}"" style=""background-color: #0d9488; color: #ffffff; text-decoration: none; padding: 12px 32px; font-weight: 600; border-radius: 8px; display: inline-block; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.3);"">Log in to Parent Portal</a>
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

        /// <summary>
        /// Builds the official, responsive HTML notification email sent to an existing Parent user when a new sibling child is linked.
        /// </summary>
        public static string BuildChildLinkedNotificationEmailHtml(
            string parentName,
            string parentEmail,
            string childName,
            string admissionNo,
            string? portalUrl = null,
            string? institutionName = null)
        {
            var safeParentName = HtmlEncoder.Default.Encode(string.IsNullOrWhiteSpace(parentName) ? "Parent / Guardian" : parentName);
            var safeEmail = HtmlEncoder.Default.Encode(parentEmail);
            var safeChildName = HtmlEncoder.Default.Encode(childName);
            var safeAdmissionNo = HtmlEncoder.Default.Encode(admissionNo);
            var safePortalUrl = HtmlEncoder.Default.Encode(string.IsNullOrWhiteSpace(portalUrl) ? "http://localhost:5173" : portalUrl);
            var safeInstitution = HtmlEncoder.Default.Encode(string.IsNullOrWhiteSpace(institutionName) ? "College Management System" : institutionName);

            return $@"
            <div style=""font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);"">
                <div style=""background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); color: #ffffff; padding: 28px 24px; text-align: center;"">
                    <h2 style=""margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; color: #ffffff;"">{safeInstitution}</h2>
                    <p style=""margin: 6px 0 0 0; font-size: 14px; opacity: 0.95; color: #ccfbf1;"">New Student Linked to Your Parent Account</p>
                </div>
                <div style=""padding: 28px 24px; color: #1e293b; line-height: 1.6;"">
                    <p style=""font-size: 16px; margin-top: 0;"">Dear <strong>{safeParentName}</strong>,</p>
                    <p style=""font-size: 14px; color: #334155; margin: 12px 0 20px 0;"">
                        We are pleased to notify you that a new student admission has been linked to your existing Parent Portal account (<strong>{safeEmail}</strong>).
                    </p>

                    <div style=""background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin: 20px 0;"">
                        <div style=""font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #15803d; margin-bottom: 6px;"">Newly Linked Student</div>
                        <div style=""font-size: 14px; color: #166534;"">
                            <strong>Student Name:</strong> {safeChildName}<br>
                            <strong>Admission No:</strong> <code>{safeAdmissionNo}</code>
                        </div>
                    </div>

                    <div style=""background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px 18px; margin: 20px 0;"">
                        <p style=""font-size: 13.5px; color: #334155; margin: 0;"">
                            ℹ️ You can continue logging in with your <strong>existing password</strong>. Both of your enrolled children can now be managed and monitored seamlessly under your single parent account.
                        </p>
                    </div>

                    <div style=""text-align: center; margin: 28px 0;"">
                        <a href=""{safePortalUrl}"" style=""background-color: #0d9488; color: #ffffff; text-decoration: none; padding: 12px 32px; font-weight: 600; border-radius: 8px; display: inline-block; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(13, 148, 136, 0.3);"">Open Parent Portal</a>
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
