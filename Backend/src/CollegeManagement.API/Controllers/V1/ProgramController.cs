using CollegeManagement.API.DTOs.Program;
using CollegeManagement.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers
{
    [ApiController]
    [Route("api/v1/programs")]
    [Authorize]
    public class ProgramController : ControllerBase
    {
        private readonly IProgramService _programService;

        public ProgramController(
            IProgramService programService)
        {
            _programService = programService;
        }


        // =========================================================
        // 1. GET ALL PROGRAMS
        // =========================================================

        /// <summary>
        /// Gets all Programs/Tracks configured in the system.
        ///
        /// USE:
        /// This API is used in the Add Group screen to display
        /// the multi-select Programs / Tracks list.
        ///
        /// Example:
        /// Regular, JEE, JEE Advanced, EAPCET, NEET, CUET etc.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var result =
                    await _programService.GetAllAsync();

                return Ok(new
                {
                    success = true,
                    message = "Programs retrieved successfully.",
                    data = result
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Unable to retrieve programs.",
                    error = ex.Message
                });
            }
        }


        // =========================================================
        // 2. GET PROGRAM BY ID
        // =========================================================

        /// <summary>
        /// Gets one Program using ProgramId.
        ///
        /// USE:
        /// Used when opening the Edit Program screen or when
        /// the frontend needs complete details of one Program.
        /// </summary>
        [HttpGet("{programId:int}")]
        public async Task<IActionResult> GetById(
            int programId)
        {
            try
            {
                if (programId <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Valid ProgramId is required."
                    });
                }

                var result =
                    await _programService
                        .GetByIdAsync(programId);

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Program not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Program retrieved successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Unable to retrieve program.",
                    error = ex.Message
                });
            }
        }


        // =========================================================
        // 3. CREATE PROGRAM
        // =========================================================

        /// <summary>
        /// Creates a new Program/Track.
        ///
        /// USE:
        /// Used by the Add Program popup inside Group Management.
        ///
        /// Program Code is intentionally NOT required.
        ///
        /// Example:
        /// JEE
        /// NEET
        /// EAPCET
        /// CUET
        /// Regular
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateProgramDto dto)
        {
            try
            {
                if (dto == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Request body is required."
                    });
                }

                var result =
                    await _programService
                        .CreateAsync(dto);

                if (result == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Unable to create program."
                    });
                }

                return StatusCode(201, new
                {
                    success = true,
                    message = "Program created successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Unable to create program.",
                    error = ex.Message
                });
            }
        }


        // =========================================================
        // 4. UPDATE PROGRAM
        // =========================================================

        /// <summary>
        /// Updates an existing Program.
        ///
        /// USE:
        /// Used from the Edit Program screen.
        ///
        /// Program Name and Active/Inactive status can be changed.
        /// </summary>
        [HttpPut("{programId:int}")]
        public async Task<IActionResult> Update(
            int programId,
            [FromBody] UpdateProgramDto dto)
        {
            try
            {
                if (programId <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Valid ProgramId is required."
                    });
                }

                if (dto == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Request body is required."
                    });
                }

                var result =
                    await _programService
                        .UpdateAsync(
                            programId,
                            dto);

                if (result == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Program not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = "Program updated successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Unable to update program.",
                    error = ex.Message
                });
            }
        }


        // =========================================================
        // 5. ACTIVATE / DEACTIVATE PROGRAM
        // =========================================================

        /// <summary>
        /// Activates or deactivates a Program.
        ///
        /// USE:
        /// Used when the admin switches the Program status.
        ///
        /// Example:
        /// true  = Active
        /// false = Inactive
        ///
        /// Deactivating a Program does not delete it.
        /// Existing Group relationships remain available.
        /// </summary>
        [HttpPatch("{programId:int}/status")]
        public async Task<IActionResult> SetStatus(
            int programId,
            [FromBody] ProgramStatusDto dto)
        {
            try
            {
                if (programId <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Valid ProgramId is required."
                    });
                }

                if (dto == null)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Request body is required."
                    });
                }

                var result =
                    await _programService
                        .SetStatusAsync(
                            programId,
                            dto.IsActive);

                if (!result)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Program not found."
                    });
                }

                return Ok(new
                {
                    success = true,
                    message = dto.IsActive
                        ? "Program activated successfully."
                        : "Program deactivated successfully."
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = "Unable to change program status.",
                    error = ex.Message
                });
            }
        }


        // =========================================================
        // 6. GET PROGRAMS BY GROUP
        // =========================================================

        /// <summary>
        /// Gets all Programs/Tracks assigned to a particular Group.
        ///
        /// USE:
        /// Used in Group Management to display:
        ///
        /// MPC
        ///  -> Regular
        ///  -> JEE
        ///  -> EAPCET
        ///
        /// BiPC
        ///  -> Regular
        ///  -> NEET
        ///
        /// This API reads the GroupPrograms relationship.
        /// </summary>
        [HttpGet("group/{groupId:int}")]
        public async Task<IActionResult> GetByGroup(
            int groupId)
        {
            try
            {
                if (groupId <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Valid GroupId is required."
                    });
                }

                var result =
                    await _programService
                        .GetByGroupIdAsync(groupId);

                return Ok(new
                {
                    success = true,
                    message =
                        "Group programs retrieved successfully.",
                    data = result
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message =
                        "Unable to retrieve group programs.",
                    error = ex.Message
                });
            }
        }
    }
}