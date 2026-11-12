using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.SuperAdmin;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ISuperAdminService
    {
        // Hydration Bootstrap
        Task<SuperAdminBootstrapDto> GetBootstrapDataAsync();

        // 1. Dashboard
        Task<DashboardSummaryDto> GetDashboardSummaryAsync();

        // 2. Colleges
        Task<(IEnumerable<CollegeDto> Colleges, int TotalCount)> GetCollegesPagedAsync(string? searchTerm, string? status, int? planId, int page, int pageSize);
        Task<CollegeDto?> GetCollegeByIdAsync(int collegeId);
        Task<int> CreateCollegeAsync(CreateCollegeRequest request, string currentUserName);
        Task<bool> UpdateCollegeAsync(int collegeId, UpdateCollegeRequest request, string currentUserName);
        Task<bool> UpdateCollegeStatusAsync(int collegeId, string status, string currentUserName);

        // 3. College Admins
        Task<IEnumerable<CollegeAdminDto>> GetCollegeAdminsAsync(int? collegeId);
        Task<int> CreateCollegeAdminAsync(CreateCollegeAdminRequest request, string currentUserName);
        Task<bool> ResendAdminCredentialsAsync(int userId, string currentUserName);

        // 4. Global Users
        Task<(IEnumerable<GlobalUserDto> Users, int TotalCount)> GetGlobalUsersPagedAsync(string? searchTerm, int? collegeId, string? role, string? status, int page, int pageSize);
        Task<GlobalUserDto?> GetUserDetailAsync(int userId);
        Task<bool> UpdateUserAsync(int userId, SuperAdminUpdateUserRequest request, string currentUserName);
        Task<bool> UpdateUserStatusAsync(int userId, bool isActive, string currentUserName);
        Task<bool> ResetUserPasswordAsync(int userId, string newPassword, string currentUserName);

        // 5. Subscription Plans
        Task<IEnumerable<SubscriptionPlanDto>> GetAllPlansAsync();
        Task<int> SavePlanAsync(SavePlanRequest request, int? planId, string currentUserName);
        Task<bool> UpdatePlanStatusAsync(int planId, bool isActive, string currentUserName);

        // 6. College Subscriptions
        Task<IEnumerable<CollegeSubscriptionDto>> GetCollegeSubscriptionsAsync();
        Task<bool> ChangeCollegePlanAsync(int collegeId, string newPlanName, string currentUserName);
        Task<bool> RenewCollegeSubscriptionAsync(int collegeId, int extensionDays, string currentUserName);
        Task<bool> CancelCollegeSubscriptionAsync(int collegeId, string currentUserName);

        // 7. Account Usage
        Task<IEnumerable<AccountUsageDto>> GetAccountUsageStatsAsync();

        // 8. Renewals
        Task<(IEnumerable<RenewalDto> Renewals, int TotalCount)> GetRenewalsPagedAsync(int daysThreshold, int page, int pageSize);

        // 9. Payments & Invoices
        Task<IEnumerable<PlatformPaymentDto>> GetPaymentsAndInvoicesAsync();
        Task<bool> VerifyPlatformPaymentAsync(int paymentId, string currentUserName);

        // 10. Module Management
        Task<IEnumerable<PlanModuleItemDto>> GetPlanModuleMatrixAsync();
        Task<bool> UpdatePlanModuleMatrixAsync(int planId, string moduleName, bool isEnabled, string currentUserName);

        // 11. Notifications
        Task<IEnumerable<PlatformNotificationDto>> GetNotificationsAsync(bool? isRead, string? category);
        Task<int> CreatePlatformNotificationAsync(CreatePlatformNotificationRequest request, int createdBy);
        Task<bool> MarkNotificationReadAsync(int notificationId);

        // 12. Audit Logs
        Task<(IEnumerable<PlatformAuditLogDto> Logs, int TotalCount)> GetAuditLogsPagedAsync(int? collegeId, string? action, DateTime? fromDate, DateTime? toDate, int page, int pageSize);

        // 13. Platform Settings
        Task<PlatformSettingsDto> GetPlatformSettingsAsync();
        Task<bool> UpdatePlatformSettingsAsync(PlatformSettingsDto settings, string currentUserName);
    }
}
