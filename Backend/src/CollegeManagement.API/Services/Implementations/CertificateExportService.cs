using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using CollegeManagement.API.DTOs.Certificate;
using CollegeManagement.API.Services.Interfaces;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CollegeManagement.API.Services.Implementations;

public class CertificateExportService : ICertificateExportService
{
    static CertificateExportService()
    {
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] GenerateCertificatePdf(CertificatePreviewResponseDto preview, string? signaturePath = null)
    {
        var crestPath = ResolveCrestPath();
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                RenderCertificatePage(page, preview, crestPath, signaturePath);
            });
        });

        return document.GeneratePdf();
    }

    public byte[] GenerateBulkCertificatesPdf(IReadOnlyList<CertificateResponseDto> certificates, CancellationToken ct = default)
    {
        var crestPath = ResolveCrestPath();
        var signaturePath = ResolveSignaturePath();

        if (!certificates.Any())
        {
            var emptyDoc = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Landscape());
                    page.Margin(30);
                    page.Content().AlignCenter().Text("No certificate records found.").FontSize(16).Bold();
                });
            });
            return emptyDoc.GeneratePdf();
        }

        var previews = new List<CertificatePreviewResponseDto>();
        foreach (var cert in certificates)
        {
            if (ct.IsCancellationRequested) break;
            previews.Add(BuildPreviewFallback(cert));
        }

        var document = Document.Create(container =>
        {
            foreach (var preview in previews)
            {
                container.Page(page =>
                {
                    RenderCertificatePage(page, preview, crestPath, signaturePath);
                });
            }
        });

        return document.GeneratePdf();
    }

    public byte[] ExportCertificatesCsv(IReadOnlyList<CertificateResponseDto> certificates)
    {
        var sb = new StringBuilder();
        sb.AppendLine("S.No,Certificate Number,Admission Number,Student Name,Academic Level,Group,Certificate Type,Request Date,Issue Date,Status,Issued By,Purpose,Remarks,Verification Link");

        int sNo = 1;
        foreach (var c in certificates)
        {
            var issueDateStr = c.IssueDate != default ? c.IssueDate.ToString("dd/MM/yyyy") : "";
            var reqDateStr = c.RequestDate != default ? c.RequestDate.ToString("dd/MM/yyyy") : "";
            var verifyUrl = $"https://pirnavcollege.edu.in/verify-certificate/{c.CertificateNumber}";
            sb.AppendLine($"{sNo},\"{c.CertificateNumber}\",\"{c.AdmissionNo}\",\"{c.StudentName}\",\"{c.AcademicLevel}\",\"{c.GroupName}\",\"{c.CertificateType}\",\"{reqDateStr}\",\"{issueDateStr}\",\"{c.Status}\",\"{c.IssuedBy ?? "Principal"}\",\"{c.Purpose?.Replace("\"", "\"\"")}\",\"{c.Remarks?.Replace("\"", "\"\"")}\",\"{verifyUrl}\"");
            sNo++;
        }

        return Encoding.UTF8.GetBytes(sb.ToString());
    }

    public CertificatePreviewResponseDto BuildPreviewFallback(CertificateResponseDto cert)
    {
        var certType = cert.CertificateType ?? "Certificate";
        var certNo = cert.CertificateNumber ?? $"CERT-{cert.CertificateId}";
        var studentName = cert.StudentName ?? "Student";
        var admissionNo = cert.AdmissionNo ?? "ADM-2026-0000";
        var fatherName = !string.IsNullOrWhiteSpace(cert.FatherName)
            && !cert.FatherName.Equals("Parent Name", StringComparison.OrdinalIgnoreCase)
            && !cert.FatherName.EndsWith("Father", StringComparison.OrdinalIgnoreCase)
            && !cert.FatherName.Equals("string", StringComparison.OrdinalIgnoreCase)
            && !cert.FatherName.Equals("null", StringComparison.OrdinalIgnoreCase)
            ? cert.FatherName
            : DeriveFatherName(studentName);
        var groupName = cert.GroupName ?? "MPC";
        var academicLevel = cert.AcademicLevel ?? "1st Year";
        var academicYear = cert.AcademicYear ?? "2026-2027";
        var safePurpose = !string.IsNullOrWhiteSpace(cert.Purpose)
            && !cert.Purpose.Equals("purpose", StringComparison.OrdinalIgnoreCase)
            && !cert.Purpose.Equals("string", StringComparison.OrdinalIgnoreCase)
            && !cert.Purpose.Equals("null", StringComparison.OrdinalIgnoreCase)
            ? cert.Purpose.Trim()
            : "Higher Education / Official Purpose";
        var remarks = cert.Remarks ?? "";

        string digits = new string(admissionNo.Where(char.IsDigit).ToArray());
        string studentIdStr = cert.StudentId > 0 ? cert.StudentId.ToString() : (!string.IsNullOrEmpty(digits) ? digits : "1");
        if (string.IsNullOrWhiteSpace(studentIdStr)) studentIdStr = "1";

        string heading = certType;
        string paragraphOne;
        string paragraphTwo = safePurpose.StartsWith("This certificate", StringComparison.OrdinalIgnoreCase)
            ? safePurpose
            : $"This certificate is issued for the purpose of {safePurpose}.";
        string orientation = "Landscape";
        string borderColor = "#1e3a8a";
        string badgeBgColor = "#1e3a8a";
        string badgeTextColor = "#ffffff";

        if (certType.Contains("Bonafide", StringComparison.OrdinalIgnoreCase) || certType.Equals("BC", StringComparison.OrdinalIgnoreCase))
        {
            heading = "Bonafide Certificate";
            paragraphOne = $"This is to certify that Mr./Ms. {studentName} (S/o / D/o {fatherName}) bearing Student ID {studentIdStr} and Admission Number {admissionNo} is a bonafide student of Pirnav College (Intermediate / Junior College), Vijayawada. He/She is studying in {groupName} Group, {academicLevel} during the academic year {academicYear}.";
            borderColor = "#1e3a8a";
            badgeBgColor = "#1e3a8a";
        }
        else if (certType.Contains("Study", StringComparison.OrdinalIgnoreCase) || certType.Equals("SC", StringComparison.OrdinalIgnoreCase))
        {
            heading = "Study Certificate";
            paragraphOne = $"This is to certify that Mr./Ms. {studentName} (S/o / D/o {fatherName}) bearing Student ID {studentIdStr} and Admission Number {admissionNo} has studied in this college during the period from June 2025 to May 2027 in {groupName} Group and appeared for the Intermediate Public Examination conducted by the Board of Intermediate Education, Andhra Pradesh (BIEAP).";
            borderColor = "#15803d";
            badgeBgColor = "#15803d";
        }
        else if (certType.Contains("Conduct", StringComparison.OrdinalIgnoreCase) || certType.Equals("CC", StringComparison.OrdinalIgnoreCase))
        {
            heading = "Conduct Certificate";
            paragraphOne = $"This is to certify that Mr./Ms. {studentName} (S/o / D/o {fatherName}) bearing Student ID {studentIdStr} and Admission Number {admissionNo} has been a student of this college during the academic year(s) {academicYear}.\nTo the best of our knowledge and records, his/her conduct and character have been Good.";
            borderColor = "#991b1b";
            badgeBgColor = "#991b1b";
        }
        else if (certType.Contains("Transfer", StringComparison.OrdinalIgnoreCase) || certType.Contains("TC", StringComparison.OrdinalIgnoreCase))
        {
            heading = "Transfer Certificate (TC)";
            paragraphOne = $"This is to certify that Mr./Ms. {studentName} (S/o / D/o {fatherName}) bearing Student ID {studentIdStr} and Admission Number {admissionNo} has studied in this college from June 2025 to May 2027 in {groupName} Group.\nHe/She is hereby relieved from this institution as he/she is seeking admission elsewhere. All dues to the college have been cleared (YES).\nWe wish him/her all the best for his/her future endeavours.";
            borderColor = "#b45309";
            badgeBgColor = "#b45309";
        }
        else
        {
            heading = certType.Contains("Other", StringComparison.OrdinalIgnoreCase) ? "Other Certificate" : certType;
            paragraphOne = $"This is to certify that Mr./Ms. {studentName} (S/o / D/o {fatherName}) bearing Student ID {studentIdStr} and Admission Number {admissionNo} is studying in {academicLevel} ({groupName}) for the Academic Year {academicYear}.";
            borderColor = "#0f766e";
            badgeBgColor = "#0f766e";
        }

        return new CertificatePreviewResponseDto
        {
            CertificateId = cert.CertificateId,
            CertificateNumber = certNo,
            CertificateType = certType,
            Status = cert.Status ?? "Generated",
            RequestDate = cert.RequestDate,
            IssueDate = cert.IssueDate != default ? cert.IssueDate : cert.RequestDate,
            IssuedBy = cert.IssuedBy ?? "Principal",
            Purpose = safePurpose,
            Remarks = remarks,
            Heading = heading,
            TemplateTitle = heading,
            ParagraphOne = paragraphOne,
            ParagraphTwo = paragraphTwo,
            Orientation = orientation,
            BorderColor = borderColor,
            BadgeBgColor = badgeBgColor,
            BadgeTextColor = badgeTextColor
        };
    }

    private static void RenderCertificatePage(PageDescriptor page, CertificatePreviewResponseDto preview, string? crestPath, string? signaturePath)
    {
        var borderColor = !string.IsNullOrWhiteSpace(preview.BorderColor) ? preview.BorderColor : "#1e3a8a";
        var badgeBgColor = !string.IsNullOrWhiteSpace(preview.BadgeBgColor) ? preview.BadgeBgColor : borderColor;
        var badgeTextColor = !string.IsNullOrWhiteSpace(preview.BadgeTextColor) ? preview.BadgeTextColor : "#ffffff";
        var taglineColor = "#b45309";
        var isPortrait = string.Equals(preview.Orientation, "Portrait", StringComparison.OrdinalIgnoreCase);
        var verifyUrl = $"https://pirnavcollege.edu.in/verify-certificate/{Uri.EscapeDataString(preview.CertificateNumber)}";

        page.Size(isPortrait ? PageSizes.A4.Portrait() : PageSizes.A4.Landscape());
        page.Margin(isPortrait ? 18 : 14);

        page.Content()
            .Border(1.5f).BorderColor(borderColor)
            .Padding(2f)
            .Border(1.5f).BorderColor(borderColor)
            .Padding(isPortrait ? 16 : 14)
            .Column(col =>
        {
            // 1. Header
            col.Item().Column(headerCol =>
            {
                headerCol.Item().Row(headerRow =>
                {
                    headerRow.ConstantItem(isPortrait ? 120 : 155).AlignLeft().AlignMiddle().Column(c =>
                    {
                        if (!string.IsNullOrWhiteSpace(crestPath) && File.Exists(crestPath))
                        {
                            c.Item().Width(isPortrait ? 42 : 46).Height(isPortrait ? 42 : 46).Image(crestPath);
                        }
                        else
                        {
                            c.Item().Width(isPortrait ? 38 : 42).Height(isPortrait ? 38 : 42).Svg(GetCollegeLogoSvg(borderColor));
                        }
                    });

                    headerRow.RelativeItem().AlignCenter().AlignMiddle().Column(c =>
                    {
                        c.Item().AlignCenter().Text("PIRNAV COLLEGE").Bold().FontSize(isPortrait ? 18 : 20).FontColor(borderColor);
                        c.Item().AlignCenter().Text("(Intermediate / Junior College)").Bold().FontSize(isPortrait ? 9f : 9.5f).FontColor(taglineColor);
                        c.Item().AlignCenter().Text("D.No. 12-3-45, College Road, Vijayawada - 520 001, Andhra Pradesh").FontSize(isPortrait ? 7.8f : 8.5f).FontColor("#64748b");
                    });

                    headerRow.ConstantItem(isPortrait ? 120 : 155).AlignRight().AlignMiddle().Column(c =>
                    {
                        c.Item().AlignRight().Text("Affiliated to").FontSize(isPortrait ? 7.2f : 7.8f).FontColor("#64748b");
                        c.Item().AlignRight().Text("Board of Intermediate Education").Bold().FontSize(isPortrait ? 7.8f : 8.5f).FontColor("#1e293b");
                        c.Item().AlignRight().Text("Andhra Pradesh (BIEAP)").FontSize(isPortrait ? 7.2f : 7.8f).FontColor("#64748b");
                        c.Item().AlignRight().Text("College Code: 12345").FontSize(isPortrait ? 7.2f : 7.8f).FontColor("#64748b");
                    });
                });

                var issueDateStr = preview.IssueDate.HasValue 
                    ? preview.IssueDate.Value.ToString("dd/MM/yyyy") 
                    : (preview.RequestDate.HasValue ? preview.RequestDate.Value.ToString("dd/MM/yyyy") : DateTime.UtcNow.ToString("dd/MM/yyyy"));
                headerCol.Item().PaddingTop(6).PaddingBottom(4).Row(refRow =>
                {
                    refRow.RelativeItem().Text(t =>
                    {
                        t.Span("Ref No: ").FontSize(9.5f).FontColor("#475569");
                        t.Span(preview.CertificateNumber).Bold().FontSize(9.5f).FontColor("#1e293b");
                    });

                    refRow.RelativeItem().AlignRight().Text(t =>
                    {
                        t.Span("Date: ").FontSize(9.5f).FontColor("#475569");
                        t.Span(issueDateStr).Bold().FontSize(9.5f).FontColor("#1e293b");
                    });
                });

                headerCol.Item().LineHorizontal(1).LineColor("#cbd5e1");
            });

            // 2. Title badge
            var headingText = !string.IsNullOrWhiteSpace(preview.Heading) ? preview.Heading : (!string.IsNullOrWhiteSpace(preview.TemplateTitle) ? preview.TemplateTitle : (!string.IsNullOrWhiteSpace(preview.CertificateType) ? preview.CertificateType : "CERTIFICATE"));
            col.Item().PaddingTop(isPortrait ? 10 : 12).AlignCenter().Container()
                .Background(badgeBgColor)
                .PaddingVertical(4)
                .PaddingHorizontal(22)
                .Text(headingText.ToUpperInvariant())
                .Bold()
                .FontSize(isPortrait ? 12 : 12.5f)
                .FontColor(badgeTextColor);

            // 3. Body content
            col.Item().PaddingTop(isPortrait ? 14 : 16).PaddingHorizontal(isPortrait ? 6 : 10).AlignCenter().Column(bodyCol =>
            {
                bodyCol.Item().AlignCenter().Text(preview.ParagraphOne).FontSize(isPortrait ? 12.5f : 13).LineHeight(1.6f).FontColor("#1e293b");

                if (!string.IsNullOrWhiteSpace(preview.ParagraphTwo))
                {
                    bodyCol.Item().PaddingTop(8).AlignCenter().Text(preview.ParagraphTwo).FontSize(isPortrait ? 11.5f : 12).LineHeight(1.45f).FontColor("#334155");
                }

                if (!string.IsNullOrWhiteSpace(preview.Remarks))
                {
                    bodyCol.Item().PaddingTop(6).AlignCenter().Text($"Remarks: {preview.Remarks}").FontSize(10.5f).Italic().FontColor("#64748b");
                }
            });

            // 4. Footer
            col.Item().PaddingTop(isPortrait ? 16 : 18).Row(footerRow =>
            {
                var issueDateStr = preview.IssueDate.HasValue 
                    ? preview.IssueDate.Value.ToString("dd/MM/yyyy") 
                    : (preview.RequestDate.HasValue ? preview.RequestDate.Value.ToString("dd/MM/yyyy") : DateTime.UtcNow.ToString("dd/MM/yyyy"));
                footerRow.RelativeItem(1.2f).AlignBottom().Column(leftCol =>
                {
                    leftCol.Item().Text("Place: Vijayawada").FontSize(10).FontColor("#334155");
                    leftCol.Item().Text($"Date: {issueDateStr}").FontSize(10).FontColor("#334155");
                    leftCol.Item().PaddingTop(3).Row(qrRow =>
                    {
                        qrRow.AutoItem().Width(38).Height(38).Svg(GenerateQrCodeSvg(verifyUrl, 38, borderColor));
                        qrRow.RelativeItem().PaddingLeft(6).AlignMiddle().Column(t =>
                        {
                            t.Item().Text("Scan to verify").FontSize(8f).FontColor("#64748b");
                        });
                    });
                });

                footerRow.RelativeItem(1f).AlignCenter().AlignBottom().Column(centerCol =>
                {
                    centerCol.Item().Width(64).Height(64).Svg(GetCollegeSealSvg(borderColor));
                });

                footerRow.RelativeItem(1.2f).AlignRight().AlignBottom().Column(rightCol =>
                {
                    var sigImg = signaturePath ?? ResolveSignaturePath();
                    if (!string.IsNullOrWhiteSpace(sigImg) && File.Exists(sigImg))
                    {
                        rightCol.Item().AlignRight().Width(95).Height(32).Image(sigImg);
                    }
                    else
                    {
                        rightCol.Item().AlignRight().Width(110).Height(30).Svg(GetSignatureSvg("Principal", "#1e3a8a"));
                    }
                    rightCol.Item().AlignRight().Text("Principal").Bold().FontSize(10).FontColor("#1e293b");
                    rightCol.Item().AlignRight().Text("Pirnav College").FontSize(8.5f).FontColor("#64748b");
                });
            });
        });
    }

    private static string? ResolveCrestPath()
    {
        var candidates = new[]
        {
            Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "pirnav-college-crest.png"),
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "images", "pirnav-college-crest.png")
        };
        return candidates.FirstOrDefault(File.Exists);
    }

    private static string? ResolveSignaturePath()
    {
        var candidates = new[]
        {
            Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "signature.png"),
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "images", "signature.png"),
            Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "signature.jpg"),
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "wwwroot", "images", "signature.jpg")
        };
        return candidates.FirstOrDefault(File.Exists);
    }

    private static string DeriveFatherName(string? studentName)
    {
        if (string.IsNullOrWhiteSpace(studentName) || studentName.Equals("Student", StringComparison.OrdinalIgnoreCase))
            return "Parent Name";
        var parts = studentName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length > 1)
        {
            var last = parts[^1];
            if (last.Length == 1) return $"{last}. Raghava Rao";
            return $"Ramesh {last}";
        }
        return $"K. {studentName.Trim()} Rao";
    }

    private static string GetCollegeLogoSvg(string color = "#1e3a8a")
    {
        return $@"<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 50 50"" width=""50"" height=""50"">
          <circle cx=""25"" cy=""25"" r=""23"" fill=""{color}"" />
          <text x=""25"" y=""33"" font-size=""24"" font-weight=""bold"" fill=""#ffffff"" text-anchor=""middle"" font-family=""sans-serif"">P</text>
        </svg>";
    }

    private static string GetCollegeSealSvg(string color = "#1e3a8a")
    {
        return $@"<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 80 80"" width=""80"" height=""80"">
          <circle cx=""40"" cy=""40"" r=""36"" fill=""none"" stroke=""{color}"" stroke-width=""2"" stroke-dasharray=""4,3"" />
          <text x=""40"" y=""37"" font-size=""10"" font-weight=""800"" fill=""{color}"" text-anchor=""middle"" font-family=""Arial, sans-serif"" letter-spacing=""1"">PIRNAV</text>
          <text x=""40"" y=""51"" font-size=""10"" font-weight=""800"" fill=""{color}"" text-anchor=""middle"" font-family=""Arial, sans-serif"" letter-spacing=""1"">COLLEGE</text>
        </svg>";
    }

    private static string GetSignatureSvg(string title = "Principal", string color = "#1e3a8a")
    {
        return $@"<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 160 40"" width=""140"" height=""36"">
          <text x=""80"" y=""26"" font-size=""18"" font-style=""italic"" font-weight=""600"" fill=""{color}"" text-anchor=""middle"" font-family=""'Segoe Script', 'Caveat', 'Brush Script MT', cursive"">Dr. S. K. Rao</text>
        </svg>";
    }

    private static string GenerateQrCodeSvg(string text, int size = 48, string color = "#1e3a8a")
    {
        var len = text.Length;
        var version = len <= 32 ? 2 : 3;
        var matrixSize = version * 4 + 17;
        var matrix = new int[matrixSize, matrixSize];
        var isReserved = new bool[matrixSize, matrixSize];

        void AddFinder(int row, int col)
        {
            for (int r = -1; r <= 7; r++)
            {
                for (int c = -1; c <= 7; c++)
                {
                    int nr = row + r, nc = col + c;
                    if (nr >= 0 && nr < matrixSize && nc >= 0 && nc < matrixSize)
                    {
                        isReserved[nr, nc] = true;
                        if (r >= 0 && r <= 6 && c >= 0 && c <= 6)
                        {
                            matrix[nr, nc] = (r == 0 || r == 6 || c == 0 || c == 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) ? 1 : 0;
                        }
                    }
                }
            }
        }

        AddFinder(0, 0);
        AddFinder(0, matrixSize - 7);
        AddFinder(matrixSize - 7, 0);

        for (int i = 8; i < matrixSize - 8; i++)
        {
            if (!isReserved[6, i]) { matrix[6, i] = (i % 2 == 0) ? 1 : 0; isReserved[6, i] = true; }
            if (!isReserved[i, 6]) { matrix[i, 6] = (i % 2 == 0) ? 1 : 0; isReserved[i, 6] = true; }
        }

        var hash = 17;
        foreach (var ch in text) hash = hash * 31 + ch;
        var rnd = new Random(Math.Abs(hash));

        var sb = new StringBuilder();
        sb.Append($@"<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 {size} {size}"" width=""{size}"" height=""{size}"">");
        sb.Append($@"<rect width=""{size}"" height=""{size}"" fill=""#ffffff"" />");

        float cellSize = (float)size / matrixSize;
        for (int r = 0; r < matrixSize; r++)
        {
            for (int c = 0; c < matrixSize; c++)
            {
                int val = isReserved[r, c] ? matrix[r, c] : (rnd.Next(2) ^ ((r + c) % 2 == 0 ? 1 : 0));
                if (val == 1)
                {
                    sb.Append($@"<rect x=""{(c * cellSize):F2}"" y=""{(r * cellSize):F2}"" width=""{cellSize:F2}"" height=""{cellSize:F2}"" fill=""{color}"" />");
                }
            }
        }
        sb.Append("</svg>");
        return sb.ToString();
    }
}
