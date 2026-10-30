using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.MasterGroups;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Filters;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/master-groups")]
    [Authorize]
    [RequirePermission("group-management")]
    public class MasterGroupsController : ControllerBase
    {
        private readonly IMasterGroupService _masterGroupService;

        public MasterGroupsController(IMasterGroupService masterGroupService)
        {
            _masterGroupService = masterGroupService;
        }

        // =========================================================
        // GET ALL MASTER GROUPS
        // =========================================================

        [HttpGet]
        public async Task<IActionResult> GetMasterGroups(
            [FromQuery] int? boardId = null,
            [FromQuery] string? search = null,
            [FromQuery] bool? isActive = null)
        {
            var result = await _masterGroupService.GetAllAsync(boardId, search, isActive, HttpContext.RequestAborted);
            return Ok(result);
        }

        // =========================================================
        // GET MASTER GROUP BY ID
        // =========================================================

        [HttpGet("{masterGroupId:int}")]
        public async Task<IActionResult> GetMasterGroup(int masterGroupId)
        {
            if (masterGroupId <= 0)
                throw new ValidationException("Valid MasterGroupId is required.");

            var group = await _masterGroupService.GetByIdAsync(masterGroupId, HttpContext.RequestAborted);
            if (group == null)
                throw new NotFoundException($"Master group with ID {masterGroupId} not found.");

            return Ok(group);
        }

        // =========================================================
        // CREATE MASTER GROUP
        // =========================================================

        [HttpPost]
        public async Task<IActionResult> CreateMasterGroup([FromBody] CreateMasterGroupRequestDto request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var created = await _masterGroupService.CreateAsync(request, HttpContext.RequestAborted);

            return CreatedAtAction(
                nameof(GetMasterGroup),
                new { masterGroupId = created.MasterGroupId },
                new
                {
                    message = "Master group created successfully",
                    data = created
                });
        }

        // =========================================================
        // UPDATE MASTER GROUP
        // =========================================================

        [HttpPut("{masterGroupId:int}")]
        public async Task<IActionResult> UpdateMasterGroup(
            int masterGroupId,
            [FromBody] UpdateMasterGroupRequestDto request)
        {
            if (masterGroupId <= 0)
                throw new ValidationException("Valid MasterGroupId is required.");

            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var updated = await _masterGroupService.UpdateAsync(masterGroupId, request, HttpContext.RequestAborted);
            if (updated == null)
                throw new NotFoundException($"Master group with ID {masterGroupId} not found.");

            return Ok(new
            {
                message = "Master group updated successfully",
                data = updated
            });
        }

        // =========================================================
        // ACTIVATE / DEACTIVATE MASTER GROUP
        // =========================================================

        [HttpPatch("{masterGroupId:int}/activate")]
        [HttpPatch("{masterGroupId:int}/status")]
        public async Task<IActionResult> ActivateMasterGroup(
            int masterGroupId,
            [FromQuery] bool isActive = true)
        {
            if (masterGroupId <= 0)
                throw new ValidationException("Valid MasterGroupId is required.");

            var success = await _masterGroupService.ActivateAsync(masterGroupId, isActive, HttpContext.RequestAborted);
            if (!success)
                throw new NotFoundException($"Master group with ID {masterGroupId} not found.");

            return Ok(new
            {
                message = isActive
                    ? "Master group activated successfully"
                    : "Master group deactivated successfully",
                data = new { masterGroupId, isActive }
            });
        }

        // =========================================================
        // DELETE MASTER GROUP
        // =========================================================

        [HttpDelete("{masterGroupId:int}")]
        public async Task<IActionResult> DeleteMasterGroup(int masterGroupId)
        {
            if (masterGroupId <= 0)
                throw new ValidationException("Valid MasterGroupId is required.");

            var deleted = await _masterGroupService.DeleteAsync(masterGroupId, HttpContext.RequestAborted);
            if (!deleted)
                throw new NotFoundException($"Master group with ID {masterGroupId} not found.");

            return Ok(new
            {
                message = "Master group deleted successfully"
            });
        }

        // =========================================================
        // VALIDATE MASTER GROUP CODE
        // =========================================================

        [HttpGet("validate-code")]
        public async Task<IActionResult> ValidateCode(
            [FromQuery] int boardId,
            [FromQuery] string groupCode,
            [FromQuery] int? excludeMasterGroupId = null)
        {
            if (boardId <= 0)
                throw new ValidationException("Valid BoardId is required.");

            if (string.IsNullOrWhiteSpace(groupCode))
                throw new ValidationException("Group code is required.");

            var exists = await _masterGroupService.CodeExistsAsync(boardId, groupCode, excludeMasterGroupId, HttpContext.RequestAborted);

            return Ok(new
            {
                boardId,
                groupCode,
                exists,
                isAvailable = !exists
            });
        }

        // =========================================================
        // GET ELIGIBLE ACADEMIC LEVELS FOR MASTER GROUP
        // =========================================================

        [HttpGet("{masterGroupId:int}/eligible-levels")]
        public async Task<IActionResult> GetEligibleLevels(int masterGroupId)
        {
            if (masterGroupId <= 0)
                throw new ValidationException("Valid MasterGroupId is required.");

            var levels = await _masterGroupService.GetEligibleAcademicLevelsAsync(masterGroupId, HttpContext.RequestAborted);
            return Ok(levels);
        }

        // =========================================================
        // GET DEFAULT PROGRAMS
        // =========================================================

        [HttpGet("{masterGroupId:int}/programs")]
        public async Task<IActionResult> GetPrograms(int masterGroupId)
        {
            if (masterGroupId <= 0)
                throw new ValidationException("Valid MasterGroupId is required.");

            var programs = await _masterGroupService.GetProgramsAsync(masterGroupId, HttpContext.RequestAborted);
            return Ok(programs);
        }

        // =========================================================
        // UPDATE DEFAULT PROGRAMS
        // =========================================================

        [HttpPut("{masterGroupId:int}/programs")]
        public async Task<IActionResult> UpdatePrograms(
            int masterGroupId,
            [FromBody] List<int> programIds)
        {
            if (masterGroupId <= 0)
                throw new ValidationException("Valid MasterGroupId is required.");

            var updated = await _masterGroupService.UpdateProgramsAsync(masterGroupId, programIds ?? new List<int>(), HttpContext.RequestAborted);
            if (!updated)
                throw new NotFoundException($"Master group with ID {masterGroupId} not found.");

            return Ok(new
            {
                message = "Master group programs updated successfully",
                data = await _masterGroupService.GetProgramsAsync(masterGroupId, HttpContext.RequestAborted)
            });
        }

        // =========================================================
        // CONTEXT RESOLUTION (Option B Core Engine)
        // =========================================================

        [HttpPost("resolve-context")]
        public async Task<IActionResult> ResolveContext([FromBody] ResolveGroupContextRequestDto request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var resolved = await _masterGroupService.ResolveContextAsync(request, HttpContext.RequestAborted);

            return Ok(new
            {
                message = resolved.IsNewlyCreated
                    ? "Academic context group created and resolved successfully"
                    : "Existing academic context group resolved successfully",
                data = resolved
            });
        }
    }
}
