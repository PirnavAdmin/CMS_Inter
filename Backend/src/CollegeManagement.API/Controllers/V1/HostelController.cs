using CollegeManagement.API.DTOs.Hostel;
using CollegeManagement.API.Services.Interfaces.Hostel;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [Route("api/v1/hostel")]
    [EnableCors("AllowFrontend")]
    [Produces("application/json")]
    public class HostelController : ControllerBase
    {
        private readonly IHostelBlockService _hostelBlockService;
        private readonly IRoomTypeConfigService _roomTypeConfigService;
        private readonly IRoomMasterService _roomMasterService;
        private readonly IHostelBedService _hostelBedService;
        private readonly IHostelWardenAssignmentService _hostelWardenAssignmentService;
        private readonly IHostelStudentAllocationService _hostelStudentAllocationService;
        private readonly IHostelAttendanceService _hostelAttendanceService;
        private readonly IHostelOutpassLeaveService _hostelOutpassLeaveService;
        private readonly IHostelTransferVacateService _hostelTransferVacateService;
        private readonly IHostelDashboardService _hostelDashboardService;
        private readonly IHostelReportService _hostelReportService;

        public HostelController(
            IHostelBlockService hostelBlockService,
            IRoomTypeConfigService roomTypeConfigService,
            IRoomMasterService roomMasterService,
            IHostelBedService hostelBedService,
            IHostelWardenAssignmentService hostelWardenAssignmentService,
            IHostelStudentAllocationService hostelStudentAllocationService,
            IHostelAttendanceService hostelAttendanceService,
            IHostelOutpassLeaveService hostelOutpassLeaveService,
            IHostelTransferVacateService hostelTransferVacateService,
            IHostelDashboardService hostelDashboardService,
            IHostelReportService hostelReportService)
        {
            _hostelBlockService = hostelBlockService;
            _roomTypeConfigService = roomTypeConfigService;
            _roomMasterService = roomMasterService;
            _hostelBedService = hostelBedService;
            _hostelWardenAssignmentService = hostelWardenAssignmentService;
            _hostelStudentAllocationService = hostelStudentAllocationService;
            _hostelAttendanceService = hostelAttendanceService;
            _hostelOutpassLeaveService = hostelOutpassLeaveService;
            _hostelTransferVacateService = hostelTransferVacateService;
            _hostelDashboardService = hostelDashboardService;
            _hostelReportService = hostelReportService;
        }


        [HttpGet("blocks")]
        public async Task<IActionResult> GetAllHostelBlocks(
            [FromQuery] string? search = null,
            [FromQuery] string? status = null)
        {
            var result =
                await _hostelBlockService.GetAllAsync(search, status);

            return Ok(new
            {
                success = true,
                message = "Hostel blocks retrieved successfully.",
                data = result
            });
        }

        [HttpGet("blocks/{id:int}")]
        public async Task<IActionResult> GetHostelBlockById(int id)
        {
            var result =
                await _hostelBlockService.GetByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Hostel block not found."
                });
            }

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        [HttpPost("blocks")]
        public async Task<IActionResult> CreateHostelBlock(
            [FromBody] CreateHostelBlockDto dto)
        {
            var result =
                await _hostelBlockService.CreateAsync(dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpPut("blocks/{id:int}")]
        public async Task<IActionResult> UpdateHostelBlock(
            int id,
            [FromBody] UpdateHostelBlockDto dto)
        {
            var result =
                await _hostelBlockService.UpdateAsync(id, dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpDelete("blocks/{id:int}")]
        public async Task<IActionResult> DeleteHostelBlock(int id)
        {
            var result =
                await _hostelBlockService.DeleteAsync(id);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message
            });
        }



        [HttpGet("room-types")]
        public async Task<IActionResult> GetAllRoomTypes(
            [FromQuery] string? search = null,
            [FromQuery] string? status = null)
        {
            var result =
                await _roomTypeConfigService.GetAllAsync(
                    search,
                    status);

            return Ok(new
            {
                success = true,
                message = "Room types retrieved successfully.",
                data = result
            });
        }

        [HttpGet("room-types/{id:int}")]
        public async Task<IActionResult> GetRoomTypeById(int id)
        {
            var result =
                await _roomTypeConfigService.GetByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Room type not found."
                });
            }

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        [HttpPost("room-types")]
        public async Task<IActionResult> CreateRoomType(
            [FromBody] CreateRoomTypeConfigDto dto)
        {
            var result =
                await _roomTypeConfigService.CreateAsync(dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpPut("room-types/{id:int}")]
        public async Task<IActionResult> UpdateRoomType(
            int id,
            [FromBody] UpdateRoomTypeConfigDto dto)
        {
            var result =
                await _roomTypeConfigService.UpdateAsync(id, dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpDelete("room-types/{id:int}")]
        public async Task<IActionResult> DeleteRoomType(int id)
        {
            var result =
                await _roomTypeConfigService.DeleteAsync(id);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message
            });
        }



        [HttpGet("rooms")]
        public async Task<IActionResult> GetAllRooms(
            [FromQuery] int? hostelId = null,
            [FromQuery] int? roomTypeId = null,
            [FromQuery] string? status = null,
            [FromQuery] string? search = null)
        {
            var result =
                await _roomMasterService.GetAllAsync(
                    hostelId,
                    roomTypeId,
                    status,
                    search);

            return Ok(new
            {
                success = true,
                message = "Rooms retrieved successfully.",
                data = result
            });
        }

        [HttpGet("rooms/{id:int}")]
        public async Task<IActionResult> GetRoomById(int id)
        {
            var result =
                await _roomMasterService.GetByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Room not found."
                });
            }

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        [HttpPost("rooms")]
        public async Task<IActionResult> CreateRoom(
            [FromBody] CreateRoomMasterDto dto)
        {
            var result =
                await _roomMasterService.CreateAsync(dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpPut("rooms/{id:int}")]
        public async Task<IActionResult> UpdateRoom(
            int id,
            [FromBody] UpdateRoomMasterDto dto)
        {
            var result =
                await _roomMasterService.UpdateAsync(id, dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpDelete("rooms/{id:int}")]
        public async Task<IActionResult> DeleteRoom(int id)
        {
            var result =
                await _roomMasterService.DeleteAsync(id);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message
            });
        }

        // ==========================================
        // HOSTEL BED APIs
        // ==========================================

        [HttpGet("beds")]
        public async Task<IActionResult> GetAllBeds(
            [FromQuery] int? hostelId = null,
            [FromQuery] int? roomId = null,
            [FromQuery] string? bedStatus = null,
            [FromQuery] string? status = null,
            [FromQuery] string? search = null)
        {
            var result =
                await _hostelBedService.GetAllAsync(
                    hostelId,
                    roomId,
                    bedStatus,
                    status,
                    search);

            return Ok(new
            {
                success = true,
                message = "Beds retrieved successfully.",
                data = result
            });
        }

        [HttpGet("beds/{id:int}")]
        public async Task<IActionResult> GetBedById(int id)
        {
            var result =
                await _hostelBedService.GetByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Bed not found."
                });
            }

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        [HttpPost("beds")]
        public async Task<IActionResult> CreateBed(
            [FromBody] CreateHostelBedDto dto)
        {
            var result =
                await _hostelBedService.CreateAsync(dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpPut("beds/{id:int}")]
        public async Task<IActionResult> UpdateBed(
            int id,
            [FromBody] UpdateHostelBedDto dto)
        {
            var result =
                await _hostelBedService.UpdateAsync(id, dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpDelete("beds/{id:int}")]
        public async Task<IActionResult> DeleteBed(int id)
        {
            var result =
                await _hostelBedService.DeleteAsync(id);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message
            });
        }


        // ==========================================
        // WARDEN ALLOCATION APIs
        // ==========================================

        [HttpGet("wardens")]
        public async Task<IActionResult> GetAllWardenAssignments(
            [FromQuery] int? hostelId = null,
            [FromQuery] int? staffId = null,
            [FromQuery] string? status = null,
            [FromQuery] string? search = null)
        {
            var result =
                await _hostelWardenAssignmentService.GetAllAsync(
                    hostelId,
                    staffId,
                    status,
                    search);

            return Ok(new
            {
                success = true,
                message = "Warden assignments retrieved successfully.",
                data = result
            });
        }

        [HttpGet("wardens/{id:int}")]
        public async Task<IActionResult> GetWardenAssignmentById(int id)
        {
            var result =
                await _hostelWardenAssignmentService.GetByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Warden assignment not found."
                });
            }

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        [HttpPost("wardens")]
        public async Task<IActionResult> CreateWardenAssignment(
            [FromBody] CreateHostelWardenAssignmentDto dto)
        {
            var result =
                await _hostelWardenAssignmentService.CreateAsync(dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpPut("wardens/{id:int}")]
        public async Task<IActionResult> UpdateWardenAssignment(
            int id,
            [FromBody] UpdateHostelWardenAssignmentDto dto)
        {
            var result =
                await _hostelWardenAssignmentService.UpdateAsync(id, dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpDelete("wardens/{id:int}")]
        public async Task<IActionResult> DeleteWardenAssignment(int id)
        {
            var result =
                await _hostelWardenAssignmentService.DeleteAsync(id);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message
            });
        }


        // ==========================================
        // STUDENT HOSTEL ALLOCATION APIs
        // ==========================================

        [HttpGet("student-allocations")]
        public async Task<IActionResult> GetAllStudentAllocations(
            [FromQuery] int? hostelId = null,
            [FromQuery] int? roomId = null,
            [FromQuery] int? studentId = null,
            [FromQuery] string? status = null,
            [FromQuery] string? search = null)
        {
            var result =
                await _hostelStudentAllocationService.GetAllAsync(
                    hostelId,
                    roomId,
                    studentId,
                    status,
                    search);

            return Ok(new
            {
                success = true,
                message = "Student hostel allocations retrieved successfully.",
                data = result
            });
        }

        [HttpGet("student-allocations/{id:int}")]
        public async Task<IActionResult> GetStudentAllocationById(int id)
        {
            var result =
                await _hostelStudentAllocationService.GetByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Student hostel allocation not found."
                });
            }

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        [HttpPost("student-allocations")]
        public async Task<IActionResult> CreateStudentAllocation(
            [FromBody] CreateHostelStudentAllocationDto dto)
        {
            var result =
                await _hostelStudentAllocationService.CreateAsync(dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpPut("student-allocations/{id:int}")]
        public async Task<IActionResult> UpdateStudentAllocation(
            int id,
            [FromBody] UpdateHostelStudentAllocationDto dto)
        {
            var result =
                await _hostelStudentAllocationService.UpdateAsync(id, dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpDelete("student-allocations/{id:int}")]
        public async Task<IActionResult> DeleteStudentAllocation(int id)
        {
            var result =
                await _hostelStudentAllocationService.DeleteAsync(id);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message
            });
        }



        // ==========================================
        // HOSTEL ATTENDANCE APIs
        // ==========================================

        [HttpGet("attendance")]
        public async Task<IActionResult> GetAllHostelAttendance(
            [FromQuery] int? hostelId = null,
            [FromQuery] int? roomId = null,
            [FromQuery] int? studentId = null,
            [FromQuery] DateTime? attendanceDate = null,
            [FromQuery] string? session = null,
            [FromQuery] string? attendanceStatus = null,
            [FromQuery] string? search = null)
        {
            var result =
                await _hostelAttendanceService.GetAllAsync(
                    hostelId, roomId, studentId, attendanceDate,
                    session, attendanceStatus, search);

            return Ok(new
            {
                success = true,
                message = "Hostel attendance retrieved successfully.",
                data = result
            });
        }

        [HttpGet("attendance/{id:int}")]
        public async Task<IActionResult> GetHostelAttendanceById(int id)
        {
            var result =
                await _hostelAttendanceService.GetByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Hostel attendance record not found."
                });
            }

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        [HttpPost("attendance")]
        public async Task<IActionResult> CreateHostelAttendance(
            [FromBody] CreateHostelAttendanceDto dto)
        {
            var result =
                await _hostelAttendanceService.CreateAsync(dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpPut("attendance/{id:int}")]
        public async Task<IActionResult> UpdateHostelAttendance(
            int id,
            [FromBody] UpdateHostelAttendanceDto dto)
        {
            var result =
                await _hostelAttendanceService.UpdateAsync(id, dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpDelete("attendance/{id:int}")]
        public async Task<IActionResult> DeleteHostelAttendance(int id)
        {
            var result =
                await _hostelAttendanceService.DeleteAsync(id);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message
            });
        }


        // ==========================================
        // HOSTEL OUTPASS / LEAVE APIs
        // ==========================================

        [HttpGet("outpass-leave")]
        public async Task<IActionResult> GetAllHostelOutpassLeaveRequests(
            [FromQuery] int? hostelId = null,
            [FromQuery] int? studentId = null,
            [FromQuery] string? requestType = null,
            [FromQuery] string? approvalStatus = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string? search = null)
        {
            var result =
                await _hostelOutpassLeaveService.GetAllAsync(
                    hostelId,
                    studentId,
                    requestType,
                    approvalStatus,
                    fromDate,
                    toDate,
                    search);

            return Ok(new
            {
                success = true,
                message = "Hostel outpass/leave requests retrieved successfully.",
                data = result
            });
        }

        [HttpGet("outpass-leave/{id:int}")]
        public async Task<IActionResult> GetHostelOutpassLeaveRequestById(int id)
        {
            var result =
                await _hostelOutpassLeaveService.GetByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Hostel outpass/leave request not found."
                });
            }

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        [HttpPost("outpass-leave")]
        public async Task<IActionResult> CreateHostelOutpassLeaveRequest(
            [FromBody] CreateHostelOutpassLeaveDto dto)
        {
            var result =
                await _hostelOutpassLeaveService.CreateAsync(dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpPut("outpass-leave/{id:int}")]
        public async Task<IActionResult> UpdateHostelOutpassLeaveRequest(
            int id,
            [FromBody] UpdateHostelOutpassLeaveDto dto)
        {
            var result =
                await _hostelOutpassLeaveService.UpdateAsync(id, dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpPut("outpass-leave/{id:int}/approval")]
        public async Task<IActionResult> UpdateHostelOutpassLeaveApproval(
            int id,
            [FromBody] UpdateHostelOutpassLeaveApprovalDto dto)
        {
            var result =
                await _hostelOutpassLeaveService.UpdateApprovalAsync(id, dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpDelete("outpass-leave/{id:int}")]
        public async Task<IActionResult> DeleteHostelOutpassLeaveRequest(int id)
        {
            var result =
                await _hostelOutpassLeaveService.DeleteAsync(id);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message
            });
        }


        // ==========================================
        // HOSTEL TRANSFER / VACATE APIs
        // ==========================================

        [HttpGet("transfer-vacate")]
        public async Task<IActionResult> GetAllHostelTransferVacateRequests(
            [FromQuery] int? studentId = null,
            [FromQuery] string? requestType = null,
            [FromQuery] string? approvalStatus = null,
            [FromQuery] string? feeSettlementStatus = null,
            [FromQuery] DateTime? requestDate = null,
            [FromQuery] string? search = null)
        {
            var result =
                await _hostelTransferVacateService.GetAllAsync(
                    studentId,
                    requestType,
                    approvalStatus,
                    feeSettlementStatus,
                    requestDate,
                    search);

            return Ok(new
            {
                success = true,
                message = "Hostel transfer/vacate requests retrieved successfully.",
                data = result
            });
        }

        [HttpGet("transfer-vacate/{id:int}")]
        public async Task<IActionResult> GetHostelTransferVacateRequestById(int id)
        {
            var result =
                await _hostelTransferVacateService.GetByIdAsync(id);

            if (result == null)
            {
                return NotFound(new
                {
                    success = false,
                    message = "Hostel transfer/vacate request not found."
                });
            }

            return Ok(new
            {
                success = true,
                data = result
            });
        }

        [HttpPost("transfer-vacate")]
        public async Task<IActionResult> CreateHostelTransferVacateRequest(
            [FromBody] CreateHostelTransferVacateDto dto)
        {
            var result =
                await _hostelTransferVacateService.CreateAsync(dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpPut("transfer-vacate/{id:int}")]
        public async Task<IActionResult> UpdateHostelTransferVacateRequest(
            int id,
            [FromBody] UpdateHostelTransferVacateDto dto)
        {
            var result =
                await _hostelTransferVacateService.UpdateAsync(id, dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpPut("transfer-vacate/{id:int}/approval")]
        public async Task<IActionResult> UpdateHostelTransferVacateApproval(
            int id,
            [FromBody] UpdateHostelTransferVacateApprovalDto dto)
        {
            var result =
                await _hostelTransferVacateService.UpdateApprovalAsync(id, dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpPut("transfer-vacate/{id:int}/settlement")]
        public async Task<IActionResult> UpdateHostelTransferVacateSettlement(
            int id,
            [FromBody] UpdateHostelTransferVacateSettlementDto dto)
        {
            var result =
                await _hostelTransferVacateService.UpdateSettlementAsync(id, dto);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpPost("transfer-vacate/{id:int}/complete")]
        public async Task<IActionResult> CompleteHostelTransferVacateRequest(int id)
        {
            var result =
                await _hostelTransferVacateService.CompleteAsync(id);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message,
                data = result.Data
            });
        }

        [HttpDelete("transfer-vacate/{id:int}")]
        public async Task<IActionResult> DeleteHostelTransferVacateRequest(int id)
        {
            var result =
                await _hostelTransferVacateService.DeleteAsync(id);

            if (!result.Success)
            {
                return BadRequest(new
                {
                    success = false,
                    message = result.Message
                });
            }

            return Ok(new
            {
                success = true,
                message = result.Message
            });
        }


        [HttpGet("dashboard")]
        public async Task<IActionResult> GetHostelDashboard(
            [FromQuery] int? hostelId = null)
        {
            var result =
                await _hostelDashboardService.GetDashboardAsync(hostelId);

            return Ok(new
            {
                success = true,
                message = "Hostel dashboard retrieved successfully.",
                data = result
            });
        }


        // ==========================================
        // HOSTEL REPORT APIs
        // ==========================================

        [HttpGet("reports/occupancy")]
        public async Task<IActionResult> GetHostelOccupancyReport(
            [FromQuery] int? hostelId = null)
        {
            var result =
                await _hostelReportService.GetOccupancyReportAsync(hostelId);

            return Ok(new
            {
                success = true,
                message = "Hostel occupancy report retrieved successfully.",
                data = result
            });
        }

        [HttpGet("reports/students")]
        public async Task<IActionResult> GetHostelStudentReport(
            [FromQuery] int? hostelId = null,
            [FromQuery] string? status = null,
            [FromQuery] string? search = null)
        {
            var result =
                await _hostelReportService.GetStudentReportAsync(
                    hostelId,
                    status,
                    search);

            return Ok(new
            {
                success = true,
                message = "Hostel student report retrieved successfully.",
                data = result
            });
        }

        [HttpGet("reports/attendance")]
        public async Task<IActionResult> GetHostelAttendanceReport(
            [FromQuery] int? hostelId = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string? session = null,
            [FromQuery] string? attendanceStatus = null,
            [FromQuery] string? search = null)
        {
            var result =
                await _hostelReportService.GetAttendanceReportAsync(
                    hostelId,
                    fromDate,
                    toDate,
                    session,
                    attendanceStatus,
                    search);

            return Ok(new
            {
                success = true,
                message = "Hostel attendance report retrieved successfully.",
                data = result
            });
        }

        [HttpGet("reports/outpass-leave")]
        public async Task<IActionResult> GetHostelOutpassLeaveReport(
            [FromQuery] int? hostelId = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string? requestType = null,
            [FromQuery] string? approvalStatus = null,
            [FromQuery] string? search = null)
        {
            var result =
                await _hostelReportService.GetOutpassLeaveReportAsync(
                    hostelId,
                    fromDate,
                    toDate,
                    requestType,
                    approvalStatus,
                    search);

            return Ok(new
            {
                success = true,
                message = "Hostel outpass/leave report retrieved successfully.",
                data = result
            });
        }

        [HttpGet("reports/transfer-vacate")]
        public async Task<IActionResult> GetHostelTransferVacateReport(
            [FromQuery] int? studentId = null,
            [FromQuery] DateTime? fromDate = null,
            [FromQuery] DateTime? toDate = null,
            [FromQuery] string? requestType = null,
            [FromQuery] string? approvalStatus = null,
            [FromQuery] string? feeSettlementStatus = null,
            [FromQuery] string? search = null)
        {
            var result =
                await _hostelReportService.GetTransferVacateReportAsync(
                    studentId,
                    fromDate,
                    toDate,
                    requestType,
                    approvalStatus,
                    feeSettlementStatus,
                    search);

            return Ok(new
            {
                success = true,
                message = "Hostel transfer/vacate report retrieved successfully.",
                data = result
            });
        }

    }
}