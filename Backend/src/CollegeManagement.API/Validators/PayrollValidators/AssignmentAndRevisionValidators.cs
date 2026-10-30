using FluentValidation;
using CollegeManagement.API.DTOs.Payroll;

namespace CollegeManagement.API.Validators.PayrollValidators
{
    public class AssignSalaryStructureRequestValidator : AbstractValidator<AssignSalaryStructureRequest>
    {
        public AssignSalaryStructureRequestValidator()
        {
            RuleFor(x => x.StaffId)
                .GreaterThan(0).WithMessage("Staff ID must be a valid positive integer.");

            RuleFor(x => x.SalaryStructureId)
                .GreaterThan(0).WithMessage("Salary structure ID must be a valid positive integer.");

            RuleFor(x => x.EffectiveFrom)
                .NotEmpty().WithMessage("Effective from date is required.");
        }
    }

    public class UpdateSalaryAssignmentRequestValidator : AbstractValidator<UpdateSalaryAssignmentRequest>
    {
        public UpdateSalaryAssignmentRequestValidator()
        {
            RuleFor(x => x.SalaryStructureId)
                .GreaterThan(0).WithMessage("Salary structure ID must be a valid positive integer.");

            RuleFor(x => x.EffectiveFrom)
                .NotEmpty().WithMessage("Effective from date is required.");
        }
    }

    public class CreateSalaryRevisionRequestValidator : AbstractValidator<CreateSalaryRevisionRequest>
    {
        public CreateSalaryRevisionRequestValidator()
        {
            RuleFor(x => x.StaffId)
                .GreaterThan(0).WithMessage("Staff ID must be a valid positive integer.");

            RuleFor(x => x.CurrentSalaryStructureId)
                .GreaterThan(0).WithMessage("Current salary structure ID must be a valid positive integer.");

            RuleFor(x => x.ProposedSalaryStructureId)
                .GreaterThan(0).WithMessage("Proposed salary structure ID must be a valid positive integer.")
                .Must((req, proposed) => proposed != req.CurrentSalaryStructureId)
                .WithMessage("Proposed salary structure must be different from current salary structure.");

            RuleFor(x => x.EffectiveFrom)
                .NotEmpty().WithMessage("Effective from date is required.");
        }
    }
}
