using CollegeManagement.API.DTOs.Program;
using CollegeManagement.API.Repositories;

namespace CollegeManagement.API.Services
{
    public class ProgramService : IProgramService
    {
        private readonly IProgramRepository _programRepository;

        public ProgramService(
            IProgramRepository programRepository)
        {
            _programRepository = programRepository;
        }


        // =========================================================
        // 1. GET ALL PROGRAMS
        // =========================================================

        public async Task<IEnumerable<ProgramDto>> GetAllAsync()
        {
            return await _programRepository.GetAllAsync();
        }


        // =========================================================
        // 2. GET PROGRAM BY ID
        // =========================================================

        public async Task<ProgramDto?> GetByIdAsync(
            int programId)
        {
            if (programId <= 0)
                throw new ArgumentException(
                    "Valid ProgramId is required.");

            return await _programRepository
                .GetByIdAsync(programId);
        }


        // =========================================================
        // 3. CREATE PROGRAM
        // =========================================================

        public async Task<ProgramDto?> CreateAsync(
            CreateProgramDto dto)
        {
            if (dto == null)
                throw new ArgumentNullException(
                    nameof(dto));

            if (string.IsNullOrWhiteSpace(
                    dto.ProgramName))
            {
                throw new ArgumentException(
                    "Program name is required.");
            }

            dto.ProgramName =
                dto.ProgramName.Trim();

            if (dto.ProgramName.Length > 100)
            {
                throw new ArgumentException(
                    "Program name cannot exceed 100 characters.");
            }

            return await _programRepository
                .CreateAsync(dto);
        }


        // =========================================================
        // 4. UPDATE PROGRAM
        // =========================================================

        public async Task<ProgramDto?> UpdateAsync(
            int programId,
            UpdateProgramDto dto)
        {
            if (programId <= 0)
                throw new ArgumentException(
                    "Valid ProgramId is required.");

            if (dto == null)
                throw new ArgumentNullException(
                    nameof(dto));

            if (string.IsNullOrWhiteSpace(
                    dto.ProgramName))
            {
                throw new ArgumentException(
                    "Program name is required.");
            }

            dto.ProgramName =
                dto.ProgramName.Trim();

            if (dto.ProgramName.Length > 100)
            {
                throw new ArgumentException(
                    "Program name cannot exceed 100 characters.");
            }

            return await _programRepository
                .UpdateAsync(
                    programId,
                    dto);
        }


        // =========================================================
        // 5. ACTIVATE / DEACTIVATE
        // =========================================================

        public async Task<bool> SetStatusAsync(
            int programId,
            bool isActive)
        {
            if (programId <= 0)
                throw new ArgumentException(
                    "Valid ProgramId is required.");

            return await _programRepository
                .SetStatusAsync(
                    programId,
                    isActive);
        }


        // =========================================================
        // 6. GET PROGRAMS BY GROUP
        // =========================================================

        public async Task<IEnumerable<ProgramDto>>
            GetByGroupIdAsync(int groupId)
        {
            if (groupId <= 0)
                throw new ArgumentException(
                    "Valid GroupId is required.");

            return await _programRepository
                .GetByGroupIdAsync(groupId);
        }
    }
}