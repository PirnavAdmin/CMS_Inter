using CollegeManagement.API.DTOs.Hostel;

namespace CollegeManagement.API.Services.Interfaces.Hostel
{
    public interface IHostelAttendanceService
    {
        Task<IEnumerable<HostelAttendanceResponseDto>> GetAllAsync(
            int? hostelId = null,
            int? roomId = null,
            int? studentId = null,
            DateTime? attendanceDate = null,
            string? session = null,
            string? attendanceStatus = null,
            string? search = null);

        Task<HostelAttendanceResponseDto?> GetByIdAsync(
            int attendanceId);

        Task<(
            bool Success,
            string Message,
            HostelAttendanceResponseDto? Data)>
            CreateAsync(CreateHostelAttendanceDto dto);

        Task<(
            bool Success,
            string Message,
            HostelAttendanceResponseDto? Data)>
            UpdateAsync(
                int attendanceId,
                UpdateHostelAttendanceDto dto);

        Task<(bool Success, string Message)>
            DeleteAsync(int attendanceId);
    }
}