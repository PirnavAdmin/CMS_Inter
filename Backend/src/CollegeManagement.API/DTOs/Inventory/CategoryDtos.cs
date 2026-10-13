using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Inventory
{
    public class CategoryDto
    {
        public int CategoryId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Department { get; set; } = "Administration";
        public string Status { get; set; } = "Active";
        public int Count { get; set; }
        public decimal Value { get; set; }
        public int Alerts { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateCategoryRequest
    {
        [Required(ErrorMessage = "Category Name is required.")]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Category Code is required.")]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        public string? Description { get; set; }

        [StringLength(100)]
        public string Department { get; set; } = "Administration";

        [StringLength(20)]
        public string Status { get; set; } = "Active";
    }

    public class UpdateCategoryRequest : CreateCategoryRequest
    {
    }
}
