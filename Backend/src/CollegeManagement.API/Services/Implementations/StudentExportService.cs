using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Students;
using CollegeManagement.API.Services.Exports;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;

namespace CollegeManagement.API.Services.Implementations
{
    public class StudentExportService : IStudentExportService
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment? _environment;
        private readonly Microsoft.Extensions.Configuration.IConfiguration? _configuration;

        public StudentExportService(
            AppDbContext context,
            IWebHostEnvironment? environment = null,
            Microsoft.Extensions.Configuration.IConfiguration? configuration = null)
        {
            _context = context;
            _environment = environment;
            _configuration = configuration;
        }

        public async Task<(byte[] PdfBytes, string FileName)> ExportStudentProfilePdfAsync(int studentId, CancellationToken ct = default)
        {
            if (studentId <= 0)
                throw new ArgumentException("Invalid student ID.");

            var student = await _context.Students
                .AsNoTracking()
                .Include(s => s.BoardNavigation)
                .Include(s => s.AcademicYear)
                .Include(s => s.AcademicLevelNavigation)
                .Include(s => s.GroupNavigation)
                .Include(s => s.ProgramNavigation)
                .Include(s => s.SectionNavigation)
                .FirstOrDefaultAsync(s => s.StudentId == studentId, ct);

            if (student == null)
            {
                throw new KeyNotFoundException("Student not found.");
            }

            // Resolve Photo if exists and accessible
            byte[]? photoBytes = null;
            if (!string.IsNullOrWhiteSpace(student.Photo))
            {
                try
                {
                    string cleanPhotoPath = student.Photo.TrimStart('/', '\\');
                    string? candidatePath = null;

                    if (_environment != null && !string.IsNullOrWhiteSpace(_environment.WebRootPath))
                    {
                        var p = Path.Combine(_environment.WebRootPath, cleanPhotoPath);
                        if (File.Exists(p)) candidatePath = p;
                    }

                    if (candidatePath == null)
                    {
                        var baseWwwRoot = Path.Combine(AppContext.BaseDirectory, "wwwroot", cleanPhotoPath);
                        if (File.Exists(baseWwwRoot)) candidatePath = baseWwwRoot;
                    }

                    if (candidatePath == null && File.Exists(student.Photo))
                    {
                        candidatePath = student.Photo;
                    }

                    if (candidatePath != null && File.Exists(candidatePath))
                    {
                        photoBytes = await File.ReadAllBytesAsync(candidatePath, ct);
                    }
                }
                catch
                {
                    photoBytes = null;
                }
            }

            var model = new StudentProfilePdfModel
            {
                StudentId = student.StudentId,
                AdmissionNo = string.IsNullOrWhiteSpace(student.AdmissionNo) ? $"ADM-{student.StudentId}" : student.AdmissionNo,
                RollNo = string.IsNullOrWhiteSpace(student.RollNo) ? "N/A" : student.RollNo,
                AdmissionDate = student.AdmissionDate,
                AdmissionType = student.AdmissionType,
                AdmissionQuota = student.AdmissionQuota,
                Medium = student.Medium,
                SecondLanguage = student.SecondLanguage,

                StudentName = student.StudentName,
                PhotoBytes = photoBytes,
                Gender = student.Gender,
                DateOfBirth = student.DateOfBirth,
                BloodGroup = student.BloodGroup,
                Email = student.Email,
                MobileNumber = student.MobileNumber,
                AadhaarNumber = student.AadhaarNumber,
                Nationality = student.Nationality,
                Religion = student.Religion,
                Category = student.Category,

                Address = student.Address,
                City = student.City,
                District = student.District,
                State = student.State,
                Pincode = student.Pincode,

                BoardId = student.BoardId,
                BoardName = student.BoardNavigation?.BoardName ?? "N/A",
                AcademicYearId = student.AcademicYearId,
                AcademicYearName = student.AcademicYear?.AcademicYearName ?? "N/A",
                AcademicLevelId = student.AcademicLevelId,
                AcademicLevelName = student.AcademicLevelNavigation?.LevelName ?? "N/A",
                GroupId = student.GroupId,
                GroupName = student.GroupNavigation?.GroupName ?? "N/A",
                ProgramId = student.ProgramId,
                ProgramName = student.ProgramNavigation?.ProgramName ?? "N/A",
                SectionId = student.SectionId,
                SectionName = student.SectionNavigation?.SectionName ?? "N/A",

                FatherName = student.FatherName,
                FatherOccupation = student.FatherOccupation,
                FatherMobile = student.FatherMobile,
                FatherEmail = student.FatherEmail,

                MotherName = student.MotherName,
                MotherOccupation = student.MotherOccupation,
                MotherMobile = student.MotherMobile,
                MotherEmail = student.MotherEmail,

                GuardianName = student.GuardianName,
                GuardianMobile = student.GuardianMobile,
                GuardianEmail = student.GuardianEmail,
                AnnualIncome = student.AnnualIncome,

                PreviousSchool = student.PreviousSchool,
                PreviousBoard = student.PreviousBoard,
                PreviousHallTicketNumber = student.PreviousHallTicketNumber,
                PreviousYearOfPassing = student.PreviousYearOfPassing,
                PreviousPercentage = student.PreviousPercentage,

                Status = string.IsNullOrWhiteSpace(student.Status) ? (student.IsActive ? "Active" : "Inactive") : student.Status,
                IsActive = student.IsActive,
                Remarks = student.Remarks,
                GeneratedAt = DateTime.UtcNow
            };

            var document = new StudentProfilePdfDocument(model);
            byte[] pdfBytes = document.GeneratePdf();

            string safeAdmissionNo = SanitizeForFilename(model.AdmissionNo);
            string safeStudentName = SanitizeForFilename(model.StudentName);
            string fileName = $"Student_{safeAdmissionNo}_{safeStudentName}.pdf";

            return (pdfBytes, fileName);
        }

        public async Task<(byte[] PdfBytes, string FileName)> ExportStudentCredentialSlipPdfAsync(int studentId, CancellationToken ct = default)
        {
            if (studentId <= 0)
                throw new ArgumentException("Invalid student ID.");

            var student = await _context.Students
                .AsNoTracking()
                .Include(s => s.BoardNavigation)
                .Include(s => s.AcademicYear)
                .Include(s => s.AcademicLevelNavigation)
                .Include(s => s.GroupNavigation)
                .Include(s => s.ProgramNavigation)
                .Include(s => s.SectionNavigation)
                .FirstOrDefaultAsync(s => s.StudentId == studentId, ct);

            if (student == null)
            {
                throw new KeyNotFoundException("Student not found.");
            }

            // Credential PDF is for INITIAL ONBOARDING only.
            // Allow credential PDF generation only while IsFirstLogin = 1.
            // If IsFirstLogin = 0, reject with clear error message.
            if (!student.IsFirstLogin)
            {
                throw new InvalidOperationException("Initial credential has already been consumed. Student password has already been changed.");
            }

            var initialPassword = "Sent to registered email";

            var model = new StudentIndividualCredentialSlipModel
            {
                StudentId = student.StudentId,
                StudentName = student.StudentName,
                AdmissionNo = string.IsNullOrWhiteSpace(student.AdmissionNo) ? $"ADM-{student.StudentId}" : student.AdmissionNo,
                RollNo = student.RollNo,
                DateOfBirth = student.DateOfBirth,
                Gender = student.Gender,
                MobileNumber = student.MobileNumber,
                Email = student.Email,
                BoardName = student.BoardNavigation?.BoardName ?? "Board of Intermediate Education",
                AcademicYearName = student.AcademicYear?.AcademicYearName ?? "Current Academic Year",
                AcademicLevelName = student.AcademicLevelNavigation?.LevelName ?? "Academic Level",
                GroupName = student.GroupNavigation?.GroupName ?? "Group Stream",
                ProgramName = student.ProgramNavigation?.ProgramName,
                SectionName = student.SectionNavigation?.SectionName,
                InstitutionName = _configuration?["InstitutionSettings:InstitutionName"] ?? "College Management System",
                PortalLoginUrl = _configuration?["StudentPortal:LoginUrl"]
                              ?? _configuration?["InstitutionSettings:PortalUrl"]
                              ?? _configuration?["AppSettings:StudentPortalUrl"]
                              ?? "http://localhost:5173",
                LoginId = string.IsNullOrWhiteSpace(student.AdmissionNo) ? $"ADM-{student.StudentId}" : student.AdmissionNo,
                InitialPassword = initialPassword,
                IsFirstLogin = student.IsFirstLogin,
                GeneratedAt = DateTime.UtcNow
            };

            var document = new StudentIndividualCredentialSlipDocument(model);
            byte[] pdfBytes = document.GeneratePdf();

            string safeAdmissionNo = SanitizeForFilename(model.AdmissionNo);
            string safeStudentName = SanitizeForFilename(model.StudentName);
            string fileName = $"CredentialSlip_{safeAdmissionNo}_{safeStudentName}.pdf";

            return (pdfBytes, fileName);
        }
        public async Task<(byte[] ExcelBytes, string FileName)> ExportStudentsToExcelAsync(StudentExportFilterDto filter, CancellationToken ct = default)
        {
            filter ??= new StudentExportFilterDto();

            // 1. Hierarchy Validation
            string? resolvedBoardName = null;
            string? resolvedLevelName = null;
            string? resolvedYearName = null;
            string? resolvedGroupName = null;
            string? resolvedGroupFileLabel = null;
            string? resolvedProgramName = null;
            string? resolvedSectionName = null;

            if (filter.BoardId.HasValue && filter.BoardId.Value > 0)
            {
                var b = await _context.Boards.FirstOrDefaultAsync(x => x.BoardId == filter.BoardId.Value && x.IsActive, ct);
                if (b == null) throw new ArgumentException($"Invalid or inactive Board ID {filter.BoardId.Value}.");
                resolvedBoardName = b.BoardName;
            }

            if (filter.AcademicLevelId.HasValue && filter.AcademicLevelId.Value > 0)
            {
                var l = await _context.AcademicLevels.FirstOrDefaultAsync(x => x.AcademicLevelId == filter.AcademicLevelId.Value && x.IsActive, ct);
                if (l == null) throw new ArgumentException($"Invalid or inactive Academic Level ID {filter.AcademicLevelId.Value}.");
                resolvedLevelName = l.LevelName;
            }

            if (filter.AcademicYearId.HasValue && filter.AcademicYearId.Value > 0)
            {
                var y = await _context.AcademicYears.FirstOrDefaultAsync(x => x.AcademicYearId == filter.AcademicYearId.Value && x.IsActive, ct);
                if (y == null) throw new ArgumentException($"Invalid or inactive Academic Year ID {filter.AcademicYearId.Value}.");
                resolvedYearName = y.AcademicYearName;
            }

            if (filter.GroupId.HasValue && filter.GroupId.Value > 0)
            {
                var g = await _context.Groups.FirstOrDefaultAsync(x => x.GroupId == filter.GroupId.Value && x.IsActive, ct);
                if (g == null) throw new ArgumentException($"Invalid or inactive Group ID {filter.GroupId.Value}.");

                if (filter.BoardId.HasValue && filter.BoardId.Value > 0 && g.BoardId != filter.BoardId.Value)
                    throw new ArgumentException($"Group '{g.GroupName}' does not belong to Board ID {filter.BoardId.Value}.");

                if (filter.AcademicLevelId.HasValue && filter.AcademicLevelId.Value > 0 && g.AcademicLevelId != filter.AcademicLevelId.Value)
                    throw new ArgumentException($"Group '{g.GroupName}' does not belong to Academic Level ID {filter.AcademicLevelId.Value}.");

                resolvedGroupName = g.GroupName;
                resolvedGroupFileLabel = !string.IsNullOrWhiteSpace(g.GroupCode) ? g.GroupCode : g.GroupName;
            }

            if (filter.ProgramId.HasValue && filter.ProgramId.Value > 0)
            {
                var p = await _context.Programs.FirstOrDefaultAsync(x => x.ProgramId == filter.ProgramId.Value && x.IsActive, ct);
                if (p == null) throw new ArgumentException($"Invalid or inactive Program ID {filter.ProgramId.Value}.");

                if (filter.GroupId.HasValue && filter.GroupId.Value > 0)
                {
                    bool hasGroupPrograms = await _context.GroupPrograms.AnyAsync(gp => gp.GroupId == filter.GroupId.Value, ct);
                    if (hasGroupPrograms)
                    {
                        bool isMapped = await _context.GroupPrograms.AnyAsync(gp => gp.GroupId == filter.GroupId.Value && gp.ProgramId == filter.ProgramId.Value && gp.IsActive, ct);
                        if (!isMapped)
                            throw new ArgumentException($"Program '{p.ProgramName}' (ID: {p.ProgramId}) does not belong to Group '{resolvedGroupName ?? filter.GroupId.Value.ToString()}'.");
                    }
                    else
                    {
                        bool hasSection = await _context.Sections.AnyAsync(s => s.GroupId == filter.GroupId.Value && s.ProgramId == filter.ProgramId.Value && s.IsActive, ct);
                        if (!hasSection)
                        {
                            bool hasStudents = await _context.Students.AnyAsync(s => s.GroupId == filter.GroupId.Value && s.ProgramId == filter.ProgramId.Value && s.IsActive, ct);
                            if (!hasStudents)
                                throw new ArgumentException($"Program '{p.ProgramName}' (ID: {p.ProgramId}) is not associated with Group ID {filter.GroupId.Value}.");
                        }
                    }
                }

                resolvedProgramName = p.ProgramName;
            }

            if (filter.SectionId.HasValue && filter.SectionId.Value > 0)
            {
                var sec = await _context.Sections.FirstOrDefaultAsync(x => x.SectionId == filter.SectionId.Value && x.IsActive, ct);
                if (sec == null) throw new ArgumentException($"Invalid or inactive Section ID {filter.SectionId.Value}.");

                if (filter.GroupId.HasValue && filter.GroupId.Value > 0 && sec.GroupId != filter.GroupId.Value)
                    throw new ArgumentException($"Section '{sec.SectionName}' (ID: {sec.SectionId}) does not belong to Group ID {filter.GroupId.Value}.");

                if (filter.ProgramId.HasValue && filter.ProgramId.Value > 0 && sec.ProgramId != filter.ProgramId.Value)
                    throw new ArgumentException($"Section '{sec.SectionName}' (ID: {sec.SectionId}) does not belong to Program ID {filter.ProgramId.Value}.");

                if (filter.AcademicLevelId.HasValue && filter.AcademicLevelId.Value > 0 && sec.AcademicLevelId != filter.AcademicLevelId.Value)
                    throw new ArgumentException($"Section '{sec.SectionName}' (ID: {sec.SectionId}) does not belong to Academic Level ID {filter.AcademicLevelId.Value}.");

                if (filter.BoardId.HasValue && filter.BoardId.Value > 0 && sec.BoardId != filter.BoardId.Value)
                    throw new ArgumentException($"Section '{sec.SectionName}' (ID: {sec.SectionId}) does not belong to Board ID {filter.BoardId.Value}.");

                if (filter.AcademicYearId.HasValue && filter.AcademicYearId.Value > 0 && sec.AcademicYearId != filter.AcademicYearId.Value)
                    throw new ArgumentException($"Section '{sec.SectionName}' (ID: {sec.SectionId}) does not belong to Academic Year ID {filter.AcademicYearId.Value}.");

                resolvedSectionName = sec.SectionName;
            }

            // 2. Query Students via Single Efficient LINQ Query
            var query = _context.Students
                .AsNoTracking()
                .Include(s => s.BoardNavigation)
                .Include(s => s.AcademicYear)
                .Include(s => s.AcademicLevelNavigation)
                .Include(s => s.GroupNavigation)
                .Include(s => s.ProgramNavigation)
                .Include(s => s.SectionNavigation)
                .AsQueryable();

            bool hasAnyFilter = false;

            if (filter.BoardId.HasValue && filter.BoardId.Value > 0)
            {
                query = query.Where(s => s.BoardId == filter.BoardId.Value);
                hasAnyFilter = true;
            }

            if (filter.AcademicLevelId.HasValue && filter.AcademicLevelId.Value > 0)
            {
                query = query.Where(s => s.AcademicLevelId == filter.AcademicLevelId.Value);
                hasAnyFilter = true;
            }

            if (filter.AcademicYearId.HasValue && filter.AcademicYearId.Value > 0)
            {
                query = query.Where(s => s.AcademicYearId == filter.AcademicYearId.Value);
                hasAnyFilter = true;
            }

            if (filter.GroupId.HasValue && filter.GroupId.Value > 0)
            {
                query = query.Where(s => s.GroupId == filter.GroupId.Value);
                hasAnyFilter = true;
            }

            if (filter.ProgramId.HasValue && filter.ProgramId.Value > 0)
            {
                query = query.Where(s => s.ProgramId == filter.ProgramId.Value);
                hasAnyFilter = true;
            }

            if (filter.SectionId.HasValue && filter.SectionId.Value > 0)
            {
                query = query.Where(s => s.SectionId == filter.SectionId.Value);
                hasAnyFilter = true;
            }

            if (!string.IsNullOrWhiteSpace(filter.Status))
            {
                query = query.Where(s => s.Status.ToLower() == filter.Status.Trim().ToLower());
                hasAnyFilter = true;
            }

            if (filter.IsActive.HasValue)
            {
                query = query.Where(s => s.IsActive == filter.IsActive.Value);
                hasAnyFilter = true;
            }

            // Predictable Order: Group, Program, Section, RollNo, StudentName
            var studentList = await query
                .OrderBy(s => s.GroupNavigation != null ? s.GroupNavigation.GroupName : "")
                .ThenBy(s => s.ProgramNavigation != null ? s.ProgramNavigation.ProgramName : "")
                .ThenBy(s => s.SectionNavigation != null ? s.SectionNavigation.SectionName : "")
                .ThenBy(s => s.RollNo)
                .ThenBy(s => s.StudentName)
                .ToListAsync(ct);

            // 3. Map into Export Model
            var exportModel = new StudentExcelExportModel
            {
                GeneratedAt = DateTime.UtcNow,
                BoardName = resolvedBoardName,
                AcademicLevelName = resolvedLevelName,
                AcademicYearName = resolvedYearName,
                GroupName = resolvedGroupName,
                ProgramName = resolvedProgramName,
                SectionName = resolvedSectionName,
                Status = filter.Status,
                IsActive = filter.IsActive,
                HasAnyFilter = hasAnyFilter
            };

            int sno = 1;
            foreach (var s in studentList)
            {
                exportModel.Students.Add(new StudentExcelRowModel
                {
                    SNo = sno++,
                    StudentId = s.StudentId,
                    StudentName = s.StudentName,
                    AdmissionNo = s.AdmissionNo ?? $"ADM-{s.StudentId}",
                    RollNo = string.IsNullOrWhiteSpace(s.RollNo) ? "N/A" : s.RollNo,
                    Gender = s.Gender,
                    DateOfBirth = s.DateOfBirth != default ? s.DateOfBirth : (DateTime?)null,
                    BloodGroup = s.BloodGroup,
                    MobileNumber = s.MobileNumber,
                    Email = s.Email,
                    BoardName = s.BoardNavigation?.BoardName ?? "N/A",
                    AcademicYearName = s.AcademicYear?.AcademicYearName ?? "N/A",
                    AcademicLevelName = s.AcademicLevelNavigation?.LevelName ?? "N/A",
                    GroupName = s.GroupNavigation?.GroupName ?? "N/A",
                    ProgramName = s.ProgramNavigation?.ProgramName ?? "N/A",
                    SectionName = s.SectionNavigation?.SectionName ?? "N/A",
                    Status = string.IsNullOrWhiteSpace(s.Status) ? (s.IsActive ? "Active" : "Inactive") : s.Status,
                    IsActive = s.IsActive
                });
            }

            // 4. Build ClosedXML Workbook
            byte[] excelBytes = StudentExcelWorkbookBuilder.BuildWorkbook(exportModel);

            // 5. Build Dynamic Sanitized Filename
            string fileName;
            if (!hasAnyFilter)
            {
                fileName = "Students_All.xlsx";
            }
            else
            {
                var parts = new List<string> { "Students" };
                if (!string.IsNullOrWhiteSpace(resolvedGroupFileLabel)) parts.Add(resolvedGroupFileLabel);
                if (!string.IsNullOrWhiteSpace(resolvedProgramName)) parts.Add(resolvedProgramName);
                if (!string.IsNullOrWhiteSpace(resolvedSectionName)) parts.Add(resolvedSectionName);
                if (!string.IsNullOrWhiteSpace(resolvedYearName) && string.IsNullOrWhiteSpace(resolvedGroupFileLabel)) parts.Add(resolvedYearName);
                if (!string.IsNullOrWhiteSpace(filter.Status) && string.IsNullOrWhiteSpace(resolvedGroupFileLabel)) parts.Add(filter.Status);

                string combined = string.Join("_", parts);
                fileName = $"{SanitizeForFilename(combined)}.xlsx";
            }

            return (excelBytes, fileName);
        }

        private static string SanitizeForFilename(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return "Student";

            var invalidChars = Path.GetInvalidFileNameChars();
            var sanitized = new string(input.Select(ch => invalidChars.Contains(ch) || char.IsWhiteSpace(ch) ? '_' : ch).ToArray());
            sanitized = Regex.Replace(sanitized, @"_+", "_").Trim('_');
            return string.IsNullOrWhiteSpace(sanitized) ? "Student" : sanitized;
        }
    }
}
