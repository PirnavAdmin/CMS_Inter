using System.Data;
using Dapper;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelOutpassLeaveRepository
        : IHostelOutpassLeaveRepository
    {
        private readonly IDbConnection _dbConnection;

        public HostelOutpassLeaveRepository(
            IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        private const string BaseSelectSql = @"
            SELECT
                hol.RequestId,
                hol.StudentId,
                s.AdmissionNo,
                s.RollNo,
                s.StudentName AS StudentName,

                hol.HostelId,
                hb.HostelName,
                hb.HostelCode,
                hb.HostelType,

                hol.RoomId,
                rm.RoomNumber,
                rm.FloorLevel,

                hol.BedId,
                bed.BedNumber,

                hol.WardenAssignmentId,

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

                hol.RequestType,
                hol.FromDateTime,
                hol.ToDateTime,
                hol.Reason,
                hol.Destination,
                hol.ApprovalStatus,
                hol.ApprovalRemarks,
                hol.ApprovedAt,
                hol.CreatedAt,
                hol.UpdatedAt

            FROM hostel_outpass_leave hol

            INNER JOIN Students s
                ON hol.StudentId = s.StudentId

            INNER JOIN hostel_blocks hb
                ON hol.HostelId = hb.HostelId

            INNER JOIN room_masters rm
                ON hol.RoomId = rm.RoomId

            INNER JOIN hostel_beds bed
                ON hol.BedId = bed.BedId

            LEFT JOIN hostel_warden_assignments hwa
                ON hol.WardenAssignmentId =
                   hwa.WardenAssignmentId

            LEFT JOIN Staff st
                ON hwa.StaffId = st.Id
        ";

        public async Task<IEnumerable<HostelOutpassLeave>>
            GetAllAsync(
                int? hostelId = null,
                int? studentId = null,
                string? requestType = null,
                string? approvalStatus = null,
                DateTime? fromDate = null,
                DateTime? toDate = null,
                string? search = null)
        {
            var parameters = new
            {
                p_HostelId = hostelId,
                p_StudentId = studentId,
                p_RequestType = requestType,
                p_ApprovalStatus = approvalStatus,
                p_FromDate = fromDate?.Date,
                p_ToDate = toDate?.Date,
                p_Search = search
            };

            return await _dbConnection
                .QueryAsync<HostelOutpassLeave>(
                    "sp_GetHostelOutpassLeave",
                    parameters,
                    commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelOutpassLeave?>
            GetByIdAsync(int requestId)
        {
            return await _dbConnection
                .QueryFirstOrDefaultAsync<HostelOutpassLeave>(
                    "sp_GetHostelOutpassLeaveById",
                    new
                    {
                        p_RequestId = requestId
                    },
                    commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelOutpassLeave?>
            GetOverlappingRequestAsync(
                int studentId,
                DateTime fromDateTime,
                DateTime toDateTime,
                int? excludeRequestId = null)
        {
            var sql = BaseSelectSql + @"
                WHERE hol.StudentId = @StudentId

                  AND LOWER(hol.ApprovalStatus)
                      IN ('pending', 'approved')

                  AND hol.FromDateTime < @ToDateTime
                  AND hol.ToDateTime > @FromDateTime
            ";

            if (excludeRequestId.HasValue)
            {
                sql += @"
                    AND hol.RequestId <> @ExcludeRequestId
                ";
            }

            sql += @"
                ORDER BY hol.RequestId DESC
                LIMIT 1;
            ";

            return await _dbConnection
                .QueryFirstOrDefaultAsync<HostelOutpassLeave>(
                    sql,
                    new
                    {
                        StudentId = studentId,
                        FromDateTime = fromDateTime,
                        ToDateTime = toDateTime,
                        ExcludeRequestId = excludeRequestId
                    });
        }

        public async Task<int> CreateAsync(
            HostelOutpassLeave request)
        {
            var parameters = new
            {
                p_StudentId = request.StudentId,
                p_HostelId = request.HostelId,
                p_RoomId = request.RoomId,
                p_BedId = request.BedId,
                p_WardenAssignmentId =
                    request.WardenAssignmentId,
                p_RequestType = request.RequestType,
                p_FromDateTime = request.FromDateTime,
                p_ToDateTime = request.ToDateTime,
                p_Reason = request.Reason,
                p_Destination = request.Destination,
                p_ApprovalStatus = request.ApprovalStatus,
                p_ApprovalRemarks = request.ApprovalRemarks,
                p_ApprovedAt = request.ApprovedAt
            };

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    "sp_CreateHostelOutpassLeave",
                    parameters,
                    commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(
            HostelOutpassLeave request)
        {
            var parameters = new
            {
                p_RequestId = request.RequestId,
                p_StudentId = request.StudentId,
                p_HostelId = request.HostelId,
                p_RoomId = request.RoomId,
                p_BedId = request.BedId,
                p_WardenAssignmentId =
                    request.WardenAssignmentId,
                p_RequestType = request.RequestType,
                p_FromDateTime = request.FromDateTime,
                p_ToDateTime = request.ToDateTime,
                p_Reason = request.Reason,
                p_Destination = request.Destination
            };

            var result = await _dbConnection
                .ExecuteScalarAsync<int>(
                    "sp_UpdateHostelOutpassLeave",
                    parameters,
                    commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> UpdateApprovalAsync(
            int requestId,
            string approvalStatus,
            string? approvalRemarks,
            DateTime? approvedAt)
        {
            var result = await _dbConnection
                .ExecuteScalarAsync<int>(
                    "sp_UpdateHostelOutpassLeaveApproval",
                    new
                    {
                        p_RequestId = requestId,
                        p_ApprovalStatus = approvalStatus,
                        p_ApprovalRemarks = approvalRemarks,
                        p_ApprovedAt = approvedAt
                    },
                    commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> DeleteAsync(
            int requestId)
        {
            var result = await _dbConnection
                .ExecuteScalarAsync<int>(
                    "sp_DeleteHostelOutpassLeave",
                    new
                    {
                        p_RequestId = requestId
                    },
                    commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> ExistsAsync(
            int requestId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_outpass_leave
                WHERE RequestId = @RequestId;
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    new
                    {
                        RequestId = requestId
                    }) > 0;
        }

        public async Task<bool> StudentExistsAsync(
            int studentId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM Students
                WHERE StudentId = @StudentId;
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
                WHERE HostelId = @HostelId;
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
                WHERE RoomId = @RoomId;
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
                WHERE BedId = @BedId;
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    new
                    {
                        BedId = bedId
                    }) > 0;
        }

        public async Task<bool> RoomBelongsToHostelAsync(
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

        public async Task<bool> BedBelongsToRoomAsync(
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
