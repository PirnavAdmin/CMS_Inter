using CollegeManagement.API.DTOs;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class SectionRollAllocationService
        : ISectionRollAllocationService
    {
        private readonly ISectionRollAllocationRepository _repository;

        public SectionRollAllocationService(
            ISectionRollAllocationRepository repository)
        {
            _repository = repository;
        }


        // =========================================================
        // SECTION PREVIEW
        // =========================================================

        public async Task<SectionAllocationPreviewResponse>
            PreviewSectionAllocationAsync(
                SectionRollAllocationFilterRequest request)
        {
            ValidateRequest(request);

            return await _repository
                .PreviewSectionAllocationAsync(request);
        }


        // =========================================================
        // SECTION CONFIRM
        // =========================================================

        public async Task<int>
            ConfirmSectionAllocationAsync(
                ConfirmSectionAllocationRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            ValidateValues(
                request.AcademicYearId,
                request.AcademicLevelId,
                request.GroupId,
                request.ProgramId);

            return await _repository
                .ConfirmSectionAllocationAsync(request);
        }


        // =========================================================
        // ROLL PREVIEW
        // =========================================================

        public async Task<RollNumberAllocationPreviewResponse>
            PreviewRollNumberAllocationAsync(
                SectionRollAllocationFilterRequest request)
        {
            ValidateRequest(request);

            return await _repository
                .PreviewRollNumberAllocationAsync(request);
        }


        // =========================================================
        // ROLL CONFIRM
        // =========================================================

        public async Task<int>
            ConfirmRollNumberAllocationAsync(
                ConfirmRollNumberAllocationRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            ValidateValues(
                request.AcademicYearId,
                request.AcademicLevelId,
                request.GroupId,
                request.ProgramId);

            return await _repository
                .ConfirmRollNumberAllocationAsync(request);
        }


        // =========================================================
        // UPDATE STUDENT ALLOCATION
        // =========================================================

        public async Task<object>
            UpdateAllocationAsync(
                int studentId,
                UpdateStudentAllocationRequest request)
        {
            if (studentId <= 0)
                throw new ArgumentException(
                    "Invalid StudentId.");

            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (request.ProgramId <= 0)
                throw new ArgumentException(
                    "Invalid ProgramId.");

            if (request.SectionId <= 0)
                throw new ArgumentException(
                    "Invalid SectionId.");

            return await _repository
                .UpdateAllocationAsync(
                    studentId,
                    request);
        }


        // =========================================================
        // VALIDATION
        // =========================================================

        private static void ValidateRequest(
            SectionRollAllocationFilterRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            ValidateValues(
                request.AcademicYearId,
                request.AcademicLevelId,
                request.GroupId,
                request.ProgramId);
        }


        private static void ValidateValues(
            int academicYearId,
            int academicLevelId,
            int groupId,
            int programId)
        {
            if (academicYearId <= 0)
                throw new ArgumentException(
                    "Invalid AcademicYearId.");

            if (academicLevelId <= 0)
                throw new ArgumentException(
                    "Invalid AcademicLevelId.");

            if (groupId <= 0)
                throw new ArgumentException(
                    "Invalid GroupId.");

            if (programId <= 0)
                throw new ArgumentException(
                    "Invalid ProgramId.");
        }
    }
}