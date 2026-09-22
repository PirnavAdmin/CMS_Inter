using Asp.Versioning;
using CollegeManagement.API.Services.Location;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1;

[ApiController]
[ApiVersion("1.0")]
[Route("api/v{version:apiVersion}/locations")]
[AllowAnonymous]
public class LocationController : ControllerBase
{
    private readonly ILocationService _service;

    public LocationController(ILocationService service) => _service = service;

    [HttpGet("pincode/{pincode}")]
    public async Task<IActionResult> GetByPincode(string pincode, CancellationToken cancellationToken)
    {
        if (!System.Text.RegularExpressions.Regex.IsMatch(pincode ?? string.Empty, "^[1-9][0-9]{5}$"))
            return BadRequest(new { message = "Pincode must be exactly 6 digits and cannot start with 0." });

        var result = await _service.GetByPincodeAsync(pincode, cancellationToken);
        if (!result.Found)
            return NotFound(new { message = "No address details found for the supplied pincode.", pincode });

        return Ok(result);
    }
}
