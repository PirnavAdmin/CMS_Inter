using System;
using System.ComponentModel.DataAnnotations;

namespace CollegeManagement.API.DTOs.Inventory
{
    public class TransactionDto
    {
        public int TransactionId { get; set; }
        public string TransactionNumber { get; set; } = string.Empty;
        public int Sequence { get; set; }
        public DateTime TransactionDate { get; set; }
        public string MovementType { get; set; } = string.Empty; // 'Stock In', 'Stock Out'
        public int ItemId { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string ItemCode { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal PreviousUnitCost { get; set; }
        public string Status { get; set; } = "Posted";
        public string? PaymentMethod { get; set; }
        public string? PaymentTransactionNumber { get; set; }
        public string? CashReceiptPath { get; set; }
        public string? CashReceipt => CashReceiptPath;
        public string? ReceiptUrl => CashReceiptPath;
        public int? CorrectionOfId { get; set; }
        public string? CorrectionOfNumber { get; set; }
        public int? ReturnOfId { get; set; }
        public string? ReturnOfNumber { get; set; }
        public int? SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public string? SupplierInvoice { get; set; }
        public string? InvoiceNumber { get; set; }
        public string? PurchaseOrderNumber { get; set; }
        public string? ReferenceNumber { get; set; }
        public string? Location { get; set; }
        public string? Condition { get; set; }
        public string? BatchNumber { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public string? IssueType { get; set; }
        public string? Department { get; set; }
        public string? RecipientName { get; set; }
        public string? RecipientId { get; set; }
        public string? Destination { get; set; }
        public string? Purpose { get; set; }
        public string? ApprovedBy { get; set; }
        public bool IsReturnable { get; set; }
        public DateTime? ExpectedReturnDate { get; set; }
        public string PerformedBy { get; set; } = string.Empty;
        public string? Partner { get; set; }
        public string? Remarks { get; set; }
        public bool CanReverse { get; set; }
        public string? ReverseBlockedReason { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class MovementDto : TransactionDto
    {
    }

    public class PostMovementRequest
    {
        [Required(ErrorMessage = "Item is required.")]
        [Range(1, int.MaxValue, ErrorMessage = "Choose an active inventory item.")]
        public int ItemId { get; set; }

        [Required(ErrorMessage = "Movement Type is required.")]
        public string MovementType { get; set; } = "Stock In"; // 'Stock In', 'Stock Out'

        [Required(ErrorMessage = "Quantity is required.")]
        [Range(0.000001, double.MaxValue, ErrorMessage = "Quantity must be greater than zero.")]
        public decimal Quantity { get; set; }

        public decimal UnitCost { get; set; }

        [Required(ErrorMessage = "Transaction Date is required.")]
        public DateTime TransactionDate { get; set; } = DateTime.UtcNow.Date;

        public int? SupplierId { get; set; }
        public string? SupplierInvoice { get; set; }
        public string? InvoiceNumber { get; set; }
        public string? PurchaseOrderNumber { get; set; }
        public string? ReferenceNumber { get; set; }
        public string? Location { get; set; }
        public string? Condition { get; set; } = "Good";
        public string? BatchNumber { get; set; }
        public DateTime? ExpiryDate { get; set; }

        // Stock Out fields
        public string? IssueType { get; set; }
        public string? Department { get; set; }
        public string? RecipientName { get; set; }
        public string? RecipientId { get; set; }
        public string? Destination { get; set; }
        public string? Purpose { get; set; }
        public string? ApprovedBy { get; set; }
        public bool IsReturnable { get; set; }
        public DateTime? ExpectedReturnDate { get; set; }

        [Required(ErrorMessage = "Performed By is required.")]
        public string PerformedBy { get; set; } = string.Empty;

        public string? Remarks { get; set; }

        // Payment fields
        public string? PaymentMethod { get; set; } = "Cash"; // 'Cash', 'Online Transaction'
        public string? PaymentTransactionNumber { get; set; }
        public string? TransactionNumber { get; set; } // Frontend alias for online transaction number
        public string? PaymentReference { get; set; } // Frontend alias
        public string? OnlineTransactionNumber { get; set; } // Frontend alias
        public string? CashReceiptPath { get; set; }
        public string? CashReceipt { get; set; } // Frontend alias
        public string? ReceiptUrl { get; set; } // Frontend alias
        public string? ReceiptPath { get; set; } // Frontend alias
    }

    public class MovementFilterRequest
    {
        public int? TransactionId { get; set; }
        public string? Search { get; set; }
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public int? ItemId { get; set; }
        public int? CategoryId { get; set; }
        public string? Department { get; set; }
        public int? SupplierId { get; set; }
        public string? Type { get; set; }
        public string? StockStatus { get; set; }
        public string? PaymentMethod { get; set; }
    }
}
