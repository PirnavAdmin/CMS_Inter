using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Models.Timetable;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class PeriodService : IPeriodService
    {
        private readonly IPeriodRepository _periodRepository;
        private readonly IMapper _mapper;

        public PeriodService(IPeriodRepository periodRepository, IMapper mapper)
        {
            _periodRepository = periodRepository;
            _mapper = mapper;
        }

        public async Task<IEnumerable<PeriodResponseDto>> GetAllAsync(int? boardId = null, int? academicLevelId = null, int? academicYearId = null, int? groupId = null)
        {
            if (boardId.HasValue || academicLevelId.HasValue || academicYearId.HasValue || groupId.HasValue)
            {
                var contextPeriods = await _periodRepository.GetByContextAsync(boardId, academicLevelId, academicYearId, groupId);
                return _mapper.Map<IEnumerable<PeriodResponseDto>>(contextPeriods);
            }

            var periods = await _periodRepository.GetAllAsync();
            return _mapper.Map<IEnumerable<PeriodResponseDto>>(periods);
        }

        public async Task<PeriodResponseDto?> GetByIdAsync(int id)
        {
            var period = await _periodRepository.GetByIdAsync(id);
            return period == null ? null : _mapper.Map<PeriodResponseDto>(period);
        }

        public async Task<PeriodResponseDto> CreateAsync(CreatePeriodDto dto)
        {
            var entity = _mapper.Map<Period>(dto);
            var result = await _periodRepository.AddAsync(entity);
            return _mapper.Map<PeriodResponseDto>(result);
        }

        public async Task<PeriodResponseDto?> UpdateAsync(int id, UpdatePeriodDto dto)
        {
            var existing = await _periodRepository.GetByIdAsync(id);
            if (existing == null) return null;

            _mapper.Map(dto, existing);
            await _periodRepository.UpdateAsync(existing);
            return _mapper.Map<PeriodResponseDto>(existing);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var existing = await _periodRepository.GetByIdAsync(id);
            if (existing == null) return false;

            await _periodRepository.DeleteAsync(id);
            return true;
        }
    }
}