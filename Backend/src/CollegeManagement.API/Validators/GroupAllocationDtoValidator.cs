using CollegeManagement.API.DTOs.Promotion;
using FluentValidation;

namespace CollegeManagement.API.Validators.PromotionModuleValidators
{
    public class GroupAllocationRequestValidator
        : AbstractValidator<GroupAllocationRequest>
    {
        public GroupAllocationRequestValidator()
        {
            RuleFor(x => x.TargetGroupId)
                .GreaterThan(0);

            RuleFor(x => x.StudentIds)
                .NotEmpty();
        }
    }
}