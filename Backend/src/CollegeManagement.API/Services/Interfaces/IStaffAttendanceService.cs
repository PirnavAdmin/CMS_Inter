using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.DTOs.StaffAttendance.Responses;
using CollegeManagement.API.Enums;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface IStaffAttendanceService
    {
        Task<IEnumerable<StaffAttendanceItemResponse>> LoadStaffAttendanceAsync(LoadStaffAttendanceRequest request);

        Task<int> BulkSaveStaffAttendanceAsync(BulkSaveStaffAttendanceRequest request, int? currentUserId);

        Task<bool> UpdateStaffAttendanceAsync(UpdateStaffAttendanceRequest request, int? currentUserId);

        Task<StaffDetailsResponse?> GetStaffDetailsAsync(int facultyId, DateTime date);

        Task<StaffMonthlyReportResponse> GetStaffMonthlyReportGridAsync(StaffMonthlyReportRequest request);

        Task<byte[]> ExportStaffMonthlyReportToCsvAsync(StaffMonthlyReportRequest request);

        Task<byte[]> ExportStaffMonthlyReportToExcelAsync(StaffMonthlyReportRequest request);

        Task<CollegeManagement.API.DTOs.Attendance.Responses.YearlyOverviewResponse> GetStaffYearlyOverviewAsync(int staffId, int academicYearId);
        Task<byte[]> GenerateImportTemplateAsync();
        Task<object> ImportStaffAttendanceFromExcelAsync(byte[] fileBytes, bool validateOnly, bool isAdmin, string userName, int? userId);

        // Self-Service Attendance & Regularization
        Task<MyAttendanceTodayResponse> GetMyTodayStatusAsync(int facultyId, DateTime date);
        Task<MyAttendanceTodayResponse> PunchInAsync(int facultyId, StaffPunchRequest request, string? clientIp, int? userId);
        Task<MyAttendanceTodayResponse> PunchOutAsync(int facultyId, StaffPunchRequest request, string? clientIp, int? userId);
        Task<MyAttendanceHistoryResponse> GetMyAttendanceHistoryAsync(int facultyId, string period, DateTime? targetDate);
        Task<bool> SubmitRegularizationAsync(int facultyId, SubmitRegularizationRequest request, int? userId);
        Task<IEnumerable<RegularizationItemDto>> GetRegularizationsAsync(string? status, int? departmentId);
        Task<bool> ReviewRegularizationAsync(int regularizationId, ReviewRegularizationRequest request, int? reviewerUserId);
    }
}
