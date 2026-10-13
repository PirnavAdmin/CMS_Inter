using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Inventory
{
    public class InventoryDashboardDto
    {
        public DashboardKpisDto Kpis { get; set; } = new DashboardKpisDto();
        public List<TransactionDto> RecentMovements { get; set; } = new List<TransactionDto>();
        public List<ItemDto> LowStockAlerts { get; set; } = new List<ItemDto>();
        public List<CategoryDistributionDto> CategoryDistribution { get; set; } = new List<CategoryDistributionDto>();
        public List<ActivityLogDto> RecentActivities { get; set; } = new List<ActivityLogDto>();
    }

    public class DashboardKpisDto
    {
        public int TotalItems { get; set; }
        public decimal TotalStockValue { get; set; }
        public int LowStockCount { get; set; }
        public int PendingOrdersCount { get; set; }
    }

    public class CategoryDistributionDto
    {
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public int ItemCount { get; set; }
        public decimal TotalStockValue { get; set; }
    }

    public class ActivityLogDto
    {
        public int ActivityId { get; set; }
        public DateTime ActivityDate { get; set; }
        public string ActivityText { get; set; } = string.Empty;
        public string? UserName { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
