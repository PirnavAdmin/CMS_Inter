using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Examination.Responses;
using CollegeManagement.API.Services.Interfaces;
using MiniExcelLibs;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CollegeManagement.API.Services.Implementations
{
    public class ExaminationExportService : IExaminationExportService
    {
        #region 1. Examinations List Exports

        public async Task<byte[]> GenerateExaminationsCsvAsync(IEnumerable<ExaminationResponse> examinations)
        {
            using var ms = new MemoryStream();
            using (var writer = new StreamWriter(ms, new UTF8Encoding(true)))
            {
                await writer.WriteLineAsync("Exam Code,Exam Name,Board,Academic Year,Level,Group,Program,Exam Type,Exam Pattern,Start Date,End Date,Total Marks,Pass %,Status,Total Subjects,Scheduled Subjects");

                foreach (var e in examinations)
                {
                    var code = EscapeCsv(e.ExamCode);
                    var name = EscapeCsv(e.ExamName);
                    var board = EscapeCsv(e.BoardName);
                    var year = EscapeCsv(e.AcademicYear);
                    var level = EscapeCsv(e.AcademicLevel);
                    var group = EscapeCsv(e.GroupName);
                    var program = EscapeCsv(e.ProgramName);
                    var type = EscapeCsv(e.ExamType);
                    var pattern = EscapeCsv(e.ExamPattern);
                    var start = e.StartDate.ToString("yyyy-MM-dd");
                    var end = e.EndDate.ToString("yyyy-MM-dd");
                    var marks = e.TotalMarks?.ToString() ?? "—";
                    var passPct = e.PassPercentage?.ToString("0.00") ?? "—";
                    var status = EscapeCsv(e.Status);
                    var totalSub = e.TotalEligibleSubjects;
                    var schedSub = e.ScheduledSubjectsCount;

                    await writer.WriteLineAsync($"{code},{name},{board},{year},{level},{group},{program},{type},{pattern},{start},{end},{marks},{passPct},{status},{totalSub},{schedSub}");
                }
            }
            return ms.ToArray();
        }

        public async Task<byte[]> GenerateExaminationsExcelAsync(IEnumerable<ExaminationResponse> examinations)
        {
            var dataList = examinations.Select(e => new Dictionary<string, object>
            {
                { "Exam Code", e.ExamCode },
                { "Exam Name", e.ExamName },
                { "Board", e.BoardName },
                { "Academic Year", e.AcademicYear },
                { "Level", e.AcademicLevel },
                { "Group", e.GroupName },
                { "Program", e.ProgramName },
                { "Exam Type", e.ExamType },
                { "Exam Pattern", e.ExamPattern ?? "—" },
                { "Start Date", e.StartDate.ToString("yyyy-MM-dd") },
                { "End Date", e.EndDate.ToString("yyyy-MM-dd") },
                { "Total Marks", (object?)e.TotalMarks ?? "—" },
                { "Pass %", (object?)e.PassPercentage ?? "—" },
                { "Status", e.Status },
                { "Eligible Subjects", e.TotalEligibleSubjects },
                { "Scheduled Subjects", e.ScheduledSubjectsCount }
            }).ToList();

            using var ms = new MemoryStream();
            await ms.SaveAsAsync(dataList, sheetName: "Examinations");
            return ms.ToArray();
        }

        public Task<byte[]> GenerateExaminationsPdfAsync(IEnumerable<ExaminationResponse> examinations)
        {
            var pdfBytes = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Landscape());
                    page.Margin(20);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(8).FontFamily("Arial"));

                    page.Header().Row(row =>
                    {
                        row.RelativeItem().Column(column =>
                        {
                            column.Item().Text(t =>
                            {
                                t.Span("PIRNAV JUNIOR COLLEGE — EXAMINATIONS LIST")
                                    .FontSize(14)
                                    .Bold()
                                    .FontColor(Colors.Green.Darken2);
                            });
                            column.Item().Text(t =>
                            {
                                t.Span($"Generated On: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC")
                                    .FontSize(8)
                                    .Italic()
                                    .FontColor(Colors.Grey.Medium);
                            });
                        });
                    });

                    page.Content().PaddingVertical(10).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.ConstantColumn(80);   // Code
                            columns.RelativeColumn(2);    // Name
                            columns.RelativeColumn(1.2f); // Level
                            columns.RelativeColumn(1f);   // Group
                            columns.RelativeColumn(1.5f); // Program
                            columns.RelativeColumn(1.2f); // Exam Type
                            columns.ConstantColumn(130);  // Period
                            columns.ConstantColumn(65);   // Status
                            columns.ConstantColumn(60);   // Scheduled
                        });

                        table.Header(header =>
                        {
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Exam Code").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Exam Name").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Level").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Group").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Program").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Exam Type").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Exam Period").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Status").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Subjects").Bold().FontColor(Colors.White));
                        });

                        bool isAlternate = false;
                        foreach (var e in examinations)
                        {
                            var bgColor = isAlternate ? Colors.Grey.Lighten4 : Colors.White;

                            table.Cell().Background(bgColor).Padding(4).Text(e.ExamCode);
                            table.Cell().Background(bgColor).Padding(4).Text(e.ExamName);
                            table.Cell().Background(bgColor).Padding(4).Text(e.AcademicLevel);
                            table.Cell().Background(bgColor).Padding(4).Text(e.GroupName);
                            table.Cell().Background(bgColor).Padding(4).Text(e.ProgramName);
                            table.Cell().Background(bgColor).Padding(4).Text(e.ExamType);
                            table.Cell().Background(bgColor).Padding(4).Text($"{e.StartDate:dd MMM yyyy} - {e.EndDate:dd MMM yyyy}");
                            table.Cell().Background(bgColor).Padding(4).Text(e.Status);
                            table.Cell().Background(bgColor).Padding(4).Text($"{e.ScheduledSubjectsCount}/{e.TotalEligibleSubjects}");

                            isAlternate = !isAlternate;
                        }
                    });

                    page.Footer().AlignRight().Text(x =>
                    {
                        x.Span("Page ");
                        x.CurrentPageNumber();
                        x.Span(" of ");
                        x.TotalPages();
                    });
                });
            }).GeneratePdf();

            return Task.FromResult(pdfBytes);
        }

        #endregion

        #region 2. Timetable / Exam Schedules Exports (For a Specific Examination)

        public async Task<byte[]> GenerateTimetableCsvAsync(ExaminationResponse exam, IEnumerable<ExamScheduleResponse> schedules)
        {
            using var ms = new MemoryStream();
            using (var writer = new StreamWriter(ms, new UTF8Encoding(true)))
            {
                await writer.WriteLineAsync($"Examination: {EscapeCsv(exam.ExamName)} ({EscapeCsv(exam.ExamCode)})");
                await writer.WriteLineAsync($"Academic Context: {EscapeCsv(exam.BoardName)} | {EscapeCsv(exam.AcademicYear)} | {EscapeCsv(exam.AcademicLevel)} | {EscapeCsv(exam.GroupName)} | {EscapeCsv(exam.ProgramName)}");
                await writer.WriteLineAsync($"Exam Window: {exam.StartDate:yyyy-MM-dd} to {exam.EndDate:yyyy-MM-dd}");
                await writer.WriteLineAsync();
                await writer.WriteLineAsync("Subject Code,Subject Name,Exam Date,Start Time,End Time,Hall / Room,Invigilator,Exam Mode,Max Marks,Passing Marks");

                foreach (var s in schedules.OrderBy(x => x.ExamDate).ThenBy(x => x.StartTime))
                {
                    var subCode = EscapeCsv(s.SubjectCode);
                    var subName = EscapeCsv(s.SubjectName);
                    var date = s.ExamDate.ToString("yyyy-MM-dd");
                    var start = s.StartTime.ToString("HH:mm");
                    var end = s.EndTime.ToString("HH:mm");
                    var hall = EscapeCsv(s.Hall);
                    var invig = EscapeCsv(s.Invigilator);
                    var mode = EscapeCsv(s.ExamMode);
                    var max = s.MaxMarks.ToString("0.00");
                    var pass = s.PassingMarks.ToString("0.00");

                    await writer.WriteLineAsync($"{subCode},{subName},{date},{start},{end},{hall},{invig},{mode},{max},{pass}");
                }
            }
            return ms.ToArray();
        }

        public async Task<byte[]> GenerateTimetableExcelAsync(ExaminationResponse exam, IEnumerable<ExamScheduleResponse> schedules)
        {
            var dataList = schedules
                .OrderBy(x => x.ExamDate)
                .ThenBy(x => x.StartTime)
                .Select(s => new Dictionary<string, object>
                {
                    { "Subject Code", s.SubjectCode },
                    { "Subject Name", s.SubjectName },
                    { "Exam Date", s.ExamDate.ToString("yyyy-MM-dd") },
                    { "Start Time", s.StartTime.ToString("HH:mm") },
                    { "End Time", s.EndTime.ToString("HH:mm") },
                    { "Hall / Room", s.Hall },
                    { "Invigilator", s.Invigilator },
                    { "Exam Mode", s.ExamMode },
                    { "Max Marks", s.MaxMarks },
                    { "Passing Marks", s.PassingMarks }
                }).ToList();

            using var ms = new MemoryStream();
            await ms.SaveAsAsync(dataList, sheetName: exam.ExamCode ?? "Timetable");
            return ms.ToArray();
        }

        public Task<byte[]> GenerateTimetablePdfAsync(ExaminationResponse exam, IEnumerable<ExamScheduleResponse> schedules)
        {
            var sortedSchedules = schedules.OrderBy(x => x.ExamDate).ThenBy(x => x.StartTime).ToList();

            var pdfBytes = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Portrait());
                    page.Margin(25);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Arial"));

                    // Header
                    page.Header().Column(col =>
                    {
                        col.Item().AlignCenter().Text(t =>
                        {
                            t.Span("PIRNAV JUNIOR COLLEGE").FontSize(16).Bold().FontColor(Colors.Green.Darken3);
                        });
                        col.Item().AlignCenter().Text(t =>
                        {
                            t.Span($"EXAMINATION TIMETABLE — {exam.ExamName.ToUpper()}").FontSize(12).Bold();
                        });
                        col.Item().AlignCenter().Text(t =>
                        {
                            t.Span($"{exam.BoardName} · {exam.AcademicYear} · {exam.AcademicLevel} · {exam.GroupName} · {exam.ProgramName}")
                                .FontSize(9).FontColor(Colors.Grey.Darken1);
                        });
                        col.Item().AlignCenter().Text(t =>
                        {
                            t.Span($"Exam Period: {exam.StartDate:dd MMM yyyy} to {exam.EndDate:dd MMM yyyy}  |  Code: {exam.ExamCode}")
                                .FontSize(9).Italic().FontColor(Colors.Grey.Darken2);
                        });
                        col.Item().PaddingTop(5).LineHorizontal(1).LineColor(Colors.Green.Darken2);
                    });

                    // Content Table
                    page.Content().PaddingVertical(15).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(2.5f); // Subject
                            columns.ConstantColumn(80);   // Date
                            columns.ConstantColumn(85);   // Time
                            columns.RelativeColumn(1.2f); // Hall
                            columns.RelativeColumn(1.5f); // Invigilator
                            columns.ConstantColumn(60);   // Mode
                        });

                        table.Header(header =>
                        {
                            header.Cell().Background(Colors.Green.Darken2).Padding(5).Text(t => t.Span("Subject").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(5).Text(t => t.Span("Date").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(5).Text(t => t.Span("Time").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(5).Text(t => t.Span("Hall").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(5).Text(t => t.Span("Invigilator").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(5).Text(t => t.Span("Mode").Bold().FontColor(Colors.White));
                        });

                        bool isAlternate = false;
                        foreach (var s in sortedSchedules)
                        {
                            var bgColor = isAlternate ? Colors.Grey.Lighten4 : Colors.White;

                            table.Cell().Background(bgColor).Padding(5).Column(c =>
                            {
                                c.Item().Text(s.SubjectName).Bold();
                                if (!string.IsNullOrWhiteSpace(s.SubjectCode))
                                    c.Item().Text(s.SubjectCode).FontSize(8).FontColor(Colors.Grey.Medium);
                            });
                            table.Cell().Background(bgColor).Padding(5).Text(s.ExamDate.ToString("dd MMM yyyy"));
                            table.Cell().Background(bgColor).Padding(5).Text($"{s.StartTime:HH\\:mm} - {s.EndTime:HH\\:mm}");
                            table.Cell().Background(bgColor).Padding(5).Text(string.IsNullOrWhiteSpace(s.Hall) ? "—" : s.Hall);
                            table.Cell().Background(bgColor).Padding(5).Text(string.IsNullOrWhiteSpace(s.Invigilator) ? "—" : s.Invigilator);
                            table.Cell().Background(bgColor).Padding(5).Text(s.ExamMode);

                            isAlternate = !isAlternate;
                        }
                    });

                    // Footer with Signatures
                    page.Footer().Column(col =>
                    {
                        col.Item().PaddingTop(25).Row(row =>
                        {
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Medium);
                                c.Item().PaddingTop(3).Text("Controller of Examinations").FontSize(8).Bold();
                            });
                            row.ConstantItem(40);
                            row.RelativeItem().Column(c =>
                            {
                                c.Item().LineHorizontal(0.5f).LineColor(Colors.Grey.Medium);
                                c.Item().PaddingTop(3).Text("Principal / Dean").FontSize(8).Bold();
                            });
                        });

                        col.Item().PaddingTop(10).Row(row =>
                        {
                            row.RelativeItem().Text(t =>
                            {
                                t.Span($"Official Schedule · Generated {DateTime.UtcNow:dd-MM-yyyy HH:mm} UTC").FontSize(7).Italic().FontColor(Colors.Grey.Medium);
                            });
                            row.RelativeItem().AlignRight().Text(x =>
                            {
                                x.Span("Page ");
                                x.CurrentPageNumber();
                                x.Span(" of ");
                                x.TotalPages();
                            });
                        });
                    });
                });
            }).GeneratePdf();

            return Task.FromResult(pdfBytes);
        }

        #endregion

        #region 3. Global Scheduled Exams Export (All scheduled exams list)

        public async Task<byte[]> GenerateScheduledExamsCsvAsync(IEnumerable<ExaminationResponse> examinations)
        {
            var scheduled = examinations.Where(x => x.Status == "SCHEDULED").ToList();
            using var ms = new MemoryStream();
            using (var writer = new StreamWriter(ms, new UTF8Encoding(true)))
            {
                await writer.WriteLineAsync("Exam Name,Exam Code,Academic Year,Level,Group,Program,Exam Date,Start Time,End Time,Status");

                foreach (var exam in scheduled)
                {
                    if (exam.Schedules != null && exam.Schedules.Any())
                    {
                        foreach (var s in exam.Schedules)
                        {
                            await writer.WriteLineAsync($"{EscapeCsv(exam.ExamName)},{EscapeCsv(exam.ExamCode)},{EscapeCsv(exam.AcademicYear)},{EscapeCsv(exam.AcademicLevel)},{EscapeCsv(exam.GroupName)},{EscapeCsv(exam.ProgramName)},{s.ExamDate:yyyy-MM-dd},{s.StartTime:HH\\:mm},{s.EndTime:HH\\:mm},{EscapeCsv(exam.Status)}");
                        }
                    }
                    else
                    {
                        await writer.WriteLineAsync($"{EscapeCsv(exam.ExamName)},{EscapeCsv(exam.ExamCode)},{EscapeCsv(exam.AcademicYear)},{EscapeCsv(exam.AcademicLevel)},{EscapeCsv(exam.GroupName)},{EscapeCsv(exam.ProgramName)},{exam.StartDate:yyyy-MM-dd},—,—,{EscapeCsv(exam.Status)}");
                    }
                }
            }
            return ms.ToArray();
        }

        public async Task<byte[]> GenerateScheduledExamsExcelAsync(IEnumerable<ExaminationResponse> examinations)
        {
            var scheduled = examinations.Where(x => x.Status == "SCHEDULED").ToList();
            var dataList = new List<Dictionary<string, object>>();

            foreach (var exam in scheduled)
            {
                if (exam.Schedules != null && exam.Schedules.Any())
                {
                    foreach (var s in exam.Schedules)
                    {
                        dataList.Add(new Dictionary<string, object>
                        {
                            { "Exam Name", exam.ExamName },
                            { "Exam Code", exam.ExamCode },
                            { "Subject", s.SubjectName },
                            { "Academic Year", exam.AcademicYear },
                            { "Level", exam.AcademicLevel },
                            { "Group", exam.GroupName },
                            { "Program", exam.ProgramName },
                            { "Exam Date", s.ExamDate.ToString("yyyy-MM-dd") },
                            { "Start Time", s.StartTime.ToString("HH:mm") },
                            { "End Time", s.EndTime.ToString("HH:mm") },
                            { "Hall", s.Hall },
                            { "Invigilator", s.Invigilator },
                            { "Status", exam.Status }
                        });
                    }
                }
                else
                {
                    dataList.Add(new Dictionary<string, object>
                    {
                        { "Exam Name", exam.ExamName },
                        { "Exam Code", exam.ExamCode },
                        { "Subject", "—" },
                        { "Academic Year", exam.AcademicYear },
                        { "Level", exam.AcademicLevel },
                        { "Group", exam.GroupName },
                        { "Program", exam.ProgramName },
                        { "Exam Date", exam.StartDate.ToString("yyyy-MM-dd") },
                        { "Start Time", "—" },
                        { "End Time", "—" },
                        { "Hall", "—" },
                        { "Invigilator", "—" },
                        { "Status", exam.Status }
                    });
                }
            }

            using var ms = new MemoryStream();
            await ms.SaveAsAsync(dataList, sheetName: "ScheduledExams");
            return ms.ToArray();
        }

        public Task<byte[]> GenerateScheduledExamsPdfAsync(IEnumerable<ExaminationResponse> examinations)
        {
            var scheduled = examinations.Where(x => x.Status == "SCHEDULED").ToList();

            var pdfBytes = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Landscape());
                    page.Margin(20);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(8).FontFamily("Arial"));

                    page.Header().Row(row =>
                    {
                        row.RelativeItem().Column(column =>
                        {
                            column.Item().Text(t =>
                            {
                                t.Span("SCHEDULED EXAMINATIONS EXPORT REPORT")
                                    .FontSize(14)
                                    .Bold()
                                    .FontColor(Colors.Green.Darken2);
                            });
                            column.Item().Text(t =>
                            {
                                t.Span($"Generated: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC")
                                    .FontSize(8)
                                    .Italic()
                                    .FontColor(Colors.Grey.Medium);
                            });
                        });
                    });

                    page.Content().PaddingVertical(10).Table(table =>
                    {
                        table.ColumnsDefinition(columns =>
                        {
                            columns.RelativeColumn(2);    // Exam Name
                            columns.ConstantColumn(80);   // Code
                            columns.RelativeColumn(1.5f); // Subject
                            columns.ConstantColumn(80);   // Date
                            columns.ConstantColumn(80);   // Time
                            columns.RelativeColumn(1.2f); // Hall
                            columns.RelativeColumn(1.2f); // Invigilator
                            columns.ConstantColumn(60);   // Status
                        });

                        table.Header(header =>
                        {
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Exam Name").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Exam Code").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Subject").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Date").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Time").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Hall").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Invigilator").Bold().FontColor(Colors.White));
                            header.Cell().Background(Colors.Green.Darken2).Padding(4).Text(t => t.Span("Status").Bold().FontColor(Colors.White));
                        });

                        bool isAlternate = false;
                        foreach (var exam in scheduled)
                        {
                            if (exam.Schedules != null && exam.Schedules.Any())
                            {
                                foreach (var s in exam.Schedules)
                                {
                                    var bgColor = isAlternate ? Colors.Grey.Lighten4 : Colors.White;

                                    table.Cell().Background(bgColor).Padding(4).Text(exam.ExamName);
                                    table.Cell().Background(bgColor).Padding(4).Text(exam.ExamCode);
                                    table.Cell().Background(bgColor).Padding(4).Text(s.SubjectName);
                                    table.Cell().Background(bgColor).Padding(4).Text(s.ExamDate.ToString("dd MMM yyyy"));
                                    table.Cell().Background(bgColor).Padding(4).Text($"{s.StartTime:HH\\:mm} - {s.EndTime:HH\\:mm}");
                                    table.Cell().Background(bgColor).Padding(4).Text(string.IsNullOrWhiteSpace(s.Hall) ? "—" : s.Hall);
                                    table.Cell().Background(bgColor).Padding(4).Text(string.IsNullOrWhiteSpace(s.Invigilator) ? "—" : s.Invigilator);
                                    table.Cell().Background(bgColor).Padding(4).Text(exam.Status);

                                    isAlternate = !isAlternate;
                                }
                            }
                            else
                            {
                                var bgColor = isAlternate ? Colors.Grey.Lighten4 : Colors.White;

                                table.Cell().Background(bgColor).Padding(4).Text(exam.ExamName);
                                table.Cell().Background(bgColor).Padding(4).Text(exam.ExamCode);
                                table.Cell().Background(bgColor).Padding(4).Text("—");
                                table.Cell().Background(bgColor).Padding(4).Text(exam.StartDate.ToString("dd MMM yyyy"));
                                table.Cell().Background(bgColor).Padding(4).Text("—");
                                table.Cell().Background(bgColor).Padding(4).Text("—");
                                table.Cell().Background(bgColor).Padding(4).Text("—");
                                table.Cell().Background(bgColor).Padding(4).Text(exam.Status);

                                isAlternate = !isAlternate;
                            }
                        }
                    });

                    page.Footer().AlignRight().Text(x =>
                    {
                        x.Span("Page ");
                        x.CurrentPageNumber();
                        x.Span(" of ");
                        x.TotalPages();
                    });
                });
            }).GeneratePdf();

            return Task.FromResult(pdfBytes);
        }

        #endregion

        #region Private Helpers

        private string EscapeCsv(string? value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            if (value.Contains(",") || value.Contains("\"") || value.Contains("\r") || value.Contains("\n"))
            {
                return $"\"{value.Replace("\"", "\"\"")}\"";
            }
            return value;
        }

        #endregion
    }
}
