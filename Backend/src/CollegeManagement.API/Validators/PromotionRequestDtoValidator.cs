using CollegeManagement.API.DTOs.Promotion;
using FluentValidation;

namespace CollegeManagement.API.Validators.PromotionModuleValidators
{
    public class PromoteStudentsRequestValidator
        : AbstractValidator<PromoteStudentsRequest>
    {
        public PromoteStudentsRequestValidator()
        {
            RuleFor(x => x.StudentIds)
                .NotEmpty()
                .WithMessage("Select at least one student.");

            RuleFor(x => x.TargetAcademicYearId)
                .GreaterThan(0);

            RuleFor(x => x.TargetAcademicLevel)
                .NotEmpty();

            RuleFor(x => x.TargetGroupId)
                .GreaterThan(0);

            RuleFor(x => x.TargetSection)
                .MaximumLength(50);

            RuleFor(x => x.TargetMedium)
                .MaximumLength(50);
        }
    }
}