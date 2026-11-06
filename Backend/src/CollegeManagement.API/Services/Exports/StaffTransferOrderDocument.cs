using System;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CollegeManagement.API.Services.Exports
{
    public class StaffTransferOrderModel
    {
        public string TransferOrderNumber { get; set; } = string.Empty;
        public string StaffName { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string FromCampus { get; set; } = string.Empty;
        public string ToCampus { get; set; } = string.Empty;
        public string? FromDepartment { get; set; }
        public string? ToDepartment { get; set; }
        public DateTime EffectiveDate { get; set; }
        public DateTime? RelievingDate { get; set; }
        public DateTime? JoiningDate { get; set; }
        public string TransferType { get; set; } = "Permanent";
        public string TransferReason { get; set; } = string.Empty;
        public string ApprovedBy { get; set; } = "Director of Human Resources";
        public string InstitutionName { get; set; } = "PIRNAV EDUCATIONAL SOCIETY";
    }

    public class StaffTransferOrderDocument : IDocument
    {
        private readonly StaffTransferOrderModel _model;

        private const string PrimaryBlue = "#1E40AF";
        private const string DarkBlue = "#1E3A8A";
        private const string LightBlueBg = "#EFF6FF";
        private const string BorderColor = "#CBD5E1";
        private const string TextDark = "#0F172A";
        private const string TextMuted = "#475569";

        public StaffTransferOrderDocument(StaffTransferOrderModel model)
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
                page.Margin(36);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Arial").FontColor(TextDark));

                page.Header().Element(ComposeHeader);
                page.Content().Element(ComposeContent);
                page.Footer().Element(ComposeFooter);
            });
        }

        private void ComposeHeader(IContainer container)
        {
            container.Column(col =>
            {
                col.Item().Row(r =>
                {
                    r.RelativeItem().Column(c =>
                    {
                        c.Item().Text(_model.InstitutionName.ToUpperInvariant()).FontSize(18).ExtraBold().FontColor(PrimaryBlue);
                        c.Item().Text("CENTRAL HUMAN RESOURCES & INSTITUTIONAL ADMINISTRATION").FontSize(10).Bold().FontColor(TextMuted);
                        c.Item().Text("OFFICIAL INTER-CAMPUS TRANSFER ORDER").FontSize(9).FontColor(DarkBlue);
                    });
                    r.ConstantItem(150).AlignRight().Column(c =>
                    {
                        c.Item().Text($"Order No: {_model.TransferOrderNumber}").Bold().FontSize(9);
                        c.Item().Text($"Date: {_model.EffectiveDate:dd MMM yyyy}").FontSize(9).FontColor(TextMuted);
                    });
                });
                col.Item().PaddingTop(8).PaddingBottom(12).LineHorizontal(1.5f).LineColor(PrimaryBlue);
            });
        }

        private void ComposeContent(IContainer container)
        {
            container.PaddingTop(10).Column(col =>
            {
                col.Spacing(12);

                col.Item().Text(
                    "In the interest of administrative realignment and academic resource optimization across our institutional network, the management hereby sanctions the inter-campus relocation of the following faculty member with immediate institutional effect:").LineHeight(1.4f);

                // Transfer Summary Grid
                col.Item().Border(1).BorderColor(BorderColor).Background(LightBlueBg).Padding(12).Column(c =>
                {
                    c.Spacing(6);
                    c.Item().Text("OFFICIAL TRANSFER PARTICULARS").Bold().FontSize(10).FontColor(PrimaryBlue);

                    c.Item().Table(t =>
                    {
                        t.ColumnsDefinition(cd =>
                        {
                            cd.RelativeColumn(2);
                            cd.RelativeColumn(3);
                        });

                        t.Cell().Padding(4).Text("Employee Full Name:").Bold();
                        t.Cell().Padding(4).Text(_model.StaffName);

                        t.Cell().Padding(4).Text("Permanent Employee ID:").Bold();
                        t.Cell().Padding(4).Text(_model.EmployeeId);

                        t.Cell().Padding(4).Text("Designation:").Bold();
                        t.Cell().Padding(4).Text(_model.Designation);

                        t.Cell().Padding(4).Text("Relieving Campus (From):").Bold().FontColor(Colors.Red.Darken2);
                        t.Cell().Padding(4).Text(_model.FromCampus).Bold();

                        t.Cell().Padding(4).Text("Reporting Campus (To):").Bold().FontColor(Colors.Green.Darken2);
                        t.Cell().Padding(4).Text(_model.ToCampus).Bold();

                        t.Cell().Padding(4).Text("Transfer Category:").Bold();
                        t.Cell().Padding(4).Text(_model.TransferType);

                        t.Cell().Padding(4).Text("Effective Transfer Date:").Bold();
                        t.Cell().Padding(4).Text($"{_model.EffectiveDate:yyyy-MM-dd}");

                        t.Cell().Padding(4).Text("Relieving Deadline:").Bold();
                        t.Cell().Padding(4).Text(_model.RelievingDate.HasValue ? $"{_model.RelievingDate.Value:yyyy-MM-dd}" : "Immediate");

                        t.Cell().Padding(4).Text("Reporting Date:").Bold();
                        t.Cell().Padding(4).Text(_model.JoiningDate.HasValue ? $"{_model.JoiningDate.Value:yyyy-MM-dd}" : "Immediate");

                        t.Cell().Padding(4).Text("Transfer Justification:").Bold();
                        t.Cell().Padding(4).Text(_model.TransferReason);
                    });
                });

                // Statutory Terms
                col.Item().Text("STATUTORY & SERVICE CONTINUITY DIRECTIVES").Bold().FontSize(11).FontColor(PrimaryBlue);
                col.Item().Column(terms =>
                {
                    terms.Spacing(4);
                    terms.Item().Text("1. Continuous Institutional Experience: The faculty member retains all accrued seniority, leave balances, provident fund accumulations, and verified institutional experience without interruption.").FontSize(9).FontColor(TextMuted);
                    terms.Item().Text("2. Permanent Credentials: The faculty member's permanent Employee ID and portal login credentials remain active across all authorized campuses.").FontSize(9).FontColor(TextMuted);
                    terms.Item().Text($"3. Operational Handover: All active class attendance books, marks registries, and examination materials at {_model.FromCampus} must be formally handed over to the Department Head before relieving.").FontSize(9).FontColor(TextMuted);
                });

                // Signatures
                col.Item().PaddingTop(30).Row(r =>
                {
                    r.RelativeItem().Column(sig =>
                    {
                        sig.Item().Text("___________________________").FontColor(BorderColor);
                        sig.Item().Text(_model.ApprovedBy).Bold();
                        sig.Item().Text("Office of Central Administration").FontSize(8).FontColor(TextMuted);
                        sig.Item().Text("Pirnav Educational Society").FontSize(8).FontColor(TextMuted);
                    });
                    r.RelativeItem().AlignRight().Column(sig =>
                    {
                        sig.Item().Text("___________________________").FontColor(BorderColor);
                        sig.Item().Text("Registrar / General Secretary").Bold();
                        sig.Item().Text("Apex Governance Board").FontSize(8).FontColor(TextMuted);
                        sig.Item().Text($"Date: {_model.EffectiveDate:dd-MM-yyyy}").FontSize(8).FontColor(TextMuted);
                    });
                });
            });
        }

        private void ComposeFooter(IContainer container)
        {
            container.PaddingTop(10).Row(r =>
            {
                r.RelativeItem().Text("Official Relocation Order issued via CMS Central Governance Platform.").FontSize(8).FontColor(TextMuted);
                r.ConstantItem(100).AlignRight().Text(x =>
                {
                    x.Span("Page ");
                    x.CurrentPageNumber();
                    x.Span(" of ");
                    x.TotalPages();
                });
            });
        }
    }
}
