using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.TimetableSubstitution;

namespace CollegeManagement.API.Services.Interfaces
{
    public interface ITimetableSubstitutionService
    {
        Task<IEnumerable<AffectedClassDto>> GetAffectedClassesAsync(int leaveRequestId);
        Task<IEnumerable<EligibleSubstituteDto>> GetEligibleSubstitutesAsync(int leaveRequestId, int timetableId, DateTime date);
        Task<IEnumerable<TimetableSubstitutionResponseDto>> CreateSubstitutionsAsync(int leaveRequestId, CreateSubstitutionsRequestDto request, int userId);
        Task<TimetableSubstitutionResponseDto> CancelSubstitutionAsync(int substitutionId, CancelSubstitutionRequestDto request, int userId);
        Task<IEnumerable<TimetableSubstitutionResponseDto>> GetSubstitutionsAsync(DateTime? date, int? sectionId, int? staffId, int? academicYearId);
        Task<IEnumerable<EffectiveTimetableSlotDto>> GetEffectiveTimetableByDateAsync(DateTime date, int? sectionId, int? staffId, int? studentId, int? academicYearId);
    }
}