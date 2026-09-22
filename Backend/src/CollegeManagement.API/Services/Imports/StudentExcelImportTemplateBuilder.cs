using System;
using System.Collections.Generic;
using System.IO;
using ClosedXML.Excel;

namespace CollegeManagement.API.Services.Imports
{
    public static class StudentExcelImportTemplateBuilder
    {
        private static readonly XLColor PrimaryNavy = XLColor.FromArgb(30, 58, 138);       // #1E3A8A
        private static readonly XLColor PrimaryBlue = XLColor.FromArgb(37, 99, 235);       // #2563EB
        private static readonly XLColor HeaderGray = XLColor.FromArgb(241, 245, 249);      // #F1F5F9
        private static readonly XLColor AccentGreen = XLColor.FromArgb(16, 185, 129);      // #10B981
        private static readonly XLColor RequiredRed = XLColor.FromArgb(239, 68, 68);       // #EF4444
        private static readonly XLColor MutedText = XLColor.FromArgb(100, 116, 139);       // #64748B
        private static readonly XLColor DarkText = XLColor.FromArgb(15, 23, 42);          // #0F172A
        private static readonly XLColor BorderGray = XLColor.FromArgb(203, 213, 225);      // #CBD5E1

        public static readonly string[] Exact56Headers = new[]
        {
            "Admission No *", "Roll No", "Student Name *", "Gender *", "Date of Birth *",
            "Blood Group", "Mobile Number", "Email", "Aadhaar Number", "Board Code *",
            "Academic Year *", "Academic Level *", "Group Code *", "Program Name", "Section Name",
            "Admission Date", "Admission Type", "Admission Quota", "Medium", "Second Language",
            "Nationality", "Religion", "Category", "Student Category", "Father Name",
            "Father Occupation", "Father Mobile", "Father Email", "Mother Name", "Mother Occupation",
            "Mother Mobile", "Mother Email", "Guardian Name", "Guardian Mobile", "Guardian Email",
            "Address", "City", "District", "State", "Pincode",
            "Previous School", "Previous Board", "Previous Hall Ticket", "Previous Year Passing", "Previous Percentage",
            "Fee Amount", "Fee Paid", "Fee Status", "Scholarship Status", "Scholarship Amount",
            "Annual Income", "Attendance Percentage", "Performance Grade", "CGPA", "Rank", "Remarks"
        };

        public static byte[] BuildTemplate(
            IEnumerable<(string Code, string Name)> boards,
            IEnumerable<string> academicYears,
            IEnumerable<(string Code, string Name)> academicLevels,
            IEnumerable<(string Code, string Name, string BoardCode, string LevelCode)> groups,
            IEnumerable<(string ProgramName, string GroupCode)> programs,
            IEnumerable<(string SectionName, string GroupCode, string ProgramName, string YearName, string LevelCode, string BoardCode)> sections)
        {
            using var workbook = new XLWorkbook();

            // Sheet 1: Instructions & Guidelines
            BuildInstructionsSheet(workbook);

            // Sheet 2: Students (Data Entry Sheet)
            BuildStudentsDataSheet(workbook);

            // Sheet 3: Academic Master Data (Reference Only)
            BuildMasterDataSheet(workbook, boards, academicYears, academicLevels, groups, programs, sections);

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        private static void BuildInstructionsSheet(IXLWorkbook workbook)
        {
            var ws = workbook.Worksheets.Add("Instructions");

            ws.Cell(1, 1).Value = "COLLEGE MANAGEMENT SYSTEM";
            ws.Cell(1, 1).Style.Font.Bold = true;
            ws.Cell(1, 1).Style.Font.FontSize = 14;
            ws.Cell(1, 1).Style.Font.FontColor = PrimaryNavy;

            ws.Cell(2, 1).Value = "LEGACY STUDENT BULK IMPORT - OFFICIAL GUIDELINES";
            ws.Cell(2, 1).Style.Font.Bold = true;
            ws.Cell(2, 1).Style.Font.FontSize = 11;
            ws.Cell(2, 1).Style.Font.FontColor = PrimaryBlue;

            ws.Cell(4, 1).Value = "IMPORTANT RULES & INSTRUCTIONS:";
            ws.Cell(4, 1).Style.Font.Bold = true;
            ws.Cell(4, 1).Style.Font.FontColor = DarkText;

            var rules = new[]
            {
                "1. Fill your historical student records in the 'Students' sheet only.",
                "2. Headers marked with an asterisk (*) are strictly MANDATORY: Admission No, Student Name, Gender, Date of Birth, Board Code, Academic Year, Academic Level, Group Code.",
                "3. Use exact Codes and Names as shown in the 'Academic Master Data' reference sheet.",
                "4. Date Format: Use YYYY-MM-DD (e.g., 2008-05-14) or standard Excel Date format.",
                "5. Gender must be one of: Male, Female, Other.",
                "6. Phone Numbers (Mobile / Father / Mother / Guardian) must be 10 digits starting with 6-9 (e.g., 9876543210).",
                "7. Aadhaar Number must be exactly 12 digits (e.g., 123456789012).",
                "8. Pincode must be exactly 6 digits (e.g., 500001).",
                "9. Initial login credentials will be automatically generated and sent to the student's registered email address.",
                "10. Do NOT modify or rename column headers in the 'Students' worksheet.",
                "11. Student photos and document certificates can be uploaded later via the Student Profile screen."
            };

            for (int i = 0; i < rules.Length; i++)
            {
                ws.Cell(5 + i, 1).Value = rules[i];
                ws.Cell(5 + i, 1).Style.Font.FontSize = 10;
                ws.Cell(5 + i, 1).Style.Font.FontColor = DarkText;
            }

            ws.Columns().AdjustToContents();
        }

        private static void BuildStudentsDataSheet(IXLWorkbook workbook)
        {
            var ws = workbook.Worksheets.Add("Students");

            // Title banner
            ws.Cell(1, 1).Value = "STUDENT DATA IMPORT (56 CANONICAL COLUMNS)";
            ws.Cell(1, 1).Style.Font.Bold = true;
            ws.Cell(1, 1).Style.Font.FontSize = 12;
            ws.Cell(1, 1).Style.Font.FontColor = PrimaryNavy;

            // Headers at Row 3
            int headerRow = 3;
            for (int col = 0; col < Exact56Headers.Length; col++)
            {
                var cell = ws.Cell(headerRow, col + 1);
                cell.Value = Exact56Headers[col];
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontSize = 10;
                cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                cell.Style.Border.OutsideBorderColor = BorderGray;

                if (Exact56Headers[col].Contains("*"))
                {
                    cell.Style.Fill.BackgroundColor = XLColor.FromArgb(254, 226, 226); // Light Red
                    cell.Style.Font.FontColor = RequiredRed;
                }
                else
                {
                    cell.Style.Fill.BackgroundColor = HeaderGray;
                    cell.Style.Font.FontColor = DarkText;
                }
            }
            ws.Row(headerRow).Height = 26;

            // Sample Row at Row 4
            int sampleRow = 4;
            var sampleValues = new object[]
            {
                "ADM-2024-0001", "R-101", "Aarav Sharma", "Male", "2008-05-14",
                "O+", "9876543210", "aarav.sharma@example.com", "123456789012", "BIEAP",
                "2026-2027", "INTER-1", "MPC", "Regular", "Section A",
                "2024-06-01", "Regular", "General", "English", "Sanskrit",
                "Indian", "Hindu", "OC", "Day Scholar", "Ramesh Sharma",
                "Business", "9876543211", "ramesh.sharma@example.com", "Sita Sharma", "Teacher",
                "9876543212", "sita.sharma@example.com", "", "", "",
                "H.No 12-34, Main Road", "Hyderabad", "Hyderabad", "Telangana", "500001",
                "St. Johns High School", "SSC", "HT-2024-9988", 2024, 88.50,
                50000.00, 25000.00, "PartiallyPaid", "None", 0.00,
                240000.00, 92.50, "A+", 8.80, 5, "Sample legacy migration record"
            };

            for (int col = 0; col < sampleValues.Length; col++)
            {
                var cell = ws.Cell(sampleRow, col + 1);
                cell.Value = sampleValues[col] != null ? sampleValues[col].ToString() : "";
                cell.Style.Font.Italic = true;
                cell.Style.Font.FontSize = 9;
                cell.Style.Font.FontColor = MutedText;
                cell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                cell.Style.Border.OutsideBorderColor = BorderGray;
            }

            ws.Columns().AdjustToContents();
        }

        private static void BuildMasterDataSheet(
            IXLWorkbook workbook,
            IEnumerable<(string Code, string Name)> boards,
            IEnumerable<string> academicYears,
            IEnumerable<(string Code, string Name)> academicLevels,
            IEnumerable<(string Code, string Name, string BoardCode, string LevelCode)> groups,
            IEnumerable<(string ProgramName, string GroupCode)> programs,
            IEnumerable<(string SectionName, string GroupCode, string ProgramName, string YearName, string LevelCode, string BoardCode)> sections)
        {
            var ws = workbook.Worksheets.Add("Academic Master Data");

            ws.Cell(1, 1).Value = "ACADEMIC MASTER DATA REFERENCE (READ-ONLY)";
            ws.Cell(1, 1).Style.Font.Bold = true;
            ws.Cell(1, 1).Style.Font.FontSize = 12;
            ws.Cell(1, 1).Style.Font.FontColor = PrimaryNavy;

            int col = 1;

            // Boards
            ws.Cell(3, col).Value = "Boards";
            ws.Cell(4, col).Value = "Board Code";
            ws.Cell(4, col + 1).Value = "Board Name";
            ws.Range(4, col, 4, col + 1).Style.Font.Bold = true;
            ws.Range(4, col, 4, col + 1).Style.Fill.BackgroundColor = HeaderGray;
            int r = 5;
            foreach (var b in boards)
            {
                ws.Cell(r, col).Value = b.Code;
                ws.Cell(r, col + 1).Value = b.Name;
                r++;
            }
            col += 3;

            // Academic Years
            ws.Cell(3, col).Value = "Academic Years";
            ws.Cell(4, col).Value = "Academic Year";
            ws.Cell(4, col).Style.Font.Bold = true;
            ws.Cell(4, col).Style.Fill.BackgroundColor = HeaderGray;
            r = 5;
            foreach (var y in academicYears)
            {
                ws.Cell(r, col).Value = y;
                r++;
            }
            col += 2;

            // Academic Levels
            ws.Cell(3, col).Value = "Academic Levels";
            ws.Cell(4, col).Value = "Level Code";
            ws.Cell(4, col + 1).Value = "Level Name";
            ws.Range(4, col, 4, col + 1).Style.Font.Bold = true;
            ws.Range(4, col, 4, col + 1).Style.Fill.BackgroundColor = HeaderGray;
            r = 5;
            foreach (var l in academicLevels)
            {
                ws.Cell(r, col).Value = l.Code;
                ws.Cell(r, col + 1).Value = l.Name;
                r++;
            }
            col += 3;

            // Groups
            ws.Cell(3, col).Value = "Groups";
            ws.Cell(4, col).Value = "Group Code";
            ws.Cell(4, col + 1).Value = "Group Name";
            ws.Cell(4, col + 2).Value = "Board Code";
            ws.Cell(4, col + 3).Value = "Level Code";
            ws.Range(4, col, 4, col + 3).Style.Font.Bold = true;
            ws.Range(4, col, 4, col + 3).Style.Fill.BackgroundColor = HeaderGray;
            r = 5;
            foreach (var g in groups)
            {
                ws.Cell(r, col).Value = g.Code;
                ws.Cell(r, col + 1).Value = g.Name;
                ws.Cell(r, col + 2).Value = g.BoardCode;
                ws.Cell(r, col + 3).Value = g.LevelCode;
                r++;
            }
            col += 5;

            // Programs
            ws.Cell(3, col).Value = "Programs";
            ws.Cell(4, col).Value = "Program Name";
            ws.Cell(4, col + 1).Value = "Group Code";
            ws.Range(4, col, 4, col + 1).Style.Font.Bold = true;
            ws.Range(4, col, 4, col + 1).Style.Fill.BackgroundColor = HeaderGray;
            r = 5;
            foreach (var p in programs)
            {
                ws.Cell(r, col).Value = p.ProgramName;
                ws.Cell(r, col + 1).Value = p.GroupCode;
                r++;
            }
            col += 3;

            // Sections
            ws.Cell(3, col).Value = "Sections Master Reference";
            ws.Cell(4, col).Value = "Board Code";
            ws.Cell(4, col + 1).Value = "Academic Year";
            ws.Cell(4, col + 2).Value = "Level Code";
            ws.Cell(4, col + 3).Value = "Group Code";
            ws.Cell(4, col + 4).Value = "Program Name";
            ws.Cell(4, col + 5).Value = "Section Name";
            ws.Range(4, col, 4, col + 5).Style.Font.Bold = true;
            ws.Range(4, col, 4, col + 5).Style.Fill.BackgroundColor = HeaderGray;
            r = 5;
            foreach (var s in sections)
            {
                ws.Cell(r, col).Value = s.BoardCode;
                ws.Cell(r, col + 1).Value = s.YearName;
                ws.Cell(r, col + 2).Value = s.LevelCode;
                ws.Cell(r, col + 3).Value = s.GroupCode;
                ws.Cell(r, col + 4).Value = s.ProgramName;
                ws.Cell(r, col + 5).Value = s.SectionName;
                r++;
            }

            ws.Columns().AdjustToContents();
        }
    }
}