using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using CollegeManagement.API.Models;
using CollegeManagement.API.Services.Interfaces;
using MiniExcelLibs;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CollegeManagement.API.Services.Implementations
{
    /// <summary>
    /// Service implementation for Board CSV/Excel data exporters.
    /// </summary>
    public class BoardExportService : IBoardExportService
    {
        /// <inheritdoc />
        public async Task<byte[]> GenerateCsvAsync(IEnumerable<Board> boards)
        {
            using var ms = new MemoryStream();
            // Write UTF-8 with BOM
            using (var writer = new StreamWriter(ms, new UTF8Encoding(true)))
            {
                // Write Header
                await writer.WriteLineAsync("Board Code,Board Name,Board Type,Description,Country,State,Grading System,Status,Created At,Updated At");

                foreach (var b in boards)
                {
                    var code = EscapeCsv(SanitizeText(b.BoardCode));
                    var name = EscapeCsv(SanitizeText(b.BoardName));
                    var type = EscapeCsv(SanitizeText(b.BoardType));
                    var desc = EscapeCsv(SanitizeText(b.Description));
                    var country = EscapeCsv(b.Country?.CountryName);
                    var state = EscapeCsv(b.State?.StateName);
                    var grading = EscapeCsv(b.GradingSystem?.GradingSystemName);
                    var status = b.IsActive ? "Active" : "Inactive";
                    var createdAt = b.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss");
                    var updatedAt = b.UpdatedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? string.Empty;

                    await writer.WriteLineAsync($"{code},{name},{type},{desc},{country},{state},{grading},{status},{createdAt},{updatedAt}");
                }
            }
            return ms.ToArray();
        }

        /// <inheritdoc />
        public async Task<byte[]> GenerateExcelAsync(IEnumerable<Board> boards)
        {
            var dataList = new List<Dictionary<string, object>>();

            foreach (var b in boards)
            {
                var row = new Dictionary<string, object>
                {
                    { "Board Code", SanitizeText(b.BoardCode) },
                    { "Board Name", SanitizeText(b.BoardName) },
                    { "Board Type", SanitizeText(b.BoardType) },
                    { "Description", SanitizeText(b.Description) },
                    { "Country", b.Country?.CountryName ?? string.Empty },
                    { "State", b.State?.StateName ?? string.Empty },
                    { "Grading System", b.GradingSystem?.GradingSystemName ?? string.Empty },
                    { "Status", b.IsActive ? "Active" : "Inactive" },
                    { "Created At", b.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss") },
                    { "Updated At", b.UpdatedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? string.Empty }
                };
                dataList.Add(row);
            }

            using var ms = new MemoryStream();
            await ms.SaveAsAsync(dataList, sheetName: "Boards");
            return ms.ToArray();
        }

        /// <inheritdoc />
        public Task<byte[]> GeneratePdfAsync(IEnumerable<Board> boards)
        {
            var pdfBytes = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4.Landscape());
                    page.Margin(20);
                    page.PageColor(Colors.White);
                    page.DefaultTextStyle(x => x.FontSize(8).FontFamily("Arial"));

                    // Header
                    page.Header()
                        .Row(row =>
                        {
                            row.RelativeItem().Column(column =>
                            {
                                column.Item().Text(t =>
                                {
                                    t.Span("BOARD MANAGEMENT — BOARDS LIST REPORT")
                                        .FontSize(14)
                                        .Bold()
                                        .FontColor(Colors.Blue.Darken2);
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

                    // Content
                    page.Content()
                        .PaddingVertical(10)
                        .Table(table =>
                        {
                            // Define columns
                            table.ColumnsDefinition(columns =>
                            {
                                columns.ConstantColumn(70);  // Code
                                columns.RelativeColumn(2);   // Name
                                columns.RelativeColumn(1.5f); // Type
                                columns.RelativeColumn(1.5f); // Country
                                columns.RelativeColumn(1.5f); // State
                                columns.RelativeColumn(2);   // Grading System
                                columns.ConstantColumn(50);  // Status
                                columns.ConstantColumn(80);  // Created Date
                            });

                            // Headers
                            table.Header(header =>
                            {
                                header.Cell().Background(Colors.Blue.Darken2).Padding(5).Text(t => t.Span("Board Code").Bold().FontColor(Colors.White));
                                header.Cell().Background(Colors.Blue.Darken2).Padding(5).Text(t => t.Span("Board Name").Bold().FontColor(Colors.White));
                                header.Cell().Background(Colors.Blue.Darken2).Padding(5).Text(t => t.Span("Board Type").Bold().FontColor(Colors.White));
                                header.Cell().Background(Colors.Blue.Darken2).Padding(5).Text(t => t.Span("Country").Bold().FontColor(Colors.White));
                                header.Cell().Background(Colors.Blue.Darken2).Padding(5).Text(t => t.Span("State").Bold().FontColor(Colors.White));
                                header.Cell().Background(Colors.Blue.Darken2).Padding(5).Text(t => t.Span("Grading System").Bold().FontColor(Colors.White));
                                header.Cell().Background(Colors.Blue.Darken2).Padding(5).Text(t => t.Span("Status").Bold().FontColor(Colors.White));
                                header.Cell().Background(Colors.Blue.Darken2).Padding(5).Text(t => t.Span("Created At").Bold().FontColor(Colors.White));
                            });

                            // Rows
                            bool isAlternate = false;
                            foreach (var b in boards)
                            {
                                var bgColor = isAlternate ? Colors.Grey.Lighten4 : Colors.White;

                                table.Cell().Background(bgColor).Padding(5).Text(t => t.Span(SanitizeText(b.BoardCode)));
                                table.Cell().Background(bgColor).Padding(5).Text(t => t.Span(SanitizeText(b.BoardName)));
                                table.Cell().Background(bgColor).Padding(5).Text(t => t.Span(SanitizeText(b.BoardType)));
                                table.Cell().Background(bgColor).Padding(5).Text(t => t.Span(b.Country?.CountryName ?? string.Empty));
                                table.Cell().Background(bgColor).Padding(5).Text(t => t.Span(b.State?.StateName ?? string.Empty));
                                table.Cell().Background(bgColor).Padding(5).Text(t => t.Span(b.GradingSystem?.GradingSystemName ?? string.Empty));
                                table.Cell().Background(bgColor).Padding(5).Text(t => t.Span(b.IsActive ? "Active" : "Inactive"));
                                table.Cell().Background(bgColor).Padding(5).Text(t => t.Span(b.CreatedAt.ToString("yyyy-MM-dd")));

                                isAlternate = !isAlternate;
                            }
                        });

                    // Footer
                    page.Footer()
                        .AlignRight()
                        .Text(x =>
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

        #region Private Helpers

        /// <summary>
        /// Escapes special CSV delimiter characters (commas, quotes, newlines).
        /// </summary>
        private string EscapeCsv(string? value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            if (value.Contains(",") || value.Contains("\"") || value.Contains("\r") || value.Contains("\n"))
            {
                return $"\"{value.Replace("\"", "\"\"")}\"";
            }
            return value;
        }

        /// <summary>
        /// Sanitizes text to block Excel Formula Injection vulnerabilities (=, +, -, @).
        /// </summary>
        private string SanitizeText(string? value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            if (value.StartsWith("=") || value.StartsWith("+") || value.StartsWith("-") || value.StartsWith("@"))
            {
                return "'" + value;
            }
            return value;
        }

        #endregion
    }
}
