using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.AcademicCalendar;
using CollegeManagement.API.Models;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface IAcademicCalendarRepository
    {
        Task<(List<AcademicCalendarEvent> Items, int TotalCount)> GetPagedEventsAsync(AcademicCalendarFilterDto filter);
        Task<List<AcademicCalendarEvent>> GetEventsByRangeAsync(DateTime startDate, DateTime endDate, int? boardId = null, int? academicYearId = null, int? campusId = null, int? academicLevelId = null, int? groupId = null);
        Task<AcademicCalendarEvent?> GetByIdAsync(int eventId);
        Task<AcademicCalendarMetricsDto> GetMetricsAsync(int? academicYearId, int? boardId, int? campusId);
        Task<List<AcademicCalendarEvent>> GetUpcomingEventsAsync(int? academicYearId, int? boardId, int? campusId, int count = 5);
        Task<AcademicCalendarEvent> CreateAsync(AcademicCalendarEvent entity);
        Task<AcademicCalendarEvent> UpdateAsync(AcademicCalendarEvent entity);
        Task<bool> DeleteAsync(int eventId, int? deletedBy = null);
    }
}
