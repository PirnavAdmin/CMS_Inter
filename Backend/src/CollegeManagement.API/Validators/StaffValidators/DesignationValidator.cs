using CollegeManagement.API.DTOs.Staff;
using FluentValidation;

namespace CollegeManagement.API.Validators.StaffValidators
{
    public class CreateDesignationValidator : AbstractValidator<CreateDesignationDto>
    {
        public CreateDesignationValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Designation name is required.")
                .MaximumLength(100).WithMessage("Designation name cannot exceed 100 characters.");
        }
    }

    public class UpdateDesignationValidator : AbstractValidator<UpdateDesignationDto>
    {
        public UpdateDesignationValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Designation name is required.")
                .MaximumLength(100).WithMessage("Designation name cannot exceed 100 characters.");
        }
    }
}
