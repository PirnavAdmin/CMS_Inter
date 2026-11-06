using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.SuperAdmin;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ISuperAdminRepository
    {
        // 1. Dashboard
        Task<DashboardSummaryDto> GetDashboardSummaryAsync();

        // 2. Colleges
        Task<(IEnumerable<CollegeDto> Colleges, int TotalCount)> GetCollegesPagedAsync(string? searchTerm, string? status, int? planId, int page, int pageSize);
        Task<CollegeDto?> GetCollegeByIdAsync(int collegeId);
        Task<int> CreateCollegeWithAdminAsync(CreateCollegeRequest request, string? adminPasswordHash);
        Task<bool> UpdateCollegeAsync(int collegeId, UpdateCollegeRequest request);
        Task<bool> UpdateCollegeStatusAsync(int collegeId, string status);

        // 3. College Admins
        Task<IEnumerable<CollegeAdminDto>> GetCollegeAdminsAsync(int? collegeId);
        Task<int> CreateCollegeAdminAsync(CreateCollegeAdminRequest request, string defaultPasswordHash);

        // 4. Global Users
        Task<(IEnumerable<GlobalUserDto> Users, int TotalCount)> GetGlobalUsersPagedAsync(string? searchTerm, int? collegeId, string? role, string? status, int page, int pageSize);
        Task<GlobalUserDto?> GetUserDetailAsync(int userId);
        Task<bool> UpdateUserStatusAsync(int userId, bool isActive);
        Task<bool> ResetUserPasswordAsync(int userId, string passwordHash);

        // 5. Subscription Plans
        Task<IEnumerable<SubscriptionPlanDto>> GetAllPlansAsync();
        Task<int> SavePlanAsync(SavePlanRequest request, int? planId);
        Task<bool> UpdatePlanStatusAsync(int planId, bool isActive);

        // 6. College Subscriptions
        Task<IEnumerable<CollegeSubscriptionDto>> GetCollegeSubscriptionsAsync();
        Task<bool> ChangeCollegePlanAsync(int collegeId, string newPlanName, string performedBy);
        Task<bool> RenewCollegeSubscriptionAsync(int collegeId, int extensionDays, string performedBy);
        Task<bool> CancelCollegeSubscriptionAsync(int collegeId, string performedBy);

        // 7. Account Usage
        Task<IEnumerable<AccountUsageDto>> GetAccountUsageStatsAsync();

        // 8. Renewals
        Task<(IEnumerable<RenewalDto> Renewals, int TotalCount)> GetRenewalsPagedAsync(int daysThreshold, int page, int pageSize);

        // 9. Payments & Invoices
        Task<IEnumerable<PlatformPaymentDto>> GetPaymentsAndInvoicesAsync();
        Task<bool> VerifyPlatformPaymentAsync(int paymentId, string verifiedBy);

        // 10. Module Management
        Task<IEnumerable<PlanModuleItemDto>> GetPlanModuleMatrixAsync();
        Task<bool> UpdatePlanModuleMatrixAsync(int planId, string moduleName, bool isEnabled);

        // 11. Notifications
        Task<IEnumerable<PlatformNotificationDto>> GetNotificationsAsync(bool? isRead, string? category);
        Task<int> CreatePlatformNotificationAsync(CreatePlatformNotificationRequest request, int createdBy);
        Task<bool> MarkNotificationReadAsync(int notificationId);

        // 12. Audit Logs
        Task<(IEnumerable<PlatformAuditLogDto> Logs, int TotalCount)> GetAuditLogsPagedAsync(int? collegeId, string? action, DateTime? fromDate, DateTime? toDate, int page, int pageSize);

        // 13. Platform Settings
        Task<PlatformSettingsDto> GetPlatformSettingsAsync();
        Task<bool> UpdatePlatformSettingsAsync(PlatformSettingsDto settings, string updatedBy);
    }
}
