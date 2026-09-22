using CollegeManagement.API.DTOs.Promotion;
using FluentValidation;

namespace CollegeManagement.API.Validators.PromotionModuleValidators
{
    public class SectionAllocationRequestValidator
        : AbstractValidator<SectionAllocationRequest>
    {
        public SectionAllocationRequestValidator()
        {
            RuleFor(x => x.TargetSection)
                .NotEmpty();

            RuleFor(x => x.StudentIds)
                .NotEmpty();
        }
    }
}