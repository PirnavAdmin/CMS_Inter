using CollegeManagement.API.DTOs.Sections;
using FluentValidation;

namespace CollegeManagement.API.Validators
{
    public class CreateSectionRequestValidator : AbstractValidator<CreateSectionRequest>
    {
        public CreateSectionRequestValidator()
        {
            RuleFor(x => x)
                .Must(x => (x.BoardId.HasValue && x.BoardId.Value > 0) || !string.IsNullOrWhiteSpace(x.Board))
                .WithMessage("Board (or Board ID) is required.");

            RuleFor(x => x.AcademicYearId)
                .GreaterThan(0).WithMessage("Valid Academic Year ID is required.");

            RuleFor(x => x)
                .Must(x => (x.GroupId.HasValue && x.GroupId.Value > 0) || !string.IsNullOrWhiteSpace(x.Group))
                .WithMessage("Group (or Group ID) is required.");

            RuleFor(x => x.ProgramId)
                .GreaterThan(0).When(x => x.ProgramId.HasValue).WithMessage("Valid Program ID is required.");

            RuleFor(x => x.AcademicLevelId)
                .GreaterThan(0).When(x => x.AcademicLevelId.HasValue).WithMessage("Valid Academic Level ID is required.");

            RuleFor(x => x.SectionName)
                .NotEmpty().WithMessage("Section Name is required.")
                .MaximumLength(50).WithMessage("Section Name cannot exceed 50 characters.")
                .Matches(@"^[A-Za-z0-9 -]+$").WithMessage("Section name may contain only letters, numbers, spaces, and hyphens.");

            RuleFor(x => x.InchargeId)
                .GreaterThan(0).When(x => x.InchargeId.HasValue).WithMessage("Valid Incharge ID is required.");

            RuleFor(x => x.RoomId)
                .GreaterThan(0).When(x => x.RoomId.HasValue).WithMessage("Valid Room ID is required.");

            RuleFor(x => x.MaximumStrength)
                .GreaterThan(0).WithMessage("Capacity is required and must be greater than 0.")
                .InclusiveBetween(1, 150).WithMessage("Capacity must be between 1 and 150.");
        }
    }

    public class UpdateSectionRequestValidator : AbstractValidator<UpdateSectionRequest>
    {
        public UpdateSectionRequestValidator()
        {
            RuleFor(x => x)
                .Must(x => (x.BoardId.HasValue && x.BoardId.Value > 0) || !string.IsNullOrWhiteSpace(x.Board))
                .WithMessage("Board (or Board ID) is required.");

            RuleFor(x => x.AcademicYearId)
                .GreaterThan(0).WithMessage("Valid Academic Year ID is required.");

            RuleFor(x => x)
                .Must(x => (x.GroupId.HasValue && x.GroupId.Value > 0) || !string.IsNullOrWhiteSpace(x.Group))
                .WithMessage("Group (or Group ID) is required.");

            RuleFor(x => x.ProgramId)
                .GreaterThan(0).When(x => x.ProgramId.HasValue).WithMessage("Valid Program ID is required.");

            RuleFor(x => x.AcademicLevelId)
                .GreaterThan(0).When(x => x.AcademicLevelId.HasValue).WithMessage("Valid Academic Level ID is required.");

            RuleFor(x => x.SectionName)
                .NotEmpty().WithMessage("Section Name is required.")
                .MaximumLength(50).WithMessage("Section Name cannot exceed 50 characters.")
                .Matches(@"^[A-Za-z0-9 -]+$").WithMessage("Section name may contain only letters, numbers, spaces, and hyphens.");

            RuleFor(x => x.InchargeId)
                .GreaterThan(0).When(x => x.InchargeId.HasValue).WithMessage("Valid Incharge ID is required.");

            RuleFor(x => x.RoomId)
                .GreaterThan(0).When(x => x.RoomId.HasValue).WithMessage("Valid Room ID is required.");

            RuleFor(x => x.MaximumStrength)
                .GreaterThan(0).WithMessage("Capacity is required and must be greater than 0.")
                .InclusiveBetween(1, 150).WithMessage("Capacity must be between 1 and 150.");
        }
    }
}
