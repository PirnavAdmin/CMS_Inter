using System.Data;
using Dapper;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelAttendanceRepository
        : IHostelAttendanceRepository
    {
        private readonly IDbConnection _dbConnection;

        public HostelAttendanceRepository(
            IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        private const string BaseSelectSql = @"
            SELECT
                ha.AttendanceId,
                ha.StudentId,
                s.AdmissionNo,
                s.RollNo,

                s.StudentName AS StudentName,

                ha.HostelId,
                hb.HostelName,
                hb.HostelCode,
                hb.HostelType,

                ha.RoomId,
                rm.RoomNumber,
                rm.FloorLevel,

                ha.BedId,
                bed.BedNumber,

                ha.WardenAssignmentId,

                CASE
                    WHEN hwa.WardenAssignmentId IS NULL
                        THEN NULL
                    ELSE CONCAT_WS(
                        ' ',
                        st.FirstName,
                        NULLIF(st.MiddleName, ''),
                        st.LastName
                    )
                END AS WardenName,

                ha.AttendanceDate,
                ha.Session,
                ha.AttendanceStatus,
                ha.Remarks,
                ha.CreatedAt,
                ha.UpdatedAt

            FROM hostel_attendance ha

            INNER JOIN Students s
                ON ha.StudentId = s.StudentId

            INNER JOIN hostel_blocks hb
                ON ha.HostelId = hb.HostelId

            INNER JOIN room_masters rm
                ON ha.RoomId = rm.RoomId

            INNER JOIN hostel_beds bed
                ON ha.BedId = bed.BedId

            LEFT JOIN hostel_warden_assignments hwa
                ON ha.WardenAssignmentId =
                   hwa.WardenAssignmentId

            LEFT JOIN Staff st
                ON hwa.StaffId = st.Id
        ";

        public async Task<IEnumerable<HostelAttendance>>
            GetAllAsync(
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

            return await _dbConnection
                .QueryAsync<HostelAttendance>(
                    "sp_GetHostelAttendance",
                    parameters,
                    commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelAttendance?>
            GetByIdAsync(int attendanceId)
        {
            return await _dbConnection
                .QueryFirstOrDefaultAsync<HostelAttendance>(
                    "sp_GetHostelAttendanceById",
                    new
                    {
                        p_AttendanceId = attendanceId
                    },
                    commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelAttendance?>
            GetByStudentDateSessionAsync(
                int studentId,
                DateTime attendanceDate,
                string session)
        {
            var sql = BaseSelectSql + @"
                WHERE ha.StudentId = @StudentId
                  AND ha.AttendanceDate =
                      @AttendanceDate
                  AND LOWER(ha.Session) =
                      LOWER(@Session)
                LIMIT 1;
            ";

            return await _dbConnection
                .QueryFirstOrDefaultAsync<HostelAttendance>(
                    sql,
                    new
                    {
                        StudentId = studentId,
                        AttendanceDate =
                            attendanceDate.Date,
                        Session = session
                    });
        }

        public async Task<int> CreateAsync(
            HostelAttendance attendance)
        {
            var parameters = new
            {
                p_StudentId = attendance.StudentId,
                p_HostelId = attendance.HostelId,
                p_RoomId = attendance.RoomId,
                p_BedId = attendance.BedId,
                p_WardenAssignmentId =
                    attendance.WardenAssignmentId,
                p_AttendanceDate =
                    attendance.AttendanceDate.Date,
                p_Session = attendance.Session,
                p_AttendanceStatus =
                    attendance.AttendanceStatus,
                p_Remarks = attendance.Remarks
            };

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    "sp_CreateHostelAttendance",
                    parameters,
                    commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(
            HostelAttendance attendance)
        {
            var parameters = new
            {
                p_AttendanceId = attendance.AttendanceId,
                p_StudentId = attendance.StudentId,
                p_HostelId = attendance.HostelId,
                p_RoomId = attendance.RoomId,
                p_BedId = attendance.BedId,
                p_WardenAssignmentId =
                    attendance.WardenAssignmentId,
                p_AttendanceDate =
                    attendance.AttendanceDate.Date,
                p_Session = attendance.Session,
                p_AttendanceStatus =
                    attendance.AttendanceStatus,
                p_Remarks = attendance.Remarks
            };

            var result = await _dbConnection
                .ExecuteScalarAsync<int>(
                    "sp_UpdateHostelAttendance",
                    parameters,
                    commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> DeleteAsync(
            int attendanceId)
        {
            var result = await _dbConnection
                .ExecuteScalarAsync<int>(
                    "sp_DeleteHostelAttendance",
                    new
                    {
                        p_AttendanceId = attendanceId
                    },
                    commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> ExistsAsync(
            int attendanceId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_attendance
                WHERE AttendanceId =
                    @AttendanceId;
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    new
                    {
                        AttendanceId = attendanceId
                    }) > 0;
        }

        public async Task<bool> StudentExistsAsync(
            int studentId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM Students
                WHERE StudentId =
                    @StudentId;
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    new
                    {
                        StudentId = studentId
                    }) > 0;
        }

        public async Task<bool> HostelExistsAsync(
            int hostelId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_blocks
                WHERE HostelId =
                    @HostelId;
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    new
                    {
                        HostelId = hostelId
                    }) > 0;
        }

        public async Task<bool> RoomExistsAsync(
            int roomId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM room_masters
                WHERE RoomId =
                    @RoomId;
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    new
                    {
                        RoomId = roomId
                    }) > 0;
        }

        public async Task<bool> BedExistsAsync(
            int bedId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_beds
                WHERE BedId =
                    @BedId;
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    new
                    {
                        BedId = bedId
                    }) > 0;
        }

        public async Task<bool>
            RoomBelongsToHostelAsync(
                int roomId,
                int hostelId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM room_masters
                WHERE RoomId = @RoomId
                  AND HostelId = @HostelId;
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    new
                    {
                        RoomId = roomId,
                        HostelId = hostelId
                    }) > 0;
        }

        public async Task<bool>
            BedBelongsToRoomAsync(
                int bedId,
                int roomId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_beds
                WHERE BedId = @BedId
                  AND RoomId = @RoomId;
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    new
                    {
                        BedId = bedId,
                        RoomId = roomId
                    }) > 0;
        }

        public async Task<bool>
            StudentHasActiveAllocationAsync(
                int studentId,
                int hostelId,
                int roomId,
                int bedId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_student_allocations
                WHERE StudentId = @StudentId
                  AND HostelId = @HostelId
                  AND RoomId = @RoomId
                  AND BedId = @BedId
                  AND LOWER(Status) = 'active';
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    new
                    {
                        StudentId = studentId,
                        HostelId = hostelId,
                        RoomId = roomId,
                        BedId = bedId
                    }) > 0;
        }

        public async Task<bool>
            WardenAssignmentExistsAsync(
                int wardenAssignmentId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_warden_assignments
                WHERE WardenAssignmentId =
                    @WardenAssignmentId
                  AND LOWER(Status) = 'active';
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    new
                    {
                        WardenAssignmentId =
                            wardenAssignmentId
                    }) > 0;
        }
    }
}
