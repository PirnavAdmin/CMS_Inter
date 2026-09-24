using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.StudentAdmission
{
    public class StudentAdmissionResponseDto
    {
        public int AdmissionId { get; set; }

        public string? AdmissionNo { get; set; }

        public DateTime AdmissionDate { get; set; }

        public string? AdmissionType { get; set; }

        public string? AdmissionQuota { get; set; }


        // Academic Relations
        public int? CampusId { get; set; } public int? AdmittedById { get; set; } public string? AdmittedByName { get; set; }
        public string? CampusName { get; set; }

        public int BoardId { get; set; }

        public string? BoardName { get; set; }

        public int AcademicYearId { get; set; }

        public string? AcademicYearName { get; set; }

        public int AcademicLevelId { get; set; }

        public string? AcademicLevelName { get; set; }

        public int GroupId { get; set; }

        public string? GroupName { get; set; }

        public int ProgramId { get; set; }

        public string? ProgramName { get; set; }


        // Student

        public string? FirstName { get; set; }

        public string? LastName { get; set; }

        public string? Gender { get; set; }

        public DateTime? DateOfBirth { get; set; }

        public string? BloodGroup { get; set; }
        [FromForm(Name = "Email")]
        public string? StudentEmail { get; set; }

        [FromForm(Name = "Student Mobile")]
        public string? StudentMobileNumber { get; set; }

        public string? StudentPhoto { get; set; }


        // Personal

        public string? AadhaarNumber { get; set; }

        public string? Nationality { get; set; }

        public string? Religion { get; set; }

        public string? Category { get; set; }


        // Father

        public string? FatherName { get; set; }

        public string? FatherOccupation { get; set; }

        public string? FatherMobile { get; set; }

        public string? FatherEmail { get; set; }


        // Mother

        public string? MotherName { get; set; }

        public string? MotherOccupation { get; set; }

        public string? MotherMobile { get; set; }

        public string? MotherEmail { get; set; }


        // Guardian

        public string? GuardianName { get; set; }

        public string? GuardianMobile { get; set; }

        public string? GuardianEmail { get; set; }


        // Other

        public decimal? AnnualIncome { get; set; }

        public string? ScholarshipStatus { get; set; }

        public string? Medium { get; set; }

        public string? SecondLanguage { get; set; }


        // Address

        public string? HouseDoorNumber { get; set; }

        public string? StreetVillage { get; set; }
        public string? City { get; set; }

        public string? District { get; set; }

        public string? State { get; set; }

        public string? Pincode { get; set; }


        // Previous Education

        public string? PreviousSchool { get; set; }

        public string? PreviousBoard { get; set; }

        public decimal? PreviousPercentage { get; set; }

        public int? PreviousYearOfPassing { get; set; }


        // Admission Status

        public string? Status { get; set; }

        public bool IsVerified { get; set; }

        public bool IsApproved { get; set; }

        public bool IsRejected { get; set; }

        public string? RejectionReason { get; set; }

        public string? Remarks { get; set; }

        public bool IsActive { get; set; }

        public DateTime CreatedAt { get; set; }

        public DateTime? UpdatedAt { get; set; }


        // =====================================================
        // ALLOCATION - populated only after approval
        // =====================================================

        public int? SectionId { get; set; }

        public string? SectionName { get; set; }

        public string? RollNo { get; set; }

        // Residential & Transport Allocation
        public string? StudentType { get; set; }
        public bool? TransportRequired { get; set; }
        public string? BusType { get; set; }
        public int? RouteId { get; set; }
        public string? BusRoute { get; set; }
        public int? PickupPointId { get; set; }
        public string? PickupPoint { get; set; }
        public int? HostelId { get; set; }
        public string? HostelBlock { get; set; }
        public int? RoomId { get; set; }
        public string? HostelRoom { get; set; }
        public int? BedId { get; set; }
        public string? HostelBed { get; set; }
        public string? HallTicketNumber { get; set; }

        // Fetched from master tables by IDs (sp_GetStudentAdmissionById)
        public string? FetchedHostelBlock { get; set; }
        public string? FetchedHostelRoom { get; set; }
        public string? FetchedHostelBed { get; set; }
        public string? FetchedBusRoute { get; set; }
        public string? FetchedPickupPoint { get; set; }

        // Fee & Payment Plan
        public int? FeeStructureId { get; set; }
        public string? FeeStructureName { get; set; }
        public string? PaymentPlan { get; set; }
        public List<int> SelectedFeeStructureComponentIds { get; set; } = new();
    }
}
