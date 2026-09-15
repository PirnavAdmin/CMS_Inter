using System.Collections.Generic;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.DTOs.Settings;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/settings/number-series")]
    [Route("api/v{version:apiVersion}/number-series")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    [Authorize]
    public class NumberSeriesController : ControllerBase
    {
        private readonly INumberSeriesService _numberSeriesService;

        public NumberSeriesController(INumberSeriesService numberSeriesService)
        {
            _numberSeriesService = numberSeriesService;
        }

        /// <summary>
        /// 1. GET /api/v1/settings/number-series
        /// Returns list of configurations for all supported number series.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<NumberSeriesResponseDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAll()
        {
            var result = await _numberSeriesService.GetAllSeriesAsync();
            return Ok(result);
        }

        /// <summary>
        /// 2. GET /api/v1/settings/number-series/{seriesCode}
        /// Returns configuration object + dynamically parsed livePreview string for a specific series.
        /// Supports code (e.g., EMPLOYEE_ID) or slug (e.g., employee-id, admission-no, certificate-number, receipt-no).
        /// </summary>
        [HttpGet("{seriesCode}")]
        [ProducesResponseType(typeof(NumberSeriesResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetByCode(string seriesCode)
        {
            var result = await _numberSeriesService.GetSeriesByCodeAsync(seriesCode);
            if (result == null)
            {
                return NotFound(new { message = $"Number series configuration '{seriesCode}' was not found." });
            }
            return Ok(result);
        }

        /// <summary>
        /// 3. PUT /api/v1/settings/number-series/{seriesCode}
        /// Updates configuration: prefix, formatPattern, numberLength, startNumber, description.
        /// </summary>
        [HttpPut("{seriesCode}")]
        [ProducesResponseType(typeof(NumberSeriesResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(string seriesCode, [FromBody] UpdateNumberSeriesDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _numberSeriesService.UpdateSeriesAsync(seriesCode, dto);
            if (result == null)
            {
                return NotFound(new { message = $"Number series configuration '{seriesCode}' was not found." });
            }

            return Ok(result);
        }

        /// <summary>
        /// 4. POST /api/v1/settings/number-series/{seriesCode}/generate-next
        /// Executes thread-safe atomic sequence increment and returns the newly generated sequence ID.
        /// </summary>
        [HttpPost("{seriesCode}/generate-next")]
        [ProducesResponseType(typeof(GenerateNumberSeriesResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GenerateNext(string seriesCode, [FromBody] GenerateNumberSeriesRequestDto? context = null)
        {
            var result = await _numberSeriesService.GenerateNextNumberAsync(seriesCode, context);
            if (result == null)
            {
                return NotFound(new { message = $"Number series configuration '{seriesCode}' was not found." });
            }

            return Ok(result);
        }

        /// <summary>
        /// 5. GET /api/v1/settings/number-series/{seriesCode}/preview
        /// Dynamic on-the-fly preview calculation for UI typing without persisting changes.
        /// </summary>
        [HttpGet("{seriesCode}/preview")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPreview(
            string seriesCode,
            [FromQuery] string? pattern = null,
            [FromQuery] int? numberLength = null,
            [FromQuery] string? prefix = null)
        {
            var preview = await _numberSeriesService.GetLivePreviewAsync(seriesCode, pattern, numberLength, prefix);
            return Ok(new { seriesCode, preview });
        }
    }
}
