using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.AcademicCalendar;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IAcademicCalendarService
    {
        Task<(List<AcademicCalendarEventResponseDto> Items, int TotalCount, int TotalPages)> GetPagedEventsAsync(AcademicCalendarFilterDto filter);
        Task<List<AcademicCalendarEventResponseDto>> GetEventsByRangeAsync(DateTime startDate, DateTime endDate, int? boardId = null, int? academicYearId = null, int? campusId = null, int? academicLevelId = null, int? groupId = null);
        Task<AcademicCalendarEventResponseDto?> GetByIdAsync(int eventId);
        Task<AcademicCalendarMetricsDto> GetMetricsAsync(int? academicYearId, int? boardId, int? campusId);
        Task<List<AcademicCalendarEventResponseDto>> GetUpcomingEventsAsync(int? academicYearId, int? boardId, int? campusId, int count = 5);
        Task<AcademicCalendarEventResponseDto> CreateEventAsync(CreateAcademicCalendarEventDto dto, int? userId = null);
        Task<AcademicCalendarEventResponseDto?> UpdateEventAsync(int eventId, UpdateAcademicCalendarEventDto dto, int? userId = null);
        Task<AcademicCalendarEventResponseDto?> PublishEventAsync(int eventId, int? userId = null);
        Task<bool> DeleteEventAsync(int eventId, int? userId = null);
        Task<byte[]> ExportCsvAsync(AcademicCalendarFilterDto filter);
    }
}
