using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using ClosedXML.Excel;
using CollegeManagement.API.DTOs.Students;

namespace CollegeManagement.API.Services.Imports
{
    public static class StudentExcelImportReader
    {
        public static (List<StudentImportRowDto> Rows, List<StudentImportRowErrorDto> StructureErrors) ReadWorkbook(Stream stream)
        {
            var rows = new List<StudentImportRowDto>();
            var errors = new List<StudentImportRowErrorDto>();

            IXLWorkbook workbook;
            try
            {
                workbook = new XLWorkbook(stream);
            }
            catch (Exception ex)
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = 0,
                    FieldName = "File",
                    ErrorMessage = $"Failed to open Excel workbook: {ex.Message}"
                });
                return (rows, errors);
            }

            // Find Students worksheet
            var ws = workbook.Worksheets.FirstOrDefault(w => string.Equals(w.Name.Trim(), "Students", StringComparison.OrdinalIgnoreCase));
            if (ws == null)
            {
                errors.Add(new StudentImportRowErrorDto
                {
                    RowNumber = 0,
                    FieldName = "Worksheet",
                    ErrorMessage = "Required worksheet 'Students' was not found in the workbook."
                });
                return (rows, errors);
            }

            // Verify header row (Row 3 or Row 1 fallback)
            int headerRowIndex = 3;
            var cellVal = ws.Cell(headerRowIndex, 1).GetString().Trim();
            if (!cellVal.StartsWith("Admission No", StringComparison.OrdinalIgnoreCase))
            {
                // check Row 1
                if (ws.Cell(1, 1).GetString().Trim().StartsWith("Admission No", StringComparison.OrdinalIgnoreCase))
                {
                    headerRowIndex = 1;
                }
            }

            var expected = StudentExcelImportTemplateBuilder.Exact56Headers;
            for (int col = 0; col < expected.Length; col++)
            {
                var actualHeader = ws.Cell(headerRowIndex, col + 1).GetString().Trim();
                if (!string.Equals(actualHeader, expected[col], StringComparison.OrdinalIgnoreCase))
                {
                    errors.Add(new StudentImportRowErrorDto
                    {
                        RowNumber = headerRowIndex,
                        FieldName = $"Column {col + 1}",
                        InvalidValue = actualHeader,
                        ErrorMessage = $"Header mismatch at column {col + 1}. Expected '{expected[col]}', but found '{actualHeader}'."
                    });
                }
            }

            if (errors.Count > 0)
            {
                return (rows, errors);
            }

            // Read rows
            int lastRowUsed = ws.LastRowUsed()?.RowNumber() ?? headerRowIndex;
            for (int r = headerRowIndex + 1; r <= lastRowUsed; r++)
            {
                // Check if row is completely blank
                bool isRowEmpty = true;
                for (int col = 1; col <= 56; col++)
                {
                    if (!string.IsNullOrWhiteSpace(ws.Cell(r, col).GetString()))
                    {
                        isRowEmpty = false;
                        break;
                    }
                }

                if (isRowEmpty)
                    continue;

                // Check if this is the sample row
                string admVal = ws.Cell(r, 1).GetString().Trim();
                string nameVal = ws.Cell(r, 3).GetString().Trim();
                if (r == headerRowIndex + 1 && admVal.Equals("ADM-2024-0001", StringComparison.OrdinalIgnoreCase) && nameVal.Equals("Aarav Sharma", StringComparison.OrdinalIgnoreCase))
                {
                    // If sample row has "Sample legacy migration record" remarks, ignore it
                    string remVal = ws.Cell(r, 56).GetString().Trim();
                    if (remVal.Contains("Sample legacy migration record", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }
                }

                var rowDto = new StudentImportRowDto
                {
                    RowNumber = r,
                    AdmissionNo = GetString(ws.Cell(r, 1)),
                    RollNo = GetString(ws.Cell(r, 2)),
                    StudentName = GetString(ws.Cell(r, 3)),
                    Gender = GetString(ws.Cell(r, 4)),
                    DateOfBirth = GetDate(ws.Cell(r, 5)),
                    BloodGroup = GetString(ws.Cell(r, 6)),
                    MobileNumber = GetString(ws.Cell(r, 7)),
                    Email = GetString(ws.Cell(r, 8)),
                    AadhaarNumber = GetString(ws.Cell(r, 9)),
                    BoardCode = GetString(ws.Cell(r, 10)),
                    AcademicYear = GetString(ws.Cell(r, 11)),
                    AcademicLevel = GetString(ws.Cell(r, 12)),
                    GroupCode = GetString(ws.Cell(r, 13)),
                    ProgramName = GetString(ws.Cell(r, 14)),
                    SectionName = GetString(ws.Cell(r, 15)),
                    AdmissionDate = GetDate(ws.Cell(r, 16)),
                    AdmissionType = GetString(ws.Cell(r, 17)),
                    AdmissionQuota = GetString(ws.Cell(r, 18)),
                    Medium = GetString(ws.Cell(r, 19)),
                    SecondLanguage = GetString(ws.Cell(r, 20)),
                    Nationality = GetString(ws.Cell(r, 21)),
                    Religion = GetString(ws.Cell(r, 22)),
                    Category = GetString(ws.Cell(r, 23)),
                    StudentCategory = GetString(ws.Cell(r, 24)),
                    FatherName = GetString(ws.Cell(r, 25)),
                    FatherOccupation = GetString(ws.Cell(r, 26)),
                    FatherMobile = GetString(ws.Cell(r, 27)),
                    FatherEmail = GetString(ws.Cell(r, 28)),
                    MotherName = GetString(ws.Cell(r, 29)),
                    MotherOccupation = GetString(ws.Cell(r, 30)),
                    MotherMobile = GetString(ws.Cell(r, 31)),
                    MotherEmail = GetString(ws.Cell(r, 32)),
                    GuardianName = GetString(ws.Cell(r, 33)),
                    GuardianMobile = GetString(ws.Cell(r, 34)),
                    GuardianEmail = GetString(ws.Cell(r, 35)),
                    Address = GetString(ws.Cell(r, 36)),
                    City = GetString(ws.Cell(r, 37)),
                    District = GetString(ws.Cell(r, 38)),
                    State = GetString(ws.Cell(r, 39)),
                    Pincode = GetString(ws.Cell(r, 40)),
                    PreviousSchool = GetString(ws.Cell(r, 41)),
                    PreviousBoard = GetString(ws.Cell(r, 42)),
                    PreviousHallTicketNumber = GetString(ws.Cell(r, 43)),
                    PreviousYearOfPassing = GetInt(ws.Cell(r, 44)),
                    PreviousPercentage = GetDecimal(ws.Cell(r, 45)),
                    FeeAmount = GetDecimal(ws.Cell(r, 46)),
                    FeePaid = GetDecimal(ws.Cell(r, 47)),
                    FeeStatus = GetString(ws.Cell(r, 48)),
                    ScholarshipStatus = GetString(ws.Cell(r, 49)),
                    ScholarshipAmount = GetDecimal(ws.Cell(r, 50)),
                    AnnualIncome = GetDecimal(ws.Cell(r, 51)),
                    AttendancePercentage = GetDecimal(ws.Cell(r, 52)),
                    PerformanceGrade = GetString(ws.Cell(r, 53)),
                    CGPA = GetDecimal(ws.Cell(r, 54)),
                    Rank = GetInt(ws.Cell(r, 55)),
                    Remarks = GetString(ws.Cell(r, 56))
                };

                rows.Add(rowDto);
            }

            return (rows, errors);
        }

        private static string? GetString(IXLCell cell)
        {
            if (cell.IsEmpty())
                return null;
            var val = cell.GetString()?.Trim();
            return string.IsNullOrWhiteSpace(val) ? null : val;
        }

        private static DateTime? GetDate(IXLCell cell)
        {
            if (cell.IsEmpty())
                return null;

            if (cell.DataType == XLDataType.DateTime)
                return cell.GetDateTime();

            var str = cell.GetString()?.Trim();
            if (string.IsNullOrWhiteSpace(str))
                return null;

            if (DateTime.TryParse(str, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dt) ||
                DateTime.TryParse(str, out dt))
            {
                return dt;
            }

            return null;
        }

        private static decimal? GetDecimal(IXLCell cell)
        {
            if (cell.IsEmpty())
                return null;

            if (cell.DataType == XLDataType.Number)
                return Convert.ToDecimal(cell.GetDouble());

            var str = cell.GetString()?.Trim();
            if (string.IsNullOrWhiteSpace(str))
                return null;

            if (decimal.TryParse(str, NumberStyles.Any, CultureInfo.InvariantCulture, out var val) ||
                decimal.TryParse(str, out val))
            {
                return val;
            }

            return null;
        }

        private static int? GetInt(IXLCell cell)
        {
            if (cell.IsEmpty())
                return null;

            if (cell.DataType == XLDataType.Number)
                return Convert.ToInt32(cell.GetDouble());

            var str = cell.GetString()?.Trim();
            if (string.IsNullOrWhiteSpace(str))
                return null;

            if (int.TryParse(str, NumberStyles.Any, CultureInfo.InvariantCulture, out var val) ||
                int.TryParse(str, out val))
            {
                return val;
            }

            return null;
        }
    }
}