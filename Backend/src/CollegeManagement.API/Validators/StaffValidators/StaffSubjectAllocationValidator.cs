using CollegeManagement.API.DTOs.Staff;
using FluentValidation;

namespace CollegeManagement.API.Validators.StaffValidators
{
    public class AssignStaffSubjectDtoValidator : AbstractValidator<AssignStaffSubjectDto>
    {
        public AssignStaffSubjectDtoValidator()
        {
            RuleFor(x => x.StaffId)
                .GreaterThan(0).WithMessage("Valid Staff ID is required.");

            RuleFor(x => x)
                .Must(x => x.SubjectId > 0 || !string.IsNullOrWhiteSpace(x.SubjectName))
                .WithMessage("Valid Subject ID or Subject Name is required.");
        }
    }

    public class UpdateStaffSubjectAllocationDtoValidator : AbstractValidator<UpdateStaffSubjectAllocationDto>
    {
        public UpdateStaffSubjectAllocationDtoValidator()
        {
            RuleFor(x => x.SubjectId)
                .GreaterThan(0).WithMessage("Valid Subject ID is required.");
        }
    }
}
