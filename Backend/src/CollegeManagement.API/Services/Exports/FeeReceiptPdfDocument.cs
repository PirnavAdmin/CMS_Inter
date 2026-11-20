using System;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CollegeManagement.API.Services.Exports;

public class FeeReceiptPdfModel
{
    public string InstitutionName { get; set; } = "PIRNAV EDUCATIONAL GROUP";
    public string InstitutionAddress { get; set; } = "Campus Administration & Accounts Division";
    public string ReceiptNumber { get; set; } = string.Empty;
    public DateTime ReceiptDate { get; set; } = DateTime.UtcNow;
    public string StudentName { get; set; } = string.Empty;
    public string AdmissionNo { get; set; } = string.Empty;
    public string Course { get; set; } = string.Empty;
    public string Section { get; set; } = string.Empty;
    public decimal AmountPaid { get; set; }
    public decimal TotalPayable { get; set; }
    public decimal RemainingBalance { get; set; }
    public string PaymentMethod { get; set; } = "UPI_QR";
    public string TransactionReference { get; set; } = string.Empty;
    public string? Remarks { get; set; }
}

public class FeeReceiptPdfDocument : IDocument
{
    private readonly FeeReceiptPdfModel _model;

    private const string PrimaryNavy = "#1E3A8A";
    private const string AccentBlue = "#2563EB";
    private const string HeaderBg = "#F1F5F9";
    private const string BorderColor = "#CBD5E1";
    private const string TextDark = "#0F172A";
    private const string TextMuted = "#475569";
    private const string SuccessGreen = "#059669";

    public FeeReceiptPdfDocument(FeeReceiptPdfModel model)
    {
        _model = model;
    }

    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;
    public DocumentSettings GetSettings() => DocumentSettings.Default;

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(32);
            page.PageColor(Colors.White);
            page.DefaultTextStyle(x => x.FontSize(9.5f).FontFamily("Arial").FontColor(TextDark));

            page.Header().Element(ComposeHeader);
            page.Content().Element(ComposeContent);
            page.Footer().Element(ComposeFooter);
        });
    }

    private void ComposeHeader(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                row.RelativeItem().Column(titleCol =>
                {
                    titleCol.Item().Text(_model.InstitutionName.ToUpperInvariant())
                        .FontSize(16)
                        .ExtraBold()
                        .FontColor(PrimaryNavy);

                    titleCol.Item().Text(_model.InstitutionAddress)
                        .FontSize(9)
                        .FontColor(TextMuted);
                });

                row.ConstantItem(180).Column(rcptCol =>
                {
                    rcptCol.Item().AlignRight().Text("FEE PAYMENT RECEIPT")
                        .FontSize(13)
                        .Bold()
                        .FontColor(AccentBlue);

                    rcptCol.Item().AlignRight().Text($"Receipt No: {_model.ReceiptNumber}")
                        .FontSize(9.5f)
                        .Bold();

                    rcptCol.Item().AlignRight().Text($"Date: {_model.ReceiptDate:dd MMM yyyy, hh:mm tt}")
                        .FontSize(8.5f)
                        .FontColor(TextMuted);
                });
            });

            col.Item().PaddingTop(8).LineHorizontal(1.5f).LineColor(PrimaryNavy);
        });
    }

    private void ComposeContent(IContainer container)
    {
        container.PaddingTop(12).Column(col =>
        {
            // Student Profile Section
            col.Item().Background(HeaderBg).Padding(10).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text(t => { t.Span("Student Name: ").SemiBold(); t.Span(_model.StudentName); });
                    c.Item().Text(t => { t.Span("Admission No: ").SemiBold(); t.Span(_model.AdmissionNo); });
                });

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text(t => { t.Span("Course / Group: ").SemiBold(); t.Span(_model.Course); });
                    c.Item().Text(t => { t.Span("Section: ").SemiBold(); t.Span(string.IsNullOrWhiteSpace(_model.Section) ? "A" : _model.Section); });
                });
            });

            // Payment Metadata
            col.Item().PaddingTop(12).Row(row =>
            {
                row.RelativeItem().Text(t => { t.Span("Payment Method: ").SemiBold(); t.Span(_model.PaymentMethod); });
                row.RelativeItem().Text(t => { t.Span("Transaction Ref: ").SemiBold(); t.Span(_model.TransactionReference); });
            });

            // Financial Table
            col.Item().PaddingTop(16).Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(40);
                    columns.RelativeColumn(3);
                    columns.RelativeColumn(2);
                });

                table.Header(header =>
                {
                    header.Cell().Background(PrimaryNavy).Padding(6).Text("#").FontColor(Colors.White).Bold();
                    header.Cell().Background(PrimaryNavy).Padding(6).Text("Fee Particulars").FontColor(Colors.White).Bold();
                    header.Cell().Background(PrimaryNavy).Padding(6).AlignRight().Text("Amount (INR)").FontColor(Colors.White).Bold();
                });

                table.Cell().BorderBottom(1).BorderColor(BorderColor).Padding(6).Text("1");
                table.Cell().BorderBottom(1).BorderColor(BorderColor).Padding(6).Text("College Academic & Tuition Fee Collection");
                table.Cell().BorderBottom(1).BorderColor(BorderColor).Padding(6).AlignRight().Text($"INR {_model.AmountPaid:N2}").Bold();
            });

            // Summary Totals
            col.Item().PaddingTop(14).AlignRight().Width(240).Column(totalsCol =>
            {
                totalsCol.Item().Row(r =>
                {
                    r.RelativeItem().Text("Total Amount Paid:").Bold().FontSize(11).FontColor(SuccessGreen);
                    r.RelativeItem().AlignRight().Text($"INR {_model.AmountPaid:N2}").Bold().FontSize(11).FontColor(SuccessGreen);
                });

                totalsCol.Item().PaddingTop(4).Row(r =>
                {
                    r.RelativeItem().Text("Remaining Balance:").FontColor(TextMuted);
                    r.RelativeItem().AlignRight().Text($"INR {_model.RemainingBalance:N2}").FontColor(TextMuted);
                });
            });

            // Remarks / Notes
            if (!string.IsNullOrWhiteSpace(_model.Remarks))
            {
                col.Item().PaddingTop(16).Text(t =>
                {
                    t.Span("Remarks: ").SemiBold();
                    t.Span(_model.Remarks).Italic();
                });
            }

            // Status Badge
            col.Item().PaddingTop(20).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Status: PAYMENT RECEIVED & SETTLED").Bold().FontColor(SuccessGreen);
                    c.Item().Text("This is an electronically generated and digitally recorded fee receipt.").FontSize(8).FontColor(TextMuted);
                });

                row.ConstantItem(120).Column(signCol =>
                {
                    signCol.Item().PaddingTop(30).LineHorizontal(1).LineColor(BorderColor);
                    signCol.Item().AlignCenter().Text("Authorized Accounts Signatory").FontSize(8).FontColor(TextMuted);
                });
            });
        });
    }

    private void ComposeFooter(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().LineHorizontal(0.5f).LineColor(BorderColor);
            col.Item().PaddingTop(4).Row(row =>
            {
                row.RelativeItem().Text("College Management ERP - Online Payment & Fee Billing System")
                    .FontSize(8).FontColor(TextMuted);

                row.RelativeItem().AlignRight().Text(x =>
                {
                    x.Span("Page ");
                    x.CurrentPageNumber();
                    x.Span(" of ");
                    x.TotalPages();
                });
            });
        });
    }
}
