using CollegeManagement.API.DTOs.Board.Requests;
using FluentValidation;

namespace CollegeManagement.API.Validators.BoardManagementValidators
{
    /// <summary>
    /// Validator for <see cref="ChangeBoardStatusRequest"/> to ensure status configuration is present.
    /// </summary>
    public class ChangeBoardStatusRequestValidator : AbstractValidator<ChangeBoardStatusRequest>
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ChangeBoardStatusRequestValidator"/> class.
        /// </summary>
        public ChangeBoardStatusRequestValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.Status)
                .NotNull().WithMessage("Status is required.");

            RuleFor(x => x.RowVersion)
                .NotEmpty().WithMessage("RowVersion is required.")
                .GreaterThan(0u).WithMessage("RowVersion must be greater than 0.");
        }
    }
}
