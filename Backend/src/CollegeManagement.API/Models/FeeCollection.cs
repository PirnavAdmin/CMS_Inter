using CollegeManagement.API.Models.Fee;

namespace CollegeManagement.API.Models
{
    public class FeeCollection
    {
        public int FeeCollectionId { get; set; } 
        public int StudentId { get; set; }
        public int FeeStructureId { get; set; }
        public string ReceiptId { get; set; } = string.Empty;
        public DateTime PaymentDate { get; set; }
        public decimal Amount { get; set; }
       public string? TransactionId { get; set; } = string.Empty;
      
    public string?TransactionNumber { get; set; }

    public decimal PaidAmount { get; set; }
        public decimal DueAmount { get; set; }
        public decimal Discount { get; set; } = 0;
        public decimal Fine { get; set; } = 0;
        public decimal FeeType  { get; set; }
        public string PaymentMode { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending";
        public Student Student { get; set; } = null!;
        public FeeStructure FeeStructure { get; set; } = null!;
    }
}