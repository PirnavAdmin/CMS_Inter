using CollegeManagement.API.DTOs.StudyMaterial;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/study-materials")]
    [Produces("application/json")]
    [Authorize]
    public class StudyMaterialsController : ControllerBase
    {
        private readonly IStudyMaterialService _service;

        public StudyMaterialsController(IStudyMaterialService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _service.GetAllAsync();

            return Ok(new
            {
                Status = true,
                Message = "Study materials retrieved successfully.",
                Data = result
            });
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateStudyMaterialDto dto)
        {
            var result = await _service.CreateAsync(dto);

            return Ok(new
            {
                Status = true,
                Message = "Study material created successfully.",
                Data = result
            });
        }

        [HttpGet("{id}/download")]
        public async Task<IActionResult> Download(int id)
        {
            var result = await _service.GetByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    Status = false,
                    Message = $"Study material with ID {id} not found."
                });
            }

            return Ok(new
            {
                Status = true,
                Message = "Study material retrieved successfully.",
                Data = result
            });
        }
    }
}