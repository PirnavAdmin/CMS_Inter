using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Staff
{
    public class CreateStaffTransferDto
    {
        [Required]
        public int StaffId { get; set; }

        [Required]
        public int ToCampusId { get; set; }

        public int? ToBoardId { get; set; }
        public string? ToBoardName { get; set; }

        public int? ToDepartmentId { get; set; }
        public string? ToDepartmentName { get; set; }

        public int? ToDesignationId { get; set; }
        public string? ToDesignationName { get; set; }

        public string TransferType { get; set; } = "Permanent"; // "Permanent", "Deputation", "Temporary"

        [Required]
        [StringLength(255)]
        public string Reason { get; set; } = string.Empty;

        [Required]
        public DateTime EffectiveDate { get; set; }

        public DateTime? RelievingDate { get; set; }

        public DateTime? JoiningDate { get; set; }

        public string? ApprovalRemarks { get; set; }

        // Teaching Staff Destination Allocations
        public int? AcademicYearId { get; set; }
        public string? AcademicYearName { get; set; }
        public int? AcademicLevelId { get; set; }
        public string? AcademicLevelName { get; set; }
        public int? GroupId { get; set; }
        public string? GroupName { get; set; }
        public int? SectionId { get; set; }
        public string? SectionName { get; set; }
        public List<int>? AllocatedSubjectIds { get; set; }
        public List<string>? AllocatedSubjectNames { get; set; }

        // Non-Teaching Staff Destination Role
        public int? RoleId { get; set; }
        public string? RoleName { get; set; }

        public bool AutoApprove { get; set; } = true;
    }

    public class ApproveStaffTransferDto
    {
        public string? ApprovalRemarks { get; set; }
        public DateTime? EffectiveDate { get; set; }
    }

    public class RejectStaffTransferDto
    {
        [Required]
        public string Remarks { get; set; } = string.Empty;
    }

    public class StaffTransferResponseDto
    {
        public int Id { get; set; }
        public string TransferOrderNumber { get; set; } = string.Empty;
        public int StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string StaffType { get; set; } = "Teaching";
        public int FromCampusId { get; set; }
        public string FromCampusName { get; set; } = string.Empty;
        public int ToCampusId { get; set; }
        public string ToCampusName { get; set; } = string.Empty;
        public int? FromDepartmentId { get; set; }
        public string? FromDepartmentName { get; set; }
        public int? ToDepartmentId { get; set; }
        public string? ToDepartmentName { get; set; }
        public int? FromDesignationId { get; set; }
        public string? FromDesignationName { get; set; }
        public int? ToDesignationId { get; set; }
        public string? ToDesignationName { get; set; }
        public int? ToBoardId { get; set; }
        public string? ToBoardName { get; set; }
        public List<string>? AllocatedSubjects { get; set; }
        public string TransferType { get; set; } = "Permanent";
        public string Reason { get; set; } = string.Empty;
        public int RequestedByUserId { get; set; }
        public string? RequestedByName { get; set; }
        public int? ApprovedByUserId { get; set; }
        public string? ApprovedByName { get; set; }
        public DateTime RequestDate { get; set; }
        public DateTime EffectiveDate { get; set; }
        public DateTime? RelievingDate { get; set; }
        public DateTime? JoiningDate { get; set; }
        public string Status { get; set; } = "PendingApproval";
        public string? ApprovalRemarks { get; set; }
        public int? GeneratedDocumentId { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class StaffTransferPreflightCheckDto
    {
        public int StaffId { get; set; }
        public string StaffName { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public int FromCampusId { get; set; }
        public string FromCampusName { get; set; } = string.Empty;
        public int PendingExamMarksCount { get; set; }
        public int PendingExamDutiesCount { get; set; }
        public int ActiveTimetableSlotsCount { get; set; }
        public List<string> Warnings { get; set; } = new();
        public bool CanProceed { get; set; } = true;
    }
}
