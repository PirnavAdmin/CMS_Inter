using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using ClosedXML.Excel;

namespace CollegeManagement.API.Services.Exports
{
    /// <summary>
    /// Professional ClosedXML builder for Group Timetable Excel workbooks.
    /// Preserves Group -> Program -> Section -> Day -> Period hierarchy.
    /// </summary>
    public static class GroupTimetableExcelBuilder
    {
        // Color Palette
        private static readonly XLColor PrimaryNavy = XLColor.FromArgb(30, 58, 138);       // #1E3A8A
        private static readonly XLColor PrimaryBlue = XLColor.FromArgb(37, 99, 235);       // #2563EB
        private static readonly XLColor SectionBanner = XLColor.FromArgb(224, 231, 255);    // #E0E7FF
        private static readonly XLColor BreakHeader = XLColor.FromArgb(217, 119, 6);       // #D97706
        private static readonly XLColor BreakCell = XLColor.FromArgb(254, 243, 199);        // #FEF3C7
        private static readonly XLColor LightGrayRow = XLColor.FromArgb(248, 250, 252);     // #F8FAFC
        private static readonly XLColor BorderGray = XLColor.FromArgb(203, 213, 225);       // #CBD5E1
        private static readonly XLColor MutedText = XLColor.FromArgb(100, 116, 139);        // #64748B
        private static readonly XLColor DarkText = XLColor.FromArgb(15, 23, 42);           // #0F172A

        /// <summary>
        /// Generates the complete Excel workbook binary stream.
        /// </summary>
        public static byte[] BuildWorkbook(GroupTimetableExcelModel model)
        {
            using var workbook = new XLWorkbook();

            var existingSheetNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            // 1. Group Overview Sheet
            BuildOverviewSheet(workbook, model, existingSheetNames);

            // 2. Program Worksheets (One per Program)
            foreach (var program in model.Programs)
            {
                BuildProgramSheet(workbook, model, program, existingSheetNames);
            }

            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        /// <summary>
        /// Generates Sheet 1: Group Overview with metadata summary and program breakdown.
        /// </summary>
        private static void BuildOverviewSheet(
            IXLWorkbook workbook,
            GroupTimetableExcelModel model,
            HashSet<string> existingSheetNames)
        {
            string sheetName = GetSafeSheetName("Group Overview", existingSheetNames);
            var ws = workbook.Worksheets.Add(sheetName);

            // Title Banner
            ws.Range("A1:D1").Merge();
            var titleCell = ws.Cell("A1");
            titleCell.Value = "GROUP TIMETABLE OVERVIEW";
            titleCell.Style.Font.Bold = true;
            titleCell.Style.Font.FontSize = 14;
            titleCell.Style.Font.FontColor = XLColor.White;
            titleCell.Style.Fill.BackgroundColor = PrimaryNavy;
            titleCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            titleCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            ws.Row(1).Height = 28;

            // Metadata Box
            int metaStart = 3;
            var metaItems = new List<(string Label, string Value)>
            {
                ("Academic Group:", $"{model.GroupName} ({model.GroupCode})"),
                ("Board:", $"{model.BoardName} ({model.BoardCode})"),
                ("Academic Level:", model.AcademicLevelName),
                ("Academic Year:", model.AcademicYearName),
                ("Export Generated:", model.GeneratedAt.ToString("dd-MMM-yyyy HH:mm:ss"))
            };

            for (int i = 0; i < metaItems.Count; i++)
            {
                int row = metaStart + i;
                ws.Cell(row, 1).Value = metaItems[i].Label;
                ws.Cell(row, 1).Style.Font.Bold = true;
                ws.Cell(row, 1).Style.Font.FontSize = 10;
                ws.Cell(row, 1).Style.Font.FontColor = DarkText;
                ws.Cell(row, 1).Style.Fill.BackgroundColor = LightGrayRow;

                ws.Range(row, 2, row, 4).Merge();
                var valCell = ws.Cell(row, 2);
                valCell.Value = metaItems[i].Value;
                valCell.Style.Font.FontSize = 10;
                valCell.Style.Font.FontColor = DarkText;
                valCell.Style.Fill.BackgroundColor = LightGrayRow;

                ws.Range(row, 1, row, 4).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                ws.Range(row, 1, row, 4).Style.Border.OutsideBorderColor = BorderGray;
                ws.Row(row).Height = 20;
            }

            // Program Breakdown Table
            int tableHeaderRow = metaStart + metaItems.Count + 2;
            ws.Cell(tableHeaderRow - 1, 1).Value = "PROGRAM BREAKDOWN";
            ws.Cell(tableHeaderRow - 1, 1).Style.Font.Bold = true;
            ws.Cell(tableHeaderRow - 1, 1).Style.Font.FontSize = 11;
            ws.Cell(tableHeaderRow - 1, 1).Style.Font.FontColor = PrimaryNavy;

            string[] headers = { "Program Name", "Program ID", "Number of Sections", "Total Timetable Slots" };
            for (int col = 0; col < headers.Length; col++)
            {
                var hCell = ws.Cell(tableHeaderRow, col + 1);
                hCell.Value = headers[col];
                hCell.Style.Font.Bold = true;
                hCell.Style.Font.FontSize = 10;
                hCell.Style.Font.FontColor = XLColor.White;
                hCell.Style.Fill.BackgroundColor = PrimaryBlue;
                hCell.Style.Alignment.Horizontal = col >= 2 ? XLAlignmentHorizontalValues.Center : XLAlignmentHorizontalValues.Left;
                hCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            }
            ws.Row(tableHeaderRow).Height = 24;

            int dataRow = tableHeaderRow + 1;
            int totalSections = 0;
            int totalSlots = 0;

            foreach (var item in model.ProgramSummaries)
            {
                ws.Cell(dataRow, 1).Value = item.ProgramName;
                ws.Cell(dataRow, 2).Value = item.ProgramId.HasValue ? item.ProgramId.Value.ToString() : "-";
                ws.Cell(dataRow, 3).Value = item.SectionCount;
                ws.Cell(dataRow, 4).Value = item.TotalSlots;

                ws.Cell(dataRow, 1).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
                ws.Cell(dataRow, 2).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                ws.Cell(dataRow, 3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                ws.Cell(dataRow, 4).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;

                var rowRange = ws.Range(dataRow, 1, dataRow, 4);
                rowRange.Style.Font.FontSize = 9.5;
                rowRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
                rowRange.Style.Border.InsideBorderColor = BorderGray;
                rowRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                rowRange.Style.Border.OutsideBorderColor = BorderGray;

                if (dataRow % 2 == 0)
                {
                    rowRange.Style.Fill.BackgroundColor = LightGrayRow;
                }

                ws.Row(dataRow).Height = 20;
                totalSections += item.SectionCount;
                totalSlots += item.TotalSlots;
                dataRow++;
            }

            // Total Summary Row
            ws.Cell(dataRow, 1).Value = "Total";
            ws.Cell(dataRow, 2).Value = "";
            ws.Cell(dataRow, 3).Value = totalSections;
            ws.Cell(dataRow, 4).Value = totalSlots;

            var totalRange = ws.Range(dataRow, 1, dataRow, 4);
            totalRange.Style.Font.Bold = true;
            totalRange.Style.Font.FontSize = 10;
            totalRange.Style.Fill.BackgroundColor = LightGrayRow;
            totalRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            totalRange.Style.Border.OutsideBorderColor = BorderGray;
            ws.Cell(dataRow, 3).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            ws.Cell(dataRow, 4).Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            ws.Row(dataRow).Height = 22;

            // Column Widths
            ws.Column(1).Width = 32;
            ws.Column(2).Width = 16;
            ws.Column(3).Width = 22;
            ws.Column(4).Width = 24;

            ws.PageSetup.PageOrientation = XLPageOrientation.Portrait;
            ws.ShowGridLines = true;
        }

        /// <summary>
        /// Generates an individual Program worksheet containing all Section timetable blocks.
        /// </summary>
        private static void BuildProgramSheet(
            IXLWorkbook workbook,
            GroupTimetableExcelModel model,
            ProgramTimetableExcelModel program,
            HashSet<string> existingSheetNames)
        {
            // Candidate Sheet Name e.g. "MPC - IIT" or "IIT"
            string rawName = $"{model.GroupName} - {program.ProgramName}";
            if (rawName.Length > 31)
            {
                rawName = program.ProgramName;
            }
            string sheetName = GetSafeSheetName(rawName, existingSheetNames);
            var ws = workbook.Worksheets.Add(sheetName);

            // Determine max columns needed (Day column + Periods count)
            int periodCount = program.Sections.FirstOrDefault(s => s.Periods.Count > 0)?.Periods.Count ?? 8;
            int totalCols = Math.Max(periodCount + 1, 6);

            // Row 1: Program Header Banner
            ws.Range(1, 1, 1, totalCols).Merge();
            var titleCell = ws.Cell("A1");
            titleCell.Value = $"PROGRAM TIMETABLE: {program.ProgramName.ToUpperInvariant()} ({model.GroupName})";
            titleCell.Style.Font.Bold = true;
            titleCell.Style.Font.FontSize = 13;
            titleCell.Style.Font.FontColor = XLColor.White;
            titleCell.Style.Fill.BackgroundColor = PrimaryNavy;
            titleCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            titleCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            ws.Row(1).Height = 26;

            // Row 2: Subheader Metadata
            ws.Range(2, 1, 2, totalCols).Merge();
            var subCell = ws.Cell("A2");
            subCell.Value = $"Group: {model.GroupName}  |  Board: {model.BoardName}  |  Level: {model.AcademicLevelName}  |  Year: {model.AcademicYearName}  |  Generated: {model.GeneratedAt:dd-MMM-yyyy HH:mm}";
            subCell.Style.Font.Italic = true;
            subCell.Style.Font.FontSize = 9.5;
            subCell.Style.Font.FontColor = XLColor.FromArgb(51, 65, 85);
            subCell.Style.Fill.BackgroundColor = LightGrayRow;
            subCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            subCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            ws.Row(2).Height = 18;

            int currentRow = 4;

            // If no sections in this program
            if (program.Sections.Count == 0)
            {
                ws.Range(currentRow, 1, currentRow, totalCols).Merge();
                var emptyCell = ws.Cell(currentRow, 1);
                emptyCell.Value = "No sections configured for this program.";
                emptyCell.Style.Font.Italic = true;
                emptyCell.Style.Font.FontSize = 10;
                emptyCell.Style.Font.FontColor = MutedText;
                emptyCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                ws.Row(currentRow).Height = 24;
                return;
            }

            // Iterate each Section block
            foreach (var section in program.Sections)
            {
                // Section Banner
                ws.Range(currentRow, 1, currentRow, totalCols).Merge();
                var secBannerCell = ws.Cell(currentRow, 1);
                secBannerCell.Value = $"SECTION: {section.SectionName.ToUpperInvariant()}";
                secBannerCell.Style.Font.Bold = true;
                secBannerCell.Style.Font.FontSize = 11;
                secBannerCell.Style.Font.FontColor = PrimaryNavy;
                secBannerCell.Style.Fill.BackgroundColor = SectionBanner;
                secBannerCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
                secBannerCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                secBannerCell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                secBannerCell.Style.Border.OutsideBorderColor = BorderGray;
                ws.Row(currentRow).Height = 22;
                currentRow++;

                // If Section has no timetable slots
                if (!section.HasTimetable || section.Days.Count == 0 || section.Periods.Count == 0)
                {
                    ws.Range(currentRow, 1, currentRow, totalCols).Merge();
                    var noSlotsCell = ws.Cell(currentRow, 1);
                    noSlotsCell.Value = "No timetable generated for this section";
                    noSlotsCell.Style.Font.Italic = true;
                    noSlotsCell.Style.Font.FontSize = 9.5;
                    noSlotsCell.Style.Font.FontColor = MutedText;
                    noSlotsCell.Style.Fill.BackgroundColor = LightGrayRow;
                    noSlotsCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    noSlotsCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                    noSlotsCell.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    noSlotsCell.Style.Border.OutsideBorderColor = BorderGray;
                    ws.Row(currentRow).Height = 24;
                    currentRow += 3; // spacing
                    continue;
                }

                // Table Header Row: Day/Period + Periods
                int headerRow = currentRow;
                var dayHeaderCell = ws.Cell(headerRow, 1);
                dayHeaderCell.Value = "Day / Period";
                dayHeaderCell.Style.Font.Bold = true;
                dayHeaderCell.Style.Font.FontSize = 10;
                dayHeaderCell.Style.Font.FontColor = XLColor.White;
                dayHeaderCell.Style.Fill.BackgroundColor = PrimaryNavy;
                dayHeaderCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                dayHeaderCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

                for (int pIdx = 0; pIdx < section.Periods.Count; pIdx++)
                {
                    var period = section.Periods[pIdx];
                    int col = pIdx + 2;
                    var pCell = ws.Cell(headerRow, col);
                    pCell.Value = $"{period.PeriodName}\n({period.TimeRangeString})";
                    pCell.Style.Font.Bold = true;
                    pCell.Style.Font.FontSize = 9.5;
                    pCell.Style.Font.FontColor = XLColor.White;
                    pCell.Style.Fill.BackgroundColor = period.IsBreak ? BreakHeader : PrimaryNavy;
                    pCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    pCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                    pCell.Style.Alignment.WrapText = true;
                }

                ws.Range(headerRow, 1, headerRow, section.Periods.Count + 1).Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                ws.Range(headerRow, 1, headerRow, section.Periods.Count + 1).Style.Border.InsideBorder = XLBorderStyleValues.Thin;
                ws.Range(headerRow, 1, headerRow, section.Periods.Count + 1).Style.Border.OutsideBorderColor = BorderGray;
                ws.Range(headerRow, 1, headerRow, section.Periods.Count + 1).Style.Border.InsideBorderColor = BorderGray;
                ws.Row(headerRow).Height = 28;
                currentRow++;

                // Day Rows
                foreach (var day in section.Days)
                {
                    int row = currentRow;

                    // Day Name Cell
                    var dayCell = ws.Cell(row, 1);
                    dayCell.Value = day.DayName;
                    dayCell.Style.Font.Bold = true;
                    dayCell.Style.Font.FontSize = 10;
                    dayCell.Style.Font.FontColor = DarkText;
                    dayCell.Style.Fill.BackgroundColor = LightGrayRow;
                    dayCell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                    dayCell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;

                    // Period Slot Cells
                    for (int pIdx = 0; pIdx < section.Periods.Count; pIdx++)
                    {
                        var period = section.Periods[pIdx];
                        int col = pIdx + 2;
                        var cell = ws.Cell(row, col);

                        if (period.IsBreak)
                        {
                            cell.Value = "BREAK";
                            cell.Style.Font.Bold = true;
                            cell.Style.Font.FontSize = 9.5;
                            cell.Style.Font.FontColor = XLColor.FromArgb(146, 64, 14); // #92400E
                            cell.Style.Fill.BackgroundColor = BreakCell;
                            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                        }
                        else if (day.SlotsByPeriodId.TryGetValue(period.PeriodId, out var slot))
                        {
                            var lines = new List<string>();
                            if (!string.IsNullOrWhiteSpace(slot.SubjectCode))
                                lines.Add($"{slot.SubjectCode} - {slot.SubjectName}");
                            else if (!string.IsNullOrWhiteSpace(slot.SubjectName))
                                lines.Add(slot.SubjectName);

                            if (!string.IsNullOrWhiteSpace(slot.StaffName))
                            {
                                string staffLine = !string.IsNullOrWhiteSpace(slot.StaffEmployeeId)
                                    ? $"{slot.StaffName} ({slot.StaffEmployeeId})"
                                    : slot.StaffName;
                                lines.Add(staffLine);
                            }

                            if (!string.IsNullOrWhiteSpace(slot.RoomName))
                            {
                                lines.Add($"Room: {slot.RoomName}");
                            }

                            cell.Value = string.Join("\n", lines);
                            cell.Style.Font.FontSize = 9;
                            cell.Style.Font.FontColor = DarkText;
                            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                            cell.Style.Alignment.WrapText = true;
                        }
                        else
                        {
                            cell.Value = "-";
                            cell.Style.Font.FontSize = 9;
                            cell.Style.Font.FontColor = MutedText;
                            cell.Style.Fill.BackgroundColor = XLColor.FromArgb(250, 250, 250);
                            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
                            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
                        }
                    }

                    var rowRange = ws.Range(row, 1, row, section.Periods.Count + 1);
                    rowRange.Style.Border.InsideBorder = XLBorderStyleValues.Thin;
                    rowRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
                    rowRange.Style.Border.InsideBorderColor = BorderGray;
                    rowRange.Style.Border.OutsideBorderColor = BorderGray;
                    ws.Row(row).Height = 44;
                    currentRow++;
                }

                // Section Spacing (2 rows)
                currentRow += 2;
            }

            // Adjust Column Widths
            ws.Column(1).Width = 15;
            for (int col = 2; col <= totalCols; col++)
            {
                ws.Column(col).Width = 22;
            }

            ws.PageSetup.PageOrientation = XLPageOrientation.Landscape;
            ws.ShowGridLines = true;
        }

        /// <summary>
        /// Sanitizes and creates a unique Excel worksheet name satisfying the 31-character limit and character restrictions.
        /// </summary>
        public static string GetSafeSheetName(string candidateName, HashSet<string> existingNames)
        {
            if (string.IsNullOrWhiteSpace(candidateName))
            {
                candidateName = "Sheet";
            }

            // Replace illegal characters: \ / ? * [ ] :
            char[] invalidChars = { '\\', '/', '?', '*', '[', ']', ':' };
            string cleaned = candidateName;
            foreach (var c in invalidChars)
            {
                cleaned = cleaned.Replace(c, '_');
            }

            cleaned = cleaned.Trim();
            if (string.IsNullOrWhiteSpace(cleaned))
            {
                cleaned = "Sheet";
            }

            if (cleaned.Length > 31)
            {
                cleaned = cleaned.Substring(0, 31).Trim();
            }

            string candidate = cleaned;
            int suffix = 2;

            while (existingNames.Contains(candidate.ToUpperInvariant()))
            {
                string suffixStr = $" ({suffix})";
                int maxBaseLen = 31 - suffixStr.Length;
                string basePart = cleaned.Length > maxBaseLen ? cleaned.Substring(0, maxBaseLen).Trim() : cleaned;
                candidate = basePart + suffixStr;
                suffix++;
            }

            existingNames.Add(candidate.ToUpperInvariant());
            return candidate;
        }
    }
}
