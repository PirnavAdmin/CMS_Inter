using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Inventory
{
    public class SupplierDto
    {
        public int SupplierId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string ContactPerson { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string? AlternatePhone { get; set; }
        public string? Email { get; set; }
        public string? Gstin { get; set; }
        public string? Pan { get; set; }
        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? PostalCode { get; set; }
        public string Country { get; set; } = "India";
        public string? Address { get; set; }
        public string? PaymentTerms { get; set; }
        public string? BankName { get; set; }
        public string? AccountHolder { get; set; }
        public string? AccountNumber { get; set; }
        public string? Ifsc { get; set; }
        public string? Notes { get; set; }
        public string Status { get; set; } = "Active";
        public List<int> CategoryIds { get; set; } = new List<int>();
        public List<string> SuppliedCategories { get; set; } = new List<string>();
        public decimal TotalPurchases { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateSupplierRequest
    {
        [Required(ErrorMessage = "Supplier Name is required.")]
        [StringLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Supplier Code is required.")]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required(ErrorMessage = "Contact Person is required.")]
        [StringLength(100)]
        public string ContactPerson { get; set; } = string.Empty;

        [Required(ErrorMessage = "Phone is required.")]
        [RegularExpression(@"^\+?[\d\s()-]{10,16}$", ErrorMessage = "Enter a valid phone number.")]
        public string Phone { get; set; } = string.Empty;

        [RegularExpression(@"^\+?[\d\s()-]{10,16}$", ErrorMessage = "Enter a valid phone number.")]
        public string? AlternatePhone { get; set; }

        [EmailAddress(ErrorMessage = "Enter a valid email.")]
        public string? Email { get; set; }

        [StringLength(20)]
        public string? Gstin { get; set; }

        [StringLength(20)]
        public string? Pan { get; set; }

        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? PostalCode { get; set; }
        public string Country { get; set; } = "India";
        public string? PaymentTerms { get; set; }
        public string? BankName { get; set; }
        public string? AccountHolder { get; set; }
        public string? AccountNumber { get; set; }
        public string? Ifsc { get; set; }
        public string? Notes { get; set; }

        [StringLength(20)]
        public string Status { get; set; } = "Active";

        public List<int> CategoryIds { get; set; } = new List<int>();
    }

    public class UpdateSupplierRequest : CreateSupplierRequest
    {
    }
}
