using System;
using System.Text;

namespace CollegeManagement.API.Helpers
{
    /// <summary>
    /// Generates responsive HTML email templates for administrator initial onboarding credentials.
    /// </summary>
    public static class AdminCredentialHelper
    {
        /// <summary>
        /// Builds the HTML body for administrator initial credential delivery.
        /// </summary>
        public static string BuildInitialCredentialEmailHtml(
            string adminName,
            string email,
            string roleName,
            string temporaryPassword,
            string portalUrl = "http://localhost:5173")
        {
            var sb = new StringBuilder();

            sb.AppendLine("<!DOCTYPE html>");
            sb.AppendLine("<html lang=\"en\">");
            sb.AppendLine("<head>");
            sb.AppendLine("    <meta charset=\"UTF-8\">");
            sb.AppendLine("    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">");
            sb.AppendLine("    <title>Administrator Account Credentials</title>");
            sb.AppendLine("    <style>");
            sb.AppendLine("        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; color: #333333; }");
            sb.AppendLine("        .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }");
            sb.AppendLine("        .header { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: #ffffff; padding: 25px 30px; text-align: center; }");
            sb.AppendLine("        .header h1 { margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px; }");
            sb.AppendLine("        .header p { margin: 5px 0 0; font-size: 14px; opacity: 0.9; }");
            sb.AppendLine("        .content { padding: 30px; }");
            sb.AppendLine("        .greeting { font-size: 16px; margin-bottom: 20px; }");
            sb.AppendLine("        .credential-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; margin: 20px 0; }");
            sb.AppendLine("        .credential-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; font-size: 14px; }");
            sb.AppendLine("        .credential-row:last-child { border-bottom: none; }");
            sb.AppendLine("        .label { font-weight: 600; color: #475569; }");
            sb.AppendLine("        .value { color: #0f172a; font-family: monospace; font-size: 15px; }");
            sb.AppendLine("        .password-box { background-color: #e0f2fe; color: #0369a1; padding: 12px; border-radius: 6px; text-align: center; font-family: monospace; font-size: 18px; font-weight: bold; letter-spacing: 2px; margin: 15px 0; }");
            sb.AppendLine("        .btn-container { text-align: center; margin: 25px 0; }");
            sb.AppendLine("        .btn { background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; }");
            sb.AppendLine("        .warning-box { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 15px; margin: 20px 0; font-size: 13px; color: #92400e; border-radius: 0 4px 4px 0; }");
            sb.AppendLine("        .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }");
            sb.AppendLine("    </style>");
            sb.AppendLine("</head>");
            sb.AppendLine("<body>");
            sb.AppendLine("    <div class=\"container\">");
            sb.AppendLine("        <div class=\"header\">");
            sb.AppendLine("            <h1>College Management System</h1>");
            sb.AppendLine("            <p>Administrator Portal Credentials</p>");
            sb.AppendLine("        </div>");
            sb.AppendLine("        <div class=\"content\">");
            sb.AppendLine($"            <p class=\"greeting\">Dear <strong>{System.Net.WebUtility.HtmlEncode(adminName)}</strong>,</p>");
            sb.AppendLine("            <p>Your institutional administrator account has been created. Below are your official login credentials to access the College Management Portal:</p>");
            sb.AppendLine("            <div class=\"credential-box\">");
            sb.AppendLine("                <div class=\"credential-row\">");
            sb.AppendLine("                    <span class=\"label\">Username / Email:</span>");
            sb.AppendLine($"                    <span class=\"value\">{System.Net.WebUtility.HtmlEncode(email)}</span>");
            sb.AppendLine("                </div>");
            sb.AppendLine("                <div class=\"credential-row\">");
            sb.AppendLine("                    <span class=\"label\">Assigned Role:</span>");
            sb.AppendLine($"                    <span class=\"value\">{System.Net.WebUtility.HtmlEncode(roleName)}</span>");
            sb.AppendLine("                </div>");
            sb.AppendLine("            </div>");
            sb.AppendLine("            <p style=\"margin-bottom: 5px; font-size: 14px;\"><strong>Temporary Password:</strong></p>");
            sb.AppendLine($"            <div class=\"password-box\">{System.Net.WebUtility.HtmlEncode(temporaryPassword)}</div>");
            sb.AppendLine("            <div class=\"warning-box\">");
            sb.AppendLine("                <strong>Security Notice:</strong> You will be prompted to change this temporary password immediately upon your first login. For administrative security, never share these credentials with anyone.");
            sb.AppendLine("            </div>");
            sb.AppendLine("            <div class=\"btn-container\">");
            sb.AppendLine($"                <a href=\"{System.Net.WebUtility.HtmlEncode(portalUrl)}\" class=\"btn\" target=\"_blank\">Access Admin Portal</a>");
            sb.AppendLine("            </div>");
            sb.AppendLine("        </div>");
            sb.AppendLine("        <div class=\"footer\">");
            sb.AppendLine("            <p>This is an automated administrative notification. Please do not reply to this email.</p>");
            sb.AppendLine("            <p>&copy; College Management System. All rights reserved.</p>");
            sb.AppendLine("        </div>");
            sb.AppendLine("    </div>");
            sb.AppendLine("</body>");
            sb.AppendLine("</html>");

            return sb.ToString();
        }
    }
}
