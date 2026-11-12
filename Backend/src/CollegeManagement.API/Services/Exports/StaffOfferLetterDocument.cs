using System;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CollegeManagement.API.Services.Exports
{
    public class StaffOfferLetterModel
    {
        public string OfferLetterNumber { get; set; } = string.Empty;
        public string StaffName { get; set; } = string.Empty;
        public string EmployeeId { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string PrimaryCampus { get; set; } = string.Empty;
        public string InstitutionName { get; set; } = "PIRNAV EDUCATIONAL SOCIETY";
        public string DocumentHeading { get; set; } = "OFFICIAL APPOINTMENT ORDER – JUNIOR COLLEGE FACULTY";
        public string DepartmentOffice { get; set; } = "DIRECTORATE OF INTERMEDIATE ACADEMICS & HUMAN RESOURCES";
        public string OpeningStatement { get; set; } = string.Empty;
        public string BoardName { get; set; } = "Board of Intermediate Education, Andhra Pradesh (BIEAP)";
        public string RoleCategory { get; set; } = "Teaching Staff";
        public DateTime DateOfJoining { get; set; }
        public decimal? BasicSalary { get; set; }
        public decimal? GrossSalary { get; set; }
        public string ReportingAuthority { get; set; } = "Campus Principal";
        public string AuthorizedSignatoryName { get; set; } = "Dr. K. V. Ramanamurthy";
        public string AuthorizedSignatoryRole { get; set; } = "Director of Human Resources";
        public string TermsAndConditions { get; set; } = 
            "1. Teaching Obligations: The Lecturer shall conduct regular theory periods, laboratory practicals, and special study hours in accordance with the Board of Intermediate Education (BIEAP/TGBIE) curriculum and annual academic calendar.\n" +
            "2. Student Academic Progress: Responsible for student syllabus completion, weekly unit test valuations, and intensive coaching for Intermediate Public Examinations (IPE) and integrated competitive entrance examinations (EAMCET / JEE / NEET).\n" +
            "3. Examination Duties: Mandatory participation in BIEAP/TGBIE practical examination supervision, internal college assessments, and external spot valuation when deputed by the Principal.\n" +
            "4. Service Notice Period: Service notice period is strictly three (3) calendar months or equivalent gross salary in lieu thereof. Mid-academic-session resignations are strictly barred to safeguard student syllabus continuity.\n" +
            "5. Campus Postings: The management reserves the right to depute or transfer teaching assignments across affiliated junior college campuses based on institutional requirements without altering service seniority.";
    }

    public class StaffOfferLetterDocument : IDocument
    {
        private readonly StaffOfferLetterModel _model;

        private const string PrimaryGreen = "#065F46";
        private const string DarkGreen = "#047857";
        private const string LightGreenBg = "#ECFDF5";
        private const string BorderColor = "#CBD5E1";
        private const string TextDark = "#0F172A";
        private const string TextMuted = "#475569";

        public StaffOfferLetterDocument(StaffOfferLetterModel model)
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
                        c.Item().Text(_model.InstitutionName.ToUpperInvariant()).FontSize(17).ExtraBold().FontColor(PrimaryGreen);
                        c.Item().Text(_model.DepartmentOffice.ToUpperInvariant()).FontSize(9.5f).Bold().FontColor(TextMuted);
                        c.Item().Text(_model.DocumentHeading).FontSize(9).FontColor(DarkGreen);
                    });
                    r.ConstantItem(160).AlignRight().Column(c =>
                    {
                        c.Item().Text($"Ref: {_model.OfferLetterNumber}").Bold().FontSize(9);
                        c.Item().Text($"Date: {_model.DateOfJoining:dd MMM yyyy}").FontSize(9).FontColor(TextMuted);
                    });
                });
                col.Item().PaddingTop(8).PaddingBottom(12).LineHorizontal(1.5f).LineColor(PrimaryGreen);
            });
        }

        private void ComposeContent(IContainer container)
        {
            container.PaddingTop(8).Column(col =>
            {
                col.Spacing(11);

                // Salutation
                col.Item().Text(t =>
                {
                    t.Span("Dear ");
                    t.Span(_model.StaffName).Bold().FontColor(PrimaryGreen);
                    t.Span(",");
                });

                if (!string.IsNullOrWhiteSpace(_model.OpeningStatement))
                {
                    col.Item().Text(_model.OpeningStatement);
                }
                else
                {
                    col.Item().Text(
                        $"We have pleasure in appointing you as {_model.Designation} in the Department of {_model.Department} at our {_model.PrimaryCampus} campus under the Board of Intermediate Education, Andhra Pradesh (BIEAP) / Telangana (TGBIE) academic stream.");
                }

                // Key Employment Summary Box
                col.Item().Border(1).BorderColor(BorderColor).Background(LightGreenBg).Padding(10).Column(c =>
                {
                    c.Spacing(5);
                    c.Item().Text("OFFICIAL APPOINTMENT SPECIFICATIONS").Bold().FontSize(9.5f).FontColor(PrimaryGreen);

                    c.Item().Row(r =>
                    {
                        r.RelativeItem().Column(sub =>
                        {
                            sub.Item().Text(t => { t.Span("Permanent Employee ID: ").Bold(); t.Span(_model.EmployeeId); });
                            sub.Item().Text(t => { t.Span("Designation: ").Bold(); t.Span(_model.Designation); });
                            sub.Item().Text(t => { t.Span("Department: ").Bold(); t.Span(_model.Department); });
                        });
                        r.RelativeItem().Column(sub =>
                        {
                            sub.Item().Text(t => { t.Span("Primary Campus: ").Bold(); t.Span(_model.PrimaryCampus); });
                            sub.Item().Text(t => { t.Span("Reporting Authority: ").Bold(); t.Span(_model.ReportingAuthority); });
                            sub.Item().Text(t => { t.Span("Joining Date: ").Bold(); t.Span($"{_model.DateOfJoining:dd MMM yyyy}"); });
                        });
                    });
                });

                // Compensation & CTC Table
                col.Item().Text("COMPENSATION & BENEFITS STRUCTURE").Bold().FontSize(10.5f).FontColor(PrimaryGreen);
                col.Item().Table(table =>
                {
                    table.ColumnsDefinition(columns =>
                    {
                        columns.RelativeColumn(3);
                        columns.RelativeColumn(2);
                    });

                    table.Header(h =>
                    {
                        h.Cell().Background(PrimaryGreen).Padding(5).Text("Component").Bold().FontColor(Colors.White);
                        h.Cell().Background(PrimaryGreen).Padding(5).AlignRight().Text("Monthly Amount (INR)").Bold().FontColor(Colors.White);
                    });

                    table.Cell().BorderBottom(1).BorderColor(BorderColor).Padding(5).Text("Basic Pay");
                    table.Cell().BorderBottom(1).BorderColor(BorderColor).Padding(5).AlignRight().Text(_model.BasicSalary.HasValue ? $"Rs. {_model.BasicSalary.Value:N2}" : "As per Pay Scale");

                    table.Cell().BorderBottom(1).BorderColor(BorderColor).Padding(5).Text("House Rent Allowance (HRA) & Allowances");
                    table.Cell().BorderBottom(1).BorderColor(BorderColor).Padding(5).AlignRight().Text("As per Junior College Bylaws");

                    table.Cell().BorderBottom(1).BorderColor(BorderColor).Padding(5).Text("Gross Monthly Salary").Bold();
                    table.Cell().BorderBottom(1).BorderColor(BorderColor).Padding(5).AlignRight().Text(_model.GrossSalary.HasValue ? $"Rs. {_model.GrossSalary.Value:N2}" : "As per Institutional Scale").Bold().FontColor(DarkGreen);

                    table.Cell().Background("#F8FAFC").Padding(5).Text("Annual CTC (Cost to Company)").Bold();
                    table.Cell().Background("#F8FAFC").Padding(5).AlignRight().Text(_model.GrossSalary.HasValue ? $"Rs. {(_model.GrossSalary.Value * 12):N2}" : "As per Institutional Scale").Bold().FontColor(DarkGreen);
                });

                // Terms
                col.Item().Text("TERMS OF APPOINTMENT & SERVICE BYLAWS").Bold().FontSize(10.5f).FontColor(PrimaryGreen);
                col.Item().Text(_model.TermsAndConditions).FontSize(8.5f).LineHeight(1.35f).FontColor(TextMuted);

                // Signatures
                col.Item().PaddingTop(22).Row(r =>
                {
                    r.RelativeItem().Column(sig =>
                    {
                        sig.Item().Text("___________________________").FontColor(BorderColor);
                        sig.Item().Text(_model.AuthorizedSignatoryName).Bold();
                        sig.Item().Text(_model.AuthorizedSignatoryRole).FontSize(8).FontColor(TextMuted);
                        sig.Item().Text(_model.InstitutionName).FontSize(8).FontColor(TextMuted);
                    });
                    r.RelativeItem().AlignRight().Column(sig =>
                    {
                        sig.Item().Text("___________________________").FontColor(BorderColor);
                        sig.Item().Text("Candidate Acceptance").Bold();
                        sig.Item().Text($"Signature of {_model.StaffName}").FontSize(8).FontColor(TextMuted);
                        sig.Item().Text("Date: ____________________").FontSize(8).FontColor(TextMuted);
                    });
                });
            });
        }

        private void ComposeFooter(IContainer container)
        {
            container.PaddingTop(10).Row(r =>
            {
                r.RelativeItem().Text("This document is an authentic electronic record issued under CMS verification bylaws.").FontSize(8).FontColor(TextMuted);
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
