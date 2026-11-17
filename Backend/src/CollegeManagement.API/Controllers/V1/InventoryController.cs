using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Inventory;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Services.Interfaces.Inventory;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/inventory")]
    [Route("api/v1/inventory")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    [Authorize]
    public class InventoryController : ControllerBase
    {
        private readonly IInventoryService _service;
        private readonly IJwtTokenHelper _jwtTokenHelper;
        private readonly AppDbContext? _db;

        public InventoryController(
            IInventoryService service,
            IJwtTokenHelper jwtTokenHelper,
            AppDbContext? db = null)
        {
            _service = service;
            _jwtTokenHelper = jwtTokenHelper;
            _db = db;
        }

        private int? GetTenantCollegeId()
        {
            var role = _jwtTokenHelper.GetRole(User);
            if (User.IsInRole("Super Admin") || string.Equals(role, "Super Admin", StringComparison.OrdinalIgnoreCase))
                return null;

            var collegeId = _jwtTokenHelper.GetCollegeId(User);
            return collegeId.HasValue && collegeId.Value > 1 ? collegeId.Value : null;
        }

        private async Task<HashSet<int>> GetOwnedIdsAsync(string table, string pkCol, int collegeId)
        {
            if (_db == null) return new HashSet<int>();
            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();
            var ids = await conn.QueryAsync<int>(
                $"SELECT `{pkCol}` FROM `{table}` WHERE CollegeId = @CollegeId;",
                new { CollegeId = collegeId });
            return new HashSet<int>(ids);
        }

        private async Task<bool> OwnsRecordAsync(string table, string pkCol, int id, int collegeId)
        {
            if (_db == null) return false;
            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();
            int count = await conn.ExecuteScalarAsync<int>(
                $"SELECT COUNT(*) FROM `{table}` WHERE `{pkCol}` = @Id AND CollegeId = @CollegeId;",
                new { Id = id, CollegeId = collegeId });
            return count > 0;
        }

        private async Task StampCollegeIdAsync(string table, string pkCol, int id, int collegeId)
        {
            if (_db == null || id <= 0) return;
            var conn = _db.Database.GetDbConnection();
            if (conn.State != ConnectionState.Open) await conn.OpenAsync();
            await conn.ExecuteAsync(
                $"UPDATE `{table}` SET CollegeId = @CollegeId WHERE `{pkCol}` = @Id;",
                new { CollegeId = collegeId, Id = id });
        }

        private int ResolveUserId()
        {
            var userId = _jwtTokenHelper.GetUserId(User);
            if (!userId.HasValue || userId.Value <= 0)
            {
                return 1; // Default fallback to system administrator
            }
            return userId.Value;
        }

        private string ResolveUserName()
        {
            var name = User.FindFirstValue("fullName") 
                ?? User.FindFirstValue("name") 
                ?? User.FindFirstValue(ClaimTypes.Name) 
                ?? User.FindFirstValue(ClaimTypes.GivenName)
                ?? "Inventory Staff";
            return name;
        }

        #region Dashboard
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue)
                {
                    var ownedItems = await GetOwnedIdsAsync("InventoryItems", "ItemId", tenantCollegeId.Value);
                    var ownedTxns = await GetOwnedIdsAsync("InventoryTransactions", "TransactionId", tenantCollegeId.Value);
                    var ownedCats = await GetOwnedIdsAsync("InventoryCategories", "CategoryId", tenantCollegeId.Value);
                    var ownedOrders = await GetOwnedIdsAsync("InventoryPurchaseOrders", "OrderId", tenantCollegeId.Value);

                    if (ownedItems.Count == 0 && ownedTxns.Count == 0 && ownedOrders.Count == 0)
                    {
                        return Ok(new { success = true, data = new InventoryDashboardDto() });
                    }

                    var allItems = (await _service.GetItemsAsync(new ItemFilterRequest())).Where(i => ownedItems.Contains(i.ItemId)).ToList();
                    var full = await _service.GetDashboardSummaryAsync();
                    var scoped = new InventoryDashboardDto
                    {
                        Kpis = new DashboardKpisDto
                        {
                            TotalItems = allItems.Count,
                            TotalStockValue = allItems.Sum(i => i.StockValue),
                            LowStockCount = allItems.Count(i => i.Quantity <= i.MinStock),
                            PendingOrdersCount = (await _service.GetPurchaseOrdersAsync("Pending", null)).Count(o => ownedOrders.Contains(o.OrderId))
                        },
                        RecentMovements = full.RecentMovements.Where(m => ownedTxns.Contains(m.TransactionId)).ToList(),
                        LowStockAlerts = full.LowStockAlerts.Where(a => ownedItems.Contains(a.ItemId)).ToList(),
                        CategoryDistribution = full.CategoryDistribution.Where(c => ownedCats.Contains(c.CategoryId)).ToList(),
                        RecentActivities = new List<ActivityLogDto>()
                    };
                    return Ok(new { success = true, data = scoped });
                }

                var data = await _service.GetDashboardSummaryAsync();
                return Ok(new { success = true, data });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        #endregion

        #region Items
        [HttpGet("items")]
        public async Task<IActionResult> GetItems([FromQuery] ItemFilterRequest filter)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue)
                {
                    var owned = await GetOwnedIdsAsync("InventoryItems", "ItemId", tenantCollegeId.Value);
                    if (owned.Count == 0) return Ok(new { success = true, data = Array.Empty<ItemDto>() });
                    var scoped = (await _service.GetItemsAsync(filter)).Where(i => owned.Contains(i.ItemId)).ToList();
                    return Ok(new { success = true, data = scoped });
                }

                var items = await _service.GetItemsAsync(filter);
                return Ok(new { success = true, data = items });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("items/{id:int}")]
        public async Task<IActionResult> GetItemById(int id)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventoryItems", "ItemId", id, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Item not found." });

                var item = await _service.GetItemByIdAsync(id);
                if (item == null)
                    return NotFound(new { success = false, message = "Item not found." });

                return Ok(new { success = true, data = item });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("items/{id:int}/ledger")]
        public async Task<IActionResult> GetItemLedger(int id, [FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventoryItems", "ItemId", id, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Item not found." });

                var ledger = await _service.GetItemLedgerAsync(id, from, to);
                return Ok(new { success = true, data = ledger });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("items")]
        public async Task<IActionResult> CreateItem([FromBody] CreateItemRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new { success = false, message = "Invalid data submitted.", errors = ModelState });

                var tenantCollegeId = GetTenantCollegeId();
                int userId = ResolveUserId();
                string userName = ResolveUserName();

                var item = await _service.CreateItemAsync(request, userId, userName);
                if (tenantCollegeId.HasValue && item != null)
                {
                    await StampCollegeIdAsync("InventoryItems", "ItemId", item.ItemId, tenantCollegeId.Value);
                    await StampCollegeIdAsync("InventoryTransactions", "ItemId", item.ItemId, tenantCollegeId.Value);
                }
                return CreatedAtAction(nameof(GetItemById), new { id = item.ItemId }, new { success = true, data = item, message = "Item created successfully." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("items/{id:int}")]
        public async Task<IActionResult> UpdateItem(int id, [FromBody] UpdateItemRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new { success = false, message = "Invalid data submitted.", errors = ModelState });

                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventoryItems", "ItemId", id, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Item not found." });

                int userId = ResolveUserId();
                string userName = ResolveUserName();

                var item = await _service.UpdateItemAsync(id, request, userId, userName);
                return Ok(new { success = true, data = item, message = "Item updated successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("items/{id:int}")]
        public async Task<IActionResult> DeleteItem(int id)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventoryItems", "ItemId", id, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Item not found." });

                int userId = ResolveUserId();
                string userName = ResolveUserName();

                await _service.DeleteItemAsync(id, userId, userName);
                return Ok(new { success = true, message = "Item deleted successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPatch("items/{id:int}/deactivate")]
        public async Task<IActionResult> DeactivateItem(int id)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventoryItems", "ItemId", id, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Item not found." });

                int userId = ResolveUserId();
                string userName = ResolveUserName();

                await _service.DeactivateItemAsync(id, userId, userName);
                return Ok(new { success = true, message = "Item deactivated successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        #endregion

        #region Movements
        [HttpGet("movements")]
        public async Task<IActionResult> GetMovements([FromQuery] MovementFilterRequest filter)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue)
                {
                    var owned = await GetOwnedIdsAsync("InventoryTransactions", "TransactionId", tenantCollegeId.Value);
                    if (owned.Count == 0) return Ok(new { success = true, data = Array.Empty<TransactionDto>() });
                    var scoped = (await _service.GetMovementsAsync(filter)).Where(m => owned.Contains(m.TransactionId)).ToList();
                    return Ok(new { success = true, data = scoped });
                }

                var movements = await _service.GetMovementsAsync(filter);
                return Ok(new { success = true, data = movements });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("movements/{id:int}")]
        public async Task<IActionResult> GetMovementById(int id)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventoryTransactions", "TransactionId", id, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Transaction not found." });

                var movement = await _service.GetMovementByIdAsync(id);
                if (movement == null)
                    return NotFound(new { success = false, message = "Transaction not found." });

                return Ok(new { success = true, data = movement });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("movements/stock-in")]
        public async Task<IActionResult> PostStockIn([FromBody] PostMovementRequest request)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventoryItems", "ItemId", request.ItemId, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Item not found." });

                request.MovementType = "Stock In";
                int userId = ResolveUserId();
                string userName = string.IsNullOrWhiteSpace(request.PerformedBy) ? ResolveUserName() : request.PerformedBy;

                var result = await _service.PostMovementAsync(request, userId, userName);
                if (tenantCollegeId.HasValue && result != null)
                    await StampCollegeIdAsync("InventoryTransactions", "TransactionId", result.TransactionId, tenantCollegeId.Value);

                return Ok(new { success = true, data = result, message = "Stock received and ledger updated." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("movements/stock-out")]
        public async Task<IActionResult> PostStockOut([FromBody] PostMovementRequest request)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventoryItems", "ItemId", request.ItemId, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Item not found." });

                request.MovementType = "Stock Out";
                int userId = ResolveUserId();
                string userName = string.IsNullOrWhiteSpace(request.PerformedBy) ? ResolveUserName() : request.PerformedBy;

                var result = await _service.PostMovementAsync(request, userId, userName);
                if (tenantCollegeId.HasValue && result != null)
                    await StampCollegeIdAsync("InventoryTransactions", "TransactionId", result.TransactionId, tenantCollegeId.Value);

                return Ok(new { success = true, data = result, message = "Stock issued and ledger updated." });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("movements/{id:int}/reverse")]
        public async Task<IActionResult> ReverseMovement(int id)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventoryTransactions", "TransactionId", id, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Transaction not found." });

                int userId = ResolveUserId();
                string userName = ResolveUserName();

                var correction = await _service.ReverseMovementAsync(id, userId, userName);
                if (tenantCollegeId.HasValue && correction != null)
                    await StampCollegeIdAsync("InventoryTransactions", "TransactionId", correction.TransactionId, tenantCollegeId.Value);

                return Ok(new { success = true, data = correction, message = "Transaction reversed. Compensating entry recorded." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("movements/{id:int}/return")]
        public async Task<IActionResult> RecordReturn(int id)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventoryTransactions", "TransactionId", id, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Transaction not found." });

                int userId = ResolveUserId();
                string userName = ResolveUserName();

                var returnReceipt = await _service.RecordReturnAsync(id, userId, userName);
                if (tenantCollegeId.HasValue && returnReceipt != null)
                    await StampCollegeIdAsync("InventoryTransactions", "TransactionId", returnReceipt.TransactionId, tenantCollegeId.Value);

                return Ok(new { success = true, data = returnReceipt, message = "Full return recorded. Stock balance updated." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        #endregion

        #region Categories
        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories([FromQuery] bool includeInactive = false)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue)
                {
                    var owned = await GetOwnedIdsAsync("InventoryCategories", "CategoryId", tenantCollegeId.Value);
                    if (owned.Count == 0) return Ok(new { success = true, data = Array.Empty<CategoryDto>() });
                    var scoped = (await _service.GetCategoriesAsync(includeInactive)).Where(c => owned.Contains(c.CategoryId)).ToList();
                    return Ok(new { success = true, data = scoped });
                }

                var categories = await _service.GetCategoriesAsync(includeInactive);
                return Ok(new { success = true, data = categories });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("categories")]
        public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new { success = false, message = "Invalid data submitted.", errors = ModelState });

                var tenantCollegeId = GetTenantCollegeId();
                int userId = ResolveUserId();
                string userName = ResolveUserName();

                var category = await _service.SaveCategoryAsync(null, request, userId, userName);
                if (tenantCollegeId.HasValue && category != null)
                    await StampCollegeIdAsync("InventoryCategories", "CategoryId", category.CategoryId, tenantCollegeId.Value);

                return Ok(new { success = true, data = category, message = "Category created successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("categories/{id:int}")]
        public async Task<IActionResult> UpdateCategory(int id, [FromBody] CreateCategoryRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new { success = false, message = "Invalid data submitted.", errors = ModelState });

                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventoryCategories", "CategoryId", id, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Category not found." });

                int userId = ResolveUserId();
                string userName = ResolveUserName();

                var category = await _service.SaveCategoryAsync(id, request, userId, userName);
                return Ok(new { success = true, data = category, message = "Category updated successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPatch("categories/{id:int}/deactivate")]
        public async Task<IActionResult> DeactivateCategory(int id)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventoryCategories", "CategoryId", id, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Category not found." });

                int userId = ResolveUserId();
                string userName = ResolveUserName();

                await _service.DeactivateCategoryAsync(id, userId, userName);
                return Ok(new { success = true, message = "Category deactivated successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        #endregion

        #region Suppliers
        [HttpGet("suppliers")]
        public async Task<IActionResult> GetSuppliers([FromQuery] bool includeInactive = false)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue)
                {
                    var owned = await GetOwnedIdsAsync("InventorySuppliers", "SupplierId", tenantCollegeId.Value);
                    if (owned.Count == 0) return Ok(new { success = true, data = Array.Empty<SupplierDto>() });
                    var scoped = (await _service.GetSuppliersAsync(includeInactive)).Where(s => owned.Contains(s.SupplierId)).ToList();
                    return Ok(new { success = true, data = scoped });
                }

                var suppliers = await _service.GetSuppliersAsync(includeInactive);
                return Ok(new { success = true, data = suppliers });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("suppliers")]
        public async Task<IActionResult> CreateSupplier([FromBody] CreateSupplierRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new { success = false, message = "Invalid data submitted.", errors = ModelState });

                var tenantCollegeId = GetTenantCollegeId();
                int userId = ResolveUserId();
                string userName = ResolveUserName();

                var supplier = await _service.SaveSupplierAsync(null, request, userId, userName);
                if (tenantCollegeId.HasValue && supplier != null)
                    await StampCollegeIdAsync("InventorySuppliers", "SupplierId", supplier.SupplierId, tenantCollegeId.Value);

                return Ok(new { success = true, data = supplier, message = "Supplier created successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPut("suppliers/{id:int}")]
        public async Task<IActionResult> UpdateSupplier(int id, [FromBody] CreateSupplierRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new { success = false, message = "Invalid data submitted.", errors = ModelState });

                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventorySuppliers", "SupplierId", id, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Supplier not found." });

                int userId = ResolveUserId();
                string userName = ResolveUserName();

                var supplier = await _service.SaveSupplierAsync(id, request, userId, userName);
                return Ok(new { success = true, data = supplier, message = "Supplier updated successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPatch("suppliers/{id:int}/deactivate")]
        public async Task<IActionResult> DeactivateSupplier(int id)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventorySuppliers", "SupplierId", id, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Supplier not found." });

                int userId = ResolveUserId();
                string userName = ResolveUserName();

                await _service.DeactivateSupplierAsync(id, userId, userName);
                return Ok(new { success = true, message = "Supplier deactivated successfully." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        #endregion

        #region Reports
        [HttpGet("reports")]
        public async Task<IActionResult> GetReport([FromQuery] ReportRequest request)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                var report = await _service.GetReportDataAsync(request);
                if (tenantCollegeId.HasValue && report != null)
                {
                    var ownedItems = await GetOwnedIdsAsync("InventoryItems", "ItemId", tenantCollegeId.Value);
                    var ownedCats = await GetOwnedIdsAsync("InventoryCategories", "CategoryId", tenantCollegeId.Value);
                    var ownedTxns = await GetOwnedIdsAsync("InventoryTransactions", "TransactionId", tenantCollegeId.Value);
                    report.Rows = report.Rows.Where(row =>
                    {
                        var t = row.GetType();
                        var itemProp = t.GetProperty("ItemId");
                        if (itemProp != null && itemProp.GetValue(row) is int iid) return ownedItems.Contains(iid);
                        var catProp = t.GetProperty("CategoryId");
                        if (catProp != null && catProp.GetValue(row) is int cid) return ownedCats.Contains(cid);
                        var txnProp = t.GetProperty("TransactionId");
                        if (txnProp != null && txnProp.GetValue(row) is int tid) return ownedTxns.Contains(tid);
                        return ownedItems.Count > 0;
                    }).ToList();
                }
                return Ok(new { success = true, data = report });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        #endregion

        #region Purchase Orders
        [HttpGet("orders")]
        public async Task<IActionResult> GetPurchaseOrders([FromQuery] string? status, [FromQuery] string? search)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue)
                {
                    var owned = await GetOwnedIdsAsync("InventoryPurchaseOrders", "OrderId", tenantCollegeId.Value);
                    if (owned.Count == 0) return Ok(new { success = true, data = Array.Empty<PurchaseOrderDto>() });
                    var scoped = (await _service.GetPurchaseOrdersAsync(status, search)).Where(o => owned.Contains(o.OrderId)).ToList();
                    return Ok(new { success = true, data = scoped });
                }

                var orders = await _service.GetPurchaseOrdersAsync(status, search);
                return Ok(new { success = true, data = orders });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("orders/{id:int}")]
        public async Task<IActionResult> GetPurchaseOrderById(int id)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventoryPurchaseOrders", "OrderId", id, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Purchase order not found." });

                var po = await _service.GetPurchaseOrderByIdAsync(id);
                if (po == null)
                    return NotFound(new { success = false, message = "Purchase order not found." });

                return Ok(new { success = true, data = po });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("orders")]
        public async Task<IActionResult> CreatePurchaseOrder([FromBody] CreatePurchaseOrderRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new { success = false, message = "Invalid purchase order request.", errors = ModelState });

                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventoryItems", "ItemId", request.ItemId, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Item not found." });

                int userId = ResolveUserId();
                string userName = ResolveUserName();

                var po = await _service.CreatePurchaseOrderAsync(request, userId, userName);
                if (tenantCollegeId.HasValue && po != null)
                    await StampCollegeIdAsync("InventoryPurchaseOrders", "OrderId", po.OrderId, tenantCollegeId.Value);

                return CreatedAtAction(nameof(GetPurchaseOrderById), new { id = po.OrderId }, new { success = true, message = "Purchase order created successfully.", data = po });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPatch("orders/{id:int}/cancel")]
        [HttpPost("orders/{id:int}/cancel")]
        public async Task<IActionResult> CancelPurchaseOrder(int id, [FromBody] CancelPurchaseOrderRequest? body = null)
        {
            try
            {
                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventoryPurchaseOrders", "OrderId", id, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Purchase order not found." });

                int userId = ResolveUserId();
                string userName = ResolveUserName();

                var success = await _service.CancelPurchaseOrderAsync(id, userId, userName, body?.Remarks);
                if (!success)
                    return NotFound(new { success = false, message = "Purchase order not found." });

                return Ok(new { success = true, message = "Purchase order cancelled successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPatch("orders/{id:int}/status")]
        [HttpPut("orders/{id:int}/status")]
        public async Task<IActionResult> UpdatePurchaseOrderStatus(int id, [FromBody] UpdatePurchaseOrderStatusRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new { success = false, message = "Invalid status update payload.", errors = ModelState });

                var tenantCollegeId = GetTenantCollegeId();
                if (tenantCollegeId.HasValue && !await OwnsRecordAsync("InventoryPurchaseOrders", "OrderId", id, tenantCollegeId.Value))
                    return NotFound(new { success = false, message = "Purchase order not found." });

                int userId = ResolveUserId();
                string userName = ResolveUserName();

                var success = await _service.UpdatePurchaseOrderStatusAsync(id, request.Status, userId, userName, request.Remarks);
                if (!success)
                    return NotFound(new { success = false, message = "Purchase order not found." });

                return Ok(new { success = true, message = "Purchase order status updated successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        #endregion
    }
}
