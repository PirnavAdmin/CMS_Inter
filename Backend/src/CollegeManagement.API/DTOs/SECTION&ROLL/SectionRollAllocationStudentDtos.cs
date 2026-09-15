using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs
{
    // =========================================================
    // FILTER
    // =========================================================

    public class SectionRollAllocationFilterRequest
    {
        public int AcademicYearId { get; set; }
        public int AcademicLevelId { get; set; }
        public int GroupId { get; set; }
        public int ProgramId { get; set; }
    }


    // =========================================================
    // SECTION ALLOCATION PREVIEW
    // =========================================================

    public class SectionAllocationPreviewStudentDto
    {
        public int StudentId { get; set; }

        public string? AdmissionNo { get; set; }

        public string? StudentName { get; set; }

        public DateTime AdmissionDate { get; set; }

        public int SectionId { get; set; }

        public string SectionName { get; set; } = string.Empty;

        public int? ExistingSectionId { get; set; }

        public string? ExistingSectionName { get; set; }
    }

    public class SectionAllocationPreviewResponse
    {
        public int TotalStudents { get; set; }

        public int StudentsToAllocate { get; set; }

        public int TotalCapacity { get; set; }

        public List<SectionAllocationPreviewStudentDto> Students { get; set; }
            = new();
    }


    // =========================================================
    // SECTION ALLOCATION CONFIRM
    // =========================================================

    public class ConfirmSectionAllocationRequest
    {
        public int AcademicYearId { get; set; }

        public int AcademicLevelId { get; set; }

        public int GroupId { get; set; }

        public int ProgramId { get; set; }
    }


    // =========================================================
    // ROLL NUMBER PREVIEW
    // =========================================================

    public class RollNumberPreviewStudentDto
    {
        public int StudentId { get; set; }

        public string? AdmissionNo { get; set; }

        public string? StudentName { get; set; }

        public int SectionId { get; set; }

        public string SectionName { get; set; } = string.Empty;

        public string RollNo { get; set; } = string.Empty;
    }

    public class RollNumberAllocationPreviewResponse
    {
        public int TotalStudents { get; set; }

        public int StudentsToAllocate { get; set; }

        public List<RollNumberPreviewStudentDto> Students { get; set; }
            = new();
    }
    //update//
    public sealed class UpdateStudentAllocationRequest
    {
        public int? GroupId { get; set; }
        [Range(1, int.MaxValue)] public int ProgramId { get; set; }
        [Range(1, int.MaxValue)] public int SectionId { get; set; }
        public string? RollNo { get; set; }
    }

    // =========================================================
    // ROLL NUMBER CONFIRM
    // =========================================================

    public class ConfirmRollNumberAllocationRequest
    {
        public int AcademicYearId { get; set; }

        public int AcademicLevelId { get; set; }

        public int GroupId { get; set; }

        public int ProgramId { get; set; }
    }
}