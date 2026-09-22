using System.Data;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Program;
using Dapper;
using Microsoft.EntityFrameworkCore;

namespace CollegeManagement.API.Repositories
{
    public class ProgramRepository : IProgramRepository
    {
        private readonly AppDbContext _context;

        public ProgramRepository(AppDbContext context)
        {
            _context = context;
        }


        // =========================================================
        // GET CONNECTION
        // =========================================================

        private async Task<IDbConnection> GetConnectionAsync()
        {
            var connection =
                _context.Database.GetDbConnection();

            if (connection.State != ConnectionState.Open)
            {
                await connection.OpenAsync();
            }

            return connection;
        }


        // =========================================================
        // 1. GET ALL PROGRAMS
        // =========================================================

        public async Task<IEnumerable<ProgramDto>> GetAllAsync()
        {
            var connection =
                await GetConnectionAsync();

            return await connection.QueryAsync<ProgramDto>(
                "sp_GetPrograms",
                commandType: CommandType.StoredProcedure);
        }


        // =========================================================
        // 2. GET PROGRAM BY ID
        // =========================================================

        public async Task<ProgramDto?> GetByIdAsync(
            int programId)
        {
            var connection =
                await GetConnectionAsync();

            return await connection
                .QueryFirstOrDefaultAsync<ProgramDto>(
                    "sp_GetProgramById",
                    new
                    {
                        p_ProgramId = programId
                    },
                    commandType:
                        CommandType.StoredProcedure);
        }


        // =========================================================
        // 3. CREATE PROGRAM
        // =========================================================

        public async Task<ProgramDto?> CreateAsync(
            CreateProgramDto dto)
        {
            var connection =
                await GetConnectionAsync();

            return await connection
                .QueryFirstOrDefaultAsync<ProgramDto>(
                    "sp_CreateProgram",
                    new
                    {
                        p_ProgramName =
                            dto.ProgramName.Trim(),

                        p_IsActive =
                            dto.IsActive
                    },
                    commandType:
                        CommandType.StoredProcedure);
        }


        // =========================================================
        // 4. UPDATE PROGRAM
        // =========================================================

        public async Task<ProgramDto?> UpdateAsync(
            int programId,
            UpdateProgramDto dto)
        {
            var connection =
                await GetConnectionAsync();

            return await connection
                .QueryFirstOrDefaultAsync<ProgramDto>(
                    "sp_UpdateProgram",
                    new
                    {
                        p_ProgramId =
                            programId,

                        p_ProgramName =
                            dto.ProgramName.Trim(),

                        p_IsActive =
                            dto.IsActive
                    },
                    commandType:
                        CommandType.StoredProcedure);
        }


        // =========================================================
        // 5. ACTIVATE / DEACTIVATE PROGRAM
        // =========================================================

        public async Task<bool> SetStatusAsync(
            int programId,
            bool isActive)
        {
            var connection =
                await GetConnectionAsync();

            var result =
                await connection
                    .QueryFirstOrDefaultAsync<int>(
                        "sp_SetProgramStatus",
                        new
                        {
                            p_ProgramId =
                                programId,

                            p_IsActive =
                                isActive
                        },
                        commandType:
                            CommandType.StoredProcedure);

            return result > 0;
        }


        // =========================================================
        // 6. GET PROGRAMS BY GROUP
        // =========================================================

        public async Task<IEnumerable<ProgramDto>>
            GetByGroupIdAsync(int groupId)
        {
            var connection =
                await GetConnectionAsync();

            return await connection
                .QueryAsync<ProgramDto>(
                    "sp_GetProgramsByGroup",
                    new
                    {
                        p_GroupId = groupId
                    },
                    commandType:
                        CommandType.StoredProcedure);
        }
    }
}