using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Settings;
using CollegeManagement.API.Helpers;
using CollegeManagement.API.Models.Settings;
using CollegeManagement.API.Repositories.Interfaces;
using CollegeManagement.API.Services.Interfaces;

namespace CollegeManagement.API.Services.Implementations
{
    public class NumberSeriesService : INumberSeriesService
    {
        private readonly INumberSeriesRepository _repository;

        public NumberSeriesService(INumberSeriesRepository repository)
        {
            _repository = repository;
        }

        public static string NormalizeSeriesCode(string codeOrSlug)
        {
            if (string.IsNullOrWhiteSpace(codeOrSlug)) return string.Empty;

            var cleaned = codeOrSlug.Trim().ToLowerInvariant().Replace("_", "-");

            return cleaned switch
            {
                "teaching-staff-id" or "teaching-staff" or "teaching" or "tch" => "TEACHING_STAFF_ID",
                "non-teaching-staff-id" or "non-teaching-staff" or "non-teaching" or "nonteaching" or "nt" => "NON_TEACHING_STAFF_ID",
                "employee-id" or "employee" or "employeeid" or "emp" => "EMPLOYEE_ID",
                "admission-no" or "admission" or "admissionno" or "adm" => "ADMISSION_NO",
                "roll-no" or "rollno" or "roll" => "ROLL_NO",
                "student-id" or "studentid" or "student" or "stu" => "STUDENT_ID",
                "section-name" or "section" or "sectionname" or "sec" => "SECTION_NAME",
                "exam-code" or "exam" or "examcode" => "EXAM_CODE",
                "certificate-number" or "certificate-no" or "certificateno" or "certificate" or "cert" => "CERTIFICATE_NO",
                "receipt-no" or "receipt" or "receiptno" or "fee-receipt" or "fee" => "RECEIPT_NO",
                _ => codeOrSlug.Trim().ToUpperInvariant().Replace("-", "_")
            };
        }

        public static string GetSlug(string seriesCode)
        {
            return seriesCode.ToUpperInvariant() switch
            {
                "TEACHING_STAFF_ID" => "teaching-staff-id",
                "NON_TEACHING_STAFF_ID" => "non-teaching-staff-id",
                "EMPLOYEE_ID" => "employee-id",
                "ADMISSION_NO" => "admission-no",
                "ROLL_NO" => "roll-no",
                "STUDENT_ID" => "student-id",
                "SECTION_NAME" => "section-name",
                "EXAM_CODE" => "exam-code",
                "CERTIFICATE_NO" => "certificate-number",
                "RECEIPT_NO" => "receipt-no",
                _ => seriesCode.ToLowerInvariant().Replace("_", "-")
            };
        }

        public async Task<IEnumerable<NumberSeriesResponseDto>> GetAllSeriesAsync(int? campusId = null, string? board = null, string? academicYear = null, bool includeSubCounters = false, string? campusCode = null)
        {
            var entities = await _repository.GetAllAsync(campusId, includeSubCounters);
            var dtos = new List<NumberSeriesResponseDto>();

            var contextDto = new GenerateNumberSeriesRequestDto { Board = board, AcademicYear = academicYear, CampusCode = campusCode };

            foreach (var entity in entities)
            {
                dtos.Add(await MapToDtoAsync(entity, contextDto, campusId));
            }

            return dtos;
        }

        public async Task<NumberSeriesResponseDto?> GetSeriesByCodeAsync(string seriesCodeOrSlug, int? campusId = null, string? board = null, string? academicYear = null, string? campusCode = null)
        {
            var code = NormalizeSeriesCode(seriesCodeOrSlug);
            var entity = await _repository.GetByCodeAsync(code, campusId);
            if (entity == null) return null;

            var context = (board != null || academicYear != null || campusCode != null) ? new GenerateNumberSeriesRequestDto { Board = board, AcademicYear = academicYear, CampusCode = campusCode } : null;
            return await MapToDtoAsync(entity, context, campusId);
        }

        public async Task<NumberSeriesResponseDto?> UpdateSeriesAsync(string seriesCodeOrSlug, UpdateNumberSeriesDto dto, int? campusId = null)
        {
            var code = NormalizeSeriesCode(seriesCodeOrSlug);
            // Removed existing == null check to allow UPSERT for new custom series

            var updated = await _repository.UpdateByCodeAsync(
                code,
                dto.Prefix?.Trim() ?? string.Empty,
                dto.FormatPattern?.Trim() ?? string.Empty,
                dto.NumberLength < 1 ? 4 : dto.NumberLength,
                dto.StartNumber < 1 ? 1 : dto.StartNumber,
                dto.Description?.Trim(),
                campusId,
                dto.IsActive,
                dto.SeriesName?.Trim());

            if (updated == null) return null;

            return await MapToDtoAsync(updated, null, campusId);
        }

        public async Task<GenerateNumberSeriesResponseDto?> GenerateNextNumberAsync(string seriesCodeOrSlug, GenerateNumberSeriesRequestDto? context = null, int? campusId = null)
        {
            var code = NormalizeSeriesCode(seriesCodeOrSlug);
            var actualCode = code;

            // ── ROLL_NO BRANCH: Campus + Group scoped ──────────────────────────────
            if (code == "ROLL_NO")
            {
                if (!campusId.HasValue || campusId <= 0)
                    throw new System.ArgumentException("campusId is required for Roll Number generation.");

                var boardId = context?.BoardId ?? 0;
                var academicYearId = context?.AcademicYearId ?? 0;
                var academicLevelId = context?.AcademicLevelId ?? 0;
                var groupId = context?.GroupId ?? 0;
                var programId = context?.ProgramId ?? 0;

                var subCode = $"ROLL_NO|{campusId}|{boardId}|{academicYearId}|{academicLevelId}|{groupId}|{programId}";

                var rollEntity = await _repository.GenerateNextSequenceAsync(
                    subCode,
                    campusId,
                    baseSeriesCode: "ROLL_NO");

                if (rollEntity == null) return null;

                var effectivePrefix = !string.IsNullOrWhiteSpace(context?.CampusGroupPrefix)
                    ? context.CampusGroupPrefix.Trim().ToUpperInvariant()
                    : rollEntity.Prefix;

                var generatedRollNumber = NumberSeriesPatternEvaluator.Evaluate(
                    pattern: rollEntity.FormatPattern,
                    sequenceNumber: rollEntity.CurrentSequence,
                    numberLength: rollEntity.NumberLength,
                    prefix: effectivePrefix,
                    context: context,
                    referenceDate: DateTime.Now,
                    isPreview: false);

                return new GenerateNumberSeriesResponseDto
                {
                    SeriesCode = rollEntity.SeriesCode,
                    GeneratedNumber = generatedRollNumber,
                    SequenceNumber = rollEntity.CurrentSequence,
                    GeneratedAt = DateTime.UtcNow
                };
            }
            // ──────────────────────────────────────────────────────────────────────

            // Note: We deliberately do NOT split the series code by Board or Academic Year here.
            // This ensures that the sequence number is continuous globally per campus.
            // Formatting tokens like {BOARD} and {AY} are still evaluated by NumberSeriesPatternEvaluator.

            // No further isolation for other sequences, maintain globally per campus

            var config = await _repository.GetByCodeAsync(actualCode, campusId) ?? await _repository.GetByCodeAsync(code, campusId);
            if (config != null && !config.IsActive) {
                throw new System.InvalidOperationException($"Generation stopped: The series {code} is currently inactive.");
            }

            var entity = await _repository.GenerateNextSequenceAsync(actualCode, campusId, baseSeriesCode: code);
            if (entity == null) return null;

            var generatedNumber = NumberSeriesPatternEvaluator.Evaluate(
                pattern: entity.FormatPattern,
                sequenceNumber: entity.CurrentSequence,
                numberLength: entity.NumberLength,
                prefix: entity.Prefix,
                context: context,
                referenceDate: DateTime.Now,
                isPreview: false);

            return new GenerateNumberSeriesResponseDto
            {
                SeriesCode = entity.SeriesCode,
                GeneratedNumber = generatedNumber,
                SequenceNumber = entity.CurrentSequence,
                GeneratedAt = DateTime.UtcNow
            };
        }

        public async Task<string> GetLivePreviewAsync(string seriesCodeOrSlug, string? pattern = null, int? numberLength = null, string? prefix = null, int? campusId = null, string? board = null, string? academicYear = null, string? campusCode = null)
        {
            var code = NormalizeSeriesCode(seriesCodeOrSlug);
            var actualCode = code;

            // Do not split series code by Board/AY to maintain global campus sequence

            // Fallback to base code if specific entity is not found just to get settings, but we primarily want the current sequence of the specific context
            var specificEntity = await _repository.GetByCodeAsync(actualCode, campusId);
            var baseEntity = (actualCode == code) ? specificEntity : await _repository.GetByCodeAsync(code, campusId);
            
            var activeEntity = specificEntity ?? baseEntity;

            var activePattern = pattern ?? activeEntity?.FormatPattern ?? "{PREFIX}{SEQ}";
            var activeLength = numberLength ?? activeEntity?.NumberLength ?? 4;
            var activePrefix = prefix ?? activeEntity?.Prefix ?? "";
            
            // If specific entity exists, use its sequence. If not, the sequence is 0.
            var curSeq = specificEntity?.CurrentSequence ?? 0;
            
            // If specificEntity is actually a global fallback, reset curSeq
            if (specificEntity != null && campusId.HasValue && specificEntity.CampusId != campusId)
            {
                curSeq = specificEntity.StartNumber > 0 ? specificEntity.StartNumber - 1 : 0;
            }
            
            // If we are previewing the base series itself, get the absolute max across all its sub-series
            if (actualCode == code)
            {
                var maxSeq = await _repository.GetMaxSequenceForBaseSeriesAsync(code, campusId, board, academicYear);
                curSeq = Math.Max(curSeq, maxSeq);
            }

            var startNum = baseEntity?.StartNumber ?? 1;

            var nextSeq = curSeq < startNum ? startNum : curSeq + 1;

            var contextDto = new GenerateNumberSeriesRequestDto { Board = board, AcademicYear = academicYear, CampusCode = campusCode };

            return NumberSeriesPatternEvaluator.Evaluate(
                pattern: activePattern,
                sequenceNumber: nextSeq,
                numberLength: activeLength,
                prefix: activePrefix,
                context: contextDto,
                referenceDate: DateTime.Now,
                isPreview: true);
        }

        private async Task<NumberSeriesResponseDto> MapToDtoAsync(NumberSeriesConfiguration entity, GenerateNumberSeriesRequestDto? context = null, int? campusId = null)
        {
            var curSeq = entity.CurrentSequence;
            
            // If the entity we are using as base is from a different campus (global fallback), 
            // the sequence for the requested campus should not inherit the global one directly 
            // unless we're just rendering a preview. But to show the correct preview (e.g. 1 instead of 99)
            // we should reset to 0 if it's a cross-campus fallback.
            if (campusId.HasValue && entity.CampusId != campusId)
            {
                curSeq = entity.StartNumber > 0 ? entity.StartNumber - 1 : 0;
            }
            
            // We no longer split sequence by Board or AcademicYear.
            // The sequence is continuous globally for the campus.
            // Formatting will still use Board/AY if present in the pattern.
            if (entity.SeriesCode != "ROLL_NO") { var maxSeq = await _repository.GetMaxSequenceForBaseSeriesAsync(entity.SeriesCode, campusId, context?.Board, context?.AcademicYear); curSeq = Math.Max(curSeq, maxSeq); }

            var nextSeq = curSeq < entity.StartNumber
                ? entity.StartNumber
                : curSeq + 1;

            var livePreview = NumberSeriesPatternEvaluator.Evaluate(
                pattern: entity.FormatPattern,
                sequenceNumber: nextSeq,
                numberLength: entity.NumberLength,
                prefix: entity.Prefix,
                context: context,
                referenceDate: DateTime.Now,
                isPreview: true);

            var curSeqToUse = curSeq > 0 ? curSeq : entity.StartNumber;
            var currentExample = NumberSeriesPatternEvaluator.Evaluate(
                pattern: entity.FormatPattern,
                sequenceNumber: curSeqToUse,
                numberLength: entity.NumberLength,
                prefix: entity.Prefix,
                context: context,
                referenceDate: DateTime.Now,
                isPreview: true);

            return new NumberSeriesResponseDto
            {
                Id = entity.Id,
                SeriesCode = entity.SeriesCode,
                Slug = GetSlug(entity.SeriesCode),
                SeriesName = entity.SeriesName,
                Prefix = entity.Prefix,
                FormatPattern = entity.FormatPattern,
                NumberLength = entity.NumberLength,
                StartNumber = entity.StartNumber,
                CurrentSequence = curSeq,
                Description = entity.Description,
                IsActive = entity.IsActive,
                LivePreview = livePreview,
                CurrentExample = currentExample,
                AvailablePlaceholders = NumberSeriesPatternEvaluator.GetAvailablePlaceholders(entity.SeriesCode),
                SampleFormats = NumberSeriesPatternEvaluator.GetSampleFormats(entity.SeriesCode),
                UpdatedAt = entity.UpdatedAt
            };
        }
    }
}
