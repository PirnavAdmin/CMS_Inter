using CollegeManagement.API.DTOs;
using FluentValidation;

namespace CollegeManagement.API.Validators.SectionValidators
{
    public class SectionRollAllocationFilterRequestValidator : AbstractValidator<SectionRollAllocationFilterRequest>
    {
        public SectionRollAllocationFilterRequestValidator()
        {
            RuleFor(x => x.AcademicYearId)
                .GreaterThan(0).WithMessage("Academic Year ID must be greater than 0.");

            RuleFor(x => x.BoardId)
                .GreaterThan(0).WithMessage("Board ID must be greater than 0.");

            RuleFor(x => x.AcademicLevelId)
                .GreaterThan(0).WithMessage("Academic Level ID must be greater than 0.");

            RuleFor(x => x.GroupId)
                .GreaterThan(0).WithMessage("Group ID must be greater than 0.");

            RuleFor(x => x.ProgramId)
                .GreaterThan(0).WithMessage("Program ID must be greater than 0.");
        }
    }

    public class ConfirmSectionAllocationRequestValidator : AbstractValidator<ConfirmSectionAllocationRequest>
    {
        public ConfirmSectionAllocationRequestValidator()
        {
            RuleFor(x => x.AcademicYearId)
                .GreaterThan(0).WithMessage("Academic Year ID must be greater than 0.");

            RuleFor(x => x.BoardId)
                .GreaterThan(0).WithMessage("Board ID must be greater than 0.");

            RuleFor(x => x.AcademicLevelId)
                .GreaterThan(0).WithMessage("Academic Level ID must be greater than 0.");

            RuleFor(x => x.GroupId)
                .GreaterThan(0).WithMessage("Group ID must be greater than 0.");

            RuleFor(x => x.ProgramId)
                .GreaterThan(0).WithMessage("Program ID must be greater than 0.");
        }
    }

    public class ConfirmRollNumberAllocationRequestValidator : AbstractValidator<ConfirmRollNumberAllocationRequest>
    {
        public ConfirmRollNumberAllocationRequestValidator()
        {
            RuleFor(x => x.AcademicYearId)
                .GreaterThan(0).WithMessage("Academic Year ID must be greater than 0.");

            RuleFor(x => x.BoardId)
                .GreaterThan(0).WithMessage("Board ID must be greater than 0.");

            RuleFor(x => x.AcademicLevelId)
                .GreaterThan(0).WithMessage("Academic Level ID must be greater than 0.");

            RuleFor(x => x.GroupId)
                .GreaterThan(0).WithMessage("Group ID must be greater than 0.");

            RuleFor(x => x.ProgramId)
                .GreaterThan(0).WithMessage("Program ID must be greater than 0.");
        }
    }

    public class UpdateStudentAllocationRequestValidator : AbstractValidator<UpdateStudentAllocationRequest>
    {
        public UpdateStudentAllocationRequestValidator()
        {
            RuleFor(x => x.ProgramId)
                .GreaterThan(0).WithMessage("Program ID must be greater than 0.");

            RuleFor(x => x.SectionId)
                .GreaterThan(0).WithMessage("Section ID must be greater than 0.");

            RuleFor(x => x.GroupId)
                .GreaterThan(0).When(x => x.GroupId.HasValue).WithMessage("Group ID must be greater than 0.");
        }
    }
}
