using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using ClosedXML.Excel;

namespace CollegeManagement.API.Services.Exports
{
    public static class StudentExcelWorkbookBuilder
    {
        private static readonly XLColor PrimaryNavy = XLColor.FromArgb(30, 58, 138);       // #1E3A8A
        private static readonly XLColor PrimaryBlue = XLColor.FromArgb(37, 99, 235);       // #2563EB
        private static readonly XLColor HeaderGray = XLColor.FromArgb(241, 245, 249);      // #F1F5F9
        private static readonly XLColor ZebraLight = XLColor.FromArgb(248, 250, 252);      // #F8FAFC
        private static readonly XLColor BorderGray = XLColor.FromArgb(203, 213, 225);      // #CBD5E1
        private static readonly XLColor MutedText = XLColor.FromArgb(100, 116, 139);       // #64748B
        private static readonly XLColor DarkText = XLColor.FromArgb(15, 23, 42);          // #0F172A

        public static byte[] BuildWorkbook(StudentExcelExportModel model)
        {
            using var workbook = new XLWorkbook();

            // Sheet 1: Student Overview
            BuildOverviewSheet(workbook, model);

            // Sheet 2: Students
            BuildStudentsSheet(workbook, model);

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        private static void BuildOverviewSheet(IXLWorkbook workbook, StudentExcelExportModel model)
        {
            var ws = workbook.Worksheets.Add("Student Overview");

            // Title Banner
            ws.Cell(1, 1).Value = "COLLEGE MANAGEMENT SYSTEM";
            ws.Cell(1, 1).Style.Font.Bold = true;
            ws.Cell(1, 1).Style.Font.FontSize = 14;
            ws.Cell(1, 1).Style.Font.FontColor = PrimaryNavy;

            ws.Cell(2, 1).Value = "STUDENT LIST EXPORT & SUMMARY";
            ws.Cell(2, 1).Style.Font.Bold = true;
            ws.Cell(2, 1).Style.Font.FontSize = 11;
            ws.Cell(2, 1).Style.Font.FontColor = PrimaryBlue;

            ws.Cell(3, 1).Value = $"Generated: {model.GeneratedAt:dd-MMM-yyyy hh:mm tt} | System Export";
            ws.Cell(3, 1).Style.Font.Italic = true;
            ws.Cell(3, 1).Style.Font.FontSize = 9;
            ws.Cell(3, 1).Style.Font.FontColor = MutedText;

            int row = 5;

            // Applied Filters Block
            ws.Cell(row, 1).Value = "APPLIED FILTER PARAMETERS";
            ws.Cell(row, 1).Style.Font.Bold = true;
            ws.Cell(row, 1).Style.Font.FontSize = 10;
            ws.Cell(row, 1).Style.Font.FontColor = PrimaryNavy;
            ws.Range(row, 1, row, 3).Merge();
            ws.Range(row, 1, row, 3).Style.Fill.BackgroundColor = HeaderGray;
            ws.Range(row, 1, row, 3).Style.Border.SetOutsideBorder(XLBorderStyleValues.Thin).Border.SetOutsideBorderColor(BorderGray);
            row++;

            if (!model.HasAnyFilter)
            {
                ws.Cell(row, 1).Value = "Filter Scope";
                ws.Cell(row, 1).Style.Font.Bold = true;
                ws.Cell(row, 2).Value = "All Students (No active filters applied)";
                ws.Cell(row, 2).Style.Font.Italic = true;
                ws.Range(row, 1, row, 3).Style.Border.SetOutsideBorder(XLBorderStyleValues.Thin).Border.SetOutsideBorderColor(BorderGray);
                row += 2;
            }
            else
            {
                var filters = new List<(string Label, string? Value)>
                {
                    ("Board", model.BoardName),
                    ("Academic Level", model.AcademicLevelName),
                    ("Academic Year", model.AcademicYearName),
                    ("Group", model.GroupName),
                    ("Program", model.ProgramName),
                    ("Section", model.SectionName),
                    ("Status", model.Status),
                    ("Active Flag", model.IsActive.HasValue ? (model.IsActive.Value ? "Active Only" : "Inactive Only") : null)
                };

                foreach (var f in filters.Where(x => !string.IsNullOrWhiteSpace(x.Value)))
                {
                    ws.Cell(row, 1).Value = f.Label;
                    ws.Cell(row, 1).Style.Font.Bold = true;
                    ws.Cell(row, 1).Style.Font.FontSize = 9;
                    ws.Cell(row, 2).Value = f.Value;
                    ws.Cell(row, 2).Style.Font.FontSize = 9;
                    ws.Range(row, 1, row, 3).Style.Border.SetOutsideBorder(XLBorderStyleValues.Thin).Border.SetOutsideBorderColor(BorderGray);
                    row++;
                }
                row++;
            }

            // Summary Metrics Block
            ws.Cell(row, 1).Value = "EXPORT METRICS & BREAKDOWN";
            ws.Cell(row, 1).Style.Font.Bold = true;
            ws.Cell(row, 1).Style.Font.FontSize = 10;
            ws.Cell(row, 1).Style.Font.FontColor = PrimaryNavy;
            ws.Range(row, 1, row, 4).Merge();
            ws.Range(row, 1, row, 4).Style.Fill.BackgroundColor = HeaderGray;
            ws.Range(row, 1, row, 4).Style.Border.SetOutsideBorder(XLBorderStyleValues.Thin).Border.SetOutsideBorderColor(BorderGray);
            row++;

            int totalStudents = model.Students.Count;
            int totalGroups = model.Students.Select(s => s.GroupName).Where(g => !string.IsNullOrWhiteSpace(g)).Distinct().Count();
            int totalPrograms = model.Students.Select(s => s.ProgramName).Where(p => !string.IsNullOrWhiteSpace(p)).Distinct().Count();
            int totalSections = model.Students.Select(s => $"{s.GroupName}_{s.ProgramName}_{s.SectionName}").Where(sec => !string.IsNullOrWhiteSpace(sec)).Distinct().Count();

            var metrics = new List<(string Label, int Value)>
            {
                ("Total Enrolled Students", totalStudents),
                ("Distinct Groups", totalGroups),
                ("Distinct Programs", totalPrograms),
                ("Distinct Sections", totalSections)
            };

            foreach (var m in metrics)
            {
                ws.Cell(row, 1).Value = m.Label;
                ws.Cell(row, 1).Style.Font.Bold = true;
                ws.Cell(row, 1).Style.Font.FontSize = 9;
                ws.Cell(row, 2).Value = m.Value;
                ws.Cell(row, 2).Style.Font.Bold = true;
                ws.Cell(row, 2).Style.Font.FontSize = 9;
                ws.Cell(row, 2).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;
                ws.Range(row, 1, row, 2).Style.Border.SetOutsideBorder(XLBorderStyleValues.Thin).Border.SetOutsideBorderColor(BorderGray);
                row++;
            }
            row++;

            // Section Breakdown Table
            if (model.Students.Any())
            {
                ws.Cell(row, 1).Value = "Section Breakdown";
                ws.Cell(row, 1).Style.Font.Bold = true;
                ws.Cell(row, 1).Style.Font.FontSize = 10;
                ws.Cell(row, 1).Style.Font.FontColor = PrimaryNavy;
                row++;

                string[] breakHeaders = { "Group", "Program", "Section", "Student Count" };
                for (int c = 0; c < breakHeaders.Length; c++)
                {
                    var cell = ws.Cell(row, c + 1);
                    cell.Value = breakHeaders[c];
                    cell.Style.Font.Bold = true;
                    cell.Style.Font.FontSize = 9;
                    cell.Style.Font.FontColor = XLColor.White;
                    cell.Style.Fill.BackgroundColor = PrimaryBlue;
                    cell.Style.Alignment.Horizontal = (c == 3) ? XLAlignmentHorizontalValues.Right : XLAlignmentHorizontalValues.Left;
                }
                row++;

                var breakdown = model.Students
                    .GroupBy(s => new { s.GroupName, s.ProgramName, s.SectionName })
                    .OrderBy(g => g.Key.GroupName)
                    .ThenBy(g => g.Key.ProgramName)
                    .ThenBy(g => g.Key.SectionName)
                    .ToList();

                foreach (var grp in breakdown)
                {
                    ws.Cell(row, 1).Value = grp.Key.GroupName;
                    ws.Cell(row, 2).Value = grp.Key.ProgramName;
                    ws.Cell(row, 3).Value = grp.Key.SectionName;
                    ws.Cell(row, 4).Value = grp.Count();
                    ws.Cell(row, 4).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Right;

                    ws.Range(row, 1, row, 4).Style.Font.FontSize = 9;
                    ws.Range(row, 1, row, 4).Style.Border.SetOutsideBorder(XLBorderStyleValues.Thin).Border.SetOutsideBorderColor(BorderGray);
                    ws.Range(row, 1, row, 4).Style.Border.SetInsideBorder(XLBorderStyleValues.Thin).Border.SetInsideBorderColor(BorderGray);
                    row++;
                }
            }

            ws.Columns().AdjustToContents(1, 30);
            ws.PageSetup.PageOrientation = XLPageOrientation.Landscape;
        }

        private static void BuildStudentsSheet(IXLWorkbook workbook, StudentExcelExportModel model)
        {
            var ws = workbook.Worksheets.Add("Students");

            string[] headers = new[]
            {
                "S.No",
                "Student Name",
                "Admission No",
                "Roll No",
                "Gender",
                "Date of Birth",
                "Blood Group",
                "Mobile",
                "Email",
                "Board",
                "Academic Year",
                "Academic Level",
                "Group",
                "Program",
                "Section",
                "Status",
                "Active"
            };

            // Header Row (Row 1)
            ws.Row(1).Height = 26;
            for (int col = 0; col < headers.Length; col++)
            {
                var cell = ws.Cell(1, col + 1);
                cell.Value = headers[col];
                cell.Style.Font.Bold = true;
                cell.Style.Font.FontSize = 9.5;
                cell.Style.Font.FontColor = XLColor.White;
                cell.Style.Fill.BackgroundColor = PrimaryNavy;
                cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                cell.Style.Alignment.Horizontal = (col == 0 || col == 4 || col == 6 || col == 15 || col == 16)
                    ? XLAlignmentHorizontalValues.Center
                    : XLAlignmentHorizontalValues.Left;
            }

            // Freeze Header Row
            ws.SheetView.FreezeRows(1);

            int currentRow = 2;

            if (!model.Students.Any())
            {
                // Controlled Empty Result Row
                ws.Row(currentRow).Height = 24;
                var emptyCell = ws.Cell(currentRow, 1);
                emptyCell.Value = "No students found for the selected filters.";
                emptyCell.Style.Font.Italic = true;
                emptyCell.Style.Font.FontSize = 9.5;
                emptyCell.Style.Font.FontColor = MutedText;
                emptyCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                emptyCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

                var emptyRange = ws.Range(currentRow, 1, currentRow, headers.Length);
                emptyRange.Merge();
                emptyRange.Style.Fill.BackgroundColor = HeaderGray;
                emptyRange.Style.Border.SetOutsideBorder(XLBorderStyleValues.Thin).Border.SetOutsideBorderColor(BorderGray);
            }
            else
            {
                for (int i = 0; i < model.Students.Count; i++)
                {
                    var s = model.Students[i];
                    ws.Row(currentRow).Height = 20;

                    ws.Cell(currentRow, 1).Value = s.SNo;
                    ws.Cell(currentRow, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                    ws.Cell(currentRow, 2).Value = s.StudentName;
                    ws.Cell(currentRow, 2).Style.Font.Bold = true;

                    ws.Cell(currentRow, 3).Value = s.AdmissionNo;
                    ws.Cell(currentRow, 4).Value = s.RollNo;
                    ws.Cell(currentRow, 5).Value = s.Gender;
                    ws.Cell(currentRow, 5).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                    if (s.DateOfBirth.HasValue)
                    {
                        ws.Cell(currentRow, 6).Value = s.DateOfBirth.Value.ToString("dd-MMM-yyyy");
                    }
                    else
                    {
                        ws.Cell(currentRow, 6).Value = "N/A";
                    }
                    ws.Cell(currentRow, 6).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                    ws.Cell(currentRow, 7).Value = s.BloodGroup ?? "N/A";
                    ws.Cell(currentRow, 7).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                    ws.Cell(currentRow, 8).Value = s.MobileNumber ?? "N/A";
                    ws.Cell(currentRow, 9).Value = s.Email ?? "N/A";

                    ws.Cell(currentRow, 10).Value = s.BoardName;
                    ws.Cell(currentRow, 11).Value = s.AcademicYearName;
                    ws.Cell(currentRow, 12).Value = s.AcademicLevelName;

                    ws.Cell(currentRow, 13).Value = s.GroupName;
                    ws.Cell(currentRow, 14).Value = s.ProgramName;
                    ws.Cell(currentRow, 15).Value = s.SectionName;

                    ws.Cell(currentRow, 16).Value = s.Status;
                    ws.Cell(currentRow, 16).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                    ws.Cell(currentRow, 17).Value = s.IsActive ? "Yes" : "No";
                    ws.Cell(currentRow, 17).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                    var rowRange = ws.Range(currentRow, 1, currentRow, headers.Length);
                    rowRange.Style.Font.FontSize = 9;
                    rowRange.Style.Border.SetInsideBorder(XLBorderStyleValues.Thin).Border.SetInsideBorderColor(BorderGray);
                    rowRange.Style.Border.SetOutsideBorder(XLBorderStyleValues.Thin).Border.SetOutsideBorderColor(BorderGray);

                    if (i % 2 == 1)
                    {
                        rowRange.Style.Fill.BackgroundColor = ZebraLight;
                    }

                    currentRow++;
                }

                // Enable AutoFilter
                ws.Range(1, 1, currentRow - 1, headers.Length).SetAutoFilter();
            }

            ws.Columns().AdjustToContents(1, 40);
            ws.PageSetup.PageOrientation = XLPageOrientation.Landscape;
            ws.PageSetup.SetRowsToRepeatAtTop(1, 1);
        }
    }
}