using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Result
{
    public class PublishResultRequestDto
    {
        public int? CampusId { get; set; }
        [Required]
        public int BoardId { get; set; }
        [Required]
        public int AcademicYearId { get; set; }
        [Required]
        public int AcademicLevelId { get; set; }
        [Required]
        public int GroupId { get; set; }
        [Required]
        public int ExamId { get; set; }
        public int ExaminationId { get => ExamId; set => ExamId = value; }
        public DateTime PublishDate { get; set; }
    }
}