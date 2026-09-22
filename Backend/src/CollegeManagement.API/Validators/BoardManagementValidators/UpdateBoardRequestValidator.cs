using System.Linq;
using CollegeManagement.API.DTOs.Board.Requests;
using FluentValidation;

namespace CollegeManagement.API.Validators.BoardManagementValidators
{
    /// <summary>
    /// Validator for <see cref="UpdateBoardRequest"/> to ensure standard model constraints.
    /// </summary>
    public class UpdateBoardRequestValidator : AbstractValidator<UpdateBoardRequest>
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="UpdateBoardRequestValidator"/> class.
        /// </summary>
        public UpdateBoardRequestValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.BoardName)
                .NotEmpty().WithMessage("Board name is required.")
                .Length(2, 100).WithMessage("Board name must be between 2 and 100 characters.");

            RuleFor(x => x.BoardCode)
                .NotEmpty().WithMessage("Board code is required.")
                .Length(2, 50).WithMessage("Board code must be between 2 and 50 characters.")
                .Matches(@"^[A-Za-z0-9_-]+$").WithMessage("Board code can only contain letters, numbers, hyphens, and underscores.");

            RuleFor(x => x.BoardType)
                .NotEmpty().WithMessage("Board type is required.").Must(x => !string.IsNullOrWhiteSpace(x)).WithMessage("Board type cannot be empty.")
                .MaximumLength(50).WithMessage("Board type cannot exceed 50 characters.");

            RuleFor(x => x.Description)
                .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.");

            RuleFor(x => x.CountryId)
                .GreaterThan(0).WithMessage("Country ID must be greater than 0.");

            RuleFor(x => x.StateId)
                .GreaterThan(0).WithMessage("State ID must be greater than 0.")
                .When(x => x.StateId.HasValue);

            RuleFor(x => x.AcademicLevelIds)
                .NotEmpty().WithMessage("At least one Academic Level is required.")
                .Must(ids => ids != null && ids.Any()).WithMessage("At least one Academic Level must be specified.")
                .Must(ids => ids == null || ids.Distinct().Count() == ids.Count).WithMessage("Academic Level IDs must not contain duplicate values.");

            RuleFor(x => x.GradingSystemId)
                .GreaterThan(0).WithMessage("Grading system ID must be greater than 0.");

            RuleFor(x => x.RowVersion)
                .NotEmpty().WithMessage("RowVersion is required.")
                .GreaterThan(0u).WithMessage("RowVersion must be greater than 0.");
        }
    }
}
