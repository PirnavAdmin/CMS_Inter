using System;
using System.Linq;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace CollegeManagement.API.Services.Exports
{
    public class SectionTimetablePdfDocument : IDocument
    {
        private readonly SectionTimetablePdfModel _model;

        public SectionTimetablePdfDocument(SectionTimetablePdfModel model)
        {
            _model = model;
        }

        public DocumentMetadata GetMetadata() => DocumentMetadata.Default;
        public DocumentSettings GetSettings() => DocumentSettings.Default;

        public void Compose(IDocumentContainer container)
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4.Landscape());
                page.Margin(20);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(9).FontFamily("Arial"));

                page.Header().Element(ComposeHeader);
                page.Content().Element(ComposeContent);
                page.Footer().Element(ComposeFooter);
            });
        }

        private void ComposeHeader(IContainer container)
        {
            container.Column(col =>
            {
                col.Spacing(6);

                // Title
                col.Item().Row(row =>
                {
                    row.RelativeItem().Column(titleCol =>
                    {
                        titleCol.Item().Text("TIMETABLE")
                            .FontSize(18)
                            .ExtraBold()
                            .FontColor(Colors.Blue.Darken3);

                        if (!string.IsNullOrWhiteSpace(_model.BoardName))
                        {
                            titleCol.Item().Text(_model.BoardName)
                                .FontSize(10)
                                .SemiBold()
                                .FontColor(Colors.Grey.Darken2);
                        }
                    });
                });

                // Metadata Box
                col.Item().Background(Colors.Grey.Lighten4).Padding(8).Row(metaRow =>
                {
                    metaRow.RelativeItem(2).Column(c =>
                    {
                        c.Item().Text(t =>
                        {
                            t.Span("Academic Year: ").Bold();
                            t.Span(_model.AcademicYearName);
                        });
                        c.Item().Text(t =>
                        {
                            t.Span("Academic Level: ").Bold();
                            t.Span(_model.AcademicLevelName);
                        });
                    });

                    metaRow.RelativeItem(2).Column(c =>
                    {
                        c.Item().Text(t =>
                        {
                            t.Span("Group: ").Bold();
                            t.Span(_model.GroupName);
                        });
                        c.Item().Text(t =>
                        {
                            t.Span("Program: ").Bold();
                            t.Span(_model.ProgramName);
                        });
                    });

                    metaRow.RelativeItem(1.5f).Column(c =>
                    {
                        c.Item().Text(t =>
                        {
                            t.Span("Section: ").Bold();
                            t.Span(_model.SectionName);
                        });
                    });
                });
            });
        }

        private void ComposeContent(IContainer container)
        {
            container.PaddingTop(10).Table(table =>
            {
                var periods = _model.Periods.OrderBy(p => p.DisplayOrder).ThenBy(p => p.StartTime).ToList();

                table.ColumnsDefinition(columns =>
                {
                    // Day column
                    columns.ConstantColumn(80);

                    // Period columns
                    foreach (var _ in periods)
                    {
                        columns.RelativeColumn(1);
                    }
                });

                // Header row
                table.Header(header =>
                {
                    header.Cell().Background(Colors.Blue.Darken3).Padding(5).AlignCenter().AlignMiddle()
                        .Text("Day").Bold().FontColor(Colors.White).FontSize(9);

                    foreach (var p in periods)
                    {
                        header.Cell().Background(p.IsBreak ? Colors.Grey.Darken1 : Colors.Blue.Darken3)
                            .Padding(4).AlignCenter().AlignMiddle()
                            .Column(c =>
                            {
                                c.Item().AlignCenter().Text(p.PeriodName).Bold().FontColor(Colors.White).FontSize(9);
                                c.Item().AlignCenter().Text(p.TimeRangeString).FontColor(Colors.Grey.Lighten3).FontSize(7.5f);
                            });
                    }
                });

                // Day rows
                bool isAlternate = false;
                foreach (var day in _model.Days.OrderBy(d => d.DayOfWeek))
                {
                    var baseBg = isAlternate ? Colors.Grey.Lighten5 : Colors.White;

                    // Day cell
                    table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2)
                        .Background(Colors.Grey.Lighten3).Padding(6).AlignCenter().AlignMiddle()
                        .Text(day.DayName).Bold().FontSize(9);

                    // Period slots
                    foreach (var p in periods)
                    {
                        if (p.IsBreak)
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2)
                                .Background(Colors.Grey.Lighten4).Padding(4).AlignCenter().AlignMiddle()
                                .Text(p.PeriodName).Italic().FontColor(Colors.Grey.Darken1).FontSize(8);
                        }
                        else if (day.SlotsByPeriodId.TryGetValue(p.PeriodId, out var slot))
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2)
                                .Background(baseBg).Padding(4).AlignCenter().AlignMiddle()
                                .Column(c =>
                                {
                                    c.Spacing(1);

                                    // Subject
                                    var subjectDisplay = !string.IsNullOrWhiteSpace(slot.SubjectName)
                                        ? slot.SubjectName
                                        : slot.SubjectCode;
                                    c.Item().AlignCenter().Text(subjectDisplay).Bold().FontSize(8.5f).FontColor(Colors.Blue.Darken4);

                                    // Staff
                                    if (!string.IsNullOrWhiteSpace(slot.StaffName))
                                    {
                                        var staffDisplay = !string.IsNullOrWhiteSpace(slot.StaffEmployeeId)
                                            ? $"{slot.StaffName} ({slot.StaffEmployeeId})"
                                            : slot.StaffName;
                                        c.Item().AlignCenter().Text(staffDisplay).FontSize(7.5f).FontColor(Colors.Grey.Darken3);
                                    }

                                    // Room
                                    if (!string.IsNullOrWhiteSpace(slot.RoomName) || !string.IsNullOrWhiteSpace(slot.RoomCode))
                                    {
                                        var roomDisplay = !string.IsNullOrWhiteSpace(slot.RoomName)
                                            ? slot.RoomName
                                            : slot.RoomCode;
                                        c.Item().AlignCenter().Text($"Room: {roomDisplay}").FontSize(7f).FontColor(Colors.Grey.Darken1);
                                    }
                                });
                        }
                        else
                        {
                            table.Cell().BorderBottom(1).BorderColor(Colors.Grey.Lighten2)
                                .Background(baseBg).Padding(4).AlignCenter().AlignMiddle()
                                .Text("—").FontColor(Colors.Grey.Lighten1).FontSize(8);
                        }
                    }

                    isAlternate = !isAlternate;
                }
            });
        }

        private void ComposeFooter(IContainer container)
        {
            container.PaddingTop(8).Row(row =>
            {
                row.RelativeItem().Text($"Generated on: {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC")
                    .FontSize(7.5f).FontColor(Colors.Grey.Darken1);

                row.RelativeItem().AlignRight().Text(x =>
                {
                    x.Span("Page ").FontSize(7.5f).FontColor(Colors.Grey.Darken1);
                    x.CurrentPageNumber().FontSize(7.5f).FontColor(Colors.Grey.Darken1);
                    x.Span(" of ").FontSize(7.5f).FontColor(Colors.Grey.Darken1);
                    x.TotalPages().FontSize(7.5f).FontColor(Colors.Grey.Darken1);
                });
            });
        }
    }
}
