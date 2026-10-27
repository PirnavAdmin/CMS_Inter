using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using AutoMapper;
using CollegeManagement.API.DTOs.Staff;
using CollegeManagement.API.Models.Staff;

namespace CollegeManagement.API.Profiles
{
    public class StaffMappingProfile : Profile
    {
        public StaffMappingProfile()
        {
            // CreateStaffDto -> Staff Entity
            CreateMap<CreateStaffDto, Staff>()
                .ForMember(dest => dest.StaffType, opt => opt.MapFrom(src => string.IsNullOrWhiteSpace(src.StaffType) ? "Teaching" : src.StaffType))
                .ForMember(dest => dest.FacultyType, opt => opt.MapFrom(src => string.IsNullOrWhiteSpace(src.StaffType) ? "Teaching" : src.StaffType))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => string.IsNullOrWhiteSpace(src.Status) ? "Active" : src.Status))
                .ForMember(dest => dest.ProfileStatus, opt => opt.MapFrom(src => string.IsNullOrWhiteSpace(src.ProfileStatus) ? "PendingLink" : src.ProfileStatus))
                .ForMember(dest => dest.ProfileCompletionPercentage, opt => opt.MapFrom(src => src.ProfileCompletionPercentage ?? 30))
                .ForMember(dest => dest.JoiningDate, opt => opt.MapFrom(src => src.JoiningDate ?? (src.DateOfJoining ?? DateTime.UtcNow)))
                .ForMember(dest => dest.FatherOrHusbandName, opt => opt.MapFrom(src => src.FatherOrHusbandName ?? src.GuardianName))
                .ForMember(dest => dest.PanNumber, opt => opt.MapFrom(src => src.PanNumber ?? src.Pan))
                .ForMember(dest => dest.Pincode, opt => opt.MapFrom(src => src.Pincode ?? src.Pin))
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.IsDeleted, opt => opt.MapFrom(_ => false))
                .ForMember(dest => dest.DrivingLicenseExpiryDate, opt => opt.MapFrom(src => ParseNullableDate(src.DrivingLicenseExpiryDate)))
                .ForMember(dest => dest.PhotoPath, opt => opt.MapFrom(src => src.PhotoPath ?? src.Photo))
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.DesignationRef, opt => opt.Ignore())
                .ForMember(dest => dest.DepartmentRef, opt => opt.Ignore())
                .ForMember(dest => dest.BoardRef, opt => opt.Ignore());

            // UpdateStaffDto -> Staff Entity
            CreateMap<UpdateStaffDto, Staff>()
                .ForMember(dest => dest.StaffType, opt => opt.MapFrom(src => string.IsNullOrWhiteSpace(src.StaffType) ? "Teaching" : src.StaffType))
                .ForMember(dest => dest.FacultyType, opt => opt.MapFrom(src => string.IsNullOrWhiteSpace(src.StaffType) ? "Teaching" : src.StaffType))
                .ForMember(dest => dest.FatherOrHusbandName, opt => opt.MapFrom(src => src.FatherOrHusbandName ?? src.GuardianName))
                .ForMember(dest => dest.PanNumber, opt => opt.MapFrom(src => src.PanNumber ?? src.Pan))
                .ForMember(dest => dest.Pincode, opt => opt.MapFrom(src => src.Pincode ?? src.Pin))
                .ForMember(dest => dest.JoiningDate, opt => opt.MapFrom(src => src.JoiningDate ?? (src.DateOfJoining ?? DateTime.UtcNow)))
                .ForMember(dest => dest.DrivingLicenseExpiryDate, opt => opt.MapFrom(src => ParseNullableDate(src.DrivingLicenseExpiryDate)))
                .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.IsDeleted, opt => opt.Ignore())
                .ForMember(dest => dest.EmployeeId, opt => opt.Ignore())
                .ForMember(dest => dest.PhotoPath, opt => opt.MapFrom(src => src.PhotoPath ?? src.Photo))
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.DesignationRef, opt => opt.Ignore())
                .ForMember(dest => dest.DepartmentRef, opt => opt.Ignore())
                .ForMember(dest => dest.BoardRef, opt => opt.Ignore());

            // Staff Entity -> StaffResponseDto
            CreateMap<Staff, StaffResponseDto>()
                .ForMember(dest => dest.Department, opt => opt.MapFrom(src => src.DepartmentRef != null ? src.DepartmentRef.DepartmentName : src.Department))
                .ForMember(dest => dest.BoardName, opt => opt.MapFrom(src => src.BoardRef != null ? src.BoardRef.BoardName : src.BoardName))
                .ForMember(dest => dest.BoardCode, opt => opt.MapFrom(src => src.BoardRef != null ? src.BoardRef.BoardCode : (src.BoardName ?? string.Empty)))
                .ForMember(dest => dest.Designation, opt => opt.MapFrom(src => src.DesignationRef != null ? src.DesignationRef.Name : src.Designation))
                .ForMember(dest => dest.DepartmentSpecific, opt => opt.MapFrom(src => DeserializeDictionary(src.DepartmentSpecificJson)))
                .ForMember(dest => dest.AllocatedSubjects, opt => opt.MapFrom(src => src.StaffSubjectAllocations != null
                    ? src.StaffSubjectAllocations.Select(a => a.Subject != null ? a.Subject.SubjectName : string.Empty).Where(s => !string.IsNullOrWhiteSpace(s)).Distinct().ToList()
                    : new List<string>()))
                .ForMember(dest => dest.AssignedCampusIds, opt => opt.MapFrom(src => src.StaffCampusAssignments != null ? src.StaffCampusAssignments.Select(a => a.CampusId).ToList() : new List<int>()))
                .ForMember(dest => dest.AssignedCampuses, opt => opt.MapFrom(src => src.StaffCampusAssignments != null ? src.StaffCampusAssignments.Select(a => new { id = a.CampusId, name = a.Campus != null ? a.Campus.CampusName : "", code = a.Campus != null ? a.Campus.CampusCode : "" }).Cast<object>().ToList() : new List<object>()))
                .ForMember(dest => dest.AssignedBoardIds, opt => opt.MapFrom(src => src.StaffBoardAssignments != null ? src.StaffBoardAssignments.Select(a => a.BoardId).ToList() : new List<int>()))
                .ForMember(dest => dest.Documents, opt => opt.MapFrom(src => DeserializeDocuments(src.DocumentsJson)))
                .ForMember(dest => dest.AssignedBoards, opt => opt.MapFrom(src => src.StaffBoardAssignments != null ? src.StaffBoardAssignments.Select(a => new { id = a.BoardId, name = a.Board != null ? a.Board.BoardName : "", code = a.Board != null ? a.Board.BoardCode : "" }).Cast<object>().ToList() : new List<object>()));

            // Staff Entity -> StaffProfileFullDto
            CreateMap<Staff, StaffProfileFullDto>()
                .ForMember(dest => dest.Department, opt => opt.MapFrom(src => src.DepartmentRef != null ? src.DepartmentRef.DepartmentName : src.Department))
                .ForMember(dest => dest.BoardName, opt => opt.MapFrom(src => src.BoardRef != null ? src.BoardRef.BoardName : src.BoardName))
                .ForMember(dest => dest.BoardCode, opt => opt.MapFrom(src => src.BoardRef != null ? src.BoardRef.BoardCode : src.BoardName))
                .ForMember(dest => dest.Designation, opt => opt.MapFrom(src => src.DesignationRef != null ? src.DesignationRef.Name : src.Designation))
                .ForMember(dest => dest.DepartmentSpecific, opt => opt.MapFrom(src => DeserializeDictionary(src.DepartmentSpecificJson)))
                .ForMember(dest => dest.AllocatedSubjects, opt => opt.MapFrom(src => src.StaffSubjectAllocations != null
                    ? src.StaffSubjectAllocations.Select(a => a.Subject != null ? a.Subject.SubjectName : string.Empty).Where(s => !string.IsNullOrWhiteSpace(s)).Distinct().ToList()
                    : new List<string>()))
                .ForMember(dest => dest.AssignedCampusIds, opt => opt.MapFrom(src => src.StaffCampusAssignments != null ? src.StaffCampusAssignments.Select(a => a.CampusId).ToList() : new List<int>()))
                .ForMember(dest => dest.AssignedCampuses, opt => opt.MapFrom(src => src.StaffCampusAssignments != null ? src.StaffCampusAssignments.Select(a => new { id = a.CampusId, name = a.Campus != null ? a.Campus.CampusName : "", code = a.Campus != null ? a.Campus.CampusCode : "" }).Cast<object>().ToList() : new List<object>()))
                .ForMember(dest => dest.AssignedBoardIds, opt => opt.MapFrom(src => src.StaffBoardAssignments != null ? src.StaffBoardAssignments.Select(a => a.BoardId).ToList() : new List<int>()))
                .ForMember(dest => dest.AssignedBoards, opt => opt.MapFrom(src => src.StaffBoardAssignments != null ? src.StaffBoardAssignments.Select(a => new { id = a.BoardId, name = a.Board != null ? a.Board.BoardName : "", code = a.Board != null ? a.Board.BoardCode : "" }).Cast<object>().ToList() : new List<object>()))
                .ForMember(dest => dest.EducationList, opt => opt.MapFrom(src => DeserializeList<StaffEducationItem>(src.EducationJson)))
                .ForMember(dest => dest.ExperienceList, opt => opt.MapFrom(src => DeserializeList<StaffExperienceItem>(src.ExperienceJson)))
                .ForMember(dest => dest.DocumentsList, opt => opt.MapFrom(src => DeserializeDocuments(src.DocumentsJson)))
                .ForMember(dest => dest.BankDetails, opt => opt.MapFrom(src => DeserializeObject<StaffBankDetails>(src.BankDetailsJson) ?? new StaffBankDetails()))
                .ForMember(dest => dest.EmergencyContact, opt => opt.MapFrom(src => DeserializeObject<StaffEmergencyContact>(src.EmergencyContactJson) ?? new StaffEmergencyContact()))
                .ForMember(dest => dest.PhotoUrl, opt => opt.MapFrom(src => src.PhotoPath));

            // StaffDocumentItem <-> StaffDocumentPayloadItem Type Maps
            CreateMap<StaffDocumentItem, StaffDocumentPayloadItem>()
                .ForMember(dest => dest.id, opt => opt.MapFrom(src => src.DocumentType))
                .ForMember(dest => dest.type, opt => opt.MapFrom(src => src.DocumentType))
                .ForMember(dest => dest.name, opt => opt.MapFrom(src => !string.IsNullOrEmpty(src.DocumentName) ? src.DocumentName : src.FileName))
                .ForMember(dest => dest.url, opt => opt.MapFrom(src => src.FilePath))
                .ForMember(dest => dest.format, opt => opt.MapFrom(src => src.FileType))
                .ForMember(dest => dest.size, opt => opt.MapFrom(src => src.FileSizeBytes > 0 ? src.FileSizeBytes.ToString() : null));

            CreateMap<StaffDocumentPayloadItem, StaffDocumentItem>()
                .ForMember(dest => dest.DocumentType, opt => opt.MapFrom(src => src.type ?? src.id ?? "Other"))
                .ForMember(dest => dest.DocumentName, opt => opt.MapFrom(src => src.name ?? string.Empty))
                .ForMember(dest => dest.FileName, opt => opt.MapFrom(src => src.name ?? string.Empty))
                .ForMember(dest => dest.FilePath, opt => opt.MapFrom(src => src.url ?? string.Empty))
                .ForMember(dest => dest.FileType, opt => opt.MapFrom(src => src.format ?? string.Empty))
                .ForMember(dest => dest.FileSizeBytes, opt => opt.MapFrom(src => ParseFileSize(src.size)))
                .ForMember(dest => dest.UploadedAt, opt => opt.MapFrom(_ => DateTime.UtcNow));

            // AssignStaffSubjectDto -> StaffSubjectAllocation Entity
            CreateMap<AssignStaffSubjectDto, StaffSubjectAllocation>()
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
                .ForMember(dest => dest.Id, opt => opt.Ignore());

            // UpdateStaffSubjectAllocationDto -> StaffSubjectAllocation Entity
            CreateMap<UpdateStaffSubjectAllocationDto, StaffSubjectAllocation>()
                .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.UtcNow))
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.StaffId, opt => opt.Ignore());

            // StaffSubjectAllocation Entity -> StaffSubjectAllocationResponseDto
            CreateMap<StaffSubjectAllocation, StaffSubjectAllocationResponseDto>()
                .ForMember(dest => dest.StaffId, opt => opt.MapFrom(src => src.StaffId))
                .ForMember(dest => dest.StaffName, opt => opt.MapFrom(src => src.Staff != null ? $"{src.Staff.FirstName} {src.Staff.LastName}".Trim() : string.Empty))
                .ForMember(dest => dest.FacultyName, opt => opt.MapFrom(src => src.Staff != null ? $"{src.Staff.FirstName} {src.Staff.LastName}".Trim() : string.Empty))
                .ForMember(dest => dest.EmployeeId, opt => opt.MapFrom(src => src.Staff != null ? (src.Staff.EmployeeId ?? string.Empty) : string.Empty))
                .ForMember(dest => dest.AcademicYearId, opt => opt.MapFrom(src => src.AcademicYearId))
                .ForMember(dest => dest.SubjectId, opt => opt.MapFrom(src => src.SubjectId))
                .ForMember(dest => dest.SubjectCode, opt => opt.MapFrom(src => src.Subject != null ? src.Subject.SubjectCode : string.Empty))
                .ForMember(dest => dest.SubjectName, opt => opt.MapFrom(src => src.Subject != null ? src.Subject.SubjectName : string.Empty))
                .ForMember(dest => dest.BoardId, opt => opt.MapFrom(src => src.Subject != null ? src.Subject.BoardId : 0))
                .ForMember(dest => dest.BoardName, opt => opt.MapFrom(src => src.Subject != null ? (src.Subject.BoardName ?? string.Empty) : string.Empty))
                .ForMember(dest => dest.GroupId, opt => opt.MapFrom(src => src.Subject != null ? src.Subject.GroupId : 0))
                .ForMember(dest => dest.GroupName, opt => opt.MapFrom(src => src.Subject != null ? (src.Subject.GroupName ?? string.Empty) : string.Empty))
                .ForMember(dest => dest.AcademicLevelId, opt => opt.MapFrom(src => src.Subject != null ? src.Subject.AcademicLevelId : 0))
                .ForMember(dest => dest.AcademicLevelName, opt => opt.MapFrom(src => src.Subject != null ? (src.Subject.AcademicLevelName ?? string.Empty) : string.Empty))
                .ForMember(dest => dest.MaxWeeklyHours, opt => opt.MapFrom(src => src.MaxWeeklyHours > 0 ? src.MaxWeeklyHours : 18))
                .ForMember(dest => dest.IsActive, opt => opt.MapFrom(src => src.IsActive))
                .ForMember(dest => dest.Status, opt => opt.MapFrom(src => "Allocated"));
        }

        private static List<T> DeserializeList<T>(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<T>();
            try
            {
                return JsonSerializer.Deserialize<List<T>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<T>();
            }
            catch
            {
                return new List<T>();
            }
        }

        private static T? DeserializeObject<T>(string? json) where T : class
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            try
            {
                return JsonSerializer.Deserialize<T>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch
            {
                return null;
            }
        }

        private static Dictionary<string, object>? DeserializeDictionary(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new Dictionary<string, object>();
            try
            {
                return JsonSerializer.Deserialize<Dictionary<string, object>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new Dictionary<string, object>();
            }
            catch
            {
                return new Dictionary<string, object>();
            }
        }

        private static DateTime? ParseNullableDate(string? dateStr)
        {
            return !string.IsNullOrWhiteSpace(dateStr) && DateTime.TryParse(dateStr, out var d) ? d : null;
        }

        private static List<StaffDocumentPayloadItem> DeserializeDocuments(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return new List<StaffDocumentPayloadItem>();
            try
            {
                var payloadItems = JsonSerializer.Deserialize<List<StaffDocumentPayloadItem>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (payloadItems != null && payloadItems.Any(p => !string.IsNullOrEmpty(p.type) || !string.IsNullOrEmpty(p.url) || !string.IsNullOrEmpty(p.name)))
                {
                    return payloadItems;
                }

                var docItems = JsonSerializer.Deserialize<List<StaffDocumentItem>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (docItems != null && docItems.Any())
                {
                    return docItems.Select(d => new StaffDocumentPayloadItem
                    {
                        id = d.DocumentType,
                        type = d.DocumentType,
                        name = !string.IsNullOrEmpty(d.DocumentName) ? d.DocumentName : d.FileName,
                        url = d.FilePath,
                        format = d.FileType,
                        size = d.FileSizeBytes > 0 ? d.FileSizeBytes.ToString() : null
                    }).ToList();
                }

                return payloadItems ?? new List<StaffDocumentPayloadItem>();
            }
            catch
            {
                return new List<StaffDocumentPayloadItem>();
            }
        }

        private static long ParseFileSize(string? sizeStr)
        {
            if (string.IsNullOrWhiteSpace(sizeStr)) return 0;
            if (long.TryParse(sizeStr, out var bytes)) return bytes;
            return 0;
        }
    }
}