using CollegeManagement.API.DTOs.LeaveCategory;
using FluentValidation;

namespace CollegeManagement.API.Validators
{
    public class CreateLeaveCategoryDtoValidator : AbstractValidator<CreateLeaveCategoryDto>
    {
        public CreateLeaveCategoryDtoValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.CategoryName)
                .NotEmpty().WithMessage("Leave category name is required.")
                .MaximumLength(100).WithMessage("Leave category name cannot exceed 100 characters.");

            RuleFor(x => x.CategoryCode)
                .NotEmpty().WithMessage("Leave code is required.")
                .MaximumLength(10).WithMessage("Leave code cannot exceed 10 characters.");

            RuleFor(x => x.AnnualQuota)
                .GreaterThan(0).WithMessage("Annual quota must be greater than 0.")
                .LessThanOrEqualTo(365).WithMessage("Annual quota cannot exceed 365 days.");

            RuleFor(x => x.ApplicableStaffType)
                .NotEmpty().WithMessage("Applicable staff eligibility is required.")
                .MaximumLength(50).WithMessage("Applicable staff eligibility cannot exceed 50 characters.");

            RuleFor(x => x.Description)
                .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.")
                .When(x => !string.IsNullOrEmpty(x.Description));
        }
    }

    public class UpdateLeaveCategoryDtoValidator : AbstractValidator<UpdateLeaveCategoryDto>
    {
        public UpdateLeaveCategoryDtoValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.CategoryName)
                .NotEmpty().WithMessage("Leave category name is required.")
                .MaximumLength(100).WithMessage("Leave category name cannot exceed 100 characters.");

            RuleFor(x => x.CategoryCode)
                .NotEmpty().WithMessage("Leave code is required.")
                .MaximumLength(10).WithMessage("Leave code cannot exceed 10 characters.");

            RuleFor(x => x.AnnualQuota)
                .GreaterThan(0).WithMessage("Annual quota must be greater than 0.")
                .LessThanOrEqualTo(365).WithMessage("Annual quota cannot exceed 365 days.");

            RuleFor(x => x.ApplicableStaffType)
                .NotEmpty().WithMessage("Applicable staff eligibility is required.")
                .MaximumLength(50).WithMessage("Applicable staff eligibility cannot exceed 50 characters.");

            RuleFor(x => x.Description)
                .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.")
                .When(x => !string.IsNullOrEmpty(x.Description));
        }
    }
}
