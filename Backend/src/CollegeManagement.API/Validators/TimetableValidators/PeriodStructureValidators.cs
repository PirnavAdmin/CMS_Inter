using System;
using System.Linq;
using CollegeManagement.API.DTOs.Timetable;
using FluentValidation;

namespace CollegeManagement.API.Validators.TimetableValidators
{
    public class BreakItemDefinitionDtoValidator : AbstractValidator<BreakItemDefinitionDto>
    {
        public BreakItemDefinitionDtoValidator()
        {
            RuleFor(x => x.BreakTypeId)
                .GreaterThan(0).WithMessage("Valid BreakTypeId is required.");

            RuleFor(x => x.AfterPeriod)
                .GreaterThanOrEqualTo(1).WithMessage("AfterPeriod must be at least 1.");

            RuleFor(x => x.DurationMinutes)
                .GreaterThan(0).WithMessage("Break duration in minutes must be greater than 0.")
                .LessThanOrEqualTo(180).WithMessage("Break duration cannot exceed 180 minutes.");
        }
    }

    public class CreatePeriodStructureDtoValidator : AbstractValidator<CreatePeriodStructureDto>
    {
        public CreatePeriodStructureDtoValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Period structure name is required.")
                .MaximumLength(100).WithMessage("Period structure name must not exceed 100 characters.");

            RuleFor(x => x.DayStartTime)
                .Must(t => t >= TimeSpan.Zero && t < TimeSpan.FromHours(24))
                .WithMessage("Day start time must be a valid time of day (between 00:00 and 23:59).");

            RuleFor(x => x.PeriodDurationMinutes)
                .GreaterThan(0).WithMessage("Period duration must be greater than 0.")
                .LessThanOrEqualTo(180).WithMessage("Period duration cannot exceed 180 minutes.");

            RuleFor(x => x.TotalTeachingPeriods)
                .GreaterThan(0).WithMessage("Total teaching periods must be at least 1.")
                .LessThanOrEqualTo(15).WithMessage("Total teaching periods cannot exceed 15.");

            RuleForEach(x => x.Breaks).SetValidator(new BreakItemDefinitionDtoValidator());

            RuleFor(x => x.Breaks)
                .Must((dto, breaks) =>
                {
                    if (breaks == null || !breaks.Any()) return true;
                    return breaks.All(b => b.AfterPeriod <= dto.TotalTeachingPeriods);
                })
                .WithMessage("Breaks cannot be placed after a period number greater than TotalTeachingPeriods.");

            RuleFor(x => x.Breaks)
                .Must(breaks =>
                {
                    if (breaks == null || !breaks.Any()) return true;
                    return breaks.Select(b => b.AfterPeriod).Distinct().Count() == breaks.Count;
                })
                .WithMessage("Duplicate break positions detected. Only one break can be configured after any given period number.");
        }
    }

    public class UpdatePeriodStructureDtoValidator : AbstractValidator<UpdatePeriodStructureDto>
    {
        public UpdatePeriodStructureDtoValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Period structure name is required.")
                .MaximumLength(100).WithMessage("Period structure name must not exceed 100 characters.");

            RuleFor(x => x.DayStartTime)
                .Must(t => t >= TimeSpan.Zero && t < TimeSpan.FromHours(24))
                .WithMessage("Day start time must be a valid time of day (between 00:00 and 23:59).");

            RuleFor(x => x.PeriodDurationMinutes)
                .GreaterThan(0).WithMessage("Period duration must be greater than 0.")
                .LessThanOrEqualTo(180).WithMessage("Period duration cannot exceed 180 minutes.");

            RuleFor(x => x.TotalTeachingPeriods)
                .GreaterThan(0).WithMessage("Total teaching periods must be at least 1.")
                .LessThanOrEqualTo(15).WithMessage("Total teaching periods cannot exceed 15.");

            RuleForEach(x => x.Breaks).SetValidator(new BreakItemDefinitionDtoValidator());

            RuleFor(x => x.Breaks)
                .Must((dto, breaks) =>
                {
                    if (breaks == null || !breaks.Any()) return true;
                    return breaks.All(b => b.AfterPeriod <= dto.TotalTeachingPeriods);
                })
                .WithMessage("Breaks cannot be placed after a period number greater than TotalTeachingPeriods.");

            RuleFor(x => x.Breaks)
                .Must(breaks =>
                {
                    if (breaks == null || !breaks.Any()) return true;
                    return breaks.Select(b => b.AfterPeriod).Distinct().Count() == breaks.Count;
                })
                .WithMessage("Duplicate break positions detected. Only one break can be configured after any given period number.");
        }
    }

    public class PreviewPeriodStructureRequestDtoValidator : AbstractValidator<PreviewPeriodStructureRequestDto>
    {
        public PreviewPeriodStructureRequestDtoValidator()
        {
            RuleFor(x => x.DayStartTime)
                .Must(t => t >= TimeSpan.Zero && t < TimeSpan.FromHours(24))
                .WithMessage("Day start time must be a valid time of day (between 00:00 and 23:59).");

            RuleFor(x => x.PeriodDurationMinutes)
                .GreaterThan(0).WithMessage("Period duration must be greater than 0.")
                .LessThanOrEqualTo(180).WithMessage("Period duration cannot exceed 180 minutes.");

            RuleFor(x => x.TotalTeachingPeriods)
                .GreaterThan(0).WithMessage("Total teaching periods must be at least 1.")
                .LessThanOrEqualTo(15).WithMessage("Total teaching periods cannot exceed 15.");

            RuleForEach(x => x.Breaks).SetValidator(new BreakItemDefinitionDtoValidator());

            RuleFor(x => x.Breaks)
                .Must((dto, breaks) =>
                {
                    if (breaks == null || !breaks.Any()) return true;
                    return breaks.All(b => b.AfterPeriod <= dto.TotalTeachingPeriods);
                })
                .WithMessage("Breaks cannot be placed after a period number greater than TotalTeachingPeriods.");

            RuleFor(x => x.Breaks)
                .Must(breaks =>
                {
                    if (breaks == null || !breaks.Any()) return true;
                    return breaks.Select(b => b.AfterPeriod).Distinct().Count() == breaks.Count;
                })
                .WithMessage("Duplicate break positions detected. Only one break can be configured after any given period number.");
        }
    }

    public class AssignPeriodStructureDtoValidator : AbstractValidator<AssignPeriodStructureDto>
    {
        public AssignPeriodStructureDtoValidator()
        {
            RuleFor(x => x.PeriodStructureId)
                .GreaterThan(0).WithMessage("Valid PeriodStructureId is required.");

            RuleFor(x => x.BoardId)
                .GreaterThan(0).WithMessage("Valid BoardId is required.");

            RuleFor(x => x.AcademicLevelId)
                .GreaterThan(0).WithMessage("Valid AcademicLevelId is required.");

            RuleFor(x => x.AcademicYearId)
                .GreaterThan(0).WithMessage("Valid AcademicYearId is required.");
        }
    }
}