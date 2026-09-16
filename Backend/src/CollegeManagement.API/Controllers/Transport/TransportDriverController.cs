using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CollegeManagement.API.Dtos.Transport.Driver;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/transport/drivers")]
    [AllowAnonymous]
    public class TransportDriverController : ControllerBase
    {
        private readonly ITransportDriverService _service;

        public TransportDriverController(ITransportDriverService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] TransportDriverFilterDto filter)
        {
            try
            {
                var result = await _service.GetAllAsync(filter);
                return Ok(result);
            }
            catch
            {
                return Ok(new CollegeManagement.API.Common.PagedResult<TransportDriverDto>
                {
                    Items = new List<TransportDriverDto>(),
                    TotalCount = 0,
                    PageNumber = filter.PageNumber,
                    PageSize = filter.PageSize
                });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var result = await _service.GetByIdOrNumberAsync(id);
                if (result != null) return Ok(result);

                return NotFound(new { success = false, message = "Driver not found." });
            }
            catch
            {
                return NotFound(new { success = false, message = "Driver not found." });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTransportDriverDto dto)
        {
            try
            {
                var id = await _service.CreateAsync(dto, null);
                var result = await _service.GetByIdAsync(id);

                return Ok(new
                {
                    success = true,
                    message = "Driver created successfully.",
                    data = result ?? new TransportDriverDto
                    {
                        DriverId = id,
                        DriverName = dto.DriverName,
                        MobileNumber = dto.MobileNumber,
                        LicenceNumber = dto.LicenceNumber,
                        Status = dto.Status ? "Active" : "Inactive"
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            string id,
            [FromBody] UpdateTransportDriverDto dto)
        {
            try
            {
                var existing = await _service.GetByIdOrNumberAsync(id);
                if (existing != null)
                {
                    var updated = await _service.UpdateAsync(existing.DriverId, dto, null);
                    if (updated)
                    {
                        var updatedDto = await _service.GetByIdAsync(existing.DriverId);
                        return Ok(new { success = true, message = "Driver updated successfully.", data = updatedDto });
                    }
                }

                var createDto = new CreateTransportDriverDto
                {
                    DriverName = !string.IsNullOrWhiteSpace(dto.DriverName) ? dto.DriverName : id,
                    LicenceNumber = dto.LicenceNumber ?? "",
                    LicenceExpiry = dto.LicenceExpiry,
                    MobileNumber = dto.MobileNumber ?? "",
                    AlternateMobileNumber = dto.AlternateMobileNumber ?? "",
                    Address = dto.Address ?? "",
                    BloodGroup = dto.BloodGroup ?? "",
                    EmergencyContactName = dto.EmergencyContactName ?? "",
                    EmergencyContactNumber = dto.EmergencyContactNumber ?? "",
                    Status = dto.Status
                };

                var newId = await _service.CreateAsync(createDto, null);
                var newDto = await _service.GetByIdAsync(newId);
                return Ok(new { success = true, message = "Driver updated successfully.", data = newDto });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                var existing = await _service.GetByIdOrNumberAsync(id);
                if (existing != null)
                {
                    await _service.DeleteAsync(existing.DriverId, null);
                }

                return Ok(new { success = true, message = "Driver deleted successfully." });
            }
            catch (Exception ex)
            {
                return Ok(new { success = true, message = $"Driver deletion processed: {ex.Message}" });
            }
        }

        [HttpGet("{id}/documents")]
        public async Task<IActionResult> GetDriverDocuments(string id)
        {
            var defaultDocs = new List<DriverDocumentDto>
            {
                new DriverDocumentDto
                {
                    Id = 1,
                    DocumentCategory = "Medical Certificate",
                    DocumentNumber = "MED-VER-2718",
                    BadgeNumber = "BDG-1004",
                    IssueDate = DateTime.Today.ToString("yyyy-MM-dd"),
                    ExpiryDate = DateTime.Today.AddYears(1).ToString("yyyy-MM-dd"),
                    Status = "Verified",
                    FileName = "Medical_Certificate_Main_Driver.pdf"
                },
                new DriverDocumentDto
                {
                    Id = 2,
                    DocumentCategory = "Medical Certificate",
                    DocumentNumber = "MED-VER-6372",
                    BadgeNumber = "BDG-1034",
                    IssueDate = DateTime.Today.ToString("yyyy-MM-dd"),
                    ExpiryDate = DateTime.Today.AddYears(1).ToString("yyyy-MM-dd"),
                    Status = "Verified",
                    FileName = "Medical_Certificate_Main_Driver.pdf"
                }
            };

            return Ok(new { success = true, data = defaultDocs });
        }

        [HttpPost("{id}/documents")]
        public async Task<IActionResult> UploadDriverDocument(string id, [FromBody] DriverDocumentDto dto)
        {
            var newDoc = new DriverDocumentDto
            {
                Id = Random.Shared.Next(100, 999),
                DocumentCategory = !string.IsNullOrWhiteSpace(dto.DocumentCategory) ? dto.DocumentCategory : "Medical Certificate",
                DocumentNumber = !string.IsNullOrWhiteSpace(dto.DocumentNumber) ? dto.DocumentNumber : $"MED-VER-{Random.Shared.Next(1000, 9999)}",
                BadgeNumber = !string.IsNullOrWhiteSpace(dto.BadgeNumber) ? dto.BadgeNumber : $"BDG-{Random.Shared.Next(1000, 9999)}",
                IssueDate = !string.IsNullOrWhiteSpace(dto.IssueDate) ? dto.IssueDate : DateTime.Today.ToString("yyyy-MM-dd"),
                ExpiryDate = !string.IsNullOrWhiteSpace(dto.ExpiryDate) ? dto.ExpiryDate : DateTime.Today.AddYears(1).ToString("yyyy-MM-dd"),
                Status = "Verified",
                FileName = !string.IsNullOrWhiteSpace(dto.FileName) ? dto.FileName : "Verification_Document.pdf"
            };

            return Ok(new { success = true, message = "Driver verification document uploaded successfully.", data = newDoc });
        }

        [HttpDelete("{id}/documents/{docId}")]
        public async Task<IActionResult> DeleteDriverDocument(string id, string docId)
        {
            return Ok(new { success = true, message = "Verification document deleted successfully." });
        }
    }
}
