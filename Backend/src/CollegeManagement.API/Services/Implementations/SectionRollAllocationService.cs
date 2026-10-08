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
        private readonly ICampusService _campusService;

        public SectionRollAllocationService(
            ISectionRollAllocationRepository repository,
            CollegeManagement.API.Services.IGroupService groupService,
            INumberSeriesService numberSeriesService,
            ICampusService campusService)
        {
            _repository = repository;
            _groupService = groupService;
            _numberSeriesService = numberSeriesService;
            _campusService = campusService;
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
                request.BoardId,
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

            var preview = await _repository.PreviewRollNumberAllocationAsync(request);
            if (preview == null || preview.Students.Count == 0) return preview;

            var subCode = $"ROLL_NO|{request.CampusId}|{request.BoardId}|{request.AcademicYearId}|{request.GroupId}|{request.ProgramId}";
            var seriesDto = await _numberSeriesService.GetSeriesByCodeAsync(subCode, request.CampusId) 
                            ?? await _numberSeriesService.GetSeriesByCodeAsync("ROLL_NO", request.CampusId);

            if (seriesDto == null || string.IsNullOrWhiteSpace(seriesDto.FormatPattern)) 
            {
                throw new InvalidOperationException("Number series configuration 'ROLL_NO' was not found. Please configure it in settings.");
            }

            var group = await _groupService.GetByIdAsync(request.GroupId);
            var groupCode = group?.GroupCode ?? "";
            
            var campusCode = "";
            if (request.CampusId.HasValue && request.CampusId.Value > 0)
            {
                var campus = await _campusService.GetCampusByIdAsync(request.CampusId.Value);
                campusCode = campus?.CampusCode ?? "";
            }

            var contextDto = new CollegeManagement.API.DTOs.Settings.GenerateNumberSeriesRequestDto 
            { 
                GroupCode = groupCode,
                BoardId = request.BoardId,
                AcademicYearId = request.AcademicYearId,
                GroupId = request.GroupId,
                ProgramId = request.ProgramId,
                CampusCode = campusCode
            };

            var curSeq = seriesDto.CurrentSequence;
            var startNum = seriesDto.StartNumber > 0 ? seriesDto.StartNumber : 1;
            var nextSeq = curSeq < startNum ? startNum : curSeq + 1;

            foreach (var student in preview.Students)
            {
                var rollPreview = CollegeManagement.API.Helpers.NumberSeriesPatternEvaluator.Evaluate(
                    pattern: seriesDto.FormatPattern,
                    sequenceNumber: nextSeq,
                    numberLength: seriesDto.NumberLength,
                    prefix: seriesDto.Prefix,
                    context: contextDto,
                    referenceDate: DateTime.Now,
                    isPreview: true);

                student.RollNo = rollPreview;
                nextSeq++;
            }

            return preview;
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
                request.BoardId,
                request.AcademicLevelId,
                request.GroupId,
                request.ProgramId);

            var filter = new SectionRollAllocationFilterRequest
            {
                AcademicYearId = request.AcademicYearId,
                BoardId = request.BoardId,
                AcademicLevelId = request.AcademicLevelId,
                GroupId = request.GroupId,
                ProgramId = request.ProgramId,
                CampusId = request.CampusId
            };

            var preview = await _repository.PreviewRollNumberAllocationAsync(filter);
            if (preview == null || preview.Students.Count == 0) return 0;

            var group = await _groupService.GetByIdAsync(request.GroupId);
            var groupCode = group?.GroupCode ?? "";
            
            var campusCode = "";
            if (request.CampusId.HasValue && request.CampusId.Value > 0)
            {
                var campus = await _campusService.GetCampusByIdAsync(request.CampusId.Value);
                campusCode = campus?.CampusCode ?? "";
            }

            foreach (var student in preview.Students)
            {
                var rollResult = await _numberSeriesService.GenerateNextNumberAsync(
                    "ROLL_NO",
                    new CollegeManagement.API.DTOs.Settings.GenerateNumberSeriesRequestDto 
                    { 
                        GroupCode = groupCode,
                        BoardId = request.BoardId,
                        AcademicYearId = request.AcademicYearId,
                        GroupId = request.GroupId,
                        ProgramId = request.ProgramId,
                        CampusCode = campusCode
                    },
                    request.CampusId);

                if (rollResult == null || string.IsNullOrEmpty(rollResult.GeneratedNumber))
                {
                    throw new InvalidOperationException("Failed to generate Roll Number. Configuration might be missing.");
                }

                student.RollNo = rollResult.GeneratedNumber;
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
                request.BoardId,
                request.AcademicLevelId,
                request.GroupId,
                request.ProgramId);
        }


        private static void ValidateValues(
            int academicYearId,
            int boardId,
            int academicLevelId,
            int groupId,
            int programId)
        {
            if (academicYearId <= 0)
                throw new ArgumentException(
                    "Invalid AcademicYearId.");

            if (boardId <= 0)
                throw new ArgumentException(
                    "Invalid BoardId.");

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
