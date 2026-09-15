using CollegeManagement.API.DTOs.Promotion;
using FluentValidation;

namespace CollegeManagement.API.Validators.PromotionModuleValidators
{
    public class RollbackPromotionRequestValidator
        : AbstractValidator<RollbackPromotionRequest>
    {
        public RollbackPromotionRequestValidator()
        {
            RuleFor(x => x.PromotionId)
                .GreaterThan(0)
                .WithMessage("Valid Promotion ID is required.");

            RuleFor(x => x.Reason)
                .NotEmpty()
                .MaximumLength(500);
        }
    }
}