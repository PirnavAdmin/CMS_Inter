using CollegeManagement.API.DTOs.Marks;
using FluentValidation;

namespace CollegeManagement.API.Validators.MarksValidators
{
    public class BulkUploadMarksDtoValidator : AbstractValidator<BulkUploadMarksDto>
    {
        public BulkUploadMarksDtoValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;
            RuleFor(x => x.Marks).NotEmpty().WithMessage("Marks collection cannot be empty.");
            RuleForEach(x => x.Marks).SetValidator(new SaveMarkDtoValidator());
        }
    }
}