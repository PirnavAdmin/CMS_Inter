using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Inventory
{
    public class ItemDto
    {
        public int ItemId { get; set; }
        public string Code { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = string.Empty;
        public string Unit { get; set; } = "Pieces";
        public string Type { get; set; } = "Consumable";
        public string? Description { get; set; }
        public string? Brand { get; set; }
        public string? Model { get; set; }
        public string? Sku { get; set; }
        public string? Department { get; set; }
        public string? Location { get; set; }
        public string? Rack { get; set; }
        public decimal OpeningQuantity { get; set; }
        public decimal OpeningCost { get; set; }
        public decimal Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public decimal StockValue { get; set; }
        public decimal MinStock { get; set; }
        public decimal? MaxStock { get; set; }
        public decimal ReorderQty { get; set; }
        public decimal IssueValue { get; set; }
        public int? SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public string? SupplierItemCode { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public DateTime? LastPurchaseDate { get; set; }
        public DateTime? WarrantyDate { get; set; }
        public string Status { get; set; } = "Active";
        public string StockStatus { get; set; } = "In Stock";
        public string? Remarks { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ItemDetailDto : ItemDto
    {
        public decimal TotalStockIn { get; set; }
        public decimal TotalStockOut { get; set; }
        public List<ItemLedgerEntryDto> Ledger { get; set; } = new List<ItemLedgerEntryDto>();
    }

    public class ItemLedgerEntryDto
    {
        public int TransactionId { get; set; }
        public string TransactionNumber { get; set; } = string.Empty;
        public int Sequence { get; set; }
        public DateTime TransactionDate { get; set; }
        public string MovementType { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal QuantityIn { get; set; }
        public decimal QuantityOut { get; set; }
        public decimal RunningBalance { get; set; }
        public decimal UnitCost { get; set; }
        public decimal TotalAmount { get; set; }
        public string? ReferenceNumber { get; set; }
        public string? Department { get; set; }
        public string? RecipientName { get; set; }
        public string? Partner { get; set; }
        public string PerformedBy { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public int? CorrectionOfId { get; set; }
        public int? ReturnOfId { get; set; }
        public string? Remarks { get; set; }
    }

    public class CreateItemRequest
    {
        [Required(ErrorMessage = "Item Name is required.")]
        [StringLength(150)]
        public string Name { get; set; } = string.Empty;

        [StringLength(50)]
        public string? Code { get; set; }

        [Required(ErrorMessage = "Category is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Choose an active category.")]
        public int CategoryId { get; set; }

        [Required(ErrorMessage = "Unit of Measurement is required.")]
        [StringLength(50)]
        public string Unit { get; set; } = "Pieces";

        [StringLength(50)]
        public string Type { get; set; } = "Consumable";

        public string? Description { get; set; }
        public string? Brand { get; set; }
        public string? Model { get; set; }
        public string? Sku { get; set; }
        public string? Department { get; set; }
        public string? Location { get; set; }
        public string? Rack { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Enter a non-negative number.")]
        public decimal OpeningQuantity { get; set; } = 0.00m;

        [Range(0, double.MaxValue, ErrorMessage = "Enter a non-negative number.")]
        public decimal UnitCost { get; set; } = 0.00m;

        [Range(0, double.MaxValue, ErrorMessage = "Enter a non-negative number.")]
        public decimal MinStock { get; set; } = 0.00m;

        public decimal? MaxStock { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Enter a non-negative number.")]
        public decimal ReorderQty { get; set; } = 0.00m;

        [Range(0, double.MaxValue, ErrorMessage = "Enter a non-negative number.")]
        public decimal IssueValue { get; set; } = 0.00m;

        public int? SupplierId { get; set; }
        public string? SupplierItemCode { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public DateTime? WarrantyDate { get; set; }

        [StringLength(20)]
        public string Status { get; set; } = "Active";

        public string? Remarks { get; set; }
    }

    public class UpdateItemRequest
    {
        [Required(ErrorMessage = "Item Name is required.")]
        [StringLength(150)]
        public string Name { get; set; } = string.Empty;

        [Required(ErrorMessage = "Item Code is required.")]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required(ErrorMessage = "Category is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Choose an active category.")]
        public int CategoryId { get; set; }

        [Required(ErrorMessage = "Unit of Measurement is required.")]
        [StringLength(50)]
        public string Unit { get; set; } = "Pieces";

        [StringLength(50)]
        public string Type { get; set; } = "Consumable";

        public string? Description { get; set; }
        public string? Brand { get; set; }
        public string? Model { get; set; }
        public string? Sku { get; set; }
        public string? Department { get; set; }
        public string? Location { get; set; }
        public string? Rack { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Enter a non-negative number.")]
        public decimal MinStock { get; set; } = 0.00m;

        public decimal? MaxStock { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Enter a non-negative number.")]
        public decimal ReorderQty { get; set; } = 0.00m;

        [Range(0, double.MaxValue, ErrorMessage = "Enter a non-negative number.")]
        public decimal IssueValue { get; set; } = 0.00m;

        public int? SupplierId { get; set; }
        public string? SupplierItemCode { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public DateTime? WarrantyDate { get; set; }

        [StringLength(20)]
        public string Status { get; set; } = "Active";

        public string? Remarks { get; set; }
    }

    public class ItemFilterRequest
    {
        public string? Search { get; set; }
        public int? CategoryId { get; set; }
        public string? Department { get; set; }
        public int? SupplierId { get; set; }
        public string? Status { get; set; }
        public string? StockStatus { get; set; }
    }
}
