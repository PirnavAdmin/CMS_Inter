using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Inventory
{
    public class PurchaseOrderDto
    {
        public int OrderId { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public int ItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public int SupplierId { get; set; }
        public string SupplierName { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = "Pending";
        public DateTime OrderDate { get; set; }
        public DateTime? ExpectedDeliveryDate { get; set; }
        public string? Remarks { get; set; }
        public string CreatedBy { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }

    public class CreatePurchaseOrderRequest
    {
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "A valid Item ID is required.")]
        public int ItemId { get; set; }

        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "A valid Supplier ID is required.")]
        public int SupplierId { get; set; }

        [Required]
        [Range(0.01, 9999999, ErrorMessage = "Quantity must be greater than zero.")]
        public decimal Quantity { get; set; }

        public decimal? UnitPrice { get; set; }

        public DateTime? ExpectedDeliveryDate { get; set; }

        [MaxLength(500)]
        public string? Remarks { get; set; }
    }

    public class UpdatePurchaseOrderStatusRequest
    {
        [Required]
        public string Status { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Remarks { get; set; }
    }

    public class CancelPurchaseOrderRequest
    {
        [MaxLength(500)]
        public string? Remarks { get; set; }
    }
}
