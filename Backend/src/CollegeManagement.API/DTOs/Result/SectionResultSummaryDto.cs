using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Result
{
    public class SectionResultSummaryDto
    {
        public int Id { get; set; }
        public int SectionId { get => Id; set => Id = value; }
        public string Name { get; set; } = string.Empty;
        public string SectionName { get => Name; set => Name = value; }
        public string Section { get => Name; set => Name = value; }
        public int? InChargeId { get; set; }
        public string InChargeName { get; set; } = string.Empty;
        public string InCharge { get => InChargeName; set => InChargeName = value; }
        public int Count { get; set; }
        public int StudentsCount { get => Count; set => Count = value; }
        public int Students { get => Count; set => Count = value; }
        public int Passed { get; set; }
        public int Failed { get; set; }
        public decimal PassRate { get; set; }
        public decimal PassPercentage { get => PassRate; set => PassRate = value; }
        public decimal Average { get; set; }
        public decimal AveragePercentage { get => Average; set => Average = value; }
        public string ResultStatus { get; set; } = "GENERATED";
        public string Status { get => ResultStatus; set => ResultStatus = value; }
        public bool IsPublished { get; set; } = false;
        public List<SectionStudentResultDto> StudentRows { get; set; } = new();
    }
}
