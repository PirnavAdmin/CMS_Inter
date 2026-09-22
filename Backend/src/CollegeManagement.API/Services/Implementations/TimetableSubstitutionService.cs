using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.TimetableSubstitution;
using CollegeManagement.API.Enums;
using CollegeManagement.API.Exceptions;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace CollegeManagement.API.Services.Implementations
{
    public class TimetableSubstitutionService : ITimetableSubstitutionService
    {
        private readonly ITimetableSubstitutionRepository _substitutionRepository;
        private readonly AppDbContext _context;

        public TimetableSubstitutionService(
            ITimetableSubstitutionRepository substitutionRepository,
            AppDbContext context)
        {
            _substitutionRepository = substitutionRepository;
            _context = context;
        }

        public async Task<IEnumerable<AffectedClassDto>> GetAffectedClassesAsync(int leaveRequestId)
        {
            var leave = await _context.StaffLeaveRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.StaffLeaveRequestId == leaveRequestId && l.IsActive);

            if (leave == null)
            {
                throw new NotFoundException($"Staff leave request with ID {leaveRequestId} not found.");
            }

            if (leave.Status != LeaveStatus.Approved)
            {
                throw new ValidationException($"Leave request is not Approved (Current status: {leave.Status}). Only approved leaves produce affected classes.");
            }

            return await _substitutionRepository.GetAffectedTimetableSlotsForLeaveAsync(leaveRequestId);
        }

        public async Task<IEnumerable<EligibleSubstituteDto>> GetEligibleSubstitutesAsync(int leaveRequestId, int timetableId, DateTime date)
        {
            var leave = await _context.StaffLeaveRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.StaffLeaveRequestId == leaveRequestId && l.IsActive);

            if (leave == null)
            {
                throw new NotFoundException($"Staff leave request with ID {leaveRequestId} not found.");
            }

            if (leave.Status != LeaveStatus.Approved)
            {
                throw new ValidationException($"Leave request must be Approved to query eligible substitute staff (Current status: {leave.Status}).");
            }

            if (date.Date < leave.StartDate.Date || date.Date > leave.EndDate.Date)
            {
                throw new ValidationException($"Date {date:yyyy-MM-dd} is outside the approved leave date range ({leave.StartDate:yyyy-MM-dd} to {leave.EndDate:yyyy-MM-dd}).");
            }

            var timetable = await _context.Timetables
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == timetableId);

            if (timetable == null)
            {
                throw new NotFoundException($"Timetable slot with ID {timetableId} not found.");
            }

            if (timetable.StaffId != leave.StaffId)
            {
                throw new ValidationException($"Timetable slot does not belong to the staff member on leave (Staff ID: {leave.StaffId}).");
            }

            return await _substitutionRepository.GetEligibleSubstituteStaffAsync(timetableId, date);
        }

        public async Task<IEnumerable<TimetableSubstitutionResponseDto>> CreateSubstitutionsAsync(int leaveRequestId, CreateSubstitutionsRequestDto request, int userId)
        {
            if (request.Assignments == null || !request.Assignments.Any())
            {
                throw new ValidationException("At least one substitution assignment is required.");
            }

            var leave = await _context.StaffLeaveRequests
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.StaffLeaveRequestId == leaveRequestId && l.IsActive);

            if (leave == null)
            {
                throw new NotFoundException($"Staff leave request with ID {leaveRequestId} not found.");
            }

            if (leave.Status != LeaveStatus.Approved)
            {
                throw new ValidationException($"Leave request must be Approved before assigning substitutions (Current status: {leave.Status}).");
            }

            // Transactional Execution of all assignments
            var createdIds = new List<int>();
            var strategy = _context.Database.CreateExecutionStrategy();

            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    createdIds.Clear();
                    foreach (var item in request.Assignments)
                    {
                        if (item.SubstitutionDate.Date < leave.StartDate.Date || item.SubstitutionDate.Date > leave.EndDate.Date)
                        {
                            throw new ValidationException($"Substitution date {item.SubstitutionDate:yyyy-MM-dd} is outside the approved leave date range ({leave.StartDate:yyyy-MM-dd} to {leave.EndDate:yyyy-MM-dd}).");
                        }

                        try
                        {
                            int newId = await _substitutionRepository.CreateSubstitutionAsync(
                                item.TimetableId,
                                leaveRequestId,
                                item.SubstitutionDate.Date,
                                item.SubstituteStaffId,
                                item.Remarks,
                                userId);

                            createdIds.Add(newId);
                        }
                        catch (MySqlException ex)
                        {
                            throw new ConflictException(ex.Message);
                        }
                    }

                    await transaction.CommitAsync();
                }
                catch
                {
                    await transaction.RollbackAsync();
                    throw;
                }
            });

            var resultList = new List<TimetableSubstitutionResponseDto>();
            foreach (var id in createdIds)
            {
                var sub = await _substitutionRepository.GetSubstitutionByIdAsync(id);
                if (sub != null) resultList.Add(sub);
            }

            return resultList;
        }

        public async Task<TimetableSubstitutionResponseDto> CancelSubstitutionAsync(int substitutionId, CancelSubstitutionRequestDto request, int userId)
        {
            var sub = await _substitutionRepository.GetSubstitutionByIdAsync(substitutionId);
            if (sub == null)
            {
                throw new NotFoundException($"Timetable substitution with ID {substitutionId} not found.");
            }

            if (string.Equals(sub.Status, "Cancelled", StringComparison.OrdinalIgnoreCase))
            {
                throw new ConflictException($"Timetable substitution {substitutionId} is already Cancelled.");
            }

            var success = await _substitutionRepository.CancelSubstitutionAsync(substitutionId, userId, request?.Reason);
            if (!success)
            {
                throw new InvalidOperationException($"Failed to cancel substitution with ID {substitutionId}.");
            }

            var updated = await _substitutionRepository.GetSubstitutionByIdAsync(substitutionId);
            return updated!;
        }

        public async Task<IEnumerable<TimetableSubstitutionResponseDto>> GetSubstitutionsAsync(DateTime? date, int? sectionId, int? staffId, int? academicYearId)
        {
            return await _substitutionRepository.GetSubstitutionsAsync(date, sectionId, staffId, academicYearId);
        }

        public async Task<IEnumerable<EffectiveTimetableSlotDto>> GetEffectiveTimetableByDateAsync(DateTime date, int? sectionId, int? staffId, int? studentId, int? academicYearId)
        {
            return await _substitutionRepository.GetEffectiveTimetableByDateAsync(date, sectionId, staffId, studentId, academicYearId);
        }
    }
}