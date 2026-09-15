using Asp.Versioning;
using CollegeManagement.API.DTOs.Students;
using CollegeManagement.API.DTOs.Students.Requests;
using CollegeManagement.API.DTOs.Students.Responses;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Services;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

namespace CollegeManagement.API.Controllers.V1
{
    [ApiController]
    [ApiVersion("1.0")]
    [Route("api/v{version:apiVersion}/students")]
    [Authorize]
    public class StudentsController : ControllerBase
    {
        private readonly IStudentService _service;
        private readonly IStudentExportService _exportService;
        private readonly IStudentImportService _importService;
        private readonly CollegeManagement.API.Helpers.IJwtTokenHelper _jwtTokenHelper;
        private readonly IAuthService _authService;

        public StudentsController(
            IStudentService service,
            IStudentExportService exportService,
            IStudentImportService importService,
            CollegeManagement.API.Helpers.IJwtTokenHelper jwtTokenHelper,
            IAuthService? authService = null)
        {
            _service = service;
            _exportService = exportService;
            _importService = importService;
            _jwtTokenHelper = jwtTokenHelper;
            _authService = authService!;
        }

        private int GetCurrentStudentId()
        {
            var studentId = _jwtTokenHelper.GetStudentId(User);
            if (!studentId.HasValue || studentId.Value <= 0)
            {
                throw new UnauthorizedException("User is not authenticated or student identifier claim is missing/invalid.");
            }
            return studentId.Value;
        }


        // =========================================================
        // STUDENT SELF-SERVICE APIS
        // =========================================================

        /// <summary>
        /// Retrieves the profile of the current authenticated student.
        /// </summary>
        [HttpGet("me")]
        [ProducesResponseType(typeof(StudentSelfProfileResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> GetSelfProfile()
        {
            var studentId = GetCurrentStudentId();
            var profile = await _service.GetSelfProfileAsync(studentId);

            if (profile == null)
            {
                return NotFound(new { message = "Student profile not found." });
            }

            return Ok(profile);
        }

        /// <summary>
        /// Updates the current authenticated student's self-editable profile fields.
        /// Protected academic, financial, and system fields cannot be modified through this endpoint.
        /// </summary>
        [HttpPut("me/profile")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UpdateSelfProfile([FromBody] StudentSelfProfileDto request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var studentId = GetCurrentStudentId();
            var success = await _service.UpdateSelfProfileAsync(studentId, request);

            if (!success)
            {
                return NotFound(new { message = "Student not found or profile could not be updated." });
            }

            var updatedProfile = await _service.GetSelfProfileAsync(studentId);
            return Ok(new
            {
                status = true,
                message = "Student profile updated successfully.",
                data = updatedProfile
            });
        }

        /// <summary>
        /// Uploads or replaces the current authenticated student's profile photograph.
        /// </summary>
        [HttpPost("me/photo")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(StudentPhotoUploadResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> UploadSelfPhoto(IFormFile file, CancellationToken ct = default)
        {
            var studentId = GetCurrentStudentId();
            try
            {
                var result = await _service.UploadPhotoAsync(studentId, file, ct);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Uploads or replaces a document/certificate for the current authenticated student.
        /// Supported types: BirthCertificate, TransferCertificate, StudyCertificate, AadhaarDocument,
        /// CommunityCertificate, IncomeCertificate, CasteCertificate, TenthCertificate, MarksMemo.
        /// </summary>
        [HttpPost("me/documents")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(StudentDocumentUploadResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> UploadSelfDocument(
            [FromForm] string documentType,
            IFormFile file,
            CancellationToken ct = default)
        {
            var studentId = GetCurrentStudentId();
            try
            {
                var result = await _service.UploadDocumentAsync(studentId, documentType, file, ct);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Changes the current authenticated student's password after first login.
        /// </summary>
        [HttpPost("me/change-password")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ChangeSelfPassword([FromBody] StudentChangePasswordRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var userId = _jwtTokenHelper.GetUserId(User);
            if (!userId.HasValue || userId.Value <= 0)
            {
                throw new UnauthorizedException("User is not authenticated or user identifier claim is missing/invalid.");
            }

            var (success, message) = await _authService.ChangePasswordAsync(
                userId.Value,
                request.OldPassword,
                request.NewPassword,
                request.ConfirmPassword);

            if (!success)
            {
                return BadRequest(new { message = message });
            }

            return Ok(new
            {
                status = true,
                message = "Password changed successfully. Initial login credential is now consumed."
            });
        }


        // =========================================================
        // GET ALL STUDENTS
        // =========================================================

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var students = await _service.GetAllAsync();

            return Ok(students);
        }


        // =========================================================
        // GET STUDENT BY ID
        // =========================================================

        [HttpGet("{studentId:int}")]
        public async Task<IActionResult> GetById(int studentId)
        {
            var student = await _service.GetByIdAsync(studentId);

            if (student == null)
                return NotFound(new
                {
                    message = "Student not found"
                });

            return Ok(student);
        }


        // =========================================================
        // CREATE STUDENT
        // =========================================================

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] CreateStudentRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var result = await _service.CreateAsync(request);

            return Ok(result);
        }


        // =========================================================
        // UPDATE STUDENT
        // =========================================================

        [HttpPut("{studentId:int}")]
        public async Task<IActionResult> Update(
            int studentId,
            [FromBody] UpdateStudentRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var result = await _service.UpdateAsync(
                studentId,
                request);

            if (result == null)
                return NotFound(new
                {
                    message = "Student not found"
                });

            return Ok(result);
        }


        // =========================================================
        // DELETE STUDENT
        // =========================================================

        [HttpDelete("{studentId:int}")]
        public async Task<IActionResult> Delete(int studentId)
        {
            var result = await _service.DeleteAsync(studentId);

            if (!result)
                return NotFound(new
                {
                    message = "Student not found"
                });

            return Ok(new
            {
                message = "Student deleted successfully"
            });
        }


        // =========================================================
        // GET STUDENT PROFILE (ADMIN)
        // =========================================================

        [HttpGet("{studentId:int}/profile")]
        public async Task<IActionResult> GetProfile(int studentId)
        {
            var profile = await _service.GetProfileAsync(studentId);

            if (profile == null)
                return NotFound(new
                {
                    message = "Student not found"
                });

            return Ok(profile);
        }


        // =========================================================
        // UPDATE STUDENT PROFILE (ADMIN)
        // =========================================================

        [HttpPut("{studentId:int}/profile")]
        public async Task<IActionResult> UpdateProfile(
            int studentId,
            [FromBody] StudentProfileDto request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var result = await _service.UpdateProfileAsync(
                studentId,
                request);

            if (result == null)
                return NotFound(new
                {
                    message = "Student not found"
                });

            return Ok(result);
        }


        // =========================================================
        // CHANGE SECTION
        // =========================================================

        [HttpPost("{studentId:int}/change-section")]
        public async Task<IActionResult> ChangeSection(
            int studentId,
            [FromBody] ChangeSectionRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var result = await _service.ChangeSectionAsync(
                studentId,
                request);

            if (!result)
                return BadRequest(new
                {
                    message = "Failed to change section"
                });

            return Ok(new
            {
                message = "Section changed successfully"
            });
        }


        // =========================================================
        // CHANGE GROUP
        // =========================================================

        [HttpPost("{studentId:int}/change-group")]
        public async Task<IActionResult> ChangeGroup(
            int studentId,
            [FromBody] ChangeGroupRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var result = await _service.ChangeGroupAsync(
                studentId,
                request);

            if (!result)
                return BadRequest(new
                {
                    message = "Failed to change group"
                });

            return Ok(new
            {
                message = "Group changed successfully"
            });
        }


        // =========================================================
        // TRANSFER STUDENT
        // =========================================================

        [HttpPost("{studentId:int}/transfer")]
        public async Task<IActionResult> Transfer(
            int studentId,
            [FromBody] TransferStudentRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var result = await _service.TransferAsync(
                studentId,
                request);

            if (!result)
                return BadRequest(new
                {
                    message = "Failed to transfer student"
                });

            return Ok(new
            {
                message = "Student transferred successfully"
            });
        }


        // =========================================================
        // SUSPEND STUDENT
        // =========================================================

        [HttpPost("{studentId:int}/suspend")]
        public async Task<IActionResult> Suspend(
            int studentId,
            [FromBody] SuspendStudentRequest request)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            var result = await _service.SuspendAsync(
                studentId,
                request);

            if (!result)
                return BadRequest(new
                {
                    message = "Failed to suspend student"
                });

            return Ok(new
            {
                message = "Student suspended successfully"
            });
        }


        // =========================================================
        // ACTIVATE STUDENT
        // =========================================================

        [HttpPost("{studentId:int}/activate")]
        public async Task<IActionResult> Activate(int studentId)
        {
            var result = await _service.ActivateAsync(studentId);

            if (!result)
                return BadRequest(new
                {
                    message = "Failed to activate student"
                });

            return Ok(new
            {
                message = "Student activated successfully"
            });
        }


        // =========================================================
        // RESET PASSWORD (ADMIN)
        // =========================================================

        [HttpPost("{studentId:int}/reset-password")]
        public async Task<IActionResult> ResetPassword(int studentId)
        {
            var result = await _service.ResetPasswordAsync(studentId);

            if (!result)
                return BadRequest(new
                {
                    message = "Failed to reset password"
                });

            return Ok(new
            {
                message = "Password reset successfully"
            });
        }


        // =========================================================
        // STUDENT DASHBOARD
        // =========================================================

        [HttpGet("{studentId:int}/dashboard")]
        public async Task<IActionResult> GetDashboard(int studentId)
        {
            var dashboard = await _service.GetDashboardAsync(studentId);

            if (dashboard == null)
                return NotFound(new
                {
                    message = "Student not found"
                });

            return Ok(dashboard);
        }


        // =========================================================
        // SEARCH STUDENTS
        // =========================================================

        [HttpGet("search")]
        public async Task<IActionResult> Search(
            [FromQuery] string? search,
            [FromQuery] int? boardId,
            [FromQuery] int? academicYearId,
            [FromQuery] int? academicLevelId,
            [FromQuery] int? groupId,
            [FromQuery] int? sectionId,
            [FromQuery] bool? isActive)
        {
            var students = await _service.SearchAsync(
                search,
                boardId,
                academicYearId,
                academicLevelId,
                groupId,
                sectionId,
                isActive);

            return Ok(students);
        }


        // =========================================================
        // GET STUDENTS BY GROUP
        // =========================================================

        [HttpGet("group/{groupId:int}")]
        public async Task<IActionResult> GetByGroup(int groupId)
        {
            var students = await _service.GetByGroupAsync(groupId);

            return Ok(students);
        }


        // =========================================================
        // GET STUDENTS BY SECTION
        // =========================================================

        [HttpGet("section/{sectionId:int}")]
        public async Task<IActionResult> GetBySection(int sectionId)
        {
            var students = await _service.GetBySectionAsync(sectionId);

            return Ok(students);
        }


        // =========================================================
        // GET ACTIVE STUDENTS
        // =========================================================

        [HttpGet("active")]
        public async Task<IActionResult> GetActive()
        {
            var students = await _service.GetActiveAsync();

            return Ok(students);
        }


        // =========================================================
        // CHECK EMAIL
        // =========================================================

        [HttpGet("check-email")]
        public async Task<IActionResult> EmailExists(
            [FromQuery] string email,
            [FromQuery] int? excludeStudentId = null)
        {
            var exists = await _service.EmailExistsAsync(
                email,
                excludeStudentId);

            return Ok(new
            {
                exists
            });
        }


        // =========================================================
        // CHECK MOBILE
        // =========================================================

        [HttpGet("check-mobile")]
        public async Task<IActionResult> MobileExists(
            [FromQuery] string mobile,
            [FromQuery] int? excludeStudentId = null)
        {
            var exists = await _service.MobileExistsAsync(
                mobile,
                excludeStudentId);

            return Ok(new
            {
                exists
            });
        }

        // =========================================================
        // EXPORT INDIVIDUAL STUDENT PDF
        // =========================================================

        /// <summary>
        /// Exports an individual student's comprehensive profile to an A4 Portrait PDF.
        /// </summary>
        /// <param name="studentId">Primary key ID of the student.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>A PDF binary stream.</returns>
        [HttpGet("{studentId:int}/export/pdf")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ExportPdf(int studentId, CancellationToken ct = default)
        {
            if (studentId <= 0)
                return BadRequest(new { message = "Invalid student ID." });

            try
            {
                var (pdfBytes, fileName) = await _exportService.ExportStudentProfilePdfAsync(studentId, ct);
                return File(pdfBytes, "application/pdf", fileName);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }


        // =========================================================
        // EXPORT INDIVIDUAL STUDENT CREDENTIAL SLIP PDF
        // =========================================================

        /// <summary>
        /// Generates a PDF onboarding credential slip for an individual student.
        /// Only allowed while IsFirstLogin = 1 (initial credential).
        /// </summary>
        [HttpGet("{studentId:int}/credentials-pdf")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> ExportCredentialSlipPdf(int studentId, CancellationToken ct = default)
        {
            if (studentId <= 0)
                return BadRequest(new { message = "Invalid student ID." });

            try
            {
                var (pdfBytes, fileName) = await _exportService.ExportStudentCredentialSlipPdfAsync(studentId, ct);
                return File(pdfBytes, "application/pdf", fileName);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


        // =========================================================
        // EXPORT ALL OR FILTERED STUDENTS EXCEL
        // =========================================================

        /// <summary>
        /// Exports all or filtered students to an Excel spreadsheet (.xlsx).
        /// </summary>
        [HttpGet("export/excel")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ExportExcel(
            [FromQuery] StudentExportFilterDto filter,
            CancellationToken ct = default)
        {
            try
            {
                var (excelBytes, fileName) = await _exportService.ExportStudentsToExcelAsync(filter, ct);
                return File(
                    excelBytes,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    fileName);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


        // =========================================================
        // LEGACY STUDENT BULK IMPORT — TEMPLATE GENERATION
        // =========================================================

        /// <summary>
        /// Downloads the official 56-column Excel template for bulk legacy student import.
        /// </summary>
        [HttpGet("import/template")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        public async Task<IActionResult> DownloadImportTemplate(CancellationToken ct)
        {
            var excelBytes = await _importService.GenerateTemplateAsync(ct);
            var fileName = $"Legacy_Student_Import_Template_{DateTime.UtcNow:yyyyMMdd_HHmmss}.xlsx";
            return File(
                excelBytes,
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                fileName);
        }


        // =========================================================
        // LEGACY STUDENT BULK IMPORT — DRY-RUN VALIDATION
        // =========================================================

        /// <summary>
        /// Validates the uploaded legacy student Excel spreadsheet without inserting records into the database.
        /// </summary>
        [HttpPost("import/validate")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(StudentImportResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(StudentImportResultDto), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ValidateImportExcel(IFormFile file, CancellationToken ct)
        {
            var result = await _importService.ValidateExcelAsync(file, ct);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }


        // =========================================================
        // LEGACY STUDENT BULK IMPORT — EXECUTE IMPORT
        // =========================================================

        /// <summary>
        /// Validates and imports legacy students directly into the Students table.
        /// </summary>
        [HttpPost("import/excel")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(StudentImportResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(StudentImportResultDto), StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ImportExcel(
            IFormFile file,
            [FromQuery] bool allowPartial = false,
            CancellationToken ct = default)
        {
            var result = await _importService.ImportExcelAsync(file, allowPartial, ct);
            if (!result.IsSuccess)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }


        // =========================================================
        // LEGACY STUDENT BULK IMPORT — CREDENTIALS PDF (CATEGORY A)
        // =========================================================

        /// <summary>
        /// Generates a printable PDF of onboarding credential slips for legacy imported students.
        /// </summary>
        [HttpGet("import/credentials-pdf")]
        [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
        public async Task<IActionResult> DownloadCredentialsPdf(
            [FromQuery] StudentCredentialPdfFilterDto filter,
            CancellationToken ct = default)
        {
            var pdfBytes = await _importService.GenerateCredentialsPdfAsync(filter, ct);
            var fileName = $"Legacy_Student_Credentials_{DateTime.UtcNow:yyyyMMdd_HHmmss}.pdf";
            return File(pdfBytes, "application/pdf", fileName);
        }


        // =========================================================
        // COMMON STUDENT PHOTO UPLOAD (CATEGORY B — ALL STUDENTS)
        // =========================================================

        /// <summary>
        /// Uploads or replaces a student's profile photograph. Available for all students.
        /// </summary>
        [HttpPost("{studentId:int}/photo")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(StudentPhotoUploadResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UploadPhoto(
            int studentId,
            IFormFile file,
            CancellationToken ct = default)
        {
            try
            {
                var result = await _service.UploadPhotoAsync(studentId, file, ct);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


        // =========================================================
        // COMMON STUDENT DOCUMENT UPLOAD (CATEGORY B — ALL STUDENTS)
        // =========================================================

        /// <summary>
        /// Uploads or replaces a student document certificate. Available for all students.
        /// Supported types: BirthCertificate, TransferCertificate, StudyCertificate, AadhaarDocument,
        /// CommunityCertificate, IncomeCertificate, CasteCertificate, TenthCertificate, MarksMemo.
        /// </summary>
        [HttpPost("{studentId:int}/documents")]
        [Consumes("multipart/form-data")]
        [ProducesResponseType(typeof(StudentDocumentUploadResultDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> UploadDocument(
            int studentId,
            [FromForm] string documentType,
            IFormFile file,
            CancellationToken ct = default)
        {
            try
            {
                var result = await _service.UploadDocumentAsync(studentId, documentType, file, ct);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

    }
}
