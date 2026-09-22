using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CollegeManagement.API.Models.Faculty
{
    [Table("Designations")]
    public class Designation
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        public int? DepartmentId { get; set; }

        [ForeignKey("DepartmentId")]
        public Department? Department { get; set; }

        [StringLength(20)]
        public string StaffType { get; set; } = "Both";

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        [NotMapped]
        public int DesignationId
        {
            get => Id;
            set => Id = value;
        }

        [NotMapped]
        public string DesignationName
        {
            get => Name;
            set => Name = value;
        }

        [NotMapped]
        public string DesignationCode => $"DES_{Name.ToUpper().Replace(" ", "_")}";

        // Navigation property for faculties/staffs assigned to this designation
        public ICollection<Faculty> Faculties { get; set; } = new List<Faculty>();
        public ICollection<CollegeManagement.API.Models.Staff.Staff> Staffs { get; set; } = new List<CollegeManagement.API.Models.Staff.Staff>();
    }
}
