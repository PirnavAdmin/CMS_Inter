using CollegeManagement.API.DTOs.Timetable;
using FluentValidation;

namespace CollegeManagement.API.Validators.TimetableValidators
{
    public class CreatePeriodDtoValidator : AbstractValidator<CreatePeriodDto>
    {
        public CreatePeriodDtoValidator()
        {
            RuleFor(x => x.PeriodName)
                .NotEmpty().WithMessage("Period name is required.")
                .MaximumLength(50).WithMessage("Period name must not exceed 50 characters.");

            RuleFor(x => x.EndTime)
                .GreaterThan(x => x.StartTime).WithMessage("End time must be after start time.");

            RuleFor(x => x.DisplayOrder)
                .GreaterThan(0).WithMessage("Display order must be a positive integer.");
        }
    }

    public class UpdatePeriodDtoValidator : AbstractValidator<UpdatePeriodDto>
    {
        public UpdatePeriodDtoValidator()
        {
            RuleFor(x => x.PeriodName)
                .NotEmpty().WithMessage("Period name is required.")
                .MaximumLength(50).WithMessage("Period name must not exceed 50 characters.");

            RuleFor(x => x.EndTime)
                .GreaterThan(x => x.StartTime).WithMessage("End time must be after start time.");

            RuleFor(x => x.DisplayOrder)
                .GreaterThan(0).WithMessage("Display order must be a positive integer.");
        }
    }
}
