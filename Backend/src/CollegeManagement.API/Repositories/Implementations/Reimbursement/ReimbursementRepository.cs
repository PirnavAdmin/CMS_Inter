using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Reimbursement;
using CollegeManagement.API.Repositories.Interfaces.Reimbursement;
using Dapper;

namespace CollegeManagement.API.Repositories.Implementations.Reimbursement
{
    public class ReimbursementRepository : IReimbursementRepository
    {
        private readonly IDbConnection _dbConnection;

        public ReimbursementRepository(IDbConnection dbConnection)
        {
            _dbConnection = dbConnection;
        }

        public async Task<CreateClaimResponseDto> CreateClaimAsync(CreateReimbursementClaimRequest request)
        {
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

            return await _dbConnection.QueryFirstOrDefaultAsync<CreateClaimResponseDto>(
                "sp_Reimbursement_Create",
                parameters,
                commandType: CommandType.StoredProcedure) ?? new CreateClaimResponseDto();
        }

        public async Task<IEnumerable<ReimbursementClaimDto>> GetAllClaimsAsync(int? campusId, string? status, string? category, string? search)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", campusId);
            parameters.Add("p_Status", status);
            parameters.Add("p_Category", category);
            parameters.Add("p_Search", search);

            return await _dbConnection.QueryAsync<ReimbursementClaimDto>(
                "sp_Reimbursement_GetAll",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<ReimbursementClaimDto>> GetMyClaimsAsync(int staffId, int? campusId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_StaffId", staffId);
            parameters.Add("p_CampusId", campusId);

            return await _dbConnection.QueryAsync<ReimbursementClaimDto>(
                "sp_Reimbursement_GetMyClaims",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<ReimbursementClaimDto?> GetClaimByIdAsync(int id)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);

            return await _dbConnection.QueryFirstOrDefaultAsync<ReimbursementClaimDto>(
                "sp_Reimbursement_GetById",
                parameters,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<ReimbursementSummaryDto> GetSummaryAsync(int? campusId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", campusId);

            return await _dbConnection.QueryFirstOrDefaultAsync<ReimbursementSummaryDto>(
                "sp_Reimbursement_GetSummary",
                parameters,
                commandType: CommandType.StoredProcedure) ?? new ReimbursementSummaryDto();
        }

        public async Task<(bool Success, string? AccountRef)> VerifyClaimAsync(int id, decimal? approvedAmount, string? reviewNotes, int reviewedBy)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_ApprovedAmount", approvedAmount);
            parameters.Add("p_ReviewNotes", reviewNotes);
            parameters.Add("p_ReviewedBy", reviewedBy);

            var result = await _dbConnection.QueryFirstOrDefaultAsync<dynamic>(
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
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_ClarificationNotes", notes);
            parameters.Add("p_ReviewedBy", reviewedBy);

            var rowsAffected = await _dbConnection.QueryFirstOrDefaultAsync<int>(
                "sp_Reimbursement_RequestClarification",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rowsAffected > 0;
        }

        public async Task<bool> RejectClaimAsync(int id, string? rejectNotes, int reviewedBy)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_RejectNotes", rejectNotes);
            parameters.Add("p_ReviewedBy", reviewedBy);

            var rowsAffected = await _dbConnection.QueryFirstOrDefaultAsync<int>(
                "sp_Reimbursement_Reject",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rowsAffected > 0;
        }

        public async Task<bool> MarkPaidAsync(int id, string? paymentReference, int paidBy)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_PaymentReference", paymentReference);
            parameters.Add("p_PaidBy", paidBy);

            var rowsAffected = await _dbConnection.QueryFirstOrDefaultAsync<int>(
                "sp_Reimbursement_MarkPaid",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rowsAffected > 0;
        }

        public async Task<bool> UploadProofAsync(int id, string receiptUrl)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_Id", id);
            parameters.Add("p_ReceiptUrl", receiptUrl);

            var rowsAffected = await _dbConnection.QueryFirstOrDefaultAsync<int>(
                "sp_Reimbursement_UploadProof",
                parameters,
                commandType: CommandType.StoredProcedure);

            return rowsAffected > 0;
        }

        public async Task<IEnumerable<AccountEntryDto>> GetAccountEntriesAsync(int? campusId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_CampusId", campusId);

            return await _dbConnection.QueryAsync<AccountEntryDto>(
                "sp_Reimbursement_GetAccountEntries",
                parameters,
                commandType: CommandType.StoredProcedure);
        }
    }
}
