using CollegeManagement.API.DTOs.Students;
using CollegeManagement.API.DTOs.Students.Requests;
using CollegeManagement.API.DTOs.Students.Responses;
using CollegeManagement.API.Repositories;

namespace CollegeManagement.API.Services
{
    public class StudentService : IStudentService
    {
        private readonly IStudentRepository _repository;
        private readonly Microsoft.AspNetCore.Hosting.IWebHostEnvironment? _environment;

        public StudentService(
            IStudentRepository repository,
            Microsoft.AspNetCore.Hosting.IWebHostEnvironment? environment = null)
        {
            _repository = repository;
            _environment = environment;
        }

        // =========================================================
        // STUDENT CRUD
        // =========================================================

        public async Task<List<StudentListItemDto>> GetAllAsync()
        {
            return await _repository.GetAllAsync();
        }

        public async Task<StudentResponse?> GetByIdAsync(int studentId)
        {
            return await _repository.GetByIdAsync(studentId);
        }

        public async Task<StudentResponse> CreateAsync(
            CreateStudentRequest request)
        {
            return await _repository.CreateAsync(request);
        }

        public async Task<StudentResponse?> UpdateAsync(
            int studentId,
            UpdateStudentRequest request)
        {
            return await _repository.UpdateAsync(studentId, request);
        }

        public async Task<bool> DeleteAsync(int studentId)
        {
            return await _repository.DeleteAsync(studentId);
        }


        // =========================================================
        // STUDENT PROFILE
        // =========================================================

        public async Task<StudentProfileDto?> GetProfileAsync(
            int studentId)
        {
            return await _repository.GetProfileAsync(studentId);
        }

        public async Task<StudentProfileDto?> UpdateProfileAsync(
            int studentId,
            StudentProfileDto request)
        {
            return await _repository.UpdateProfileAsync(
                studentId,
                request);
        }


        // =========================================================
        // ACADEMIC OPERATIONS
        // =========================================================

        public async Task<bool> ChangeSectionAsync(
            int studentId,
            ChangeSectionRequest request)
        {
            return await _repository.ChangeSectionAsync(
                studentId,
                request);
        }

        public async Task<bool> ChangeGroupAsync(
            int studentId,
            ChangeGroupRequest request)
        {
            return await _repository.ChangeGroupAsync(
                studentId,
                request);
        }

        public async Task<bool> TransferAsync(
            int studentId,
            TransferStudentRequest request)
        {
            return await _repository.TransferAsync(
                studentId,
                request);
        }


        // =========================================================
        // STUDENT STATUS
        // =========================================================

        public async Task<bool> SuspendAsync(
            int studentId,
            SuspendStudentRequest request)
        {
            return await _repository.SuspendAsync(
                studentId,
                request);
        }

        public async Task<bool> ActivateAsync(
            int studentId)
        {
            return await _repository.ActivateAsync(studentId);
        }


        // =========================================================
        // AUTHENTICATION
        // =========================================================

        public async Task<bool> ResetPasswordAsync(
            int studentId)
        {
            return await _repository.ResetPasswordAsync(studentId);
        }


        // =========================================================
        // DASHBOARD
        // =========================================================

        public async Task<StudentDashboardDto?> GetDashboardAsync(
            int studentId)
        {
            return await _repository.GetDashboardAsync(studentId);
        }


        // =========================================================
        // SEARCH STUDENTS
        // =========================================================

        public async Task<List<StudentListItemDto>> SearchAsync(
            string? search,
            int? boardId,
            int? academicYearId,
            int? academicLevelId,
            int? groupId,
            int? sectionId,
            bool? isActive)
        {
            return await _repository.SearchAsync(
                search,
                boardId,
                academicYearId,
                academicLevelId,
                groupId,
                sectionId,
                isActive);
        }


        // =========================================================
        // GET STUDENTS BY GROUP
        // =========================================================

        public async Task<List<StudentListItemDto>> GetByGroupAsync(
            int groupId)
        {
            return await _repository.GetByGroupAsync(groupId);
        }


        // =========================================================
        // GET STUDENTS BY SECTION
        // =========================================================

        public async Task<List<StudentListItemDto>> GetBySectionAsync(
            int sectionId)
        {
            return await _repository.GetBySectionAsync(sectionId);
        }


        // =========================================================
        // GET ACTIVE STUDENTS
        // =========================================================

        public async Task<List<StudentListItemDto>> GetActiveAsync()
        {
            return await _repository.GetActiveAsync();
        }


        // =========================================================
        // CHECK EMAIL EXISTS
        // =========================================================

        public async Task<bool> EmailExistsAsync(
            string email,
            int? excludeStudentId = null)
        {
            if (string.IsNullOrWhiteSpace(email))
                return false;

            return await _repository.EmailExistsAsync(
                email,
                excludeStudentId);
        }


        // =========================================================
        // CHECK MOBILE EXISTS
        // =========================================================

        public async Task<bool> MobileExistsAsync(
            string mobile,
            int? excludeStudentId = null)
        {
            if (string.IsNullOrWhiteSpace(mobile))
                return false;

            return await _repository.MobileExistsAsync(
                mobile,
                excludeStudentId);
        }

        // =========================================================
        // COMMON STUDENT PHOTO & DOCUMENT UPLOADS (CATEGORY B)
        // =========================================================

        private static readonly HashSet<string> AllowedImageExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".webp"
        };

        private static readonly HashSet<string> AllowedDocumentExtensions = new(StringComparer.OrdinalIgnoreCase)
        {
            ".pdf", ".jpg", ".jpeg", ".png"
        };

        private static readonly Dictionary<string, string> DocumentTypeToColumnMap = new(StringComparer.OrdinalIgnoreCase)
        {
            { "BirthCertificate", "BirthCertificate" },
            { "TransferCertificate", "TransferCertificate" },
            { "StudyCertificate", "StudyCertificate" },
            { "AadhaarDocument", "AadhaarDocument" },
            { "CommunityCertificate", "CommunityCertificate" },
            { "IncomeCertificate", "IncomeCertificate" },
            { "CasteCertificate", "CasteCertificate" },
            { "TenthCertificate", "TenthCertificate" },
            { "MarksMemo", "MarksMemo" }
        };

        public async Task<StudentPhotoUploadResultDto> UploadPhotoAsync(
            int studentId,
            Microsoft.AspNetCore.Http.IFormFile file,
            System.Threading.CancellationToken ct = default)
        {
            var student = await _repository.GetByIdAsync(studentId);
            if (student == null)
            {
                throw new KeyNotFoundException($"Student with ID {studentId} not found.");
            }

            if (file == null || file.Length == 0)
            {
                throw new ArgumentException("No photo file uploaded or file is empty.");
            }

            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(ext) || !AllowedImageExtensions.Contains(ext))
            {
                throw new ArgumentException("Invalid file format. Only JPG, JPEG, PNG, and WEBP image formats are supported.");
            }

            if (file.Length > 5 * 1024 * 1024)
            {
                throw new ArgumentException("Photo file size cannot exceed 5 MB.");
            }

            var uploadsFolder = Path.Combine(_environment?.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "student-photos");
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            var uniqueFileName = $"student_photo_{studentId}_{DateTime.UtcNow.Ticks}{ext}";
            var physicalPath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var stream = new FileStream(physicalPath, FileMode.Create))
            {
                await file.CopyToAsync(stream, ct);
            }

            var relativePath = $"/uploads/student-photos/{uniqueFileName}";
            await _repository.UpdatePhotoPathAsync(studentId, relativePath);

            return new StudentPhotoUploadResultDto
            {
                StudentId = studentId,
                Uploaded = true,
                PhotoUrl = relativePath,
                Message = "Student photo uploaded successfully."
            };
        }

        public async Task<StudentDocumentUploadResultDto> UploadDocumentAsync(
            int studentId,
            string documentType,
            Microsoft.AspNetCore.Http.IFormFile file,
            System.Threading.CancellationToken ct = default)
        {
            var student = await _repository.GetByIdAsync(studentId);
            if (student == null)
            {
                throw new KeyNotFoundException($"Student with ID {studentId} not found.");
            }

            if (string.IsNullOrWhiteSpace(documentType) || !DocumentTypeToColumnMap.TryGetValue(documentType.Trim(), out var targetColumn))
            {
                throw new ArgumentException($"Unsupported document type '{documentType}'. Supported types are: {string.Join(", ", DocumentTypeToColumnMap.Keys)}.");
            }

            if (file == null || file.Length == 0)
            {
                throw new ArgumentException("No document file uploaded or file is empty.");
            }

            var ext = Path.GetExtension(file.FileName);
            if (string.IsNullOrWhiteSpace(ext) || !AllowedDocumentExtensions.Contains(ext))
            {
                throw new ArgumentException("Invalid file format. Only PDF, JPG, JPEG, and PNG document formats are supported.");
            }

            if (file.Length > 10 * 1024 * 1024)
            {
                throw new ArgumentException("Document file size cannot exceed 10 MB.");
            }

            var uploadsFolder = Path.Combine(_environment?.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads", "student-documents");
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            var uniqueFileName = $"student_doc_{studentId}_{targetColumn}_{DateTime.UtcNow.Ticks}{ext}";
            var physicalPath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var stream = new FileStream(physicalPath, FileMode.Create))
            {
                await file.CopyToAsync(stream, ct);
            }

            var relativePath = $"/uploads/student-documents/{uniqueFileName}";
            await _repository.UpdateDocumentPathAsync(studentId, targetColumn, relativePath);

            return new StudentDocumentUploadResultDto
            {
                StudentId = studentId,
                DocumentType = targetColumn,
                Uploaded = true,
                DocumentUrl = relativePath,
                Message = $"{targetColumn} uploaded successfully."
            };
        }

    
        // =========================================================
        // SELF-SERVICE PROFILE & CREDENTIALS
        // =========================================================

        public async Task<StudentSelfProfileResponseDto?> GetSelfProfileAsync(int studentId)
        {
            if (studentId <= 0)
                throw new ArgumentException("Invalid student ID.");

            return await _repository.GetSelfProfileAsync(studentId);
        }

        public async Task<bool> UpdateSelfProfileAsync(int studentId, StudentSelfProfileDto request)
        {
            if (studentId <= 0)
                throw new ArgumentException("Invalid student ID.");

            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var student = await _repository.GetByIdAsync(studentId);
            if (student == null)
            {
                throw new KeyNotFoundException($"Student with ID {studentId} not found.");
            }

            return await _repository.UpdateSelfProfileAsync(studentId, request);
        }
    }
}