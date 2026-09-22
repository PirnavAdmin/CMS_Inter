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

            RuleFor(x => x.SubjectId)
                .GreaterThan(0).WithMessage("Valid Subject ID is required.");
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
