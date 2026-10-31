using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Reimbursement;
using CollegeManagement.API.Repositories.Interfaces.Reimbursement;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations.Reimbursement
{
    public class ReimbursementRepository : IReimbursementRepository
    {
        private readonly AppDbContext _context;

        public ReimbursementRepository(AppDbContext context)
        {
            _context = context;
        }

        private async Task<DbConnection> GetOpenConnectionAsync()
        {
            var conn = _context.Database.GetDbConnection();
            if (conn.State == ConnectionState.Broken || conn.State == ConnectionState.Closed)
            {
                try { await conn.CloseAsync(); } catch { }
                await _context.Database.OpenConnectionAsync();
            }
            else if (conn.State != ConnectionState.Open)
            {
                await _context.Database.OpenConnectionAsync();
            }
            return conn;
        }

        public async Task<CreateClaimResponseDto> CreateClaimAsync(CreateReimbursementClaimRequest request)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_StaffId", request.StaffId);
            parameters.Add("p_CampusId", request.CampusId);
            parameters.Add("p_AcademicYear", request.AcademicYear);
            parameters.Add("p_ExpenseCategory", request.ExpenseCategory);
            parameters.Add("p_ExpenseDate", request.ExpenseDate);
            parameters.Add("p_Amount", request.Amount);
            parameters.Add("p_PreferredPaymentMethod", request.PreferredPaymentMethod);
            parameters.Add("p_Purpose", request.Purpose);
            parameters.Add("p_AdditionalNotes", request.AdditionalNotes);
            parameters.Add("p_ReceiptUrl", request.ReceiptUrl);

            return await conn.QueryFirstOrDefaultAsync<CreateClaimResponseDto>(
                "sp_Reimbursement_Create",
                parameters,
                commandType: CommandType.StoredProcedure) ?? new CreateClaimResponseDto();
        }

        public async Task<IEnumerable<ReimbursementClaimDto>> GetAllClaimsAsync(int? campusId, string? status, string? category, string? search)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", campusId);
            parameters.Add("p_Status", status);
            parameters.Add("p_Category", category);
            parameters.Add("p_Search", search);

            return await conn.QueryAsync<ReimbursementClaimDto>(
                "sp_Reimbursement_GetAll",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<ReimbursementClaimDto>> GetMyClaimsAsync(int staffId, int? campusId)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_StaffId", staffId);
            parameters.Add("p_CampusId", campusId);

            return await conn.QueryAsync<ReimbursementClaimDto>(
                "sp_Reimbursement_GetMyClaims",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<ReimbursementClaimDto?> GetClaimByIdAsync(int id)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);

            return await conn.QueryFirstOrDefaultAsync<ReimbursementClaimDto>(
                "sp_Reimbursement_GetById",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<ReimbursementSummaryDto> GetSummaryAsync(int? campusId)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", campusId);

            return await conn.QueryFirstOrDefaultAsync<ReimbursementSummaryDto>(
                "sp_Reimbursement_GetSummary",
                parameters,
                commandType: CommandType.StoredProcedure) ?? new ReimbursementSummaryDto();
        }

        public async Task<(bool Success, string? AccountRef)> VerifyClaimAsync(int id, decimal? approvedAmount, string? reviewNotes, int reviewedBy)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_ApprovedAmount", approvedAmount);
            parameters.Add("p_ReviewNotes", reviewNotes);
            parameters.Add("p_ReviewedBy", reviewedBy);

            var result = await conn.QueryFirstOrDefaultAsync<dynamic>(
                "sp_Reimbursement_Verify",
                parameters,
                commandType: CommandType.StoredProcedure);

            if (result != null)
            {
                var dict = (IDictionary<string, object>)result;
                long rowsAffected = 0;
                string? accountRef = null;

                if (dict.ContainsKey("RowsAffected") && dict["RowsAffected"] != null)
                {
                    long.TryParse(dict["RowsAffected"].ToString(), out rowsAffected);
                }

                if (dict.ContainsKey("AccountRef") && dict["AccountRef"] != null)
                {
                    accountRef = dict["AccountRef"].ToString();
                }

                return (rowsAffected > 0, accountRef);
            }

            return (false, null);
        }

        public async Task<bool> RequestClarificationAsync(int id, string? notes, int reviewedBy)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_ClarificationNotes", notes);
            parameters.Add("p_ReviewedBy", reviewedBy);

            var rowsAffected = await conn.QueryFirstOrDefaultAsync<int>(
                "sp_Reimbursement_RequestClarification",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rowsAffected > 0;
        }

        public async Task<bool> RejectClaimAsync(int id, string? rejectNotes, int reviewedBy)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_RejectNotes", rejectNotes);
            parameters.Add("p_ReviewedBy", reviewedBy);

            var rowsAffected = await conn.QueryFirstOrDefaultAsync<int>(
                "sp_Reimbursement_Reject",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rowsAffected > 0;
        }

        public async Task<bool> MarkPaidAsync(int id, string? paymentReference, int paidBy)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_PaymentReference", paymentReference);
            parameters.Add("p_PaidBy", paidBy);

            var rowsAffected = await conn.QueryFirstOrDefaultAsync<int>(
                "sp_Reimbursement_MarkPaid",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rowsAffected > 0;
        }

        public async Task<bool> UploadProofAsync(int id, string receiptUrl)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_ReceiptUrl", receiptUrl);

            var rowsAffected = await conn.QueryFirstOrDefaultAsync<int>(
                "sp_Reimbursement_UploadProof",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rowsAffected > 0;
        }

        public async Task<IEnumerable<AccountEntryDto>> GetAccountEntriesAsync(int? campusId)
        {
            var conn = await GetOpenConnectionAsync();
            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", campusId);

            return await conn.QueryAsync<AccountEntryDto>(
                "sp_Reimbursement_GetAccountEntries",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
    }
}
