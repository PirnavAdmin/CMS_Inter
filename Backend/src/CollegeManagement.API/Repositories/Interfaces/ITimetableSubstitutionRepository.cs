using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.TimetableSubstitution;

namespace CollegeManagement.API.Repositories.Interfaces
{
    public interface ITimetableSubstitutionRepository
    {
        Task<IEnumerable<AffectedClassDto>> GetAffectedTimetableSlotsForLeaveAsync(int staffLeaveRequestId);
        Task<IEnumerable<EligibleSubstituteDto>> GetEligibleSubstituteStaffAsync(int timetableId, DateTime substitutionDate);
        Task<int> CreateSubstitutionAsync(int timetableId, int staffLeaveRequestId, DateTime substitutionDate, int substituteStaffId, string? remarks, int? userId);
        Task<IEnumerable<TimetableSubstitutionResponseDto>> GetSubstitutionsAsync(DateTime? date, int? sectionId, int? staffId, int? academicYearId);
        Task<TimetableSubstitutionResponseDto?> GetSubstitutionByIdAsync(int id);
        Task<bool> CancelSubstitutionAsync(int id, int? userId, string? reason);
        Task<int> CancelSubstitutionsByLeaveRequestIdAsync(int staffLeaveRequestId, int? userId);
        Task<IEnumerable<EffectiveTimetableSlotDto>> GetEffectiveTimetableByDateAsync(DateTime date, int? sectionId, int? staffId, int? studentId, int? academicYearId);
    }
}