using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System;

namespace CollegeManagement.API.Services.Exports
{
    public class StudentIndividualCredentialSlipDocument : IDocument
    {
        private readonly StudentIndividualCredentialSlipModel _model;

        private const string PrimaryNavy = "#1E3A8A";
        private const string AccentBlue = "#2563EB";
        private const string HeaderBg = "#F1F5F9";
        private const string CardBg = "#F8FAFC";
        private const string BorderColor = "#CBD5E1";
        private const string TextDark = "#0F172A";
        private const string TextMuted = "#475569";
        private const string AlertBg = "#FEF3C7";
        private const string AlertText = "#92400E";
        private const string SuccessBg = "#ECFDF5";
        private const string SuccessText = "#065F46";

        public StudentIndividualCredentialSlipDocument(StudentIndividualCredentialSlipModel model)
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
                page.Margin(30);
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
                col.Spacing(4);

                col.Item().Row(row =>
                {
                    row.RelativeItem().Column(titleCol =>
                    {
                        titleCol.Item().Text(_model.InstitutionName.ToUpperInvariant())
                            .FontSize(12)
                            .SemiBold()
                            .FontColor(PrimaryNavy);

                        titleCol.Item().Text("STUDENT ONBOARDING & LOGIN CREDENTIAL SLIP")
                            .FontSize(15)
                            .Bold()
                            .FontColor(AccentBlue);

                        titleCol.Item().Text($"Generated: {_model.GeneratedAt:dd-MMM-yyyy hh:mm tt} | Document Ref: ONB-CRD-{_model.StudentId:D6}")
                            .FontSize(8.5f)
                            .FontColor(TextMuted);
                    });
                });

                col.Item().PaddingTop(4).LineHorizontal(1.5f).LineColor(PrimaryNavy);
            });
        }

        private void ComposeContent(IContainer container)
        {
            container.PaddingTop(12).Column(col =>
            {
                col.Spacing(12);

                // 1. Primary Student Summary Banner
                col.Item().Border(1).BorderColor(BorderColor).Background(CardBg).Padding(12).Column(sc =>
                {
                    sc.Spacing(6);
                    sc.Item().Row(r =>
                    {
                        r.RelativeItem().Text(_model.StudentName.ToUpperInvariant())
                            .FontSize(13)
                            .Bold()
                            .FontColor(PrimaryNavy);

                        r.AutoItem().Background(SuccessBg).PaddingHorizontal(8).PaddingVertical(3).Text("ACTIVE ENROLLMENT")
                            .FontSize(8)
                            .Bold()
                            .FontColor(SuccessText);
                    });

                    sc.Item().LineHorizontal(0.5f).LineColor(BorderColor);

                    sc.Item().Row(r =>
                    {
                        r.RelativeItem().Text(t =>
                        {
                            t.Span("Admission No: ").SemiBold();
                            t.Span(_model.AdmissionNo).Bold().FontColor(AccentBlue);
                        });

                        r.RelativeItem().Text(t =>
                        {
                            t.Span("Roll No: ").SemiBold();
                            t.Span(string.IsNullOrWhiteSpace(_model.RollNo) ? "Not Allocated" : _model.RollNo);
                        });

                        r.RelativeItem().Text(t =>
                        {
                            t.Span("Date of Birth: ").SemiBold();
                            t.Span($"{_model.DateOfBirth:dd-MMM-yyyy}");
                        });

                        r.RelativeItem().Text(t =>
                        {
                            t.Span("Gender: ").SemiBold();
                            t.Span(string.IsNullOrWhiteSpace(_model.Gender) ? "—" : _model.Gender);
                        });
                    });
                });

                // 2. Academic Information
                col.Item().Border(1).BorderColor(BorderColor).Padding(12).Column(ac =>
                {
                    ac.Spacing(6);

                    ac.Item().Text("ACADEMIC ENROLLMENT DETAILS")
                        .FontSize(10)
                        .Bold()
                        .FontColor(PrimaryNavy);

                    ac.Item().LineHorizontal(0.5f).LineColor(BorderColor);

                    ac.Item().Row(r =>
                    {
                        r.RelativeItem().Column(c =>
                        {
                            c.Spacing(3);
                            c.Item().Text(t => { t.Span("Board / Affiliation: ").SemiBold(); t.Span(_model.BoardName); });
                            c.Item().Text(t => { t.Span("Academic Year: ").SemiBold(); t.Span(_model.AcademicYearName); });
                            c.Item().Text(t => { t.Span("Academic Level: ").SemiBold(); t.Span(_model.AcademicLevelName); });
                        });

                        r.RelativeItem().Column(c =>
                        {
                            c.Spacing(3);
                            c.Item().Text(t => { t.Span("Group / Stream: ").SemiBold(); t.Span(_model.GroupName); });
                            c.Item().Text(t => { t.Span("Program / Course: ").SemiBold(); t.Span(string.IsNullOrWhiteSpace(_model.ProgramName) ? "Not Allocated" : _model.ProgramName); });
                            c.Item().Text(t => { t.Span("Section: ").SemiBold(); t.Span(string.IsNullOrWhiteSpace(_model.SectionName) ? "Not Allocated" : _model.SectionName); });
                        });
                    });
                });

                // 3. Official Credentials Card (Highlighted)
                col.Item().Border(1.5f).BorderColor(AccentBlue).Background(Colors.White).Padding(14).Column(cc =>
                {
                    cc.Spacing(8);

                    cc.Item().Row(r =>
                    {
                        r.RelativeItem().Text("OFFICIAL STUDENT LOGIN CREDENTIALS")
                            .FontSize(11)
                            .Bold()
                            .FontColor(AccentBlue);

                        r.AutoItem().Text("FIRST LOGIN ONLY")
                            .FontSize(8)
                            .Bold()
                            .FontColor(AccentBlue);
                    });

                    cc.Item().LineHorizontal(1).LineColor(AccentBlue);

                    cc.Item().Row(r =>
                    {
                        r.RelativeItem().Column(c =>
                        {
                            c.Spacing(4);

                            c.Item().Text(t =>
                            {
                                t.Span("Login ID / Username: ").FontSize(10).Bold();
                                t.Span(_model.LoginId).FontSize(11).Bold().FontColor(PrimaryNavy);
                            });

                            c.Item().Text(t =>
                            {
                                t.Span("Initial Password: ").FontSize(10).Bold();
                                t.Span(_model.InitialPassword).FontSize(11).Bold().FontColor(PrimaryNavy);
                            });
                        });

                        r.RelativeItem().Column(c =>
                        {
                            c.Spacing(4);

                            c.Item().Text(t =>
                            {
                                t.Span("Portal Login URL: ").FontSize(9.5f).SemiBold();
                                t.Span(_model.PortalLoginUrl).FontSize(9.5f).FontColor(AccentBlue).Underline();
                            });

                            c.Item().Text(t =>
                            {
                                t.Span("Allowed Login Fields: ").FontSize(8.5f).FontColor(TextMuted);
                                t.Span("Admission No, Email, or Mobile").FontSize(8.5f).Italic();
                            });
                        });
                    });
                });

                // 4. Instructions & Security Notice Box
                col.Item().Background(AlertBg).Border(1).BorderColor("#FCD34D").Padding(10).Column(nc =>
                {
                    nc.Spacing(4);

                    nc.Item().Row(ir =>
                    {
                        ir.RelativeItem().Text(t =>
                        {
                            t.Span("IMPORTANT SECURITY INSTRUCTION: ").Bold().FontColor(AlertText);
                            t.Span("This credential slip contains your initial temporary password. You must log in to the Student Portal and change your password upon your first login. Once changed, this slip will be invalid and the initial password cannot be used again.").FontSize(8.5f).FontColor(AlertText);
                        });
                    });

                    nc.Item().Text("Steps: 1. Visit Portal URL -> 2. Enter Login ID and Initial Password -> 3. Set your private new password -> 4. Complete your student self-profile, photo, and documents.")
                        .FontSize(8)
                        .SemiBold()
                        .FontColor(AlertText);
                });

                // 5. Contact & Support Info
                if (!string.IsNullOrWhiteSpace(_model.MobileNumber) || !string.IsNullOrWhiteSpace(_model.Email))
                {
                    col.Item().Border(1).BorderColor(BorderColor).Background(CardBg).Padding(8).Row(r =>
                    {
                        r.RelativeItem().Text(t =>
                        {
                            t.Span("Registered Mobile: ").SemiBold();
                            t.Span(string.IsNullOrWhiteSpace(_model.MobileNumber) ? "—" : _model.MobileNumber);
                        });

                        r.RelativeItem().Text(t =>
                        {
                            t.Span("Registered Email: ").SemiBold();
                            t.Span(string.IsNullOrWhiteSpace(_model.Email) ? "—" : _model.Email);
                        });
                    });
                }
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
