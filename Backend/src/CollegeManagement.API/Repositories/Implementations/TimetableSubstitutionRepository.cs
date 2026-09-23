using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.TimetableSubstitution;
using CollegeManagement.API.Repositories.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace CollegeManagement.API.Repositories.Implementations
{
    public class TimetableSubstitutionRepository : ITimetableSubstitutionRepository
    {
        private readonly AppDbContext _context;

        public TimetableSubstitutionRepository(AppDbContext context)
        {
            _context = context;
        }

        private DbConnection Connection => _context.Database.GetDbConnection();
        private DbTransaction? CurrentTransaction => _context.Database.CurrentTransaction?.GetDbTransaction();

        public async Task<IEnumerable<AffectedClassDto>> GetAffectedTimetableSlotsForLeaveAsync(int staffLeaveRequestId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_StaffLeaveRequestId", staffLeaveRequestId, DbType.Int32);

            return await Connection.QueryAsync<AffectedClassDto>(
                "sp_GetAffectedTimetableSlotsForLeave",
                parameters,
                transaction: CurrentTransaction,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<EligibleSubstituteDto>> GetEligibleSubstituteStaffAsync(int timetableId, DateTime substitutionDate)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_TimetableId", timetableId, DbType.Int32);
            parameters.Add("p_SubstitutionDate", substitutionDate.Date, DbType.Date);

            return await Connection.QueryAsync<EligibleSubstituteDto>(
                "sp_GetEligibleSubstituteStaff",
                parameters,
                transaction: CurrentTransaction,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<int> CreateSubstitutionAsync(int timetableId, int staffLeaveRequestId, DateTime substitutionDate, int substituteStaffId, string? remarks, int? userId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_TimetableId", timetableId, DbType.Int32);
            parameters.Add("p_StaffLeaveRequestId", staffLeaveRequestId, DbType.Int32);
            parameters.Add("p_SubstitutionDate", substitutionDate.Date, DbType.Date);
            parameters.Add("p_SubstituteStaffId", substituteStaffId, DbType.Int32);
            parameters.Add("p_Remarks", remarks, DbType.String);
            parameters.Add("p_UserId", userId, DbType.Int32);

            return await Connection.QuerySingleAsync<int>(
                "sp_CreateTimetableSubstitution",
                parameters,
                transaction: CurrentTransaction,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<TimetableSubstitutionResponseDto>> GetSubstitutionsAsync(DateTime? date, int? sectionId, int? staffId, int? academicYearId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_SubstitutionDate", date?.Date, DbType.Date);
            parameters.Add("p_SectionId", sectionId, DbType.Int32);
            parameters.Add("p_StaffId", staffId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);

            return await Connection.QueryAsync<TimetableSubstitutionResponseDto>(
                "sp_GetTimetableSubstitutions",
                parameters,
                transaction: CurrentTransaction,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<TimetableSubstitutionResponseDto?> GetSubstitutionByIdAsync(int id)
        {
            return await Connection.QueryFirstOrDefaultAsync<TimetableSubstitutionResponseDto>(
                "sp_GetTimetableSubstitutionById",
                new { p_Id = id },
                transaction: CurrentTransaction,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<bool> CancelSubstitutionAsync(int id, int? userId, string? reason)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_SubstitutionId", id, DbType.Int32);
            parameters.Add("p_UserId", userId, DbType.Int32);
            parameters.Add("p_Reason", reason, DbType.String);

            var rowsAffected = await Connection.QuerySingleOrDefaultAsync<int>(
                "sp_CancelTimetableSubstitution",
                parameters,
                transaction: CurrentTransaction,
                commandType: CommandType.StoredProcedure);

            return rowsAffected > 0;
        }

        public async Task<int> CancelSubstitutionsByLeaveRequestIdAsync(int staffLeaveRequestId, int? userId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_StaffLeaveRequestId", staffLeaveRequestId, DbType.Int32);
            parameters.Add("p_UserId", userId, DbType.Int32);

            return await Connection.QuerySingleOrDefaultAsync<int>(
                "sp_CancelSubstitutionsByLeaveRequestId",
                parameters,
                transaction: CurrentTransaction,
                commandType: CommandType.StoredProcedure);
        }

        public async Task<IEnumerable<EffectiveTimetableSlotDto>> GetEffectiveTimetableByDateAsync(DateTime date, int? sectionId, int? staffId, int? studentId, int? academicYearId)
        {
            var parameters = new DynamicParameters();
            parameters.Add("p_Date", date.Date, DbType.Date);
            parameters.Add("p_SectionId", sectionId, DbType.Int32);
            parameters.Add("p_StaffId", staffId, DbType.Int32);
            parameters.Add("p_StudentId", studentId, DbType.Int32);
            parameters.Add("p_AcademicYearId", academicYearId, DbType.Int32);

            return await Connection.QueryAsync<EffectiveTimetableSlotDto>(
                "sp_GetEffectiveTimetableByDate",
                parameters,
                transaction: CurrentTransaction,
                commandType: CommandType.StoredProcedure);
        }
    }
}
