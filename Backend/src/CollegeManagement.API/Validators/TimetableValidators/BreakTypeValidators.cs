using CollegeManagement.API.DTOs.Timetable;
using FluentValidation;

namespace CollegeManagement.API.Validators.TimetableValidators
{
    public class CreateBreakTypeDtoValidator : AbstractValidator<CreateBreakTypeDto>
    {
        public CreateBreakTypeDtoValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Break type name is required.")
                .MaximumLength(50).WithMessage("Break type name must not exceed 50 characters.");
        }
    }

    public class UpdateBreakTypeDtoValidator : AbstractValidator<UpdateBreakTypeDto>
    {
        public UpdateBreakTypeDtoValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Break type name is required.")
                .MaximumLength(50).WithMessage("Break type name must not exceed 50 characters.");
        }
    }
}