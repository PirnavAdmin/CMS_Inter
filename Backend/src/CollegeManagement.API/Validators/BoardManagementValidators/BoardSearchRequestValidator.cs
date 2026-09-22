using CollegeManagement.API.DTOs.Board.Requests;
using FluentValidation;

namespace CollegeManagement.API.Validators.BoardManagementValidators
{
    /// <summary>
    /// Validator for <see cref="BoardSearchRequest"/> to ensure pagination boundaries.
    /// </summary>
    public class BoardSearchRequestValidator : AbstractValidator<BoardSearchRequest>
    {
        public BoardSearchRequestValidator()
        {
            RuleFor(x => x.PageNumber)
                .GreaterThanOrEqualTo(1).WithMessage("Page number must be greater than or equal to 1.");

            RuleFor(x => x.PageSize)
                .InclusiveBetween(1, 100).WithMessage("Page size must be between 1 and 100.");
        }
    }
}
