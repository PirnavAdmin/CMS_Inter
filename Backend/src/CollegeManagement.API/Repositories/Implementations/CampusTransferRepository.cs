
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Dapper;
using CollegeManagement.API.DTOs.Promotions;
using CollegeManagement.API.Repositories.Interfaces;
using MySqlConnector;
using Microsoft.Extensions.Configuration;
namespace CollegeManagement.API.Repositories.Implementations {
    public class CampusTransferRepository : ICampusTransferRepository {
        private readonly string _connectionString;
        public CampusTransferRepository(IConfiguration configuration) {
            _connectionString = configuration.GetConnectionString("DefaultConnection")!;
        }
        private IDbConnection CreateConnection() => new MySqlConnection(_connectionString);

        public async Task<int> CreateTransferRequestAsync(int studentId, int toCampusId, int requestedById, System.DateTime effectiveDate, string reason, string? remarks) {
            using var connection = CreateConnection();
            var parameters = new DynamicParameters();
            parameters.Add("p_StudentId", studentId);
            parameters.Add("p_ToCampusId", toCampusId);
            parameters.Add("p_RequestedById", requestedById);
            parameters.Add("p_EffectiveDate", effectiveDate);
            parameters.Add("p_TransferReason", reason);
            parameters.Add("p_Remarks", remarks);
            return await connection.QuerySingleAsync<int>("sp_CreateCampusTransferRequest", parameters, commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<CampusTransferResponseDto>> GetSentTransfersAsync(int campusId) {
            using var connection = CreateConnection();
            return await connection.QueryAsync<CampusTransferResponseDto>("sp_GetSentCampusTransfers", new { p_FromCampusId = campusId }, commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<CampusTransferResponseDto>> GetReceivedTransfersAsync(int campusId) {
            using var connection = CreateConnection();
            return await connection.QueryAsync<CampusTransferResponseDto>("sp_GetReceivedCampusTransfers", new { p_ToCampusId = campusId }, commandType: CommandType.StoredProcedure);
        }

        public async Task<CampusTransferResponseDto?> GetTransferByIdAsync(int transferId) {
            using var connection = CreateConnection();
            return await connection.QueryFirstOrDefaultAsync<CampusTransferResponseDto>("sp_GetCampusTransferById", new { p_TransferId = transferId }, commandType: CommandType.StoredProcedure);
        }

        public async Task ApproveTransferAsync(int transferId, int actionedById, string? remarks) {
            using var connection = CreateConnection();
            var parameters = new { p_TransferId = transferId, p_ActionedById = actionedById, p_ActionRemarks = remarks };
            await connection.ExecuteAsync("sp_ApproveCampusTransfer", parameters, commandType: CommandType.StoredProcedure);
        }

        public async Task RejectTransferAsync(int transferId, int actionedById, string? remarks) {
            using var connection = CreateConnection();
            var parameters = new { p_TransferId = transferId, p_ActionedById = actionedById, p_ActionRemarks = remarks };
            await connection.ExecuteAsync("sp_RejectCampusTransfer", parameters, commandType: CommandType.StoredProcedure);
        }
    }
}