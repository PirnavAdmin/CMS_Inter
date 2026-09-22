using System.Collections.Generic;
using System.Threading.Tasks;
using AutoMapper;
using CollegeManagement.API.DTOs.Timetable;
using CollegeManagement.API.Models.Timetable;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class BreakTypeService : IBreakTypeService
    {
        private readonly IBreakTypeRepository _breakTypeRepository;
        private readonly IMapper _mapper;

        public BreakTypeService(IBreakTypeRepository breakTypeRepository, IMapper mapper)
        {
            _breakTypeRepository = breakTypeRepository;
            _mapper = mapper;
        }

        public async Task<IEnumerable<BreakTypeResponseDto>> GetAllAsync(bool includeInactive = false)
        {
            var entities = await _breakTypeRepository.GetAllAsync(includeInactive);
            return _mapper.Map<IEnumerable<BreakTypeResponseDto>>(entities);
        }

        public async Task<BreakTypeResponseDto?> GetByIdAsync(int id)
        {
            var entity = await _breakTypeRepository.GetByIdAsync(id);
            return entity == null ? null : _mapper.Map<BreakTypeResponseDto>(entity);
        }

        public async Task<BreakTypeResponseDto> CreateAsync(CreateBreakTypeDto dto)
        {
            var entity = _mapper.Map<BreakType>(dto);
            var result = await _breakTypeRepository.AddAsync(entity);
            return _mapper.Map<BreakTypeResponseDto>(result);
        }

        public async Task<BreakTypeResponseDto?> UpdateAsync(int id, UpdateBreakTypeDto dto)
        {
            var existing = await _breakTypeRepository.GetByIdAsync(id);
            if (existing == null) return null;

            _mapper.Map(dto, existing);
            await _breakTypeRepository.UpdateAsync(existing);
            return _mapper.Map<BreakTypeResponseDto>(existing);
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var existing = await _breakTypeRepository.GetByIdAsync(id);
            if (existing == null) return false;

            await _breakTypeRepository.DeleteAsync(id);
            return true;
        }
    }
}