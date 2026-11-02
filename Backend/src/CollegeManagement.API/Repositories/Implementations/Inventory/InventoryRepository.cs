using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Inventory;
using CollegeManagement.API.Repositories.Interfaces.Inventory;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations.Inventory
{
    public class InventoryRepository : IInventoryRepository
    {
        private readonly AppDbContext _dbContext;

        public InventoryRepository(AppDbContext dbContext)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        }

        private IDbConnection Connection => _dbContext.Database.GetDbConnection();

        #region Dashboard
        public async Task<InventoryDashboardDto> GetDashboardSummaryAsync()
        {
            var result = new InventoryDashboardDto();

            using var multi = await Connection.QueryMultipleAsync(
                "sp_Inventory_GetDashboardSummary",
                commandType: CommandType.StoredProcedure);

            result.Kpis = await multi.ReadFirstOrDefaultAsync<DashboardKpisDto>() ?? new DashboardKpisDto();
            result.RecentMovements = (await multi.ReadAsync<TransactionDto>()).ToList();
            result.LowStockAlerts = (await multi.ReadAsync<ItemDto>()).ToList();
            result.CategoryDistribution = (await multi.ReadAsync<CategoryDistributionDto>()).ToList();
            result.RecentActivities = (await multi.ReadAsync<ActivityLogDto>()).ToList();

            return result;
        }
        #endregion

        #region Items
        public async Task<IEnumerable<ItemDto>> GetItemsAsync(ItemFilterRequest filter)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_Search", filter.Search);
            parameters.Add("p_CategoryId", filter.CategoryId);
            parameters.Add("p_Department", filter.Department);
            parameters.Add("p_SupplierId", filter.SupplierId);
            parameters.Add("p_Status", filter.Status);
            parameters.Add("p_StockStatus", filter.StockStatus);

            return await Connection.QueryAsync<ItemDto>(
                "sp_Inventory_GetItems",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<ItemDetailDto?> GetItemByIdAsync(int itemId)
        {
            var item = await Connection.QueryFirstOrDefaultAsync<ItemDetailDto>(
                "sp_Inventory_GetItemById",
                new { p_ItemId = itemId },
                commandType: CommandType.StoredProcedure);

            if (item == null) return null;

            var ledger = (await GetItemLedgerAsync(itemId, null, null)).ToList();
            item.Ledger = ledger;
            item.TotalStockIn = ledger.Sum(l => l.QuantityIn);
            item.TotalStockOut = ledger.Sum(l => l.QuantityOut);

            return item;
        }

        public async Task<IEnumerable<ItemLedgerEntryDto>> GetItemLedgerAsync(int itemId, DateTime? fromDate, DateTime? toDate)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_ItemId", itemId);
            parameters.Add("p_FromDate", fromDate);
            parameters.Add("p_ToDate", toDate);

            return await Connection.QueryAsync<ItemLedgerEntryDto>(
                "sp_Inventory_GetItemLedger",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<ItemDto> CreateItemAsync(CreateItemRequest request, int userId, string userName)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_Code", request.Code.Trim());
            parameters.Add("p_Name", request.Name.Trim());
            parameters.Add("p_CategoryId", request.CategoryId);
            parameters.Add("p_Unit", request.Unit?.Trim() ?? "Pieces");
            parameters.Add("p_Type", request.Type?.Trim() ?? "Consumable");
            parameters.Add("p_Description", request.Description?.Trim());
            parameters.Add("p_Brand", request.Brand?.Trim());
            parameters.Add("p_Model", request.Model?.Trim());
            parameters.Add("p_Sku", request.Sku?.Trim());
            parameters.Add("p_Department", request.Department?.Trim());
            parameters.Add("p_Location", request.Location?.Trim());
            parameters.Add("p_Rack", request.Rack?.Trim());
            parameters.Add("p_OpeningQuantity", request.OpeningQuantity);
            parameters.Add("p_OpeningCost", request.UnitCost);
            parameters.Add("p_MinStock", request.MinStock);
            parameters.Add("p_MaxStock", request.MaxStock);
            parameters.Add("p_ReorderQty", request.ReorderQty);
            parameters.Add("p_IssueValue", request.IssueValue);
            parameters.Add("p_SupplierId", request.SupplierId);
            parameters.Add("p_SupplierItemCode", request.SupplierItemCode?.Trim());
            parameters.Add("p_PurchaseDate", request.PurchaseDate?.Date);
            parameters.Add("p_WarrantyDate", request.WarrantyDate?.Date);
            parameters.Add("p_Status", string.IsNullOrWhiteSpace(request.Status) ? "Active" : request.Status.Trim());
            parameters.Add("p_Remarks", request.Remarks?.Trim());
            parameters.Add("p_UserId", userId);
            parameters.Add("p_UserName", string.IsNullOrWhiteSpace(userName) ? "Store Administrator" : userName.Trim());

            int newItemId = await Connection.QuerySingleAsync<int>(
                "sp_Inventory_CreateItem",
                parameters,
                commandType: CommandType.StoredProcedure);

            return (await GetItemByIdAsync(newItemId))!;
        }

        public async Task<ItemDto> UpdateItemAsync(int itemId, UpdateItemRequest request, int userId, string userName)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_ItemId", itemId);
            parameters.Add("p_Code", request.Code.Trim());
            parameters.Add("p_Name", request.Name.Trim());
            parameters.Add("p_CategoryId", request.CategoryId);
            parameters.Add("p_Unit", request.Unit?.Trim() ?? "Pieces");
            parameters.Add("p_Type", request.Type?.Trim() ?? "Consumable");
            parameters.Add("p_Description", request.Description?.Trim());
            parameters.Add("p_Brand", request.Brand?.Trim());
            parameters.Add("p_Model", request.Model?.Trim());
            parameters.Add("p_Sku", request.Sku?.Trim());
            parameters.Add("p_Department", request.Department?.Trim());
            parameters.Add("p_Location", request.Location?.Trim());
            parameters.Add("p_Rack", request.Rack?.Trim());
            parameters.Add("p_MinStock", request.MinStock);
            parameters.Add("p_MaxStock", request.MaxStock);
            parameters.Add("p_ReorderQty", request.ReorderQty);
            parameters.Add("p_IssueValue", request.IssueValue);
            parameters.Add("p_SupplierId", request.SupplierId);
            parameters.Add("p_SupplierItemCode", request.SupplierItemCode?.Trim());
            parameters.Add("p_PurchaseDate", request.PurchaseDate?.Date);
            parameters.Add("p_WarrantyDate", request.WarrantyDate?.Date);
            parameters.Add("p_Status", string.IsNullOrWhiteSpace(request.Status) ? "Active" : request.Status.Trim());
            parameters.Add("p_Remarks", request.Remarks?.Trim());
            parameters.Add("p_UserId", userId);
            parameters.Add("p_UserName", string.IsNullOrWhiteSpace(userName) ? "Store Administrator" : userName.Trim());

            await Connection.ExecuteAsync(
                "sp_Inventory_UpdateItem",
                parameters,
                commandType: CommandType.StoredProcedure);

            return (await GetItemByIdAsync(itemId))!;
        }

        public async Task<bool> DeleteItemAsync(int itemId, int userId, string userName)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_ItemId", itemId);
            parameters.Add("p_UserId", userId);
            parameters.Add("p_UserName", string.IsNullOrWhiteSpace(userName) ? "Store Administrator" : userName.Trim());

            var affected = await Connection.ExecuteScalarAsync<int?>(
                "sp_Inventory_DeleteItem",
                parameters,
                commandType: CommandType.StoredProcedure);

            return (affected ?? 1) > 0;
        }

        public async Task<bool> DeactivateItemAsync(int itemId, int userId, string userName)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_ItemId", itemId);
            parameters.Add("p_UserId", userId);
            parameters.Add("p_UserName", string.IsNullOrWhiteSpace(userName) ? "Store Administrator" : userName.Trim());

            var affected = await Connection.ExecuteScalarAsync<int?>(
                "sp_Inventory_DeactivateItem",
                parameters,
                commandType: CommandType.StoredProcedure);

            return (affected ?? 1) > 0;
        }
        #endregion

        #region Categories
        public async Task<IEnumerable<CategoryDto>> GetCategoriesAsync(bool includeInactive = false)
        {
            return await Connection.QueryAsync<CategoryDto>(
                "sp_Inventory_GetCategories",
                new { p_IncludeInactive = includeInactive ? 1 : 0 },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<CategoryDto> SaveCategoryAsync(int? categoryId, CreateCategoryRequest request, int userId, string userName)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_CategoryId", categoryId);
            parameters.Add("p_Code", request.Code.Trim());
            parameters.Add("p_Name", request.Name.Trim());
            parameters.Add("p_Description", request.Description?.Trim());
            parameters.Add("p_Department", string.IsNullOrWhiteSpace(request.Department) ? "Administration" : request.Department.Trim());
            parameters.Add("p_Status", string.IsNullOrWhiteSpace(request.Status) ? "Active" : request.Status.Trim());
            parameters.Add("p_UserId", userId);
            parameters.Add("p_UserName", string.IsNullOrWhiteSpace(userName) ? "Store Administrator" : userName.Trim());

            int savedId = await Connection.QuerySingleAsync<int>(
                "sp_Inventory_SaveCategory",
                parameters,
                commandType: CommandType.StoredProcedure);

            var categories = await GetCategoriesAsync(true);
            return categories.First(c => c.CategoryId == savedId);
        }

        public async Task<bool> DeactivateCategoryAsync(int categoryId, int userId, string userName)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_CategoryId", categoryId);
            parameters.Add("p_UserId", userId);
            parameters.Add("p_UserName", string.IsNullOrWhiteSpace(userName) ? "Store Administrator" : userName.Trim());

            var affected = await Connection.ExecuteScalarAsync<int?>(
                "sp_Inventory_DeactivateCategory",
                parameters,
                commandType: CommandType.StoredProcedure);

            return (affected ?? 1) > 0;
        }
        #endregion

        #region Suppliers
        public async Task<IEnumerable<SupplierDto>> GetSuppliersAsync(bool includeInactive = false)
        {
            var rawRows = await Connection.QueryAsync<dynamic>(
                "sp_Inventory_GetSuppliers",
                new { p_IncludeInactive = includeInactive ? 1 : 0 },
                commandType: CommandType.StoredProcedure);

            var result = new List<SupplierDto>();
            foreach (var r in rawRows)
            {
                var s = new SupplierDto
                {
                    SupplierId = (int)r.SupplierId,
                    Code = (string)r.Code,
                    Name = (string)r.Name,
                    ContactPerson = (string)r.ContactPerson,
                    Phone = (string)r.Phone,
                    AlternatePhone = (string?)r.AlternatePhone,
                    Email = (string?)r.Email,
                    Gstin = (string?)r.Gstin,
                    Pan = (string?)r.Pan,
                    Address1 = (string?)r.Address1,
                    Address2 = (string?)r.Address2,
                    City = (string?)r.City,
                    State = (string?)r.State,
                    PostalCode = (string?)r.PostalCode,
                    Country = (string)(r.Country ?? "India"),
                    PaymentTerms = (string?)r.PaymentTerms,
                    BankName = (string?)r.BankName,
                    AccountHolder = (string?)r.AccountHolder,
                    AccountNumber = (string?)r.AccountNumber,
                    Ifsc = (string?)r.Ifsc,
                    Notes = (string?)r.Notes,
                    Status = (string)r.Status,
                    TotalPurchases = (decimal)(r.TotalPurchases ?? 0.00m),
                    CreatedAt = (DateTime)r.CreatedAt,
                    UpdatedAt = (DateTime)r.UpdatedAt
                };

                s.Address = string.Join(", ", new[] { s.Address1, s.Address2, s.City, s.State, s.PostalCode }
                    .Where(p => !string.IsNullOrWhiteSpace(p)));

                string? catIdsStr = (string?)r.CategoryIdsString;
                if (!string.IsNullOrWhiteSpace(catIdsStr))
                {
                    s.CategoryIds = catIdsStr.Split(',')
                        .Select(id => int.TryParse(id.Trim(), out int val) ? val : 0)
                        .Where(val => val > 0)
                        .ToList();
                }

                string? suppliedCatsStr = (string?)r.SuppliedCategoriesString;
                if (!string.IsNullOrWhiteSpace(suppliedCatsStr))
                {
                    s.SuppliedCategories = suppliedCatsStr.Split(',')
                        .Select(name => name.Trim())
                        .Where(name => !string.IsNullOrEmpty(name))
                        .ToList();
                }

                result.Add(s);
            }

            return result;
        }

        public async Task<SupplierDto> SaveSupplierAsync(int? supplierId, CreateSupplierRequest request, int userId, string userName)
        {
            string categoryIdsCsv = request.CategoryIds != null && request.CategoryIds.Any()
                ? string.Join(",", request.CategoryIds.Distinct())
                : string.Empty;

            var parameters = new DynamicParameters();
            parameters.Add("p_SupplierId", supplierId);
            parameters.Add("p_Code", request.Code.Trim());
            parameters.Add("p_Name", request.Name.Trim());
            parameters.Add("p_ContactPerson", request.ContactPerson.Trim());
            parameters.Add("p_Phone", request.Phone.Trim());
            parameters.Add("p_AlternatePhone", request.AlternatePhone?.Trim());
            parameters.Add("p_Email", request.Email?.Trim());
            parameters.Add("p_Gstin", request.Gstin?.Trim());
            parameters.Add("p_Pan", request.Pan?.Trim());
            parameters.Add("p_Address1", request.Address1?.Trim());
            parameters.Add("p_Address2", request.Address2?.Trim());
            parameters.Add("p_City", request.City?.Trim());
            parameters.Add("p_State", request.State?.Trim());
            parameters.Add("p_PostalCode", request.PostalCode?.Trim());
            parameters.Add("p_Country", string.IsNullOrWhiteSpace(request.Country) ? "India" : request.Country.Trim());
            parameters.Add("p_PaymentTerms", request.PaymentTerms?.Trim());
            parameters.Add("p_BankName", request.BankName?.Trim());
            parameters.Add("p_AccountHolder", request.AccountHolder?.Trim());
            parameters.Add("p_AccountNumber", request.AccountNumber?.Trim());
            parameters.Add("p_Ifsc", request.Ifsc?.Trim());
            parameters.Add("p_Notes", request.Notes);
            parameters.Add("p_Status", string.IsNullOrWhiteSpace(request.Status) ? "Active" : request.Status.Trim());
            parameters.Add("p_CategoryIds", categoryIdsCsv);
            parameters.Add("p_UserId", userId);
            parameters.Add("p_UserName", string.IsNullOrWhiteSpace(userName) ? "Store Administrator" : userName.Trim());

            int savedId = await Connection.QuerySingleAsync<int>(
                "sp_Inventory_SaveSupplier",
                parameters,
                commandType: CommandType.StoredProcedure);

            var suppliers = await GetSuppliersAsync(true);
            return suppliers.First(s => s.SupplierId == savedId);
        }

        public async Task<bool> DeactivateSupplierAsync(int supplierId, int userId, string userName)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_SupplierId", supplierId);
            parameters.Add("p_UserId", userId);
            parameters.Add("p_UserName", string.IsNullOrWhiteSpace(userName) ? "Store Administrator" : userName.Trim());

            var affected = await Connection.ExecuteScalarAsync<int?>(
                "sp_Inventory_DeactivateSupplier",
                parameters,
                commandType: CommandType.StoredProcedure);

            return (affected ?? 1) > 0;
        }
        #endregion

        #region Movements
        public async Task<IEnumerable<TransactionDto>> GetMovementsAsync(MovementFilterRequest filter)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_FromDate", filter.FromDate?.Date);
            parameters.Add("p_ToDate", filter.ToDate?.Date);
            parameters.Add("p_ItemId", filter.ItemId);
            parameters.Add("p_CategoryId", filter.CategoryId);
            parameters.Add("p_Department", filter.Department);
            parameters.Add("p_SupplierId", filter.SupplierId);
            parameters.Add("p_Type", filter.Type);
            parameters.Add("p_Search", filter.Search);
            parameters.Add("p_TransactionId", (int?)null);
            parameters.Add("p_TransactionNumber", (string?)null);

            return await Connection.QueryAsync<TransactionDto>(
                "sp_Inventory_GetMovements",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<TransactionDto?> GetMovementByIdAsync(int transactionId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_FromDate", (DateTime?)null);
            parameters.Add("p_ToDate", (DateTime?)null);
            parameters.Add("p_ItemId", (int?)null);
            parameters.Add("p_CategoryId", (int?)null);
            parameters.Add("p_Department", (string?)null);
            parameters.Add("p_SupplierId", (int?)null);
            parameters.Add("p_Type", (string?)null);
            parameters.Add("p_Search", (string?)null);
            parameters.Add("p_TransactionId", transactionId);
            parameters.Add("p_TransactionNumber", (string?)null);

            return await Connection.QueryFirstOrDefaultAsync<TransactionDto>(
                "sp_Inventory_GetMovements",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<TransactionDto?> GetMovementByNumberAsync(string transactionNumber)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_FromDate", (DateTime?)null);
            parameters.Add("p_ToDate", (DateTime?)null);
            parameters.Add("p_ItemId", (int?)null);
            parameters.Add("p_CategoryId", (int?)null);
            parameters.Add("p_Department", (string?)null);
            parameters.Add("p_SupplierId", (int?)null);
            parameters.Add("p_Type", (string?)null);
            parameters.Add("p_Search", (string?)null);
            parameters.Add("p_TransactionId", (int?)null);
            parameters.Add("p_TransactionNumber", transactionNumber);

            return await Connection.QueryFirstOrDefaultAsync<TransactionDto>(
                "sp_Inventory_GetMovements",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<TransactionDto> PostMovementAsync(PostMovementRequest request, int userId, string performedBy)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_MovementType", request.MovementType);
            parameters.Add("p_ItemId", request.ItemId);
            parameters.Add("p_Quantity", request.Quantity);
            parameters.Add("p_UnitCost", request.UnitCost);
            parameters.Add("p_TransactionDate", request.TransactionDate.Date);
            parameters.Add("p_SupplierId", request.SupplierId);
            parameters.Add("p_SupplierInvoice", request.SupplierInvoice);
            parameters.Add("p_InvoiceNumber", request.InvoiceNumber);
            parameters.Add("p_PurchaseOrderNumber", request.PurchaseOrderNumber);
            parameters.Add("p_ReferenceNumber", request.ReferenceNumber);
            parameters.Add("p_Location", request.Location);
            parameters.Add("p_Condition", request.Condition);
            parameters.Add("p_BatchNumber", request.BatchNumber);
            parameters.Add("p_ExpiryDate", request.ExpiryDate?.Date);
            parameters.Add("p_IssueType", request.IssueType);
            parameters.Add("p_Department", request.Department);
            parameters.Add("p_RecipientName", request.RecipientName);
            parameters.Add("p_RecipientId", request.RecipientId);
            parameters.Add("p_Destination", request.Destination);
            parameters.Add("p_Purpose", request.Purpose);
            parameters.Add("p_ApprovedBy", request.ApprovedBy);
            parameters.Add("p_IsReturnable", request.IsReturnable ? 1 : 0);
            parameters.Add("p_ExpectedReturnDate", request.ExpectedReturnDate?.Date);
            parameters.Add("p_PerformedBy", performedBy);
            parameters.Add("p_Remarks", request.Remarks);
            parameters.Add("p_UserId", userId);

            var postResult = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                "sp_Inventory_PostMovement",
                parameters,
                commandType: CommandType.StoredProcedure);

            int newId = (int)postResult.TransactionId;
            return (await GetMovementByIdAsync(newId))!;
        }

        public async Task<TransactionDto> ReverseMovementAsync(int transactionId, int userId, string performedBy)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_TransactionId", transactionId);
            parameters.Add("p_PerformedBy", performedBy);
            parameters.Add("p_UserId", userId);

            var revResult = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                "sp_Inventory_ReverseMovement",
                parameters,
                commandType: CommandType.StoredProcedure);

            string correctionNumber = (string)revResult.CorrectionTransactionNumber;
            return (await GetMovementByNumberAsync(correctionNumber))!;
        }

        public async Task<TransactionDto> RecordReturnAsync(int transactionId, int userId, string performedBy)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_TransactionId", transactionId);
            parameters.Add("p_PerformedBy", performedBy);
            parameters.Add("p_UserId", userId);

            var retResult = await Connection.QueryFirstOrDefaultAsync<dynamic>(
                "sp_Inventory_RecordReturn",
                parameters,
                commandType: CommandType.StoredProcedure);

            string returnNumber = (string)retResult.ReturnTransactionNumber;
            return (await GetMovementByNumberAsync(returnNumber))!;
        }
        #endregion

        #region Reports
        public async Task<ReportResultDto> GetReportDataAsync(ReportRequest request)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_ReportType", request.ReportType);
            parameters.Add("p_DateFrom", request.DateFrom?.Date);
            parameters.Add("p_DateTo", request.DateTo?.Date);
            parameters.Add("p_ItemId", request.ItemId);
            parameters.Add("p_CategoryId", request.CategoryId);
            parameters.Add("p_Department", request.Department);
            parameters.Add("p_SupplierId", request.SupplierId);
            parameters.Add("p_MovementType", request.MovementType);
            parameters.Add("p_StockStatus", request.StockStatus);

            var result = new ReportResultDto();

            switch (request.ReportType)
            {
                case "Stock Summary":
                    result.Columns = new List<List<string>>
                    {
                        new() { "code", "Item Code" },
                        new() { "name", "Item Name" },
                        new() { "category", "Category" },
                        new() { "unit", "Unit" },
                        new() { "opening", "Opening Stock" },
                        new() { "received", "Stock Received" },
                        new() { "issued", "Stock Issued" },
                        new() { "quantity", "Current Stock" },
                        new() { "minStock", "Minimum Stock" },
                        new() { "unitCost", "Unit Cost", "money" },
                        new() { "stockValue", "Stock Value", "money" },
                        new() { "stockStatus", "Stock Status" },
                        new() { "status", "Item Status" }
                    };
                    result.Rows = await Connection.QueryAsync<StockSummaryReportRowDto>(
                        "sp_Inventory_GetReport", parameters, commandType: CommandType.StoredProcedure);
                    break;

                case "Stock Movement Report":
                    result.Columns = new List<List<string>>
                    {
                        new() { "number", "Transaction Number" },
                        new() { "date", "Date" },
                        new() { "item", "Item Name" },
                        new() { "code", "Item Code" },
                        new() { "type", "Movement Type" },
                        new() { "quantity", "Quantity" },
                        new() { "unitCost", "Unit Cost", "money" },
                        new() { "total", "Total Value", "money" },
                        new() { "partner", "Supplier / Recipient" },
                        new() { "department", "Department" },
                        new() { "reference", "Reference Number" },
                        new() { "performedBy", "Performed By" },
                        new() { "status", "Status" }
                    };
                    result.Rows = await Connection.QueryAsync<MovementReportRowDto>(
                        "sp_Inventory_GetReport", parameters, commandType: CommandType.StoredProcedure);
                    break;

                case "Low Stock Report":
                    result.Columns = new List<List<string>>
                    {
                        new() { "name", "Item" },
                        new() { "category", "Category" },
                        new() { "quantity", "Current Stock" },
                        new() { "minStock", "Minimum Stock" },
                        new() { "suggestedReorder", "Suggested Reorder Quantity" },
                        new() { "supplier", "Preferred Supplier" }
                    };
                    result.Rows = await Connection.QueryAsync<LowStockReportRowDto>(
                        "sp_Inventory_GetReport", parameters, commandType: CommandType.StoredProcedure);
                    break;

                case "Department-wise Issue Report":
                    result.Columns = new List<List<string>>
                    {
                        new() { "date", "Date" },
                        new() { "item", "Item" },
                        new() { "quantity", "Quantity" },
                        new() { "department", "Department" },
                        new() { "recipient", "Recipient" },
                        new() { "purpose", "Purpose" },
                        new() { "performedBy", "Issued By" },
                        new() { "total", "Issue Value", "money" },
                        new() { "status", "Status" }
                    };
                    result.Rows = await Connection.QueryAsync<DepartmentIssueReportRowDto>(
                        "sp_Inventory_GetReport", parameters, commandType: CommandType.StoredProcedure);
                    break;

                case "Supplier Purchase Report":
                    result.Columns = new List<List<string>>
                    {
                        new() { "date", "Date" },
                        new() { "partner", "Supplier" },
                        new() { "invoice", "Invoice Number" },
                        new() { "item", "Item" },
                        new() { "quantity", "Quantity Received" },
                        new() { "unitCost", "Unit Cost", "money" },
                        new() { "total", "Total Amount", "money" },
                        new() { "status", "Status" }
                    };
                    result.Rows = await Connection.QueryAsync<SupplierPurchaseReportRowDto>(
                        "sp_Inventory_GetReport", parameters, commandType: CommandType.StoredProcedure);
                    break;

                case "Category-wise Inventory Value":
                    result.Columns = new List<List<string>>
                    {
                        new() { "name", "Category" },
                        new() { "count", "Number of Items" },
                        new() { "value", "Stock Value", "money" },
                        new() { "alerts", "Minimum Stock Alerts" }
                    };
                    result.Rows = await Connection.QueryAsync<CategoryValueReportRowDto>(
                        "sp_Inventory_GetReport", parameters, commandType: CommandType.StoredProcedure);
                    break;

                case "Expiry / Warranty Report":
                    result.Columns = new List<List<string>>
                    {
                        new() { "item", "Item" },
                        new() { "code", "Item Code" },
                        new() { "batch", "Batch / SKU" },
                        new() { "kind", "Record Type" },
                        new() { "date", "Expiry / Warranty Date" },
                        new() { "days", "Days Remaining" },
                        new() { "status", "Status" }
                    };
                    result.Rows = await Connection.QueryAsync<ExpiryWarrantyReportRowDto>(
                        "sp_Inventory_GetReport", parameters, commandType: CommandType.StoredProcedure);
                    break;

                case "Returnable Items Report":
                    result.Columns = new List<List<string>>
                    {
                        new() { "number", "Transaction Number" },
                        new() { "date", "Issue Date" },
                        new() { "item", "Item" },
                        new() { "quantity", "Quantity" },
                        new() { "recipient", "Recipient" },
                        new() { "department", "Department" },
                        new() { "expectedReturnDate", "Expected Return" },
                        new() { "returnStatus", "Return Status" }
                    };
                    result.Rows = await Connection.QueryAsync<ReturnableItemsReportRowDto>(
                        "sp_Inventory_GetReport", parameters, commandType: CommandType.StoredProcedure);
                    break;

                default:
                    result.Rows = new List<object>();
                    break;
            }

            return result;
        }
        #endregion
    }
}
