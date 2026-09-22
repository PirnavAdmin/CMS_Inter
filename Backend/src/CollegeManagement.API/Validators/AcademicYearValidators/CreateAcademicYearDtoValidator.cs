using CollegeManagement.API.DTOs.AcademicYear;
using FluentValidation;

namespace CollegeManagement.API.Validators.AcademicYearValidators
{
    public class CreateAcademicYearDtoValidator : AbstractValidator<CreateAcademicYearDto>
    {
        public CreateAcademicYearDtoValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.AcademicYearName)
                .NotEmpty().WithMessage("Academic Year Name is required.")
                .Must(x => !string.IsNullOrWhiteSpace(x)).WithMessage("Academic Year Name cannot be empty.")
                .Length(2, 50).WithMessage("Academic Year Name must be between 2 and 50 characters.");

            RuleFor(x => x.StartDate)
                .NotEmpty().WithMessage("Start Date is required.");

            RuleFor(x => x.EndDate)
                .NotEmpty().WithMessage("End Date is required.")
                .GreaterThan(x => x.StartDate).WithMessage("End Date must be after Start Date.");

            When(x => x.AdmissionStartDate.HasValue && x.AdmissionEndDate.HasValue, () =>
            {
                RuleFor(x => x.AdmissionEndDate!.Value)
                    .GreaterThan(x => x.AdmissionStartDate!.Value)
                    .WithMessage("Admission End Date must be after Admission Start Date.");
            });

            RuleFor(x => x.Description)
                .MaximumLength(500).WithMessage("Description / Notes cannot exceed 500 characters.")
                .When(x => !string.IsNullOrEmpty(x.Description));
        }
    }
}
