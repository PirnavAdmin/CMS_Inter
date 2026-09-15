using System;
using System.Collections.Generic;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CollegeManagement.API.Services.Exports
{
    public class StudentCredentialPdfModel
    {
        public int StudentId { get; set; }
        public string AdmissionNo { get; set; } = string.Empty;
        public string? RollNo { get; set; }
        public string StudentName { get; set; } = string.Empty;
        public DateTime DateOfBirth { get; set; }
        public string Gender { get; set; } = string.Empty;
        public string? MobileNumber { get; set; }
        public string? Email { get; set; }
        public string BoardCode { get; set; } = string.Empty;
        public string AcademicYearName { get; set; } = string.Empty;
        public string LevelCode { get; set; } = string.Empty;
        public string GroupCode { get; set; } = string.Empty;
        public string? ProgramName { get; set; }
        public string? SectionName { get; set; }
        public string TemporaryPassword { get; set; } = string.Empty;
    }

    public class StudentCredentialPdfDocument : IDocument
    {
        private readonly List<StudentCredentialPdfModel> _students;

        private const string PrimaryNavy = "#1E3A8A";
        private const string AccentBlue = "#2563EB";
        private const string HeaderBg = "#F1F5F9";
        private const string CardBg = "#F8FAFC";
        private const string BorderColor = "#CBD5E1";
        private const string TextDark = "#0F172A";
        private const string TextMuted = "#475569";
        private const string AlertBg = "#FEF3C7";
        private const string AlertText = "#92400E";

        public StudentCredentialPdfDocument(List<StudentCredentialPdfModel> students)
        {
            _students = students;
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
                col.Spacing(3);

                col.Item().Row(row =>
                {
                    row.RelativeItem().Column(titleCol =>
                    {
                        titleCol.Item().Text("COLLEGE MANAGEMENT SYSTEM")
                            .FontSize(11)
                            .SemiBold()
                            .FontColor(PrimaryNavy);

                        titleCol.Item().Text("OFFICIAL STUDENT ONBOARDING & LOGIN CREDENTIAL SLIPS")
                            .FontSize(14)
                            .Bold()
                            .FontColor(AccentBlue);

                        titleCol.Item().Text($"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC | Total Slips: {_students.Count}")
                            .FontSize(8)
                            .FontColor(TextMuted);
                    });
                });

                col.Item().PaddingTop(4).LineHorizontal(1).LineColor(PrimaryNavy);
            });
        }

        private void ComposeContent(IContainer container)
        {
            container.PaddingTop(10).Column(col =>
            {
                col.Spacing(12);

                if (_students.Count == 0)
                {
                    col.Item().Padding(20).Border(1).BorderColor(BorderColor).Background(CardBg)
                        .AlignCenter().Text("No legacy imported students match the specified criteria.").FontSize(10).Italic();
                    return;
                }

                foreach (var s in _students)
                {
                    col.Item().Element(c => ComposeStudentSlip(c, s));
                }
            });
        }

        private void ComposeStudentSlip(IContainer container, StudentCredentialPdfModel s)
        {
            container.Border(1)
                .BorderColor(BorderColor)
                .Background(CardBg)
                .Padding(10)
                .Column(col =>
                {
                    col.Spacing(6);

                    // Header line of slip
                    col.Item().Row(r =>
                    {
                        r.RelativeItem().Text(s.StudentName)
                            .FontSize(11)
                            .Bold()
                            .FontColor(PrimaryNavy);

                        r.AutoItem().Text($"Adm No: {s.AdmissionNo}")
                            .FontSize(10)
                            .SemiBold()
                            .FontColor(TextDark);
                    });

                    col.Item().LineHorizontal(0.5f).LineColor(BorderColor);

                    // 2-column info
                    col.Item().Row(r =>
                    {
                        // Academic details
                        r.RelativeItem().Column(ac =>
                        {
                            ac.Spacing(2);
                            ac.Item().Text(t =>
                            {
                                t.Span("Board: ").SemiBold();
                                t.Span(s.BoardCode);
                                t.Span(" | Year: ").SemiBold();
                                t.Span(s.AcademicYearName);
                            });
                            ac.Item().Text(t =>
                            {
                                t.Span("Level: ").SemiBold();
                                t.Span(s.LevelCode);
                                t.Span(" | Group: ").SemiBold();
                                t.Span(s.GroupCode);
                            });
                            if (!string.IsNullOrWhiteSpace(s.ProgramName) || !string.IsNullOrWhiteSpace(s.SectionName))
                            {
                                ac.Item().Text(t =>
                                {
                                    t.Span("Program: ").SemiBold();
                                    t.Span(string.IsNullOrWhiteSpace(s.ProgramName) ? "(None)" : s.ProgramName);
                                    t.Span(" | Section: ").SemiBold();
                                    t.Span(string.IsNullOrWhiteSpace(s.SectionName) ? "(None)" : s.SectionName);
                                });
                            }
                        });

                        // Credentials Box
                        r.RelativeItem().Border(1).BorderColor(AccentBlue).Background(Colors.White).Padding(6).Column(cc =>
                        {
                            cc.Spacing(2);
                            cc.Item().Text("LOGIN CREDENTIALS").FontSize(8).Bold().FontColor(AccentBlue);
                            cc.Item().Text(t =>
                            {
                                t.Span("Login ID / Email: ").Bold();
                                t.Span(!string.IsNullOrWhiteSpace(s.Email) ? s.Email : s.AdmissionNo).SemiBold().FontColor(PrimaryNavy);
                            });
                            cc.Item().Text(t =>
                            {
                                t.Span("Temporary Password: ").Bold();
                                t.Span("Initial password sent to registered email.").Italic().FontColor(PrimaryNavy);
                            });
                        });
                    });

                    // First Login Instructions Notice
                    col.Item().Background(AlertBg).Padding(4).Row(ir =>
                    {
                        ir.RelativeItem().Text(t =>
                        {
                            t.Span("NOTICE: ").Bold().FontColor(AlertText);
                            t.Span("Your initial temporary password has been securely dispatched to your registered email address. Please log in to the Student Portal and update your password immediately upon first login.").FontSize(8).FontColor(AlertText);
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
                    row.RelativeItem().Text("CONFIDENTIAL — FOR STUDENT / PARENT DISTRIBUTION ONLY")
                        .FontSize(7.5f)
                        .FontColor(TextMuted);

                    row.AutoItem().Text(text =>
                    {
                        text.Span("Page ");
                        text.CurrentPageNumber();
                        text.Span(" of ");
                        text.TotalPages();
                    });
                });
            });
        }
    }
}
