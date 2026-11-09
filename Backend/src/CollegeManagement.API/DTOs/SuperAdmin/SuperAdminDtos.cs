using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.SuperAdmin
{
    // ==========================================
    // 1. Dashboard DTOs
    // ==========================================
    public class DashboardSummaryDto
    {
        public int TotalColleges { get; set; }
        public int ActiveColleges { get; set; }
        public int InactiveColleges { get; set; }
        public int PendingRegistrations { get; set; }
        public int ActiveLoginAccounts { get; set; }
        public int FreePlanColleges { get; set; }
        public int PaidPlanColleges { get; set; }
        public decimal MonthlyRevenue { get; set; }
        public List<RegistrationTrendDto> RegistrationTrend { get; set; } = new();
        public List<PlanDistributionDto> PlanDistribution { get; set; } = new();
    }

    public class RegistrationTrendDto
    {
        public string MonthName { get; set; } = string.Empty;
        public int TotalRegistrations { get; set; }
    }

    public class PlanDistributionDto
    {
        public string PlanName { get; set; } = string.Empty;
        public int CollegeCount { get; set; }
    }

    // ==========================================
    // 2. College DTOs
    // ==========================================
    public class CollegeDto
    {
        public string Id { get; set; } = string.Empty;
        public int CollegeId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? Logo { get; set; }
        public string? Admin { get; set; }
        public string Plan { get; set; } = "Free";
        public string Status { get; set; } = "Active";
        public string Registered { get; set; } = string.Empty;
        public string? Renewal { get; set; }
        public int ActiveAccounts { get; set; }
        public int AccountLimit { get; set; }
        public int Students { get; set; }
        public int TotalStudents { get; set; }
    }

    public class CreateCollegeRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? Logo { get; set; }
        public string? Admin { get; set; }
        public string? AdminEmail { get; set; }
        public string Plan { get; set; } = "Free";
        public string Status { get; set; } = "Active";
    }

    public class UpdateCollegeRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? Address { get; set; }
        public string? Logo { get; set; }
    }

    public class SuperAdminUpdateStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }

    // ==========================================
    // 3. College Admin DTOs
    // ==========================================
    public class CollegeAdminDto
    {
        public int UserId { get; set; }
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? PhoneNumber { get; set; }
        public string? LastLogin { get; set; }
        public int CollegeId { get; set; }
        public string CollegeName { get; set; } = string.Empty;
        public string? CollegeCode { get; set; }
        public string Role { get; set; } = "CollegeAdmin";
        public bool Active { get; set; }
        public bool LoginEnabled { get; set; }
        public string? CreatedAt { get; set; }
    }

    public class CreateCollegeAdminRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonConverter(typeof(SMS.Api.Common.FlexibleIntConverter))]
        public int CollegeId { get; set; }

        public string? Phone { get; set; }
        public string? PhoneNumber { get; set; }
    }

    public class SuperAdminUpdateUserRequest
    {
        public string? Name { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? PhoneNumber { get; set; }
        public bool? Active { get; set; }
        public bool? IsActive { get; set; }

        [System.Text.Json.Serialization.JsonConverter(typeof(SMS.Api.Common.FlexibleIntConverter))]
        public int? CollegeId { get; set; }
    }

    // ==========================================
    // 4. Global User DTOs
    // ==========================================
    public class GlobalUserDto
    {
        public int UserId { get; set; }
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public string? PhoneNumber { get; set; }
        public string? CollegeId { get; set; }
        public string CollegeName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public bool Active { get; set; }
        public bool LoginEnabled { get; set; }
        public string AccountStatus { get; set; } = "Active";
        public string? LastLogin { get; set; }
        public string? CreatedAt { get; set; }
    }

    public class ResetPasswordRequest
    {
        public string NewPassword { get; set; } = string.Empty;
    }

    // ==========================================
    // 5. Subscription Plan DTOs
    // ==========================================
    public class SubscriptionPlanDto
    {
        public int PlanId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public int Limit { get; set; }
        public int DurationDays { get; set; } = 30;
        public bool Active { get; set; } = true;
        public List<string> Modules { get; set; } = new();
    }

    public class SavePlanRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public int Limit { get; set; }
        public int DurationDays { get; set; } = 30;
        public bool Active { get; set; } = true;
        public List<string> Modules { get; set; } = new();
    }

    // ==========================================
    // 6. College Subscription DTOs
    // ==========================================
    public class CollegeSubscriptionDto
    {
        public int SubscriptionId { get; set; }
        public int CollegeId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public string Plan { get; set; } = string.Empty;
        public int Active { get; set; }
        public int? Limit { get; set; }
        public string? SubscriptionStart { get; set; }
        public string? Renewal { get; set; }
        public string SubscriptionStatus { get; set; } = string.Empty;
        public int? Days { get; set; }
        public List<string> Modules { get; set; } = new();
    }

    public class ChangePlanRequest
    {
        public string PlanName { get; set; } = string.Empty;
    }

    // ==========================================
    // 7. Account Usage DTOs
    // ==========================================
    public class AccountUsageDto
    {
        public int CollegeId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Plan { get; set; } = string.Empty;
        public int Active { get; set; }
        public int Limit { get; set; }
        public int Available { get; set; }
        public decimal Percentage { get; set; }
        public string SubscriptionStatus { get; set; } = "Active";
    }

    // ==========================================
    // 8. Renewal DTOs
    // ==========================================
    public class RenewalDto
    {
        public int CollegeId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Plan { get; set; } = string.Empty;
        public string? Renewal { get; set; }
        public int? Days { get; set; }
        public string SubscriptionStatus { get; set; } = "Active";
    }

    // ==========================================
    // 9. Payment & Invoice DTOs
    // ==========================================
    public class PlatformPaymentDto
    {
        public string Id { get; set; } = string.Empty;
        public int PaymentId { get; set; }
        public string Invoice { get; set; } = string.Empty;
        public string CollegeId { get; set; } = string.Empty;
        public string CollegeName { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Date { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string PaymentMethod { get; set; } = string.Empty;
        public string? TransactionReference { get; set; }
    }

    // ==========================================
    // 10. Module Management DTOs
    // ==========================================
    public class PlanModuleItemDto
    {
        public int PlanId { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public string ModuleName { get; set; } = string.Empty;
        public bool IsEnabled { get; set; }
    }

    public class UpdatePlanModuleRequest
    {
        public int PlanId { get; set; }
        public string ModuleName { get; set; } = string.Empty;
        public bool IsEnabled { get; set; }
    }

    // ==========================================
    // 11. Platform Notifications DTOs
    // ==========================================
    public class PlatformNotificationDto
    {
        public string Id { get; set; } = string.Empty;
        public int NotificationId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string RecipientScope { get; set; } = "Platform";
        public string Read { get; set; } = "Unread";
    }

    public class CreatePlatformNotificationRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Category { get; set; } = "System Alerts";
    }

    // ==========================================
    // 12. Audit Log DTOs
    // ==========================================
    public class PlatformAuditLogDto
    {
        public string Id { get; set; } = string.Empty;
        public int AuditLogId { get; set; }
        public string Message { get; set; } = string.Empty;
        public string PerformedBy { get; set; } = "Platform Admin";
        public string? Role { get; set; } = "Super Admin";
        public string? Module { get; set; }
        public string College { get; set; } = "Platform Global";
        public string At { get; set; } = string.Empty;
        public string ActionType { get; set; } = string.Empty;
        public string Status { get; set; } = "Success";
        public string Scope { get; set; } = "Platform";
        public string? Details { get; set; }
    }

    // ==========================================
    // 13. Global Settings DTOs
    // ==========================================
    public class PlatformSettingsDto
    {
        public string PlatformName { get; set; } = "PIRNAV CMS";
        public string SupportEmail { get; set; } = "support@example.test";
        public int RenewalDays { get; set; } = 30;
    }

    // ==========================================
    // 14. Bootstrap Payload (Hydrates React Provider)
    // ==========================================
    public class SuperAdminBootstrapDto
    {
        public List<CollegeDto> Colleges { get; set; } = new();
        public List<GlobalUserDto> Users { get; set; } = new();
        public List<SubscriptionPlanDto> Plans { get; set; } = new();
        public List<PlatformPaymentDto> Payments { get; set; } = new();
        public List<PlatformAuditLogDto> Activities { get; set; } = new();
        public PlatformSettingsDto Settings { get; set; } = new();
        public List<PlatformNotificationDto> Notifications { get; set; } = new();
    }
}
