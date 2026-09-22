using CollegeManagement.API.DTOs.Marks;
using FluentValidation;
namespace CollegeManagement.API.Validators.MarksValidators
{
    public class UpdateMarkDtoValidator : AbstractValidator<UpdateMarkDto>
    {
        public UpdateMarkDtoValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;
            RuleFor(x => x.InternalMarks).GreaterThanOrEqualTo(0).WithMessage("Internal marks cannot be negative.");
            RuleFor(x => x.PracticalMarks).GreaterThanOrEqualTo(0).WithMessage("Practical marks cannot be negative.");
            RuleFor(x => x.TheoryMarks).GreaterThanOrEqualTo(0).WithMessage("Theory marks cannot be negative.");
            RuleFor(x => x.PassingMarks).GreaterThanOrEqualTo(0).WithMessage("Passing marks cannot be negative.");
        }
    }
}