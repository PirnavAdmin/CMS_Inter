using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Inventory;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Services.Interfaces.Inventory;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

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

        public InventoryController(
            IInventoryService service,
            IJwtTokenHelper jwtTokenHelper)
        {
            _service = service;
            _jwtTokenHelper = jwtTokenHelper;
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
                ?? "Store Administrator";
            return name;
        }

        #region Dashboard
        [HttpGet("dashboard")]
        public async Task<IActionResult> GetDashboard()
        {
            try
            {
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

                int userId = ResolveUserId();
                string userName = ResolveUserName();

                var item = await _service.CreateItemAsync(request, userId, userName);
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
                request.MovementType = "Stock In";
                int userId = ResolveUserId();
                string userName = string.IsNullOrWhiteSpace(request.PerformedBy) ? ResolveUserName() : request.PerformedBy;

                var result = await _service.PostMovementAsync(request, userId, userName);
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
                request.MovementType = "Stock Out";
                int userId = ResolveUserId();
                string userName = string.IsNullOrWhiteSpace(request.PerformedBy) ? ResolveUserName() : request.PerformedBy;

                var result = await _service.PostMovementAsync(request, userId, userName);
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
                int userId = ResolveUserId();
                string userName = ResolveUserName();

                var correction = await _service.ReverseMovementAsync(id, userId, userName);
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
                int userId = ResolveUserId();
                string userName = ResolveUserName();

                var returnReceipt = await _service.RecordReturnAsync(id, userId, userName);
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

                int userId = ResolveUserId();
                string userName = ResolveUserName();

                var category = await _service.SaveCategoryAsync(null, request, userId, userName);
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

                int userId = ResolveUserId();
                string userName = ResolveUserName();

                var supplier = await _service.SaveSupplierAsync(null, request, userId, userName);
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
                var report = await _service.GetReportDataAsync(request);
                return Ok(new { success = true, data = report });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
        #endregion
    }
}
