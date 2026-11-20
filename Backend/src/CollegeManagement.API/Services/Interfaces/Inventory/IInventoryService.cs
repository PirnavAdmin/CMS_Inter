using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Inventory;

namespace CollegeManagement.API.Services.Interfaces.Inventory
{
    public interface IInventoryService
    {
        Task<InventoryDashboardDto> GetDashboardSummaryAsync();

        Task<IEnumerable<ItemDto>> GetItemsAsync(ItemFilterRequest filter);
        Task<ItemDetailDto?> GetItemByIdAsync(int itemId);
        Task<IEnumerable<ItemLedgerEntryDto>> GetItemLedgerAsync(int itemId, DateTime? fromDate, DateTime? toDate);
        Task<ItemDto> CreateItemAsync(CreateItemRequest request, int userId, string userName);
        Task<ItemDto> UpdateItemAsync(int itemId, UpdateItemRequest request, int userId, string userName);
        Task<bool> DeleteItemAsync(int itemId, int userId, string userName);
        Task<bool> DeactivateItemAsync(int itemId, int userId, string userName);

        Task<IEnumerable<CategoryDto>> GetCategoriesAsync(bool includeInactive = false);
        Task<CategoryDto> SaveCategoryAsync(int? categoryId, CreateCategoryRequest request, int userId, string userName);
        Task<bool> DeactivateCategoryAsync(int categoryId, int userId, string userName);

        Task<IEnumerable<SupplierDto>> GetSuppliersAsync(bool includeInactive = false);
        Task<SupplierDto> SaveSupplierAsync(int? supplierId, CreateSupplierRequest request, int userId, string userName);
        Task<bool> DeactivateSupplierAsync(int supplierId, int userId, string userName);

        Task<IEnumerable<TransactionDto>> GetMovementsAsync(MovementFilterRequest filter);
        Task<TransactionDto?> GetMovementByIdAsync(int transactionId);
        Task<TransactionDto> PostMovementAsync(PostMovementRequest request, int userId, string performedBy);
        Task<TransactionDto> ReverseMovementAsync(int transactionId, int userId, string performedBy);
        Task<TransactionDto> RecordReturnAsync(int transactionId, int userId, string performedBy);

        Task<ReportResultDto> GetReportDataAsync(ReportRequest request);

        Task<IEnumerable<PurchaseOrderDto>> GetPurchaseOrdersAsync(string? status, string? search);
        Task<PurchaseOrderDto?> GetPurchaseOrderByIdAsync(int orderId);
        Task<PurchaseOrderDto> CreatePurchaseOrderAsync(CreatePurchaseOrderRequest request, int userId, string userName);
        Task<bool> CancelPurchaseOrderAsync(int orderId, int userId, string userName, string? remarks = null);
        Task<bool> UpdatePurchaseOrderStatusAsync(int orderId, string status, int userId, string userName, string? remarks = null);
    }
}
