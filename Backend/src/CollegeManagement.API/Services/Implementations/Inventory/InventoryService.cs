using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Inventory;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Repositories.Interfaces.Inventory;
using CollegeManagement.API.Services.Interfaces;
using CollegeManagement.API.Services.Interfaces.Inventory;

namespace CollegeManagement.API.Services.Implementations.Inventory
{
    public class InventoryService : IInventoryService
    {
        private readonly IInventoryRepository _repository;
        private readonly IAuditLoggingService _auditLoggingService;

        public InventoryService(
            IInventoryRepository repository,
            IAuditLoggingService auditLoggingService)
        {
            _repository = repository;
            _auditLoggingService = auditLoggingService;
        }

        public async Task<InventoryDashboardDto> GetDashboardSummaryAsync()
        {
            return await _repository.GetDashboardSummaryAsync();
        }

        public async Task<IEnumerable<ItemDto>> GetItemsAsync(ItemFilterRequest filter)
        {
            return await _repository.GetItemsAsync(filter);
        }

        public async Task<ItemDetailDto?> GetItemByIdAsync(int itemId)
        {
            return await _repository.GetItemByIdAsync(itemId);
        }

        public async Task<IEnumerable<ItemLedgerEntryDto>> GetItemLedgerAsync(int itemId, DateTime? fromDate, DateTime? toDate)
        {
            return await _repository.GetItemLedgerAsync(itemId, fromDate, toDate);
        }

        public async Task<ItemDto> CreateItemAsync(CreateItemRequest request, int userId, string userName)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Item Name is required.");
            if (string.IsNullOrWhiteSpace(request.Code))
                throw new ArgumentException("Item Code is required.");
            if (request.CategoryId <= 0)
                throw new ArgumentException("Valid Category is required.");
            if (request.MaxStock.HasValue && request.MaxStock.Value < request.MinStock)
                throw new ArgumentException("Maximum stock must be at least minimum stock.");

            var item = await _repository.CreateItemAsync(request, userId);

            await _auditLoggingService.LogAsync(
                action: "Create Item",
                module: "Inventory Management",
                target: $"{item.Code} - {item.Name}",
                severity: "Info",
                status: "Success",
                details: $"Created item with opening stock {item.OpeningQuantity} {item.Unit} at ₹{item.UnitCost}",
                overrideUser: userName);

            return item;
        }

        public async Task<ItemDto> UpdateItemAsync(int itemId, UpdateItemRequest request, int userId, string userName)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Item Name is required.");
            if (string.IsNullOrWhiteSpace(request.Code))
                throw new ArgumentException("Item Code is required.");
            if (request.CategoryId <= 0)
                throw new ArgumentException("Valid Category is required.");
            if (request.MaxStock.HasValue && request.MaxStock.Value < request.MinStock)
                throw new ArgumentException("Maximum stock must be at least minimum stock.");

            var item = await _repository.UpdateItemAsync(itemId, request, userId);

            await _auditLoggingService.LogAsync(
                action: "Update Item",
                module: "Inventory Management",
                target: $"{item.Code} - {item.Name}",
                severity: "Info",
                status: "Success",
                details: $"Updated item metadata for {item.Name}",
                overrideUser: userName);

            return item;
        }

        public async Task<bool> DeleteItemAsync(int itemId, int userId, string userName)
        {
            var item = await _repository.GetItemByIdAsync(itemId);
            if (item == null) throw new KeyNotFoundException("Item not found.");

            bool deleted = await _repository.DeleteItemAsync(itemId);

            await _auditLoggingService.LogAsync(
                action: "Delete Item",
                module: "Inventory Management",
                target: $"{item.Code} - {item.Name}",
                severity: "Warning",
                status: "Success",
                details: $"Deleted zero-stock item {item.Name} with no transaction history",
                overrideUser: userName);

            return deleted;
        }

        public async Task<bool> DeactivateItemAsync(int itemId, int userId, string userName)
        {
            var item = await _repository.GetItemByIdAsync(itemId);
            if (item == null) throw new KeyNotFoundException("Item not found.");

            bool deactivated = await _repository.DeactivateItemAsync(itemId);

            await _auditLoggingService.LogAsync(
                action: "Deactivate Item",
                module: "Inventory Management",
                target: $"{item.Code} - {item.Name}",
                severity: "Info",
                status: "Success",
                details: $"Deactivated item {item.Name} while preserving historical references",
                overrideUser: userName);

            return deactivated;
        }

        public async Task<IEnumerable<CategoryDto>> GetCategoriesAsync(bool includeInactive = false)
        {
            return await _repository.GetCategoriesAsync(includeInactive);
        }

        public async Task<CategoryDto> SaveCategoryAsync(int? categoryId, CreateCategoryRequest request, int userId, string userName)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Category Name is required.");
            if (string.IsNullOrWhiteSpace(request.Code))
                throw new ArgumentException("Category Code is required.");

            var category = await _repository.SaveCategoryAsync(categoryId, request);

            await _auditLoggingService.LogAsync(
                action: categoryId.HasValue ? "Update Category" : "Create Category",
                module: "Inventory Management",
                target: $"{category.Code} - {category.Name}",
                severity: "Info",
                status: "Success",
                details: $"Saved category {category.Name}",
                overrideUser: userName);

            return category;
        }

        public async Task<bool> DeactivateCategoryAsync(int categoryId, int userId, string userName)
        {
            bool ok = await _repository.DeactivateCategoryAsync(categoryId);

            await _auditLoggingService.LogAsync(
                action: "Deactivate Category",
                module: "Inventory Management",
                target: $"Category ID {categoryId}",
                severity: "Info",
                status: "Success",
                details: $"Deactivated category {categoryId}",
                overrideUser: userName);

            return ok;
        }

        public async Task<IEnumerable<SupplierDto>> GetSuppliersAsync(bool includeInactive = false)
        {
            return await _repository.GetSuppliersAsync(includeInactive);
        }

        public async Task<SupplierDto> SaveSupplierAsync(int? supplierId, CreateSupplierRequest request, int userId, string userName)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Supplier Name is required.");
            if (string.IsNullOrWhiteSpace(request.Code))
                throw new ArgumentException("Supplier Code is required.");
            if (string.IsNullOrWhiteSpace(request.ContactPerson))
                throw new ArgumentException("Contact person is required.");
            if (string.IsNullOrWhiteSpace(request.Phone))
                throw new ArgumentException("Phone is required.");

            var supplier = await _repository.SaveSupplierAsync(supplierId, request);

            await _auditLoggingService.LogAsync(
                action: supplierId.HasValue ? "Update Supplier" : "Create Supplier",
                module: "Inventory Management",
                target: $"{supplier.Code} - {supplier.Name}",
                severity: "Info",
                status: "Success",
                details: $"Saved supplier {supplier.Name}",
                overrideUser: userName);

            return supplier;
        }

        public async Task<bool> DeactivateSupplierAsync(int supplierId, int userId, string userName)
        {
            bool ok = await _repository.DeactivateSupplierAsync(supplierId);

            await _auditLoggingService.LogAsync(
                action: "Deactivate Supplier",
                module: "Inventory Management",
                target: $"Supplier ID {supplierId}",
                severity: "Info",
                status: "Success",
                details: $"Deactivated supplier {supplierId}",
                overrideUser: userName);

            return ok;
        }

        public async Task<IEnumerable<TransactionDto>> GetMovementsAsync(MovementFilterRequest filter)
        {
            return await _repository.GetMovementsAsync(filter);
        }

        public async Task<TransactionDto?> GetMovementByIdAsync(int transactionId)
        {
            return await _repository.GetMovementByIdAsync(transactionId);
        }

        public async Task<TransactionDto> PostMovementAsync(PostMovementRequest request, int userId, string performedBy)
        {
            if (request.Quantity <= 0)
                throw new ArgumentException("Quantity must be greater than zero.");
            if (request.TransactionDate.Date > DateTime.UtcNow.Date)
                throw new ArgumentException("Transaction date cannot be in the future.");
            if (request.MovementType == "Stock In" && request.UnitCost < 0)
                throw new ArgumentException("Unit cost must be non-negative.");
            if (request.MovementType == "Stock Out" && request.IsReturnable && (!request.ExpectedReturnDate.HasValue || request.ExpectedReturnDate.Value.Date < request.TransactionDate.Date))
                throw new ArgumentException("Expected return date cannot precede issue date.");

            if (!string.IsNullOrWhiteSpace(request.PaymentMethod))
            {
                var pm = request.PaymentMethod.Trim();
                if (pm.Equals("online", StringComparison.OrdinalIgnoreCase) || 
                    pm.Equals("online transaction", StringComparison.OrdinalIgnoreCase) ||
                    pm.Equals("online_transaction", StringComparison.OrdinalIgnoreCase))
                {
                    request.PaymentMethod = "Online Transaction";
                }
                else if (pm.Equals("cash", StringComparison.OrdinalIgnoreCase))
                {
                    request.PaymentMethod = "Cash";
                }
            }
            else
            {
                request.PaymentMethod = "Cash";
            }

            var movement = await _repository.PostMovementAsync(request, userId, performedBy);

            await _auditLoggingService.LogAsync(
                action: $"Post {request.MovementType}",
                module: "Inventory Management",
                target: movement.TransactionNumber,
                severity: "Info",
                status: "Success",
                details: $"{request.MovementType} of {movement.Quantity} {movement.Unit} of {movement.ItemName} for total ₹{movement.TotalAmount}",
                overrideUser: performedBy);

            return movement;
        }

        public async Task<TransactionDto> ReverseMovementAsync(int transactionId, int userId, string performedBy)
        {
            var target = await _repository.GetMovementByIdAsync(transactionId);
            if (target == null) throw new KeyNotFoundException("Movement not found.");

            if (!target.CanReverse && !string.IsNullOrWhiteSpace(target.ReverseBlockedReason))
            {
                throw new MovementNotReversibleException(target.ReverseBlockedReason);
            }

            var correction = await _repository.ReverseMovementAsync(transactionId, userId, performedBy);

            await _auditLoggingService.LogAsync(
                action: "Reverse Movement",
                module: "Inventory Management",
                target: target.TransactionNumber,
                severity: "Warning",
                status: "Success",
                details: $"Reversed {target.TransactionNumber} with compensating transaction {correction.TransactionNumber}",
                overrideUser: performedBy);

            return correction;
        }

        public async Task<TransactionDto> RecordReturnAsync(int transactionId, int userId, string performedBy)
        {
            var target = await _repository.GetMovementByIdAsync(transactionId);
            if (target == null) throw new KeyNotFoundException("Movement not found.");

            var returnReceipt = await _repository.RecordReturnAsync(transactionId, userId, performedBy);

            await _auditLoggingService.LogAsync(
                action: "Record Return",
                module: "Inventory Management",
                target: target.TransactionNumber,
                severity: "Info",
                status: "Success",
                details: $"Recorded return for issue {target.TransactionNumber} with receipt {returnReceipt.TransactionNumber}",
                overrideUser: performedBy);

            return returnReceipt;
        }

        public async Task<ReportResultDto> GetReportDataAsync(ReportRequest request)
        {
            return await _repository.GetReportDataAsync(request);
        }
    }
}
