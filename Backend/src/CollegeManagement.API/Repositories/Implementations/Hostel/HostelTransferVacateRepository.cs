using System.Data;
using Dapper;
using CollegeManagement.API.Models.Hostel;
using CollegeManagement.API.Repositories.Interfaces.Hostel;

namespace CollegeManagement.API.Repositories.Implementations.Hostel
{
    public class HostelTransferVacateRepository
        : IHostelTransferVacateRepository
    {
        private readonly IDbConnection _dbConnection;

        public HostelTransferVacateRepository(
            IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        private const string BaseSelectSql = @"
            SELECT
                htv.RequestId,
                htv.AllocationId,
                htv.StudentId,

                s.AdmissionNo,
                s.RollNo,
                s.StudentName AS StudentName,

                htv.RequestType,

                htv.FromHostelId,
                fh.HostelName AS FromHostelName,
                fh.HostelCode AS FromHostelCode,

                htv.FromRoomId,
                fr.RoomNumber AS FromRoomNumber,
                fr.FloorLevel AS FromFloorLevel,

                htv.FromBedId,
                fb.BedNumber AS FromBedNumber,

                htv.ToHostelId,
                th.HostelName AS ToHostelName,
                th.HostelCode AS ToHostelCode,

                htv.ToRoomId,
                tr.RoomNumber AS ToRoomNumber,
                tr.FloorLevel AS ToFloorLevel,

                htv.ToBedId,
                tb.BedNumber AS ToBedNumber,

                htv.WardenAssignmentId,

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

                htv.RequestDate,
                htv.EffectiveDate,
                htv.Reason,

                htv.ApprovalStatus,
                htv.ApprovalRemarks,
                htv.ApprovedAt,

                htv.FeeSettlementStatus,
                htv.RefundAmount,
                htv.AdditionalChargeAmount,
                htv.SettlementRemarks,

                htv.CompletedAt,
                htv.CreatedAt,
                htv.UpdatedAt

            FROM hostel_transfer_vacate htv

            INNER JOIN Students s
                ON htv.StudentId = s.StudentId

            INNER JOIN hostel_blocks fh
                ON htv.FromHostelId = fh.HostelId

            INNER JOIN room_masters fr
                ON htv.FromRoomId = fr.RoomId

            INNER JOIN hostel_beds fb
                ON htv.FromBedId = fb.BedId

            LEFT JOIN hostel_blocks th
                ON htv.ToHostelId = th.HostelId

            LEFT JOIN room_masters tr
                ON htv.ToRoomId = tr.RoomId

            LEFT JOIN hostel_beds tb
                ON htv.ToBedId = tb.BedId

            LEFT JOIN hostel_warden_assignments hwa
                ON htv.WardenAssignmentId =
                   hwa.WardenAssignmentId

            LEFT JOIN Staff st
                ON hwa.StaffId = st.Id
        ";

        public async Task<IEnumerable<HostelTransferVacate>>
            GetAllAsync(
                int? studentId = null,
                string? requestType = null,
                string? approvalStatus = null,
                string? feeSettlementStatus = null,
                DateTime? requestDate = null,
                string? search = null)
        {
            return await _dbConnection
                .QueryAsync<HostelTransferVacate>(
                    "sp_GetHostelTransferVacate",
                    new
                    {
                        p_StudentId = studentId,
                        p_RequestType = string.IsNullOrWhiteSpace(requestType)
                            ? null : requestType.Trim(),
                        p_ApprovalStatus = string.IsNullOrWhiteSpace(approvalStatus)
                            ? null : approvalStatus.Trim(),
                        p_FeeSettlementStatus = string.IsNullOrWhiteSpace(feeSettlementStatus)
                            ? null : feeSettlementStatus.Trim(),
                        p_RequestDate = requestDate?.Date,
                        p_Search = string.IsNullOrWhiteSpace(search)
                            ? null : search.Trim()
                    },
                    commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelTransferVacate?>
            GetByIdAsync(int requestId)
        {
            return await _dbConnection
                .QueryFirstOrDefaultAsync<HostelTransferVacate>(
                    "sp_GetHostelTransferVacateById",
                    new
                    {
                        p_RequestId = requestId
                    },
                    commandType: CommandType.StoredProcedure);
        }

        public async Task<HostelTransferVacate?>
            GetOpenRequestByAllocationAsync(
                int allocationId,
                int? excludeRequestId = null)
        {
            var sql = BaseSelectSql + @"
                WHERE htv.AllocationId =
                    @AllocationId

                  AND LOWER(htv.ApprovalStatus)
                      IN ('pending', 'approved')
            ";

            if (excludeRequestId.HasValue)
            {
                sql += @"
                    AND htv.RequestId <>
                        @ExcludeRequestId
                ";
            }

            sql += @"
                ORDER BY htv.RequestId DESC
                LIMIT 1;
            ";

            return await _dbConnection
                .QueryFirstOrDefaultAsync<HostelTransferVacate>(
                    sql,
                    new
                    {
                        AllocationId =
                            allocationId,

                        ExcludeRequestId =
                            excludeRequestId
                    });
        }

        public async Task<int> CreateAsync(
            HostelTransferVacate request)
        {
            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    "sp_CreateHostelTransferVacate",
                    new
                    {
                        p_AllocationId = request.AllocationId,
                        p_StudentId = request.StudentId,
                        p_RequestType = request.RequestType,

                        p_FromHostelId = request.FromHostelId,
                        p_FromRoomId = request.FromRoomId,
                        p_FromBedId = request.FromBedId,

                        p_ToHostelId = request.ToHostelId,
                        p_ToRoomId = request.ToRoomId,
                        p_ToBedId = request.ToBedId,

                        p_WardenAssignmentId = request.WardenAssignmentId,

                        p_RequestDate = request.RequestDate,
                        p_EffectiveDate = request.EffectiveDate,
                        p_Reason = request.Reason,

                        p_ApprovalStatus = request.ApprovalStatus,
                        p_ApprovalRemarks = request.ApprovalRemarks,
                        p_ApprovedAt = request.ApprovedAt,

                        p_FeeSettlementStatus = request.FeeSettlementStatus,
                        p_RefundAmount = request.RefundAmount,
                        p_AdditionalChargeAmount =
                            request.AdditionalChargeAmount,
                        p_SettlementRemarks = request.SettlementRemarks,

                        p_CompletedAt = request.CompletedAt
                    },
                    commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> UpdateAsync(
            HostelTransferVacate request)
        {
            var result =
                await _dbConnection
                    .ExecuteScalarAsync<int>(
                        "sp_UpdateHostelTransferVacate",
                        new
                        {
                            p_RequestId = request.RequestId,
                            p_AllocationId = request.AllocationId,
                            p_StudentId = request.StudentId,
                            p_RequestType = request.RequestType,

                            p_FromHostelId = request.FromHostelId,
                            p_FromRoomId = request.FromRoomId,
                            p_FromBedId = request.FromBedId,

                            p_ToHostelId = request.ToHostelId,
                            p_ToRoomId = request.ToRoomId,
                            p_ToBedId = request.ToBedId,

                            p_WardenAssignmentId =
                                request.WardenAssignmentId,

                            p_RequestDate = request.RequestDate,
                            p_EffectiveDate = request.EffectiveDate,
                            p_Reason = request.Reason
                        },
                        commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> UpdateApprovalAsync(
            int requestId,
            string approvalStatus,
            string? approvalRemarks,
            DateTime? approvedAt)
        {
            var result =
                await _dbConnection
                    .ExecuteScalarAsync<int>(
                        "sp_UpdateHostelTransferVacateApproval",
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

        public async Task<bool> UpdateSettlementAsync(
            int requestId,
            string feeSettlementStatus,
            decimal refundAmount,
            decimal additionalChargeAmount,
            string? settlementRemarks)
        {
            var result =
                await _dbConnection
                    .ExecuteScalarAsync<int>(
                        "sp_UpdateHostelTransferVacateSettlement",
                        new
                        {
                            p_RequestId = requestId,
                            p_FeeSettlementStatus = feeSettlementStatus,
                            p_RefundAmount = refundAmount,
                            p_AdditionalChargeAmount =
                                additionalChargeAmount,
                            p_SettlementRemarks = settlementRemarks
                        },
                        commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> CompleteAsync(
            int requestId)
        {
            var result =
                await _dbConnection
                    .ExecuteScalarAsync<int>(
                        "sp_CompleteHostelTransferVacate",
                        new
                        {
                            p_RequestId = requestId
                        },
                        commandType: CommandType.StoredProcedure);

            return result == 1;
        }

        public async Task<bool> DeleteAsync(
            int requestId)
        {
            var result =
                await _dbConnection
                    .ExecuteScalarAsync<int>(
                        "sp_DeleteHostelTransferVacate",
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
                FROM hostel_transfer_vacate
                WHERE RequestId =
                    @RequestId;
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    new
                    {
                        RequestId = requestId
                    }) > 0;
        }

        public async Task<bool> AllocationExistsAsync(
            int allocationId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_student_allocations
                WHERE AllocationId =
                    @AllocationId;
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    new
                    {
                        AllocationId =
                            allocationId
                    }) > 0;
        }

        public async Task<bool>
            ActiveAllocationMatchesAsync(
                int allocationId,
                int studentId,
                int hostelId,
                int roomId,
                int bedId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_student_allocations
                WHERE AllocationId =
                    @AllocationId

                  AND StudentId =
                    @StudentId

                  AND HostelId =
                    @HostelId

                  AND RoomId =
                    @RoomId

                  AND BedId =
                    @BedId

                  AND LOWER(Status) =
                    'active';
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    new
                    {
                        AllocationId =
                            allocationId,

                        StudentId =
                            studentId,

                        HostelId =
                            hostelId,

                        RoomId =
                            roomId,

                        BedId =
                            bedId
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
                        HostelId =
                            hostelId
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
                        RoomId =
                            roomId
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
                        BedId =
                            bedId
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
                        RoomId =
                            roomId,

                        HostelId =
                            hostelId
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
                        BedId =
                            bedId,

                        RoomId =
                            roomId
                    }) > 0;
        }

        public async Task<bool>
            IsBedAvailableAsync(int bedId)
        {
            const string sql = @"
                SELECT COUNT(1)
                FROM hostel_beds
                WHERE BedId = @BedId
                  AND LOWER(Status) = 'active'
                  AND LOWER(BedStatus) =
                      'available';
            ";

            return await _dbConnection
                .ExecuteScalarAsync<int>(
                    sql,
                    new
                    {
                        BedId =
                            bedId
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

                  AND LOWER(Status) =
                    'active';
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