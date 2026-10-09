const fs = require('fs');

function patchFile(filePath, search, replacement) {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes(replacement.trim().split('\n')[0])) {
            content = content.replace(search, replacement);
            fs.writeFileSync(filePath, content);
            console.log("Patched: " + filePath);
        } else {
            console.log("Already patched: " + filePath);
        }
    }
}

// 1. DTOs
let dtoPath = 'Backend/src/CollegeManagement.API/DTOs/SECTION&ROLL/SectionRollAllocationStudentDtos.cs';
let dtoContent = fs.readFileSync(dtoPath, 'utf8');

// Add BoardId to SectionRollAllocationFilterRequest
dtoContent = dtoContent.replace(
    'public int AcademicYearId { get; set; }',
    'public int AcademicYearId { get; set; }\n        public int BoardId { get; set; }'
);

// Add BoardId to ConfirmSectionAllocationRequest
dtoContent = dtoContent.replace(
    'public class ConfirmSectionAllocationRequest\r\n    {\r\n        public int AcademicYearId { get; set; }',
    'public class ConfirmSectionAllocationRequest\r\n    {\r\n        public int AcademicYearId { get; set; }\n        public int BoardId { get; set; }'
);

// Add BoardId to ConfirmRollNumberAllocationRequest
dtoContent = dtoContent.replace(
    'public class ConfirmRollNumberAllocationRequest\r\n    {\r\n        public int AcademicYearId { get; set; }',
    'public class ConfirmRollNumberAllocationRequest\r\n    {\r\n        public int AcademicYearId { get; set; }\n        public int BoardId { get; set; }'
);

// Also fallback for \n vs \r\n
dtoContent = dtoContent.replace(
    'public class ConfirmSectionAllocationRequest\n    {\n        public int AcademicYearId { get; set; }',
    'public class ConfirmSectionAllocationRequest\n    {\n        public int AcademicYearId { get; set; }\n        public int BoardId { get; set; }'
);
dtoContent = dtoContent.replace(
    'public class ConfirmRollNumberAllocationRequest\n    {\n        public int AcademicYearId { get; set; }',
    'public class ConfirmRollNumberAllocationRequest\n    {\n        public int AcademicYearId { get; set; }\n        public int BoardId { get; set; }'
);

fs.writeFileSync(dtoPath, dtoContent);
console.log("Patched DTOs");

// 2. Repository SP calls (sp_GetAllocatedStudentsForRollNumbering, sp_GetStudentsForSectionAllocation, etc.)
// Wait, do the SPs take p_BoardId? 
// The user says "Add BoardId to the relevant preview/confirm DTOs and propagate it."
// I will not pass it to SP unless I need to, but wait, the prompt says "Keep API routes, section allocation behavior and unrelated modules unchanged."
// So I shouldn't alter the SP parameters if not strictly needed. I will just pass it to NumberSeries.

// 3. SectionRollAllocationService.cs
let srvPath = 'Backend/src/CollegeManagement.API/Services/Implementations/SectionRollAllocationService.cs';
let srvContent = fs.readFileSync(srvPath, 'utf8');

srvContent = srvContent.replace(
    'ValidateValues(\r\n                request.AcademicYearId,\r\n                request.AcademicLevelId,\r\n                request.GroupId,\r\n                request.ProgramId);',
    'ValidateValues(\r\n                request.AcademicYearId,\r\n                request.BoardId,\r\n                request.AcademicLevelId,\r\n                request.GroupId,\r\n                request.ProgramId);'
).replace(
    'ValidateValues(\n                request.AcademicYearId,\n                request.AcademicLevelId,\n                request.GroupId,\n                request.ProgramId);',
    'ValidateValues(\n                request.AcademicYearId,\n                request.BoardId,\n                request.AcademicLevelId,\n                request.GroupId,\n                request.ProgramId);'
);

// Update ValidateValues signature
srvContent = srvContent.replace(
    'private static void ValidateValues(\r\n            int academicYearId,\r\n            int academicLevelId,\r\n            int groupId,\r\n            int programId)',
    'private static void ValidateValues(\r\n            int academicYearId,\r\n            int boardId,\r\n            int academicLevelId,\r\n            int groupId,\r\n            int programId)'
).replace(
    'private static void ValidateValues(\n            int academicYearId,\n            int academicLevelId,\n            int groupId,\n            int programId)',
    'private static void ValidateValues(\n            int academicYearId,\n            int boardId,\n            int academicLevelId,\n            int groupId,\n            int programId)'
);

// Add boardId validation
srvContent = srvContent.replace(
    'if (academicYearId <= 0)\r\n                throw new ArgumentException(\r\n                    "Invalid AcademicYearId.");',
    'if (academicYearId <= 0)\r\n                throw new ArgumentException(\r\n                    "Invalid AcademicYearId.");\r\n\r\n            if (boardId <= 0)\r\n                throw new ArgumentException(\r\n                    "Invalid BoardId.");'
).replace(
    'if (academicYearId <= 0)\n                throw new ArgumentException(\n                    "Invalid AcademicYearId.");',
    'if (academicYearId <= 0)\n                throw new ArgumentException(\n                    "Invalid AcademicYearId.");\n\n            if (boardId <= 0)\n                throw new ArgumentException(\n                    "Invalid BoardId.");'
);

// Filter requests mapping
srvContent = srvContent.replace(
    'AcademicYearId = request.AcademicYearId,\r\n                AcademicLevelId = request.AcademicLevelId,\r\n                GroupId = request.GroupId,',
    'AcademicYearId = request.AcademicYearId,\r\n                BoardId = request.BoardId,\r\n                AcademicLevelId = request.AcademicLevelId,\r\n                GroupId = request.GroupId,'
).replace(
    'AcademicYearId = request.AcademicYearId,\n                AcademicLevelId = request.AcademicLevelId,\n                GroupId = request.GroupId,',
    'AcademicYearId = request.AcademicYearId,\n                BoardId = request.BoardId,\n                AcademicLevelId = request.AcademicLevelId,\n                GroupId = request.GroupId,'
);

// Rewrite PreviewRollNumberAllocationAsync
let oldPreview = `public async Task<RollNumberAllocationPreviewResponse>
            PreviewRollNumberAllocationAsync(
                SectionRollAllocationFilterRequest request)
        {
            ValidateRequest(request);

            return await _repository
                .PreviewRollNumberAllocationAsync(request);
        }`;
        
let oldPreviewN = `public async Task<RollNumberAllocationPreviewResponse>
            PreviewRollNumberAllocationAsync(
                SectionRollAllocationFilterRequest request)
        {
            ValidateRequest(request);

            return await _repository
                .PreviewRollNumberAllocationAsync(request);
        }`;

let newPreview = `public async Task<RollNumberAllocationPreviewResponse>
            PreviewRollNumberAllocationAsync(
                SectionRollAllocationFilterRequest request)
        {
            ValidateRequest(request);

            var preview = await _repository.PreviewRollNumberAllocationAsync(request);
            if (preview == null || preview.Students.Count == 0) return preview;

            var subCode = $"ROLL_NO|{request.CampusId}|{request.BoardId}|{request.AcademicYearId}|{request.GroupId}|{request.ProgramId}";
            var seriesDto = await _numberSeriesService.GetSeriesByCodeAsync(subCode, request.CampusId) 
                            ?? await _numberSeriesService.GetSeriesByCodeAsync("ROLL_NO", request.CampusId);

            if (seriesDto == null) 
            {
                throw new InvalidOperationException("Number series configuration 'ROLL_NO' was not found. Please configure settings.");
            }

            var group = await _groupService.GetByIdAsync(request.GroupId);
            var groupCode = group?.GroupCode ?? "";

            var contextDto = new CollegeManagement.API.DTOs.Settings.GenerateNumberSeriesRequestDto 
            { 
                GroupCode = groupCode,
                BoardId = request.BoardId,
                AcademicYearId = request.AcademicYearId,
                GroupId = request.GroupId,
                ProgramId = request.ProgramId
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
        }`;

srvContent = srvContent.replace(oldPreview, newPreview).replace(oldPreviewN, newPreview);

// Update ConfirmRollNumberAllocationAsync to pass BoardId to Generator and throw if fails
let confirmOld = `var rollResult = await _numberSeriesService.GenerateNextNumberAsync(
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
                }`;

let confirmOldN = `var rollResult = await _numberSeriesService.GenerateNextNumberAsync(
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
                }`;

let confirmNew = `var rollResult = await _numberSeriesService.GenerateNextNumberAsync(
                    "ROLL_NO",
                    new CollegeManagement.API.DTOs.Settings.GenerateNumberSeriesRequestDto 
                    { 
                        GroupCode = groupCode,
                        BoardId = request.BoardId,
                        AcademicYearId = request.AcademicYearId,
                        GroupId = request.GroupId,
                        ProgramId = request.ProgramId
                    },
                    request.CampusId);

                if (rollResult == null || string.IsNullOrEmpty(rollResult.GeneratedNumber))
                {
                    throw new InvalidOperationException("Failed to generate Roll Number. Configuration might be missing.");
                }
                
                student.RollNo = rollResult.GeneratedNumber;`;

srvContent = srvContent.replace(confirmOld, confirmNew).replace(confirmOldN, confirmNew);

fs.writeFileSync(srvPath, srvContent);
console.log("Patched Service");
