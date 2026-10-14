using System;
using System.Collections.Generic;

namespace CollegeManagement.API.DTOs.Inventory
{
    public class ReportRequest
    {
        public string ReportType { get; set; } = "Stock Summary";
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
        public int? ItemId { get; set; }
        public int? CategoryId { get; set; }
        public string? Department { get; set; }
        public int? SupplierId { get; set; }
        public string? MovementType { get; set; }
        public string? StockStatus { get; set; }
    }

    public class ReportResultDto
    {
        public List<List<string>> Columns { get; set; } = new List<List<string>>();
        public IEnumerable<object> Rows { get; set; } = new List<object>();
    }

    public class StockSummaryReportRowDto
    {
        public int ItemId { get; set; }
        public string ItemCode { get; set; } = string.Empty;
        public string ItemName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;
        public decimal OpeningStock { get; set; }
        public decimal ReceivedStock { get; set; }
        public decimal IssuedStock { get; set; }
        public decimal CurrentStock { get; set; }
        public decimal MinStock { get; set; }
        public decimal UnitCost { get; set; }
        public decimal StockValue { get; set; }
        public string StockStatus { get; set; } = string.Empty;
        public string ItemStatus { get; set; } = string.Empty;
    }

    public class MovementReportRowDto
    {
        public string TransactionNumber { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string ItemName { get; set; } = string.Empty;
        public string ItemCode { get; set; } = string.Empty;
        public string MovementType { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public decimal UnitCost { get; set; }
        public decimal TotalValue { get; set; }
        public string Partner { get; set; } = string.Empty;
        public string? Department { get; set; }
        public string? ReferenceNumber { get; set; }
        public string PerformedBy { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
    }

    public class LowStockReportRowDto
    {
        public string Item { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public decimal CurrentStock { get; set; }
        public decimal MinStock { get; set; }
        public decimal SuggestedReorder { get; set; }
        public string PreferredSupplier { get; set; } = string.Empty;
    }

    public class DepartmentIssueReportRowDto
    {
        public DateTime Date { get; set; }
        public string Item { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public string Department { get; set; } = string.Empty;
        public string Recipient { get; set; } = string.Empty;
        public string? Purpose { get; set; }
        public string IssuedBy { get; set; } = string.Empty;
        public decimal IssueValue { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class SupplierPurchaseReportRowDto
    {
        public DateTime Date { get; set; }
        public string Supplier { get; set; } = string.Empty;
        public string InvoiceNumber { get; set; } = string.Empty;
        public string Item { get; set; } = string.Empty;
        public decimal QuantityReceived { get; set; }
        public decimal UnitCost { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class CategoryValueReportRowDto
    {
        public int CategoryId { get; set; }
        public string Category { get; set; } = string.Empty;
        public int NumberOfItems { get; set; }
        public decimal StockValue { get; set; }
        public int MinimumStockAlerts { get; set; }
    }

    public class ExpiryWarrantyReportRowDto
    {
        public string Item { get; set; } = string.Empty;
        public string ItemCode { get; set; } = string.Empty;
        public string BatchOrSku { get; set; } = string.Empty;
        public string RecordType { get; set; } = string.Empty;
        public DateTime ExpiryWarrantyDate { get; set; }
        public int DaysRemaining { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class ReturnableItemsReportRowDto
    {
        public int TransactionId { get; set; }
        public string TransactionNumber { get; set; } = string.Empty;
        public DateTime IssueDate { get; set; }
        public string Item { get; set; } = string.Empty;
        public decimal Quantity { get; set; }
        public string Recipient { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public DateTime? ExpectedReturnDate { get; set; }
        public string ReturnStatus { get; set; } = string.Empty;
    }
}
