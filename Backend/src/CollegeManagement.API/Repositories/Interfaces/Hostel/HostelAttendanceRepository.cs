using CollegeManagement.API.Models.Hostel;

namespace CollegeManagement.API.Repositories.Interfaces.Hostel
{
    public interface IHostelAttendanceRepository
    {
        Task<IEnumerable<HostelAttendance>> GetAllAsync(
            int? hostelId = null,
            int? roomId = null,
            int? studentId = null,
            DateTime? attendanceDate = null,
            string? session = null,
            string? attendanceStatus = null,
            string? search = null);

        Task<HostelAttendance?> GetByIdAsync(int attendanceId);

        Task<HostelAttendance?> GetByStudentDateSessionAsync(
            int studentId,
            DateTime attendanceDate,
            string session);

        Task<int> CreateAsync(HostelAttendance attendance);

        Task<bool> UpdateAsync(HostelAttendance attendance);

        Task<bool> DeleteAsync(int attendanceId);

        Task<bool> ExistsAsync(int attendanceId);

        Task<bool> StudentExistsAsync(int studentId);

        Task<bool> HostelExistsAsync(int hostelId);

        Task<bool> RoomExistsAsync(int roomId);

        Task<bool> BedExistsAsync(int bedId);

        Task<bool> RoomBelongsToHostelAsync(
            int roomId,
            int hostelId);

        Task<bool> BedBelongsToRoomAsync(
            int bedId,
            int roomId);

        Task<bool> StudentHasActiveAllocationAsync(
            int studentId,
            int hostelId,
            int roomId,
            int bedId);

        Task<bool> WardenAssignmentExistsAsync(
            int wardenAssignmentId);
    }
}