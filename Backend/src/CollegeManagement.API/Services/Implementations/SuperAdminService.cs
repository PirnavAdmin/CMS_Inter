using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Security.Cryptography;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.SuperAdmin;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Interfaces;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class SuperAdminService : ISuperAdminService
    {
        private readonly ISuperAdminRepository _repository;
        private readonly ILogger<SuperAdminService> _logger;
        private readonly IEmailService? _emailService;
        private readonly IConfiguration? _configuration;

        public SuperAdminService(
            ISuperAdminRepository repository,
            ILogger<SuperAdminService> logger,
            IEmailService? emailService = null,
            IConfiguration? configuration = null)
        {
            _repository = repository;
            _logger = logger;
            _emailService = emailService;
            _configuration = configuration;
        }

        private static string GenerateTemporaryPassword()
        {
            const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
            const string lower = "abcdefghijkmnopqrstuvwxyz";
            const string digits = "23456789";
            const string symbols = "@#$%&*!";
            const string all = upper + lower + digits + symbols;

            var chars = new char[12];
            chars[0] = upper[RandomNumberGenerator.GetInt32(upper.Length)];
            chars[1] = lower[RandomNumberGenerator.GetInt32(lower.Length)];
            chars[2] = digits[RandomNumberGenerator.GetInt32(digits.Length)];
            chars[3] = symbols[RandomNumberGenerator.GetInt32(symbols.Length)];
            for (int i = 4; i < chars.Length; i++)
            {
                chars[i] = all[RandomNumberGenerator.GetInt32(all.Length)];
            }
            for (int i = chars.Length - 1; i > 0; i--)
            {
                int j = RandomNumberGenerator.GetInt32(i + 1);
                (chars[i], chars[j]) = (chars[j], chars[i]);
            }
            return new string(chars);
        }

        private async Task TrySendAdminCredentialsEmailAsync(
            string toEmail,
            string fullName,
            string collegeName,
            string plainPassword,
            string subjectPrefix = "Your College Admin Portal Login Credentials")
        {
            if (_emailService == null || string.IsNullOrWhiteSpace(toEmail))
            {
                _logger.LogWarning("EmailService unavailable or recipient empty; skipping credentials email for {Email}", toEmail);
                return;
            }

            try
            {
                string portalBaseUrl = (_configuration?["InstitutionSettings:PortalUrl"] ?? "http://localhost:5173").TrimEnd('/');
                string loginUrl = $"{portalBaseUrl}/login";
                string safeName = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(fullName) ? "Administrator" : fullName);
                string safeCollege = WebUtility.HtmlEncode(string.IsNullOrWhiteSpace(collegeName) ? "Pirnav CMS" : collegeName);
                string safeEmail = WebUtility.HtmlEncode(toEmail.Trim().ToLowerInvariant());
                string safePass = WebUtility.HtmlEncode(plainPassword);
                string safeLoginUrl = WebUtility.HtmlEncode(loginUrl);

                string subject = $"{subjectPrefix} — {collegeName}";
                string body = $@"
<div style=""font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #d1e7d4; border-radius: 12px; overflow: hidden; background: #ffffff;"">
  <div style=""background: #1e4529; color: #ffffff; padding: 20px 24px;"">
    <h2 style=""margin: 0; font-size: 20px;"">Pirnav College Management System</h2>
    <p style=""margin: 4px 0 0; font-size: 13px; color: #cde7d1;"">College Administrator Account Provisioned</p>
  </div>
  <div style=""padding: 24px; color: #1f2937; font-size: 14px; line-height: 1.6;"">
    <p>Hello <strong>{safeName}</strong>,</p>
    <p>You have been assigned as a <strong>College Administrator</strong> for <strong>{safeCollege}</strong>. Use the credentials below to sign in to the Admin Portal:</p>
    <div style=""background: #f4f9f4; border: 1px solid #c8e6cc; border-radius: 10px; padding: 16px 20px; margin: 18px 0;"">
      <p style=""margin: 6px 0;""><strong>Portal URL:</strong> <a href=""{safeLoginUrl}"" style=""color: #1e4529;"">{safeLoginUrl}</a></p>
      <p style=""margin: 6px 0;""><strong>Login Email:</strong> {safeEmail}</p>
      <p style=""margin: 6px 0;""><strong>Temporary Password:</strong> <code style=""background: #ffffff; padding: 3px 8px; border-radius: 6px; border: 1px solid #c8e6cc; font-size: 14px;"">{safePass}</code></p>
    </div>
    <p style=""color: #4b5563; font-size: 13px;"">For security, please change your password after your first login.</p>
  </div>
</div>";

                await _emailService.SendEmailAsync(toEmail.Trim().ToLowerInvariant(), subject, body);
                _logger.LogInformation("Sent College Admin credentials email to {Email} for {College}", toEmail, collegeName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send College Admin credentials email to {Email}", toEmail);
            }
        }

        public async Task<SuperAdminBootstrapDto> GetBootstrapDataAsync()
        {
            var (colleges, _) = await _repository.GetCollegesPagedAsync(null, null, null, 1, 100);
            var (users, _) = await _repository.GetGlobalUsersPagedAsync(null, null, null, null, 1, 500);
            var plans = await _repository.GetAllPlansAsync();
            var payments = await _repository.GetPaymentsAndInvoicesAsync();
            var (activities, _) = await _repository.GetAuditLogsPagedAsync(null, null, null, null, 1, 50);
            var settings = await _repository.GetPlatformSettingsAsync();
            var notifications = await _repository.GetNotificationsAsync(null, null);

            return new SuperAdminBootstrapDto
            {
                Colleges = colleges.ToList(),
                Users = users.ToList(),
                Plans = plans.ToList(),
                Payments = payments.ToList(),
                Activities = activities.ToList(),
                Settings = settings,
                Notifications = notifications.ToList()
            };
        }

        public Task<DashboardSummaryDto> GetDashboardSummaryAsync() =>
            _repository.GetDashboardSummaryAsync();

        public Task<(IEnumerable<CollegeDto> Colleges, int TotalCount)> GetCollegesPagedAsync(string? searchTerm, string? status, int? planId, int page, int pageSize) =>
            _repository.GetCollegesPagedAsync(searchTerm, status, planId, page, pageSize);

        public Task<CollegeDto?> GetCollegeByIdAsync(int collegeId) =>
            _repository.GetCollegeByIdAsync(collegeId);

        public async Task<int> CreateCollegeAsync(CreateCollegeRequest request, string currentUserName)
        {
            string plainPassword = !string.IsNullOrWhiteSpace(request.AdminPassword)
                ? request.AdminPassword.Trim()
                : GenerateTemporaryPassword();
            string passwordHash = PasswordHasher.HashPassword(plainPassword);
            int newCollegeId = await _repository.CreateCollegeWithAdminAsync(request, passwordHash);

            string? adminEmail = !string.IsNullOrWhiteSpace(request.AdminEmail) ? request.AdminEmail : request.Email;
            if (request.SendWelcomeEmail && !string.IsNullOrWhiteSpace(adminEmail))
            {
                await TrySendAdminCredentialsEmailAsync(
                    adminEmail,
                    request.Admin ?? "College Administrator",
                    request.Name,
                    plainPassword);
            }

            return newCollegeId;
        }

        public Task<bool> UpdateCollegeAsync(int collegeId, UpdateCollegeRequest request, string currentUserName) =>
            _repository.UpdateCollegeAsync(collegeId, request);

        public Task<bool> UpdateCollegeStatusAsync(int collegeId, string status, string currentUserName) =>
            _repository.UpdateCollegeStatusAsync(collegeId, status);

        public Task<IEnumerable<CollegeAdminDto>> GetCollegeAdminsAsync(int? collegeId) =>
            _repository.GetCollegeAdminsAsync(collegeId);

        public async Task<int> CreateCollegeAdminAsync(CreateCollegeAdminRequest request, string currentUserName)
        {
            string plainPassword = !string.IsNullOrWhiteSpace(request.Password)
                ? request.Password.Trim()
                : GenerateTemporaryPassword();
            string passwordHash = PasswordHasher.HashPassword(plainPassword);
            int newUserId = await _repository.CreateCollegeAdminAsync(request, passwordHash);

            if (request.SendWelcomeEmail && !string.IsNullOrWhiteSpace(request.Email))
            {
                var college = await _repository.GetCollegeByIdAsync(request.CollegeId);
                await TrySendAdminCredentialsEmailAsync(
                    request.Email,
                    request.Name,
                    college?.Name ?? "Pirnav CMS",
                    plainPassword);
            }

            return newUserId;
        }

        public async Task<bool> ResendAdminCredentialsAsync(int userId, string currentUserName)
        {
            var user = await _repository.GetUserDetailAsync(userId);
            if (user == null || string.IsNullOrWhiteSpace(user.Email)) return false;

            string tempPassword = GenerateTemporaryPassword();
            string hash = PasswordHasher.HashPassword(tempPassword);
            bool updated = await _repository.ResetUserPasswordAsync(userId, hash);
            if (!updated) return false;

            await TrySendAdminCredentialsEmailAsync(
                user.Email,
                user.Name,
                user.CollegeName,
                tempPassword,
                "Your Reset College Admin Portal Login Credentials");

            return true;
        }

        public Task<(IEnumerable<GlobalUserDto> Users, int TotalCount)> GetGlobalUsersPagedAsync(string? searchTerm, int? collegeId, string? role, string? status, int page, int pageSize) =>
            _repository.GetGlobalUsersPagedAsync(searchTerm, collegeId, role, status, page, pageSize);

        public Task<GlobalUserDto?> GetUserDetailAsync(int userId) =>
            _repository.GetUserDetailAsync(userId);

        public Task<bool> UpdateUserAsync(int userId, SuperAdminUpdateUserRequest request, string currentUserName) =>
            _repository.UpdateUserAsync(userId, request);

        public Task<bool> UpdateUserStatusAsync(int userId, bool isActive, string currentUserName) =>
            _repository.UpdateUserStatusAsync(userId, isActive);

        public async Task<bool> ResetUserPasswordAsync(int userId, string newPassword, string currentUserName)
        {
            string hash = PasswordHasher.HashPassword(newPassword);
            bool ok = await _repository.ResetUserPasswordAsync(userId, hash);
            if (ok)
            {
                var user = await _repository.GetUserDetailAsync(userId);
                if (user != null && !string.IsNullOrWhiteSpace(user.Email))
                {
                    await TrySendAdminCredentialsEmailAsync(
                        user.Email,
                        user.Name,
                        user.CollegeName,
                        newPassword,
                        "Your Updated College Admin Portal Password");
                }
            }
            return ok;
        }

        public Task<IEnumerable<SubscriptionPlanDto>> GetAllPlansAsync() =>
            _repository.GetAllPlansAsync();

        public Task<int> SavePlanAsync(SavePlanRequest request, int? planId, string currentUserName) =>
            _repository.SavePlanAsync(request, planId);

        public Task<bool> UpdatePlanStatusAsync(int planId, bool isActive, string currentUserName) =>
            _repository.UpdatePlanStatusAsync(planId, isActive);

        public Task<IEnumerable<CollegeSubscriptionDto>> GetCollegeSubscriptionsAsync() =>
            _repository.GetCollegeSubscriptionsAsync();

        public Task<bool> ChangeCollegePlanAsync(int collegeId, string newPlanName, string currentUserName) =>
            _repository.ChangeCollegePlanAsync(collegeId, newPlanName, currentUserName);

        public Task<bool> RenewCollegeSubscriptionAsync(int collegeId, int extensionDays, string currentUserName) =>
            _repository.RenewCollegeSubscriptionAsync(collegeId, extensionDays, currentUserName);

        public Task<bool> CancelCollegeSubscriptionAsync(int collegeId, string currentUserName) =>
            _repository.CancelCollegeSubscriptionAsync(collegeId, currentUserName);

        public Task<IEnumerable<AccountUsageDto>> GetAccountUsageStatsAsync() =>
            _repository.GetAccountUsageStatsAsync();

        public Task<(IEnumerable<RenewalDto> Renewals, int TotalCount)> GetRenewalsPagedAsync(int daysThreshold, int page, int pageSize) =>
            _repository.GetRenewalsPagedAsync(daysThreshold, page, pageSize);

        public Task<IEnumerable<PlatformPaymentDto>> GetPaymentsAndInvoicesAsync() =>
            _repository.GetPaymentsAndInvoicesAsync();

        public Task<bool> VerifyPlatformPaymentAsync(int paymentId, string currentUserName) =>
            _repository.VerifyPlatformPaymentAsync(paymentId, currentUserName);

        public Task<IEnumerable<PlanModuleItemDto>> GetPlanModuleMatrixAsync() =>
            _repository.GetPlanModuleMatrixAsync();

        public Task<bool> UpdatePlanModuleMatrixAsync(int planId, string moduleName, bool isEnabled, string currentUserName) =>
            _repository.UpdatePlanModuleMatrixAsync(planId, moduleName, isEnabled);

        public Task<IEnumerable<PlatformNotificationDto>> GetNotificationsAsync(bool? isRead, string? category) =>
            _repository.GetNotificationsAsync(isRead, category);

        public Task<int> CreatePlatformNotificationAsync(CreatePlatformNotificationRequest request, int createdBy) =>
            _repository.CreatePlatformNotificationAsync(request, createdBy);

        public Task<bool> MarkNotificationReadAsync(int notificationId) =>
            _repository.MarkNotificationReadAsync(notificationId);

        public Task<(IEnumerable<PlatformAuditLogDto> Logs, int TotalCount)> GetAuditLogsPagedAsync(int? collegeId, string? action, DateTime? fromDate, DateTime? toDate, int page, int pageSize) =>
            _repository.GetAuditLogsPagedAsync(collegeId, action, fromDate, toDate, page, pageSize);

        public Task<PlatformSettingsDto> GetPlatformSettingsAsync() =>
            _repository.GetPlatformSettingsAsync();

        public Task<bool> UpdatePlatformSettingsAsync(PlatformSettingsDto settings, string currentUserName) =>
            _repository.UpdatePlatformSettingsAsync(settings, currentUserName);
    }
}
