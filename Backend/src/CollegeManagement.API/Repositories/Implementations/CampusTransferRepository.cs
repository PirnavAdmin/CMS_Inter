using System;
using System.Collections.Generic;
using System.Data;
using System.Threading;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Promotions;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class CampusTransferRepository : ICampusTransferRepository
    {
        private readonly AppDbContext _context;

        public CampusTransferRepository(AppDbContext context)
        {
            _context = context;
        }

        private IDbConnection Connection => _context.Database.GetDbConnection();

        public async Task<int> CreateTransferRequestAsync(
            int studentId,
            int toCampusId,
            int requestedById,
            DateTime effectiveDate,
            string reason,
            string? remarks,
            CancellationToken cancellationToken = default)
        {
            var command = new CommandDefinition(
                "sp_CreateCampusTransferRequest",
                new
                {
                    p_StudentId = studentId,
                    p_ToCampusId = toCampusId,
                    p_RequestedById = requestedById,
                    p_EffectiveDate = effectiveDate,
                    p_TransferReason = reason,
                    p_Remarks = remarks
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken);

            return await Connection.QuerySingleAsync<int>(command);
        }

        public async Task<IEnumerable<CampusTransferResponseDto>> GetSentTransfersAsync(
            int campusId,
            CancellationToken cancellationToken = default)
        {
            var command = new CommandDefinition(
                "sp_GetSentCampusTransfers",
                new { p_FromCampusId = campusId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken);

            return await Connection.QueryAsync<CampusTransferResponseDto>(command);
        }

        public async Task<IEnumerable<CampusTransferResponseDto>> GetReceivedTransfersAsync(
            int campusId,
            CancellationToken cancellationToken = default)
        {
            var command = new CommandDefinition(
                "sp_GetReceivedCampusTransfers",
                new { p_ToCampusId = campusId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken);

            return await Connection.QueryAsync<CampusTransferResponseDto>(command);
        }

        public async Task<CampusTransferResponseDto?> GetTransferByIdAsync(
            int transferId,
            CancellationToken cancellationToken = default)
        {
            var command = new CommandDefinition(
                "sp_GetCampusTransferById",
                new { p_TransferId = transferId },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken);

            return await Connection.QueryFirstOrDefaultAsync<CampusTransferResponseDto>(command);
        }

        public async Task ApproveTransferAsync(
            int transferId,
            int actionedById,
            string? remarks,
            CancellationToken cancellationToken = default)
        {
            var command = new CommandDefinition(
                "sp_ApproveCampusTransfer",
                new
                {
                    p_TransferId = transferId,
                    p_ActionedById = actionedById,
                    p_ActionRemarks = remarks
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken);

            await Connection.ExecuteAsync(command);
        }

        public async Task RejectTransferAsync(
            int transferId,
            int actionedById,
            string? remarks,
            CancellationToken cancellationToken = default)
        {
            var command = new CommandDefinition(
                "sp_RejectCampusTransfer",
                new
                {
                    p_TransferId = transferId,
                    p_ActionedById = actionedById,
                    p_ActionRemarks = remarks
                },
                commandType: CommandType.StoredProcedure,
                cancellationToken: cancellationToken);

            await Connection.ExecuteAsync(command);
        }
    }
}
