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
                "employee-id" or "employee" or "employeeid" or "emp" => "EMPLOYEE_ID",
                "admission-no" or "admission" or "admissionno" or "adm" => "ADMISSION_NO",
                "certificate-number" or "certificate-no" or "certificateno" or "certificate" or "cert" => "CERTIFICATE_NO",
                "receipt-no" or "receipt" or "receiptno" or "fee-receipt" or "fee" => "RECEIPT_NO",
                _ => codeOrSlug.Trim().ToUpperInvariant().Replace("-", "_")
            };
        }

        public static string GetSlug(string seriesCode)
        {
            return seriesCode.ToUpperInvariant() switch
            {
                "EMPLOYEE_ID" => "employee-id",
                "ADMISSION_NO" => "admission-no",
                "CERTIFICATE_NO" => "certificate-number",
                "RECEIPT_NO" => "receipt-no",
                _ => seriesCode.ToLowerInvariant().Replace("_", "-")
            };
        }

        public async Task<IEnumerable<NumberSeriesResponseDto>> GetAllSeriesAsync()
        {
            var entities = await _repository.GetAllAsync();
            var dtos = new List<NumberSeriesResponseDto>();

            foreach (var entity in entities)
            {
                dtos.Add(MapToDto(entity));
            }

            return dtos;
        }

        public async Task<NumberSeriesResponseDto?> GetSeriesByCodeAsync(string seriesCodeOrSlug)
        {
            var code = NormalizeSeriesCode(seriesCodeOrSlug);
            var entity = await _repository.GetByCodeAsync(code);
            if (entity == null) return null;

            return MapToDto(entity);
        }

        public async Task<NumberSeriesResponseDto?> UpdateSeriesAsync(string seriesCodeOrSlug, UpdateNumberSeriesDto dto)
        {
            var code = NormalizeSeriesCode(seriesCodeOrSlug);
            var existing = await _repository.GetByCodeAsync(code);
            if (existing == null) return null;

            var updated = await _repository.UpdateByCodeAsync(
                code,
                dto.Prefix?.Trim() ?? string.Empty,
                dto.FormatPattern?.Trim() ?? string.Empty,
                dto.NumberLength < 1 ? 4 : dto.NumberLength,
                dto.StartNumber < 1 ? 1 : dto.StartNumber,
                dto.Description?.Trim());

            if (updated == null) return null;

            return MapToDto(updated);
        }

        public async Task<GenerateNumberSeriesResponseDto?> GenerateNextNumberAsync(string seriesCodeOrSlug, GenerateNumberSeriesRequestDto? context = null)
        {
            var code = NormalizeSeriesCode(seriesCodeOrSlug);
            var entity = await _repository.GenerateNextSequenceAsync(code);
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

        public async Task<string> GetLivePreviewAsync(string seriesCodeOrSlug, string? pattern = null, int? numberLength = null, string? prefix = null)
        {
            var code = NormalizeSeriesCode(seriesCodeOrSlug);
            var entity = await _repository.GetByCodeAsync(code);

            var activePattern = pattern ?? entity?.FormatPattern ?? "{PREFIX}{SEQ}";
            var activeLength = numberLength ?? entity?.NumberLength ?? 4;
            var activePrefix = prefix ?? entity?.Prefix ?? "";
            var curSeq = entity?.CurrentSequence ?? 0;
            var startNum = entity?.StartNumber ?? 1;

            var nextSeq = curSeq < startNum ? startNum : curSeq + 1;

            return NumberSeriesPatternEvaluator.Evaluate(
                pattern: activePattern,
                sequenceNumber: nextSeq,
                numberLength: activeLength,
                prefix: activePrefix,
                context: null,
                referenceDate: DateTime.Now,
                isPreview: true);
        }

        private NumberSeriesResponseDto MapToDto(NumberSeriesConfiguration entity)
        {
            var nextSeq = entity.CurrentSequence < entity.StartNumber
                ? entity.StartNumber
                : entity.CurrentSequence + 1;

            var livePreview = NumberSeriesPatternEvaluator.Evaluate(
                pattern: entity.FormatPattern,
                sequenceNumber: nextSeq,
                numberLength: entity.NumberLength,
                prefix: entity.Prefix,
                context: null,
                referenceDate: DateTime.Now,
                isPreview: true);

            var curSeqToUse = entity.CurrentSequence > 0 ? entity.CurrentSequence : entity.StartNumber;
            var currentExample = NumberSeriesPatternEvaluator.Evaluate(
                pattern: entity.FormatPattern,
                sequenceNumber: curSeqToUse,
                numberLength: entity.NumberLength,
                prefix: entity.Prefix,
                context: null,
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
                CurrentSequence = entity.CurrentSequence,
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
