using System.Data;
using Dapper;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelAttendanceRepository : IHostelAttendanceRepository
    {
        private readonly IDbConnection _dbConnection;

        public HostelAttendanceRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<IEnumerable<HostelAttendance>> GetAllAsync(
            int? hostelId = null,
            int? roomId = null,
            int? studentId = null,
            DateTime? attendanceDate = null,
            string? session = null,
            string? attendanceStatus = null,
            string? search = null)
        {
            var parameters = new
            {
                p_HostelId = hostelId,
                p_RoomId = roomId,
                p_StudentId = studentId,
                p_AttendanceDate = attendanceDate?.Date,
                p_Session = session,
                p_AttendanceStatus = attendanceStatus,
                p_Search = search
            };

            return await _dbConnection.QueryAsync<HostelAttendance>(
                "sp_GetHostelAttendance",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelAttendance?> GetByIdAsync(int attendanceId)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelAttendance>(
                "sp_GetHostelAttendanceById",
                new { p_AttendanceId = attendanceId },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelAttendance?> GetByStudentDateSessionAsync(
            int studentId,
            DateTime attendanceDate,
            string session)
        {
            return await _dbConnection.QueryFirstOrDefaultAsync<HostelAttendance>(
                "sp_GetHostelAttendanceByStudentDateSession",
                new
                {
                    p_StudentId = studentId,
                    p_AttendanceDate = attendanceDate.Date,
                    p_Session = session
                },
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> CreateAsync(HostelAttendance attendance)
        {
            var parameters = new
            {
                p_StudentId = attendance.StudentId,
                p_HostelId = attendance.HostelId,
                p_RoomId = attendance.RoomId,
                p_BedId = attendance.BedId,
                p_WardenAssignmentId = attendance.WardenAssignmentId,
                p_AttendanceDate = attendance.AttendanceDate.Date,
                p_Session = attendance.Session,
                p_AttendanceStatus = attendance.AttendanceStatus,
                p_Remarks = attendance.Remarks
            };

            return await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CreateHostelAttendance",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(HostelAttendance attendance)
        {
            var parameters = new
            {
                p_AttendanceId = attendance.AttendanceId,
                p_StudentId = attendance.StudentId,
                p_HostelId = attendance.HostelId,
                p_RoomId = attendance.RoomId,
                p_BedId = attendance.BedId,
                p_WardenAssignmentId = attendance.WardenAssignmentId,
                p_AttendanceDate = attendance.AttendanceDate.Date,
                p_Session = attendance.Session,
                p_AttendanceStatus = attendance.AttendanceStatus,
                p_Remarks = attendance.Remarks
            };

            var result = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_UpdateHostelAttendance",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> DeleteAsync(int attendanceId)
        {
            var result = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_DeleteHostelAttendance",
                new { p_AttendanceId = attendanceId },
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> ExistsAsync(int attendanceId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelAttendanceExists",
                new { p_AttendanceId = attendanceId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> StudentExistsAsync(int studentId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckStudentExists",
                new { p_StudentId = studentId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> HostelExistsAsync(int hostelId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelBlockExists",
                new { p_HostelId = hostelId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> RoomExistsAsync(int roomId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckRoomMasterExists",
                new { p_RoomId = roomId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> BedExistsAsync(int bedId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckHostelBedExists",
                new { p_BedId = bedId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> RoomBelongsToHostelAsync(int roomId, int hostelId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckRoomBelongsToHostel",
                new { p_RoomId = roomId, p_HostelId = hostelId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> BedBelongsToRoomAsync(int bedId, int roomId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckBedBelongsToRoom",
                new { p_BedId = bedId, p_RoomId = roomId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> StudentHasActiveAllocationAsync(
            int studentId,
            int hostelId,
            int roomId,
            int bedId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckStudentHasActiveHostelAllocation",
                new
                {
                    p_StudentId = studentId,
                    p_HostelId = hostelId,
                    p_RoomId = roomId,
                    p_BedId = bedId
                },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }

        public async Task<bool> WardenAssignmentExistsAsync(int wardenAssignmentId)
        {
            var count = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CheckActiveHostelWardenAssignmentExists",
                new { p_WardenAssignmentId = wardenAssignmentId },
                commandType: CommandType.StoredProcedure);

            return count > 0;
        }
    }
}
