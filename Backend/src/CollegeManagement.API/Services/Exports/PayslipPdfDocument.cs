using System;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CollegeManagement.API.Services.Exports
{
    public class PayslipPdfDocument : IDocument
    {
        private readonly PayslipPdfModel _model;

        private const string PrimaryNavy = "#1E3A8A";
        private const string AccentBlue = "#2563EB";
        private const string HeaderBg = "#F1F5F9";
        private const string CardBg = "#F8FAFC";
        private const string BorderColor = "#CBD5E1";
        private const string TextDark = "#0F172A";
        private const string TextMuted = "#475569";
        private const string BadgeGreenBg = "#ECFDF5";
        private const string BadgeGreenText = "#065F46";
        private const string NetSalaryGreen = "#047857";

        public PayslipPdfDocument(PayslipPdfModel model)
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
                page.Margin(28);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Arial").FontColor(TextDark));

                page.Header().Element(ComposeHeader);
                page.Content().Element(ComposeContent);
                page.Footer().Element(ComposeFooter);
            });
        }

        private void ComposeHeader(IContainer container)
        {
            container.Column(col =>
            {
                col.Spacing(4);

                col.Item().Row(row =>
                {
                    row.RelativeItem().Column(titleCol =>
                    {
                        titleCol.Item().Text(_model.InstitutionName.ToUpperInvariant())
                            .FontSize(15)
                            .ExtraBold()
                            .FontColor(PrimaryNavy);

                        titleCol.Item().Text(_model.Subtitle)
                            .FontSize(8.5f)
                            .SemiBold()
                            .FontColor(TextMuted);

                        titleCol.Item().Text($"SALARY PAYSLIP — {_model.MonthName.ToUpperInvariant()} {_model.PayrollYear}")
                            .FontSize(11)
                            .Bold()
                            .FontColor(AccentBlue);
                    });

                    row.AutoItem().Column(metaCol =>
                    {
                        metaCol.Item().AlignRight().Text($"Payslip ID: #{_model.PayslipId}")
                            .FontSize(9)
                            .Bold()
                            .FontColor(TextDark);

                        metaCol.Item().AlignRight().Text($"Date: {_model.GeneratedAt:dd-MMM-yyyy}")
                            .FontSize(8)
                            .FontColor(TextMuted);

                        metaCol.Item().AlignRight().Background(BadgeGreenBg).PaddingHorizontal(6).PaddingVertical(2).Text(_model.PayslipStatus.ToUpperInvariant())
                            .FontSize(7.5f)
                            .Bold()
                            .FontColor(BadgeGreenText);
                    });
                });

                col.Item().PaddingTop(6).LineHorizontal(1.5f).LineColor(PrimaryNavy);
            });
        }

        private void ComposeContent(IContainer container)
        {
            container.PaddingTop(12).Column(col =>
            {
                col.Spacing(14);

                // 1. Employee Details Box
                col.Item().Element(ComposeEmployeeDetails);

                // 2. Earnings and Deductions Table
                col.Item().Element(ComposeSalaryBreakdown);

                // 3. Net Take-Home Salary Highlight Box
                col.Item().Element(ComposeNetSalaryBox);

                // 4. Verification and Signatory Area
                col.Item().Element(ComposeSignatoryArea);
            });
        }

        private void ComposeEmployeeDetails(IContainer container)
        {
            container.Border(1).BorderColor(BorderColor).Background(CardBg).Padding(10).Column(col =>
            {
                col.Spacing(6);

                col.Item().Text("EMPLOYEE SUMMARY")
                    .FontSize(9)
                    .Bold()
                    .FontColor(PrimaryNavy);

                col.Item().LineHorizontal(0.5f).LineColor(BorderColor);

                col.Item().Grid(grid =>
                {
                    grid.Columns(3);
                    grid.Spacing(6);

                    grid.Item().Element(e => DetailCell(e, "Employee ID", _model.EmployeeId));
                    grid.Item().Element(e => DetailCell(e, "Staff Name", _model.StaffName));
                    grid.Item().Element(e => DetailCell(e, "Staff Type", _model.StaffType));

                    grid.Item().Element(e => DetailCell(e, "Department", _model.DepartmentName));
                    grid.Item().Element(e => DetailCell(e, "Designation", _model.Designation));
                    grid.Item().Element(e => DetailCell(e, "Salary Structure", _model.StructureName));

                    grid.Item().Element(e => DetailCell(e, "Pay Period", $"{_model.MonthName} {_model.PayrollYear}"));
                    grid.Item().Element(e => DetailCell(e, "Payment Mode", "Bank Transfer"));
                    grid.Item().Element(e => DetailCell(e, "Payment Status", _model.PayslipStatus));
                });
            });
        }

        private static void DetailCell(IContainer container, string label, string? value)
        {
            container.Column(col =>
            {
                col.Item().Text(label)
                    .FontSize(7.5f)
                    .SemiBold()
                    .FontColor(TextMuted);

                col.Item().Text(string.IsNullOrWhiteSpace(value) ? "—" : value)
                    .FontSize(8.5f)
                    .Bold()
                    .FontColor(TextDark);
            });
        }

        private void ComposeSalaryBreakdown(IContainer container)
        {
            container.Row(row =>
            {
                // Left Column: Earnings
                row.RelativeItem().Border(1).BorderColor(BorderColor).Column(earningsCol =>
                {
                    earningsCol.Item().Background(HeaderBg).Padding(6).Row(hRow =>
                    {
                        hRow.RelativeItem().Text("EARNINGS").FontSize(9).Bold().FontColor(PrimaryNavy);
                        hRow.AutoItem().Text("AMOUNT (INR)").FontSize(8).Bold().FontColor(PrimaryNavy);
                    });

                    earningsCol.Item().Padding(6).Column(list =>
                    {
                        list.Spacing(4);

                        SalaryRow(list, "Basic Pay", _model.BasicPay);
                        SalaryRow(list, "House Rent Allowance (HRA)", _model.HRA);
                        SalaryRow(list, "Dearness Allowance (DA)", _model.DA);
                        SalaryRow(list, "Conveyance / Transport Allowance", _model.ConveyanceAllowance);
                        SalaryRow(list, "Medical Allowance", _model.MedicalAllowance);
                        SalaryRow(list, "Special & Other Allowances", _model.OtherAllowance);
                    });

                    earningsCol.Item().LineHorizontal(0.5f).LineColor(BorderColor);

                    earningsCol.Item().Background("#F8FAFC").Padding(6).Row(totRow =>
                    {
                        totRow.RelativeItem().Text("Total Gross Earnings").FontSize(9).Bold().FontColor(PrimaryNavy);
                        totRow.AutoItem().Text($"Rs. {_model.GrossSalary:N2}").FontSize(9.5f).Bold().FontColor(PrimaryNavy);
                    });
                });

                row.ConstantItem(10); // Gap between tables

                // Right Column: Deductions
                row.RelativeItem().Border(1).BorderColor(BorderColor).Column(deductionsCol =>
                {
                    deductionsCol.Item().Background(HeaderBg).Padding(6).Row(hRow =>
                    {
                        hRow.RelativeItem().Text("DEDUCTIONS").FontSize(9).Bold().FontColor(PrimaryNavy);
                        hRow.AutoItem().Text("AMOUNT (INR)").FontSize(8).Bold().FontColor(PrimaryNavy);
                    });

                    deductionsCol.Item().Padding(6).Column(list =>
                    {
                        list.Spacing(4);

                        SalaryRow(list, "Provident Fund (PF)", _model.PF);
                        SalaryRow(list, "Professional Tax (PT)", _model.ProfessionalTax);
                        SalaryRow(list, "Tax Deducted at Source (TDS)", _model.TDS);
                        SalaryRow(list, "Employee State Insurance (ESI)", _model.ESI);
                        SalaryRow(list, "Insurance & Other Deductions", _model.InsuranceOtherDeduction);
                        SalaryRow(list, "—", 0); // Spacer for height alignment
                    });

                    deductionsCol.Item().LineHorizontal(0.5f).LineColor(BorderColor);

                    deductionsCol.Item().Background("#F8FAFC").Padding(6).Row(totRow =>
                    {
                        totRow.RelativeItem().Text("Total Deductions").FontSize(9).Bold().FontColor("#991B1B");
                        totRow.AutoItem().Text($"Rs. {_model.TotalDeductions:N2}").FontSize(9.5f).Bold().FontColor("#991B1B");
                    });
                });
            });
        }

        private static void SalaryRow(ColumnDescriptor list, string label, decimal amount)
        {
            if (label == "—" && amount == 0)
            {
                list.Item().PaddingVertical(1).Row(r =>
                {
                    r.RelativeItem().Text(" ").FontSize(8);
                    r.AutoItem().Text(" ").FontSize(8);
                });
                return;
            }

            list.Item().PaddingVertical(1).Row(r =>
            {
                r.RelativeItem().Text(label).FontSize(8).FontColor(TextDark);
                r.AutoItem().Text($"Rs. {amount:N2}").FontSize(8).FontColor(TextDark);
            });
        }

        private void ComposeNetSalaryBox(IContainer container)
        {
            container.Border(1.5f).BorderColor("#A7F3D0").Background(BadgeGreenBg).Padding(12).Row(row =>
            {
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("NET TAKE-HOME SALARY")
                        .FontSize(9)
                        .SemiBold()
                        .FontColor(BadgeGreenText);

                    col.Item().Text($"Rs. {_model.NetSalary:N2}")
                        .FontSize(18)
                        .Bold()
                        .FontColor(NetSalaryGreen);

                    col.Item().PaddingTop(2).Text("(Gross Salary minus Total Statutory and Discretionary Deductions)")
                        .FontSize(7.5f)
                        .Italic()
                        .FontColor(TextMuted);
                });

                row.AutoItem().AlignMiddle().Column(summaryCol =>
                {
                    summaryCol.Item().AlignRight().Text("GROSS: Rs. " + _model.GrossSalary.ToString("N2"))
                        .FontSize(8.5f)
                        .SemiBold()
                        .FontColor(TextDark);

                    summaryCol.Item().AlignRight().Text("DEDUCTIONS: -Rs. " + _model.TotalDeductions.ToString("N2"))
                        .FontSize(8.5f)
                        .SemiBold()
                        .FontColor("#991B1B");
                });
            });
        }

        private void ComposeSignatoryArea(IContainer container)
        {
            container.PaddingTop(16).Row(row =>
            {
                row.RelativeItem().Column(col =>
                {
                    col.Item().Text("Notes:")
                        .FontSize(8)
                        .Bold()
                        .FontColor(TextDark);

                    col.Item().Text("• This is a system-generated document and does not require a physical signature.")
                        .FontSize(7.5f)
                        .FontColor(TextMuted);

                    col.Item().Text("• For any queries regarding allowances or deductions, please contact the Accounts Department.")
                        .FontSize(7.5f)
                        .FontColor(TextMuted);
                });

                row.AutoItem().Column(signCol =>
                {
                    signCol.Item().Width(140).LineHorizontal(0.5f).LineColor(BorderColor);

                    signCol.Item().PaddingTop(4).AlignCenter().Text("Authorized Signatory")
                        .FontSize(8)
                        .Bold()
                        .FontColor(TextDark);

                    signCol.Item().AlignCenter().Text("Accounts & Payroll Office")
                        .FontSize(7.5f)
                        .FontColor(TextMuted);
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
                    row.RelativeItem().Text("CONFIDENTIAL — FOR EMPLOYEE PERSONAL USE ONLY")
                        .FontSize(7)
                        .SemiBold()
                        .FontColor(TextMuted);

                    row.AutoItem().Text(x =>
                    {
                        x.Span("Generated via College Management System | Page ");
                        x.CurrentPageNumber();
                        x.Span(" of ");
                        x.TotalPages();
                    });
                });
            });
        }
    }
}
