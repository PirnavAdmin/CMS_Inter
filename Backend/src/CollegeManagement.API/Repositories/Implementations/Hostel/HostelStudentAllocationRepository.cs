using System.Data;
using Dapper;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelStudentAllocationRepository
        : IHostelStudentAllocationRepository
    {
        private readonly IDbConnection _dbConnection;

        public HostelStudentAllocationRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        private const string BaseSelectSql = @"
            SELECT
                hsa.AllocationId,
                hsa.StudentId,
                s.AdmissionNo,
                s.RollNo,
                s.StudentName AS StudentName,

                hsa.HostelId,
                hb.HostelName,
                hb.HostelCode,
                hb.HostelType,

                hsa.RoomId,
                rm.RoomNumber,
                rm.FloorLevel,

                rtc.RoomTypeSpecification,

                hsa.BedId,
                bed.BedNumber,
                bed.BedStatus,

                hsa.WardenAssignmentId,

                CASE
                    WHEN hwa.WardenAssignmentId IS NULL THEN NULL
                    ELSE CONCAT_WS(
                        ' ',
                        st.FirstName,
                        NULLIF(st.MiddleName, ''),
                        st.LastName
                    )
                END AS WardenName,

                hsa.JoiningDate,
                hsa.Status,
                hsa.Remarks,
                hsa.CreatedAt,
                hsa.UpdatedAt

            FROM hostel_student_allocations hsa

            INNER JOIN Students s
                ON hsa.StudentId = s.StudentId

            INNER JOIN hostel_blocks hb
                ON hsa.HostelId = hb.HostelId

            INNER JOIN room_masters rm
                ON hsa.RoomId = rm.RoomId

            INNER JOIN room_type_configs rtc
                ON rm.RoomTypeId = rtc.RoomTypeId

            INNER JOIN hostel_beds bed
                ON hsa.BedId = bed.BedId

            LEFT JOIN hostel_warden_assignments hwa
                ON hsa.WardenAssignmentId = hwa.WardenAssignmentId

            LEFT JOIN Staff st
                ON hwa.StaffId = st.Id
        ";

        public async Task<IEnumerable<HostelStudentAllocation>> GetAllAsync(
            int? hostelId = null,
            int? roomId = null,
            int? studentId = null,
            string? status = null,
            string? search = null)
        {
            var parameters = new
            {
                p_HostelId = hostelId,
                p_RoomId = roomId,
                p_StudentId = studentId,
                p_Status = status,
                p_Search = search
            };

            return await _dbConnection.QueryAsync<HostelStudentAllocation>(
                "sp_GetHostelStudentAllocations",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelStudentAllocation?> GetByIdAsync(
            int allocationId)
        {
            return await _dbConnection
                .QueryFirstOrDefaultAsync<HostelStudentAllocation>(
                    "sp_GetHostelStudentAllocationById",
                    new
                    {
                        p_AllocationId = allocationId
                    },
                    commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelStudentAllocation?> GetActiveByStudentAsync(
            int studentId)
        {
            var sql = BaseSelectSql + @"
                WHERE hsa.StudentId = @StudentId
                  AND LOWER(hsa.Status) = 'active'
                ORDER BY hsa.AllocationId DESC
                LIMIT 1;
            ";

            return await _dbConnection
                .QueryFirstOrDefaultAsync<HostelStudentAllocation>(
                    sql,
                    new
                    {
                        StudentId = studentId
                    });
        }

        public async Task<HostelStudentAllocation?> GetActiveByBedAsync(
            int bedId)
        {
            var sql = BaseSelectSql + @"
                WHERE hsa.BedId = @BedId
                  AND LOWER(hsa.Status) = 'active'
                ORDER BY hsa.AllocationId DESC
                LIMIT 1;
            ";

            return await _dbConnection
                .QueryFirstOrDefaultAsync<HostelStudentAllocation>(
                    sql,
                    new
                    {
                        BedId = bedId
                    });
        }

        public async Task<int> CreateAsync(
            HostelStudentAllocation allocation)
        {
            var parameters = new
            {
                p_StudentId = allocation.StudentId,
                p_HostelId = allocation.HostelId,
                p_RoomId = allocation.RoomId,
                p_BedId = allocation.BedId,
                p_WardenAssignmentId = allocation.WardenAssignmentId,
                p_JoiningDate = allocation.JoiningDate.Date,
                p_Status = allocation.Status,
                p_Remarks = allocation.Remarks
            };

            return await _dbConnection.ExecuteScalarAsync<int>(
                "sp_CreateHostelStudentAllocation",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(
            HostelStudentAllocation allocation)
        {
            var parameters = new
            {
                p_AllocationId = allocation.AllocationId,
                p_StudentId = allocation.StudentId,
                p_HostelId = allocation.HostelId,
                p_RoomId = allocation.RoomId,
                p_BedId = allocation.BedId,
                p_WardenAssignmentId = allocation.WardenAssignmentId,
                p_JoiningDate = allocation.JoiningDate.Date,
                p_Status = allocation.Status,
                p_Remarks = allocation.Remarks
            };

            var result = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_UpdateHostelStudentAllocation",
                parameters,
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> DeleteAsync(int allocationId)
        {
            var result = await _dbConnection.ExecuteScalarAsync<int>(
                "sp_DeleteHostelStudentAllocation",
                new
                {
                    p_AllocationId = allocationId
                },
                commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> ExistsAsync(int allocationId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_student_allocations
                WHERE AllocationId = @AllocationId;
            ";

            return await _dbConnection.ExecuteScalarAsync<int>(
                sql,
                new
                {
                    AllocationId = allocationId
                }) > 0;
        }

        public async Task<bool> StudentExistsAsync(int studentId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM Students
                WHERE StudentId = @StudentId;
            ";

            return await _dbConnection.ExecuteScalarAsync<int>(
                sql,
                new
                {
                    StudentId = studentId
                }) > 0;
        }

        public async Task<bool> HostelExistsAsync(int hostelId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_blocks
                WHERE HostelId = @HostelId;
            ";

            return await _dbConnection.ExecuteScalarAsync<int>(
                sql,
                new
                {
                    HostelId = hostelId
                }) > 0;
        }

        public async Task<bool> RoomExistsAsync(int roomId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM room_masters
                WHERE RoomId = @RoomId;
            ";

            return await _dbConnection.ExecuteScalarAsync<int>(
                sql,
                new
                {
                    RoomId = roomId
                }) > 0;
        }

        public async Task<bool> BedExistsAsync(int bedId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_beds
                WHERE BedId = @BedId;
            ";

            return await _dbConnection.ExecuteScalarAsync<int>(
                sql,
                new
                {
                    BedId = bedId
                }) > 0;
        }

        public async Task<bool> WardenAssignmentExistsAsync(
            int wardenAssignmentId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_warden_assignments
                WHERE WardenAssignmentId = @WardenAssignmentId
                  AND LOWER(Status) = 'active';
            ";

            return await _dbConnection.ExecuteScalarAsync<int>(
                sql,
                new
                {
                    WardenAssignmentId = wardenAssignmentId
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

            return await _dbConnection.ExecuteScalarAsync<int>(
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

            return await _dbConnection.ExecuteScalarAsync<int>(
                sql,
                new
                {
                    BedId = bedId,
                    RoomId = roomId
                }) > 0;
        }
    }
}
