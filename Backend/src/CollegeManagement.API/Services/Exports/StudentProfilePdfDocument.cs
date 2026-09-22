using System;
using System.Linq;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CollegeManagement.API.Services.Exports
{
    public class StudentProfilePdfDocument : IDocument
    {
        private readonly StudentProfilePdfModel _model;

        private const string PrimaryNavy = "#1E3A8A";
        private const string AccentBlue = "#2563EB";
        private const string HeaderBg = "#F1F5F9";
        private const string CardBg = "#F8FAFC";
        private const string BorderColor = "#CBD5E1";
        private const string TextDark = "#0F172A";
        private const string TextMuted = "#475569";
        private const string BadgeGreenBg = "#ECFDF5";
        private const string BadgeGreenText = "#065F46";
        private const string BadgeRedBg = "#FEF2F2";
        private const string BadgeRedText = "#991B1B";

        public StudentProfilePdfDocument(StudentProfilePdfModel model)
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
                page.Margin(25);
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
                        titleCol.Item().Text("COLLEGE MANAGEMENT SYSTEM")
                            .FontSize(10)
                            .SemiBold()
                            .FontColor(TextMuted);

                        titleCol.Item().Text("STUDENT PROFILE")
                            .FontSize(18)
                            .ExtraBold()
                            .FontColor(PrimaryNavy);
                    });

                    row.AutoItem().Column(rightCol =>
                    {
                        rightCol.Item().AlignRight().Text($"Generated: {_model.GeneratedAt:dd-MMM-yyyy hh:mm tt}")
                            .FontSize(8)
                            .Italic()
                            .FontColor(TextMuted);

                        rightCol.Item().AlignRight().Text($"Student ID: #{_model.StudentId}")
                            .FontSize(8)
                            .Bold()
                            .FontColor(TextMuted);
                    });
                });

                col.Item().PaddingBottom(4).LineHorizontal(1.5f).LineColor(PrimaryNavy);
            });
        }

        private void ComposeContent(IContainer container)
        {
            container.PaddingTop(4).Column(col =>
            {
                col.Spacing(10);

                // 1. Identity Top Card (Photo + Core Details + Status Badge)
                col.Item().Element(ComposeIdentityCard);

                // 2. Academic Context Card
                col.Item().Element(ComposeAcademicCard);

                // 3. Contact & Personal Details Card
                col.Item().Element(ComposePersonalAndContactCard);

                // 4. Parents & Guardian Card
                col.Item().Element(ComposeParentsCard);

                // 5. Previous Education & Remarks (if present)
                if (!string.IsNullOrWhiteSpace(_model.PreviousSchool) || !string.IsNullOrWhiteSpace(_model.Remarks))
                {
                    col.Item().Element(ComposePreviousEducationCard);
                }
            });
        }

        private void ComposeIdentityCard(IContainer container)
        {
            container.Border(1).BorderColor(BorderColor).Background(CardBg).Padding(10).Row(row =>
            {
                // Left Photo Box
                row.AutoItem().PaddingRight(12).Width(85).Height(105).Element(photoContainer =>
                {
                    if (_model.PhotoBytes != null && _model.PhotoBytes.Length > 0)
                    {
                        photoContainer.Border(1).BorderColor(BorderColor).Image(_model.PhotoBytes, ImageScaling.FitArea);
                    }
                    else
                    {
                        photoContainer.Border(1).BorderColor(BorderColor).Background(Colors.Grey.Lighten3)
                            .AlignCenter().AlignMiddle().Column(c =>
                            {
                                c.Item().AlignCenter().Text("PHOTO").FontSize(8).Bold().FontColor(Colors.Grey.Darken1);
                                c.Item().AlignCenter().Text("Not Available").FontSize(7).FontColor(Colors.Grey.Darken1);
                            });
                    }
                });

                // Right Information Grid
                row.RelativeItem().Column(infoCol =>
                {
                    infoCol.Spacing(4);

                    // Name & Badge Header
                    infoCol.Item().Row(nameRow =>
                    {
                        nameRow.RelativeItem().Text(_model.StudentName)
                            .FontSize(14)
                            .Bold()
                            .FontColor(PrimaryNavy);

                        bool isActiveStatus = _model.IsActive && string.Equals(_model.Status, "Active", StringComparison.OrdinalIgnoreCase);
                        string badgeBg = isActiveStatus ? BadgeGreenBg : BadgeRedBg;
                        string badgeText = isActiveStatus ? BadgeGreenText : BadgeRedText;

                        nameRow.AutoItem().Background(badgeBg).PaddingHorizontal(8).PaddingVertical(2).Text(_model.Status.ToUpperInvariant())
                            .FontSize(8)
                            .Bold()
                            .FontColor(badgeText);
                    });

                    infoCol.Item().LineHorizontal(0.5f).LineColor(BorderColor);

                    // Key Details 2-Column Grid
                    infoCol.Item().Grid(grid =>
                    {
                        grid.Columns(2);
                        grid.Spacing(4);

                        grid.Item().Element(e => KeyVal(e, "Admission No", _model.AdmissionNo));
                        grid.Item().Element(e => KeyVal(e, "Roll No", _model.RollNo));
                        grid.Item().Element(e => KeyVal(e, "Gender", _model.Gender));
                        grid.Item().Element(e => KeyVal(e, "Date of Birth", $"{_model.DateOfBirth:dd-MMM-yyyy}"));
                        grid.Item().Element(e => KeyVal(e, "Blood Group", _model.BloodGroup ?? "N/A"));
                        grid.Item().Element(e => KeyVal(e, "Admission Date", _model.AdmissionDate != default ? $"{_model.AdmissionDate:dd-MMM-yyyy}" : "N/A"));
                    });
                });
            });
        }

        private void ComposeAcademicCard(IContainer container)
        {
            container.Border(1).BorderColor(BorderColor).Column(col =>
            {
                col.Item().Background(HeaderBg).PaddingHorizontal(10).PaddingVertical(4).Text("ACADEMIC DETAILS")
                    .FontSize(9).Bold().FontColor(PrimaryNavy);

                col.Item().Background(Colors.White).Padding(10).Grid(grid =>
                {
                    grid.Columns(3);
                    grid.Spacing(6);

                    grid.Item().Element(e => KeyVal(e, "Board", _model.BoardName));
                    grid.Item().Element(e => KeyVal(e, "Academic Year", _model.AcademicYearName));
                    grid.Item().Element(e => KeyVal(e, "Academic Level", _model.AcademicLevelName));
                    grid.Item().Element(e => KeyVal(e, "Group", _model.GroupName));
                    grid.Item().Element(e => KeyVal(e, "Program", _model.ProgramName));
                    grid.Item().Element(e => KeyVal(e, "Section", _model.SectionName));
                    grid.Item().Element(e => KeyVal(e, "Medium", _model.Medium ?? "N/A"));
                    grid.Item().Element(e => KeyVal(e, "Second Language", _model.SecondLanguage ?? "N/A"));
                    grid.Item().Element(e => KeyVal(e, "Admission Quota", _model.AdmissionQuota ?? "N/A"));
                });
            });
        }

        private void ComposePersonalAndContactCard(IContainer container)
        {
            container.Border(1).BorderColor(BorderColor).Column(col =>
            {
                col.Item().Background(HeaderBg).PaddingHorizontal(10).PaddingVertical(4).Text("PERSONAL & CONTACT DETAILS")
                    .FontSize(9).Bold().FontColor(PrimaryNavy);

                col.Item().Background(Colors.White).Padding(10).Grid(grid =>
                {
                    grid.Columns(2);
                    grid.Spacing(6);

                    grid.Item().Element(e => KeyVal(e, "Mobile Number", _model.MobileNumber ?? "N/A"));
                    grid.Item().Element(e => KeyVal(e, "Email Address", _model.Email ?? "N/A"));
                    grid.Item().Element(e => KeyVal(e, "Aadhaar Number", _model.AadhaarNumber ?? "N/A"));
                    grid.Item().Element(e => KeyVal(e, "Nationality / Religion", $"{_model.Nationality ?? "Indian"} / {_model.Religion ?? "N/A"}"));
                    grid.Item().Element(e => KeyVal(e, "Category", _model.Category ?? "General"));
                    
                    string fullAddress = string.Join(", ", new[] { _model.Address, _model.City, _model.District, _model.State, _model.Pincode }
                        .Where(s => !string.IsNullOrWhiteSpace(s)));

                    grid.Item().Element(e => KeyVal(e, "Residential Address", string.IsNullOrWhiteSpace(fullAddress) ? "N/A" : fullAddress));
                });
            });
        }

        private void ComposeParentsCard(IContainer container)
        {
            container.Border(1).BorderColor(BorderColor).Column(col =>
            {
                col.Item().Background(HeaderBg).PaddingHorizontal(10).PaddingVertical(4).Text("PARENT & GUARDIAN DETAILS")
                    .FontSize(9).Bold().FontColor(PrimaryNavy);

                col.Item().Background(Colors.White).Padding(10).Grid(grid =>
                {
                    grid.Columns(3);
                    grid.Spacing(6);

                    // Father
                    grid.Item().Column(c =>
                    {
                        c.Item().Text("Father Information").FontSize(8).Bold().FontColor(AccentBlue);
                        KeyVal(c.Item(), "Name", _model.FatherName ?? "N/A");
                        KeyVal(c.Item(), "Occupation", _model.FatherOccupation ?? "N/A");
                        KeyVal(c.Item(), "Mobile", _model.FatherMobile ?? "N/A");
                    });

                    // Mother
                    grid.Item().Column(c =>
                    {
                        c.Item().Text("Mother Information").FontSize(8).Bold().FontColor(AccentBlue);
                        KeyVal(c.Item(), "Name", _model.MotherName ?? "N/A");
                        KeyVal(c.Item(), "Occupation", _model.MotherOccupation ?? "N/A");
                        KeyVal(c.Item(), "Mobile", _model.MotherMobile ?? "N/A");
                    });

                    // Guardian
                    grid.Item().Column(c =>
                    {
                        c.Item().Text("Guardian Information").FontSize(8).Bold().FontColor(AccentBlue);
                        KeyVal(c.Item(), "Name", _model.GuardianName ?? "N/A");
                        KeyVal(c.Item(), "Mobile", _model.GuardianMobile ?? "N/A");
                        KeyVal(c.Item(), "Annual Income", _model.AnnualIncome.HasValue ? $"Rs. {_model.AnnualIncome:N2}" : "N/A");
                    });
                });
            });
        }

        private void ComposePreviousEducationCard(IContainer container)
        {
            container.Border(1).BorderColor(BorderColor).Column(col =>
            {
                col.Item().Background(HeaderBg).PaddingHorizontal(10).PaddingVertical(4).Text("PREVIOUS EDUCATION & REMARKS")
                    .FontSize(9).Bold().FontColor(PrimaryNavy);

                col.Item().Background(Colors.White).Padding(10).Grid(grid =>
                {
                    grid.Columns(2);
                    grid.Spacing(6);

                    if (!string.IsNullOrWhiteSpace(_model.PreviousSchool))
                    {
                        grid.Item().Element(e => KeyVal(e, "Previous School", _model.PreviousSchool));
                        grid.Item().Element(e => KeyVal(e, "Previous Board", _model.PreviousBoard ?? "N/A"));
                        grid.Item().Element(e => KeyVal(e, "Hall Ticket No", _model.PreviousHallTicketNumber ?? "N/A"));
                        grid.Item().Element(e => KeyVal(e, "Percentage", _model.PreviousPercentage.HasValue ? $"{_model.PreviousPercentage}%" : "N/A"));
                    }

                    if (!string.IsNullOrWhiteSpace(_model.Remarks))
                    {
                        grid.Item().Element(e => KeyVal(e, "Remarks", _model.Remarks));
                    }
                });
            });
        }

        private static void KeyVal(IContainer container, string label, string value)
        {
            container.Text(text =>
            {
                text.Span($"{label}: ").SemiBold().FontColor(TextMuted);
                text.Span(string.IsNullOrWhiteSpace(value) ? "N/A" : value).FontColor(TextDark);
            });
        }

        private void ComposeFooter(IContainer container)
        {
            container.Column(col =>
            {
                col.Item().LineHorizontal(0.5f).LineColor(BorderColor);
                col.Item().PaddingTop(4).Row(row =>
                {
                    row.RelativeItem().Text("CONFIDENTIAL - FOR COLLEGE ADMINISTRATIVE USE ONLY")
                        .FontSize(7)
                        .SemiBold()
                        .FontColor(TextMuted);

                    row.AutoItem().Text(x =>
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
}