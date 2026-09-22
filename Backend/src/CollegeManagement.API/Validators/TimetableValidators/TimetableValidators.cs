using CollegeManagement.API.DTOs.Timetable;
using FluentValidation;
using System.Linq;

namespace CollegeManagement.API.Validators.TimetableValidators
{
    public class CreateTimetableDtoValidator : AbstractValidator<CreateTimetableDto>
    {
        public CreateTimetableDtoValidator()
        {
            RuleFor(x => x.BoardId).GreaterThan(0).WithMessage("Board ID is required.");
            RuleFor(x => x.AcademicLevelId).GreaterThan(0).WithMessage("Academic Level ID is required.");
            RuleFor(x => x.AcademicYearId).GreaterThan(0).WithMessage("Academic Year ID is required.");
            RuleFor(x => x.GroupId).GreaterThan(0).WithMessage("Group ID is required.");
            RuleFor(x => x.SectionId).GreaterThan(0).WithMessage("Section ID is required.");
            RuleFor(x => x.DayOfWeek).InclusiveBetween(1, 7).WithMessage("Day of week must be between 1 (Monday) and 7 (Sunday).");
            RuleFor(x => x.PeriodId).GreaterThan(0).WithMessage("Period ID is required.");
            RuleFor(x => x.SubjectId).GreaterThan(0).WithMessage("Subject ID is required.");
            RuleFor(x => x.StaffId).GreaterThan(0).WithMessage("Teaching Staff ID is required.");
            RuleFor(x => x.RoomId).GreaterThan(0).WithMessage("Room ID is required.");
            RuleFor(x => x.Remarks).MaximumLength(250).WithMessage("Remarks cannot exceed 250 characters.");
        }
    }

    public class UpdateTimetableDtoValidator : AbstractValidator<UpdateTimetableDto>
    {
        public UpdateTimetableDtoValidator()
        {
            RuleFor(x => x.BoardId).GreaterThan(0).WithMessage("Board ID is required.");
            RuleFor(x => x.AcademicLevelId).GreaterThan(0).WithMessage("Academic Level ID is required.");
            RuleFor(x => x.AcademicYearId).GreaterThan(0).WithMessage("Academic Year ID is required.");
            RuleFor(x => x.GroupId).GreaterThan(0).WithMessage("Group ID is required.");
            RuleFor(x => x.SectionId).GreaterThan(0).WithMessage("Section ID is required.");
            RuleFor(x => x.DayOfWeek).InclusiveBetween(1, 7).WithMessage("Day of week must be between 1 (Monday) and 7 (Sunday).");
            RuleFor(x => x.PeriodId).GreaterThan(0).WithMessage("Period ID is required.");
            RuleFor(x => x.SubjectId).GreaterThan(0).WithMessage("Subject ID is required.");
            RuleFor(x => x.StaffId).GreaterThan(0).WithMessage("Teaching Staff ID is required.");
            RuleFor(x => x.RoomId).GreaterThan(0).WithMessage("Room ID is required.");
            RuleFor(x => x.Remarks).MaximumLength(250).WithMessage("Remarks cannot exceed 250 characters.");
        }
    }

    public class CopyTimetableDtoValidator : AbstractValidator<CopyTimetableDto>
    {
        public CopyTimetableDtoValidator()
        {
            RuleFor(x => x.SourceAcademicYearId).GreaterThan(0).WithMessage("Source Academic Year ID is required.");
            RuleFor(x => x.SourceSectionId).GreaterThan(0).WithMessage("Source Section ID is required.");
            RuleFor(x => x.TargetAcademicYearId).GreaterThan(0).WithMessage("Target Academic Year ID is required.");
            RuleFor(x => x.TargetSectionId).GreaterThan(0).WithMessage("Target Section ID is required.");
        }
    }

    public class GenerateTimetableRequestDtoValidator : AbstractValidator<GenerateTimetableRequestDto>
    {
        public GenerateTimetableRequestDtoValidator()
        {
            RuleFor(x => x.BoardId).GreaterThan(0).WithMessage("Board ID is required.");
            RuleFor(x => x.AcademicLevelId).GreaterThan(0).WithMessage("Academic Level ID is required.");
            RuleFor(x => x.AcademicYearId).GreaterThan(0).WithMessage("Academic Year ID is required.");
            RuleFor(x => x.GroupId).GreaterThan(0).WithMessage("Group ID is required.");

            RuleFor(x => x.PeriodStructureId)
                .GreaterThan(0)
                .When(x => x.PeriodStructureId.HasValue)
                .WithMessage("PeriodStructureId must be a valid positive integer when specified.");

            RuleFor(x => x.SectionIds)
                .NotEmpty().WithMessage("At least one Section ID is required.")
                .Must(ids => ids == null || ids.All(id => id > 0)).WithMessage("All Section IDs must be valid positive integers.")
                .Must(ids => ids == null || ids.Count == ids.Distinct().Count()).WithMessage("Duplicate Section IDs are not allowed.");

            RuleFor(x => x.WorkingDays)
                .NotEmpty().WithMessage("Working days must be specified.")
                .Must(days => days == null || days.All(d => d >= 1 && d <= 6)).WithMessage("Working days must be between 1 (Monday) and 6 (Saturday).")
                .Must(days => days == null || days.Count == days.Distinct().Count()).WithMessage("Duplicate working days are not allowed.");

            When(x => x.SubjectRequirements != null && x.SubjectRequirements.Any(), () =>
            {
                RuleFor(x => x.SubjectRequirements!)
                    .Must(reqs => reqs.All(r => r.SubjectId > 0 && r.WeeklyPeriods > 0))
                    .WithMessage("Every subject requirement must have a valid Subject ID (>0) and WeeklyPeriods (>0).")
                    .Must(reqs => reqs.Select(r => r.SubjectId).Distinct().Count() == reqs.Count)
                    .WithMessage("Duplicate Subject IDs in requirements are not allowed.");
            });
        }
    }
}
