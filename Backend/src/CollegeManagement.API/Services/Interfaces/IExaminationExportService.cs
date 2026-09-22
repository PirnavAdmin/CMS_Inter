using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Examination.Responses;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IExaminationExportService
    {
        // Examinations List Export
        Task<byte[]> GenerateExaminationsCsvAsync(IEnumerable<ExaminationResponse> examinations);
        Task<byte[]> GenerateExaminationsExcelAsync(IEnumerable<ExaminationResponse> examinations);
        Task<byte[]> GenerateExaminationsPdfAsync(IEnumerable<ExaminationResponse> examinations);

        // Specific Examination Timetable / Schedule Export
        Task<byte[]> GenerateTimetableCsvAsync(ExaminationResponse exam, IEnumerable<ExamScheduleResponse> schedules);
        Task<byte[]> GenerateTimetableExcelAsync(ExaminationResponse exam, IEnumerable<ExamScheduleResponse> schedules);
        Task<byte[]> GenerateTimetablePdfAsync(ExaminationResponse exam, IEnumerable<ExamScheduleResponse> schedules);

        // Global Scheduled Exams Export
        Task<byte[]> GenerateScheduledExamsCsvAsync(IEnumerable<ExaminationResponse> examinations);
        Task<byte[]> GenerateScheduledExamsExcelAsync(IEnumerable<ExaminationResponse> examinations);
        Task<byte[]> GenerateScheduledExamsPdfAsync(IEnumerable<ExaminationResponse> examinations);
    }
}
