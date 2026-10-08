using CollegeManagement.API.DTOs;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class SectionRollAllocationService
        : ISectionRollAllocationService
    {
        private readonly ISectionRollAllocationRepository _repository;
        private readonly CollegeManagement.API.Services.IGroupService _groupService;
        private readonly INumberSeriesService _numberSeriesService;

        public SectionRollAllocationService(
            ISectionRollAllocationRepository repository,
            CollegeManagement.API.Services.IGroupService groupService,
            INumberSeriesService numberSeriesService)
        {
            _repository = repository;
            _groupService = groupService;
            _numberSeriesService = numberSeriesService;
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

            var filter = new SectionRollAllocationFilterRequest
            {
                AcademicYearId = request.AcademicYearId,
                AcademicLevelId = request.AcademicLevelId,
                GroupId = request.GroupId,
                ProgramId = request.ProgramId,
                CampusId = request.CampusId
            };

            var preview = await _repository.PreviewRollNumberAllocationAsync(filter);
            if (preview == null || preview.Students.Count == 0) return 0;

            var group = await _groupService.GetByIdAsync(request.GroupId);
            var groupCode = group?.GroupCode ?? "";

            foreach (var student in preview.Students)
            {
                var rollResult = await _numberSeriesService.GenerateNextNumberAsync(
                    "ROLL_NO",
                    new CollegeManagement.API.DTOs.Settings.GenerateNumberSeriesRequestDto 
                    { 
                        GroupCode = groupCode,
                        BoardId = 0,
                        AcademicYearId = request.AcademicYearId,
                        GroupId = request.GroupId,
                        ProgramId = request.ProgramId
                    },
                    request.CampusId);

                if (rollResult != null && !string.IsNullOrEmpty(rollResult.GeneratedNumber))
                {
                    student.RollNo = rollResult.GeneratedNumber;
                }
            }

            return await _repository.SaveRollNumberAllocationsAsync(preview.Students);
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