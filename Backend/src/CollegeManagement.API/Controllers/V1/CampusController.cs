using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Asp.Versioning;
using CollegeManagement.API.Data;
using Dapper;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Controllers.V1
{
    public class CampusDto
    {
        [JsonPropertyName("campusId")]
        public int CampusId { get; set; }

        [JsonPropertyName("id")]
        public int Id => CampusId;

        [JsonPropertyName("campusName")]
        public string CampusName { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name => CampusName;

        [JsonPropertyName("campusCode")]
        public string CampusCode { get; set; } = string.Empty;

        [JsonPropertyName("code")]
        public string Code => CampusCode;

        [JsonPropertyName("isActive")]
        public bool IsActive { get; set; } = true;

        [JsonPropertyName("status")]
        public bool Status => IsActive;

        [JsonPropertyName("isHQ")]
        public bool IsHQ { get; set; }

        [JsonPropertyName("address")]
        public string? Address { get; set; }

        [JsonPropertyName("contactPhone")]
        public string? ContactPhone { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }
    }

    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/campuses")]
    [Route("api/v1/campuses")]
    [Route("api/campuses")]
    [AllowAnonymous]
    [Produces("application/json")]
    public class CampusController : ControllerBase
    {
        private readonly AppDbContext _context;

        public CampusController(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        /// <summary>
        /// GET /api/v1/campuses
        /// Returns all campuses required by CampusContext.
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<CampusDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetCampuses()
        {
            try
            {
                using var conn = Connection;
                var sql = @"
                    SELECT 
                        CampusId,
                        CampusName,
                        CampusCode,
                        Address,
                        ContactPhone,
                        Email,
                        IsHQ,
                        IsActive,
                        DisplayOrder
                    FROM Campuses
                    ORDER BY DisplayOrder ASC, CampusId ASC;";

                var campuses = (await conn.QueryAsync<CampusDto>(sql)).ToList();
                return Ok(campuses ?? new List<CampusDto>());
            }
            catch (Exception)
            {
                return Ok(new List<CampusDto>());
            }
        }

        /// <summary>
        /// GET /api/v1/campuses/{id}
        /// Returns single campus by ID.
        /// </summary>
        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(CampusDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetCampusById(int id)
        {
            try
            {
                using var conn = Connection;
                var sql = @"
                    SELECT 
                        CampusId,
                        CampusName,
                        CampusCode,
                        Address,
                        ContactPhone,
                        Email,
                        IsHQ,
                        IsActive,
                        DisplayOrder
                    FROM Campuses
                    WHERE CampusId = @Id
                    LIMIT 1;";

                var campus = await conn.QueryFirstOrDefaultAsync<CampusDto>(sql, new { Id = id });
                if (campus == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = $"Campus with ID {id} was not found.",
                        errors = new { }
                    });
                }

                return Ok(campus);
            }
            catch (Exception)
            {
                return NotFound(new
                {
                    success = false,
                    message = $"Campus with ID {id} was not found.",
                    errors = new { }
                });
            }
        }
    }
}
