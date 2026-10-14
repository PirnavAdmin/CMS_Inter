using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Inventory;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Models.Inventory;
using CollegeManagement.API.Repositories.Interfaces.Inventory;
using Dapper;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace CollegeManagement.API.Repositories.Implementations.Inventory
{
    public class InventoryRepository : IInventoryRepository
    {
        private readonly IDbConnection _dbConnection;
        private readonly AppDbContext _dbContext;

        public InventoryRepository(IDbConnection dbConnection, AppDbContext dbContext)
        {
            _dbConnection = dbConnection;
            _dbContext = dbContext;
        }

        #region Dashboard
        public async Task<InventoryDashboardDto> GetDashboardSummaryAsync()
        {
            var result = new InventoryDashboardDto();

            using var multi = await _dbConnection.QueryMultipleAsync(
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

            return await _dbConnection.QueryAsync<ItemDto>(
                "sp_Inventory_GetItems",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<ItemDetailDto?> GetItemByIdAsync(int itemId)
        {
            var item = await _dbConnection.QueryFirstOrDefaultAsync<ItemDetailDto>(
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

            return await _dbConnection.QueryAsync<ItemLedgerEntryDto>(
                "sp_Inventory_GetItemLedger",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<string> GetNextItemCodeAsync()
        {
            var maxId = await _dbContext.InventoryItems.MaxAsync(i => (int?)i.ItemId) ?? 0;
            int nextNum = maxId + 1;
            string generatedCode = $"ITEM-{nextNum:D4}";
            while (await _dbContext.InventoryItems.AnyAsync(i => i.Code.ToLower() == generatedCode.ToLower()))
            {
                nextNum++;
                generatedCode = $"ITEM-{nextNum:D4}";
            }
            return generatedCode;
        }

        public async Task<ItemDto> CreateItemAsync(CreateItemRequest request, int userId)
        {
            if (string.IsNullOrWhiteSpace(request.Code))
            {
                request.Code = await GetNextItemCodeAsync();
            }
            else
            {
                request.Code = request.Code.Trim();
                // Verify code uniqueness
                bool exists = await _dbContext.InventoryItems.AnyAsync(i => i.Code.ToLower() == request.Code.ToLower());
                if (exists)
                {
                    throw new InvalidOperationException("This item code already exists.");
                }
            }

            var item = new InventoryItem
            {
                Code = request.Code.Trim(),
                Name = request.Name.Trim(),
                CategoryId = request.CategoryId,
                Unit = request.Unit,
                Type = request.Type,
                Description = request.Description,
                Brand = request.Brand,
                Model = request.Model,
                Sku = request.Sku,
                Department = request.Department,
                Location = request.Location,
                Rack = request.Rack,
                OpeningQuantity = request.OpeningQuantity,
                OpeningCost = request.UnitCost,
                Quantity = request.OpeningQuantity,
                UnitCost = request.UnitCost,
                MinStock = request.MinStock,
                MaxStock = request.MaxStock,
                ReorderQty = request.ReorderQty,
                IssueValue = request.IssueValue,
                SupplierId = request.SupplierId,
                SupplierItemCode = request.SupplierItemCode,
                PurchaseDate = request.PurchaseDate,
                WarrantyDate = request.WarrantyDate,
                Status = request.Status,
                Remarks = request.Remarks,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _dbContext.InventoryItems.Add(item);
            await _dbContext.SaveChangesAsync();

            // Log activity
            _dbContext.InventoryActivities.Add(new InventoryActivity
            {
                ActivityDate = DateTime.UtcNow.Date,
                ActivityText = $"Created item: {item.Name}",
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            });
            await _dbContext.SaveChangesAsync();

            return (await GetItemByIdAsync(item.ItemId))!;
        }

        public async Task<ItemDto> UpdateItemAsync(int itemId, UpdateItemRequest request, int userId)
        {
            var item = await _dbContext.InventoryItems.FindAsync(itemId);
            if (item == null)
            {
                throw new KeyNotFoundException("Item not found.");
            }

            // Verify unique code
            bool codeTaken = await _dbContext.InventoryItems.AnyAsync(i => i.ItemId != itemId && i.Code.ToLower() == request.Code.Trim().ToLower());
            if (codeTaken)
            {
                throw new InvalidOperationException("This item code already exists.");
            }

            item.Code = request.Code.Trim();
            item.Name = request.Name.Trim();
            item.CategoryId = request.CategoryId;
            item.Unit = request.Unit;
            item.Type = request.Type;
            item.Description = request.Description;
            item.Brand = request.Brand;
            item.Model = request.Model;
            item.Sku = request.Sku;
            item.Department = request.Department;
            item.Location = request.Location;
            item.Rack = request.Rack;
            item.MinStock = request.MinStock;
            item.MaxStock = request.MaxStock;
            item.ReorderQty = request.ReorderQty;
            item.IssueValue = request.IssueValue;
            item.SupplierId = request.SupplierId;
            item.SupplierItemCode = request.SupplierItemCode;
            item.PurchaseDate = request.PurchaseDate;
            item.WarrantyDate = request.WarrantyDate;
            item.Status = request.Status;
            item.Remarks = request.Remarks;
            item.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            // Log activity
            _dbContext.InventoryActivities.Add(new InventoryActivity
            {
                ActivityDate = DateTime.UtcNow.Date,
                ActivityText = $"Updated item: {item.Name}",
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            });
            await _dbContext.SaveChangesAsync();

            return (await GetItemByIdAsync(item.ItemId))!;
        }

        public async Task<bool> DeleteItemAsync(int itemId)
        {
            var item = await _dbContext.InventoryItems.FindAsync(itemId);
            if (item == null)
            {
                throw new KeyNotFoundException("Item not found.");
            }

            // In accordance with inventory rules:
            // Items with stock or transaction history cannot be deleted.
            if (item.Quantity > 0)
            {
                throw new InvalidOperationException("Items with available stock cannot be deleted. Deactivate the item instead.");
            }

            bool hasMovements = await _dbContext.InventoryTransactions.AnyAsync(t => t.ItemId == itemId);
            if (hasMovements)
            {
                throw new InvalidOperationException("Items with transaction history cannot be deleted. Deactivate the item instead.");
            }

            _dbContext.InventoryItems.Remove(item);
            await _dbContext.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeactivateItemAsync(int itemId)
        {
            var item = await _dbContext.InventoryItems.FindAsync(itemId);
            if (item == null)
            {
                throw new KeyNotFoundException("Item not found.");
            }

            item.Status = "Inactive";
            item.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            _dbContext.InventoryActivities.Add(new InventoryActivity
            {
                ActivityDate = DateTime.UtcNow.Date,
                ActivityText = $"Deactivated item: {item.Name}",
                CreatedAt = DateTime.UtcNow
            });
            await _dbContext.SaveChangesAsync();

            return true;
        }
        #endregion

        #region Categories
        public async Task<IEnumerable<CategoryDto>> GetCategoriesAsync(bool includeInactive = false)
        {
            var categories = await _dbContext.InventoryCategories
                .Where(c => includeInactive || c.Status == "Active")
                .Select(c => new CategoryDto
                {
                    CategoryId = c.CategoryId,
                    Code = c.Code,
                    Name = c.Name,
                    Description = c.Description,
                    Department = c.Department,
                    Status = c.Status,
                    Count = c.Items.Count,
                    Value = c.Items.Sum(i => i.Quantity * i.UnitCost),
                    Alerts = c.Items.Count(i => i.Status == "Active" && i.Quantity < i.MinStock),
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt
                })
                .OrderBy(c => c.Name)
                .ToListAsync();

            return categories;
        }

        public async Task<CategoryDto> SaveCategoryAsync(int? categoryId, CreateCategoryRequest request)
        {
            string cleanCode = request.Code.Trim();
            string cleanName = request.Name.Trim();

            bool codeExists = await _dbContext.InventoryCategories
                .AnyAsync(c => (!categoryId.HasValue || c.CategoryId != categoryId.Value) && c.Code.ToLower() == cleanCode.ToLower());
            if (codeExists)
            {
                throw new InvalidOperationException("This category code already exists.");
            }

            bool nameExists = await _dbContext.InventoryCategories
                .AnyAsync(c => (!categoryId.HasValue || c.CategoryId != categoryId.Value) && c.Name.ToLower() == cleanName.ToLower());
            if (nameExists)
            {
                throw new InvalidOperationException("This category name already exists.");
            }

            InventoryCategory category;
            if (categoryId.HasValue && categoryId.Value > 0)
            {
                category = await _dbContext.InventoryCategories.FindAsync(categoryId.Value)
                    ?? throw new KeyNotFoundException("Category not found.");

                category.Code = cleanCode;
                category.Name = cleanName;
                category.Description = request.Description;
                category.Department = request.Department;
                category.Status = request.Status;
                category.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                category = new InventoryCategory
                {
                    Code = cleanCode,
                    Name = cleanName,
                    Description = request.Description,
                    Department = request.Department,
                    Status = request.Status,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _dbContext.InventoryCategories.Add(category);
            }

            await _dbContext.SaveChangesAsync();

            return (await GetCategoriesAsync(true)).First(c => c.CategoryId == category.CategoryId);
        }

        public async Task<bool> DeactivateCategoryAsync(int categoryId)
        {
            var category = await _dbContext.InventoryCategories.FindAsync(categoryId);
            if (category == null) throw new KeyNotFoundException("Category not found.");

            category.Status = "Inactive";
            category.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
            return true;
        }
        #endregion

        #region Suppliers
        public async Task<IEnumerable<SupplierDto>> GetSuppliersAsync(bool includeInactive = false)
        {
            var suppliers = await _dbContext.InventorySuppliers
                .Include(s => s.SupplierCategories)
                    .ThenInclude(sc => sc.Category)
                .Where(s => includeInactive || s.Status == "Active")
                .ToListAsync();

            var supplierIds = suppliers.Select(s => s.SupplierId).ToList();

            var purchases = await _dbContext.InventoryTransactions
                .Where(t => t.SupplierId.HasValue && supplierIds.Contains(t.SupplierId.Value) &&
                            t.MovementType == "Stock In" && t.Status == "Posted" &&
                            t.ReturnOfId == null && t.CorrectionOfId == null)
                .GroupBy(t => t.SupplierId!.Value)
                .Select(g => new { SupplierId = g.Key, Total = g.Sum(t => t.TotalAmount) })
                .ToDictionaryAsync(g => g.SupplierId, g => g.Total);

            return suppliers.Select(s => new SupplierDto
            {
                SupplierId = s.SupplierId,
                Code = s.Code,
                Name = s.Name,
                ContactPerson = s.ContactPerson,
                Phone = s.Phone,
                AlternatePhone = s.AlternatePhone,
                Email = s.Email,
                Gstin = s.Gstin,
                Pan = s.Pan,
                Address1 = s.Address1,
                Address2 = s.Address2,
                City = s.City,
                State = s.State,
                PostalCode = s.PostalCode,
                Country = s.Country,
                Address = string.Join(", ", new[] { s.Address1, s.Address2, s.City, s.State, s.PostalCode, s.Country }.Where(x => !string.IsNullOrWhiteSpace(x))),
                PaymentTerms = s.PaymentTerms,
                BankName = s.BankName,
                AccountHolder = s.AccountHolder,
                AccountNumber = s.AccountNumber,
                Ifsc = s.Ifsc,
                Notes = s.Notes,
                Status = s.Status,
                CategoryIds = s.SupplierCategories.Select(sc => sc.CategoryId).ToList(),
                SuppliedCategories = s.SupplierCategories.Select(sc => sc.Category.Name).ToList(),
                TotalPurchases = purchases.TryGetValue(s.SupplierId, out var sum) ? sum : 0.00m,
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt
            }).OrderBy(s => s.Name);
        }

        public async Task<SupplierDto> SaveSupplierAsync(int? supplierId, CreateSupplierRequest request)
        {
            string cleanCode = request.Code.Trim();
            string cleanName = request.Name.Trim();

            bool codeExists = await _dbContext.InventorySuppliers
                .AnyAsync(s => (!supplierId.HasValue || s.SupplierId != supplierId.Value) && s.Code.ToLower() == cleanCode.ToLower());
            if (codeExists)
            {
                throw new InvalidOperationException("This supplier code already exists.");
            }

            InventorySupplier supplier;
            if (supplierId.HasValue && supplierId.Value > 0)
            {
                supplier = await _dbContext.InventorySuppliers
                    .Include(s => s.SupplierCategories)
                    .FirstOrDefaultAsync(s => s.SupplierId == supplierId.Value)
                    ?? throw new KeyNotFoundException("Supplier not found.");

                supplier.Code = cleanCode;
                supplier.Name = cleanName;
                supplier.ContactPerson = request.ContactPerson.Trim();
                supplier.Phone = request.Phone.Trim();
                supplier.AlternatePhone = request.AlternatePhone?.Trim();
                supplier.Email = request.Email?.Trim();
                supplier.Gstin = request.Gstin?.Trim();
                supplier.Pan = request.Pan?.Trim();
                supplier.Address1 = request.Address1?.Trim();
                supplier.Address2 = request.Address2?.Trim();
                supplier.City = request.City?.Trim();
                supplier.State = request.State?.Trim();
                supplier.PostalCode = request.PostalCode?.Trim();
                supplier.Country = string.IsNullOrWhiteSpace(request.Country) ? "India" : request.Country.Trim();
                supplier.PaymentTerms = request.PaymentTerms?.Trim();
                supplier.BankName = request.BankName?.Trim();
                supplier.AccountHolder = request.AccountHolder?.Trim();
                supplier.AccountNumber = request.AccountNumber?.Trim();
                supplier.Ifsc = request.Ifsc?.Trim();
                supplier.Notes = request.Notes;
                supplier.Status = request.Status;
                supplier.UpdatedAt = DateTime.UtcNow;

                // Sync categories
                _dbContext.InventorySupplierCategories.RemoveRange(supplier.SupplierCategories);
            }
            else
            {
                supplier = new InventorySupplier
                {
                    Code = cleanCode,
                    Name = cleanName,
                    ContactPerson = request.ContactPerson.Trim(),
                    Phone = request.Phone.Trim(),
                    AlternatePhone = request.AlternatePhone?.Trim(),
                    Email = request.Email?.Trim(),
                    Gstin = request.Gstin?.Trim(),
                    Pan = request.Pan?.Trim(),
                    Address1 = request.Address1?.Trim(),
                    Address2 = request.Address2?.Trim(),
                    City = request.City?.Trim(),
                    State = request.State?.Trim(),
                    PostalCode = request.PostalCode?.Trim(),
                    Country = string.IsNullOrWhiteSpace(request.Country) ? "India" : request.Country.Trim(),
                    PaymentTerms = request.PaymentTerms?.Trim(),
                    BankName = request.BankName?.Trim(),
                    AccountHolder = request.AccountHolder?.Trim(),
                    AccountNumber = request.AccountNumber?.Trim(),
                    Ifsc = request.Ifsc?.Trim(),
                    Notes = request.Notes,
                    Status = request.Status,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _dbContext.InventorySuppliers.Add(supplier);
            }

            await _dbContext.SaveChangesAsync();

            // Insert categories
            if (request.CategoryIds != null && request.CategoryIds.Any())
            {
                foreach (var catId in request.CategoryIds.Distinct())
                {
                    _dbContext.InventorySupplierCategories.Add(new InventorySupplierCategory
                    {
                        SupplierId = supplier.SupplierId,
                        CategoryId = catId
                    });
                }
                await _dbContext.SaveChangesAsync();
            }

            return (await GetSuppliersAsync(true)).First(s => s.SupplierId == supplier.SupplierId);
        }

        public async Task<bool> DeactivateSupplierAsync(int supplierId)
        {
            var supplier = await _dbContext.InventorySuppliers.FindAsync(supplierId);
            if (supplier == null) throw new KeyNotFoundException("Supplier not found.");

            supplier.Status = "Inactive";
            supplier.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
            return true;
        }
        #endregion

        #region Movements
        public async Task<IEnumerable<TransactionDto>> GetMovementsAsync(MovementFilterRequest filter)
        {
            var query = _dbContext.InventoryTransactions
                .Include(t => t.Item)
                .Include(t => t.Supplier)
                .Include(t => t.CorrectionOf)
                .Include(t => t.ReturnOf)
                .AsQueryable();

            if (filter.TransactionId.HasValue && filter.TransactionId.Value > 0)
                query = query.Where(t => t.TransactionId == filter.TransactionId.Value);

            if (filter.FromDate.HasValue)
                query = query.Where(t => t.TransactionDate >= filter.FromDate.Value.Date);

            if (filter.ToDate.HasValue)
                query = query.Where(t => t.TransactionDate <= filter.ToDate.Value.Date);

            if (filter.ItemId.HasValue && filter.ItemId.Value > 0)
                query = query.Where(t => t.ItemId == filter.ItemId.Value);

            if (filter.CategoryId.HasValue && filter.CategoryId.Value > 0)
                query = query.Where(t => t.Item.CategoryId == filter.CategoryId.Value);

            if (!string.IsNullOrWhiteSpace(filter.Department))
                query = query.Where(t => t.Department == filter.Department);

            if (filter.SupplierId.HasValue && filter.SupplierId.Value > 0)
                query = query.Where(t => t.SupplierId == filter.SupplierId.Value);

            if (!string.IsNullOrWhiteSpace(filter.Type))
                query = query.Where(t => t.MovementType == filter.Type);

            if (!string.IsNullOrWhiteSpace(filter.PaymentMethod))
                query = query.Where(t => t.PaymentMethod == filter.PaymentMethod);

            if (!string.IsNullOrWhiteSpace(filter.Search))
            {
                string s = filter.Search.Trim().ToLower();
                query = query.Where(t =>
                    t.TransactionNumber.ToLower().Contains(s) ||
                    t.Item.Name.ToLower().Contains(s) ||
                    t.Item.Code.ToLower().Contains(s) ||
                    (t.RecipientName != null && t.RecipientName.ToLower().Contains(s)) ||
                    (t.Supplier != null && t.Supplier.Name.ToLower().Contains(s)) ||
                    (t.ReferenceNumber != null && t.ReferenceNumber.ToLower().Contains(s)) ||
                    t.PerformedBy.ToLower().Contains(s));
            }

            var list = await query
                .OrderByDescending(t => t.TransactionDate)
                .ThenByDescending(t => t.Sequence)
                .Select(t => new TransactionDto
                {
                    TransactionId = t.TransactionId,
                    TransactionNumber = t.TransactionNumber,
                    Sequence = t.Sequence,
                    TransactionDate = t.TransactionDate,
                    MovementType = t.MovementType,
                    ItemId = t.ItemId,
                    ItemName = t.Item.Name,
                    ItemCode = t.Item.Code,
                    Unit = t.Item.Unit,
                    Quantity = t.Quantity,
                    UnitCost = t.UnitCost,
                    TotalAmount = t.TotalAmount,
                    PreviousUnitCost = t.PreviousUnitCost,
                    Status = t.Status,
                    PaymentMethod = t.PaymentMethod,
                    PaymentTransactionNumber = t.PaymentTransactionNumber,
                    CashReceiptPath = t.CashReceiptPath,
                    CorrectionOfId = t.CorrectionOfId,
                    CorrectionOfNumber = t.CorrectionOf != null ? t.CorrectionOf.TransactionNumber : null,
                    ReturnOfId = t.ReturnOfId,
                    ReturnOfNumber = t.ReturnOf != null ? t.ReturnOf.TransactionNumber : null,
                    SupplierId = t.SupplierId,
                    SupplierName = t.Supplier != null ? t.Supplier.Name : null,
                    SupplierInvoice = t.SupplierInvoice,
                    InvoiceNumber = t.InvoiceNumber,
                    PurchaseOrderNumber = t.PurchaseOrderNumber,
                    ReferenceNumber = t.ReferenceNumber,
                    Location = t.Location,
                    Condition = t.Condition,
                    BatchNumber = t.BatchNumber,
                    ExpiryDate = t.ExpiryDate,
                    IssueType = t.IssueType,
                    Department = t.Department,
                    RecipientName = t.RecipientName,
                    RecipientId = t.RecipientId,
                    Destination = t.Destination,
                    Purpose = t.Purpose,
                    ApprovedBy = t.ApprovedBy,
                    IsReturnable = t.IsReturnable,
                    ExpectedReturnDate = t.ExpectedReturnDate,
                    PerformedBy = t.PerformedBy,
                    Partner = t.Supplier != null ? t.Supplier.Name : (t.RecipientName ?? "—"),
                    Remarks = t.Remarks,
                    CreatedAt = t.CreatedAt
                })
                .ToListAsync();

            await EnrichMovementReversalEligibilityAsync(list);

            return list;
        }

        private async Task EnrichMovementReversalEligibilityAsync(List<TransactionDto> list)
        {
            if (list == null || list.Count == 0) return;

            var itemIds = list.Select(m => m.ItemId).Distinct().ToList();
            var txnIds = list.Select(m => m.TransactionId).Distinct().ToList();

            // 1. Get latest transaction ID for each relevant item across InventoryTransactions
            string latestSql = @"
                SELECT t.ItemId, t.TransactionId
                FROM (
                    SELECT ItemId, TransactionId,
                           ROW_NUMBER() OVER (PARTITION BY ItemId ORDER BY TransactionDate DESC, Sequence DESC, TransactionId DESC) as rn
                    FROM InventoryTransactions
                    WHERE ItemId IN @ItemIds
                ) t
                WHERE t.rn = 1;";

            var latestRows = await _dbConnection.QueryAsync<(int ItemId, int TransactionId)>(latestSql, new { ItemIds = itemIds });
            var latestTxnByItemId = latestRows.ToDictionary(x => x.ItemId, x => x.TransactionId);

            // 2. Check which transactions have been returned
            string returnedSql = @"
                SELECT DISTINCT ReturnOfId
                FROM InventoryTransactions
                WHERE ReturnOfId IS NOT NULL AND ReturnOfId IN @TxnIds;";

            var returnedRows = await _dbConnection.QueryAsync<int>(returnedSql, new { TxnIds = txnIds });
            var returnedTxnIds = new HashSet<int>(returnedRows);

            // 3. Get current stock for negative stock check
            string stockSql = "SELECT ItemId, Quantity FROM InventoryItems WHERE ItemId IN @ItemIds;";
            var stockRows = await _dbConnection.QueryAsync<(int ItemId, decimal Quantity)>(stockSql, new { ItemIds = itemIds });
            var stockByItemId = stockRows.ToDictionary(x => x.ItemId, x => x.Quantity);

            foreach (var dto in list)
            {
                bool isLatest = latestTxnByItemId.TryGetValue(dto.ItemId, out int latestId) && latestId == dto.TransactionId;
                bool hasBeenReturned = returnedTxnIds.Contains(dto.TransactionId);
                decimal currentItemStock = stockByItemId.GetValueOrDefault(dto.ItemId, 0m);

                if (dto.Status == "Reversed")
                {
                    dto.CanReverse = false;
                    dto.ReverseBlockedReason = "This movement has already been reversed.";
                }
                else if (dto.CorrectionOfId.HasValue || dto.Status == "Correction")
                {
                    dto.CanReverse = false;
                    dto.ReverseBlockedReason = "A return or correction movement cannot be reversed.";
                }
                else if (dto.ReturnOfId.HasValue || dto.Status == "Returned")
                {
                    dto.CanReverse = false;
                    dto.ReverseBlockedReason = "A return or correction movement cannot be reversed.";
                }
                else if (dto.Status != "Posted")
                {
                    dto.CanReverse = false;
                    dto.ReverseBlockedReason = "Only posted movements can be reversed.";
                }
                else if (hasBeenReturned)
                {
                    dto.CanReverse = false;
                    dto.ReverseBlockedReason = "Cannot reverse an issue that has already been returned.";
                }
                else if (!isLatest)
                {
                    dto.CanReverse = false;
                    dto.ReverseBlockedReason = "A newer movement exists for this item.";
                }
                else if (dto.MovementType == "Stock In" && (currentItemStock - dto.Quantity) < 0)
                {
                    dto.CanReverse = false;
                    dto.ReverseBlockedReason = "Reversing this movement would result in negative stock.";
                }
                else
                {
                    dto.CanReverse = true;
                    dto.ReverseBlockedReason = null;
                }
            }
        }

        public async Task<TransactionDto?> GetMovementByIdAsync(int transactionId)
        {
            var filter = new MovementFilterRequest { TransactionId = transactionId };
            var list = await GetMovementsAsync(filter);
            return list.FirstOrDefault(t => t.TransactionId == transactionId);
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

            string paymentMethod = !string.IsNullOrWhiteSpace(request.PaymentMethod)
                ? request.PaymentMethod.Trim()
                : "Cash";

            string? paymentTxnNumber = !string.IsNullOrWhiteSpace(request.PaymentTransactionNumber)
                ? request.PaymentTransactionNumber.Trim()
                : (!string.IsNullOrWhiteSpace(request.TransactionNumber)
                    ? request.TransactionNumber.Trim()
                    : (!string.IsNullOrWhiteSpace(request.PaymentReference)
                        ? request.PaymentReference.Trim()
                        : (!string.IsNullOrWhiteSpace(request.OnlineTransactionNumber) ? request.OnlineTransactionNumber.Trim() : null)));

            string? cashReceipt = !string.IsNullOrWhiteSpace(request.CashReceiptPath)
                ? request.CashReceiptPath.Trim()
                : (!string.IsNullOrWhiteSpace(request.CashReceipt)
                    ? request.CashReceipt.Trim()
                    : (!string.IsNullOrWhiteSpace(request.ReceiptUrl)
                        ? request.ReceiptUrl.Trim()
                        : (!string.IsNullOrWhiteSpace(request.ReceiptPath) ? request.ReceiptPath.Trim() : null)));

            parameters.Add("p_PaymentMethod", paymentMethod);
            parameters.Add("p_PaymentTransactionNumber", paymentTxnNumber);
            parameters.Add("p_CashReceiptPath", cashReceipt);

            var postResult = await _dbConnection.QueryFirstOrDefaultAsync<dynamic>(
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

            try
            {
                var revResult = await _dbConnection.QueryFirstOrDefaultAsync<dynamic>(
                    "sp_Inventory_ReverseMovement",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                if (revResult == null || revResult.CorrectionTransactionNumber == null)
                {
                    throw new InvalidOperationException("Failed to reverse movement.");
                }

                string correctionNumber = (string)revResult.CorrectionTransactionNumber;
                var correctionTxn = await _dbContext.InventoryTransactions.FirstAsync(t => t.TransactionNumber == correctionNumber);
                return (await GetMovementByIdAsync(correctionTxn.TransactionId))!;
            }
            catch (MySqlException ex)
            {
                if (ex.Message.Contains("not exist", StringComparison.OrdinalIgnoreCase) ||
                    ex.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                {
                    throw new KeyNotFoundException(ex.Message);
                }

                if (ex.Number == 1644 ||
                    ex.Message.Contains("latest unreturned", StringComparison.OrdinalIgnoreCase) ||
                    ex.Message.Contains("Only posted", StringComparison.OrdinalIgnoreCase) ||
                    ex.Message.Contains("already been returned", StringComparison.OrdinalIgnoreCase) ||
                    ex.Message.Contains("cannot be reversed", StringComparison.OrdinalIgnoreCase) ||
                    ex.Message.Contains("negative stock", StringComparison.OrdinalIgnoreCase))
                {
                    throw new MovementNotReversibleException(ex.Message);
                }

                throw;
            }
        }

        public async Task<TransactionDto> RecordReturnAsync(int transactionId, int userId, string performedBy)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_TransactionId", transactionId);
            parameters.Add("p_PerformedBy", performedBy);
            parameters.Add("p_UserId", userId);

            try
            {
                var retResult = await _dbConnection.QueryFirstOrDefaultAsync<dynamic>(
                    "sp_Inventory_RecordReturn",
                    parameters,
                    commandType: CommandType.StoredProcedure);

                if (retResult == null || retResult.ReturnTransactionNumber == null)
                {
                    throw new InvalidOperationException("Failed to record return.");
                }

                string returnNumber = (string)retResult.ReturnTransactionNumber;
                var returnTxn = await _dbContext.InventoryTransactions.FirstAsync(t => t.TransactionNumber == returnNumber);
                return (await GetMovementByIdAsync(returnTxn.TransactionId))!;
            }
            catch (MySqlException ex)
            {
                if (ex.Message.Contains("not exist", StringComparison.OrdinalIgnoreCase) ||
                    ex.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                {
                    throw new KeyNotFoundException(ex.Message);
                }

                if (ex.Number == 1644)
                {
                    throw new ConflictException(ex.Message);
                }

                throw;
            }
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
                    result.Rows = await _dbConnection.QueryAsync<StockSummaryReportRowDto>(
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
                    result.Rows = await _dbConnection.QueryAsync<MovementReportRowDto>(
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
                    result.Rows = await _dbConnection.QueryAsync<LowStockReportRowDto>(
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
                    result.Rows = await _dbConnection.QueryAsync<DepartmentIssueReportRowDto>(
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
                    result.Rows = await _dbConnection.QueryAsync<SupplierPurchaseReportRowDto>(
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
                    result.Rows = await _dbConnection.QueryAsync<CategoryValueReportRowDto>(
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
                    result.Rows = await _dbConnection.QueryAsync<ExpiryWarrantyReportRowDto>(
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
                    result.Rows = await _dbConnection.QueryAsync<ReturnableItemsReportRowDto>(
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
