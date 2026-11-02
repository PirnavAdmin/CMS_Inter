using FluentValidation;
using CollegeManagement.API.DTOs.Payroll;

namespace CollegeManagement.API.Validators.PayrollValidators
{
    public class CreateSalaryStructureRequestValidator : AbstractValidator<CreateSalaryStructureRequest>
    {
        public CreateSalaryStructureRequestValidator()
        {
            RuleFor(x => x.StructureName)
                .NotEmpty().WithMessage("Structure name is required.")
                .MaximumLength(100).WithMessage("Structure name cannot exceed 100 characters.");

            RuleFor(x => x.StaffType)
                .NotEmpty().WithMessage("Staff type is required.")
                .MaximumLength(50).WithMessage("Staff type cannot exceed 50 characters.");

            RuleFor(x => x.BasicPay)
                .GreaterThanOrEqualTo(0).WithMessage("Basic pay cannot be negative.");

            RuleFor(x => x.HRA)
                .GreaterThanOrEqualTo(0).WithMessage("HRA cannot be negative.");

            RuleFor(x => x.DA)
                .GreaterThanOrEqualTo(0).WithMessage("DA cannot be negative.");

            RuleFor(x => x.ConveyanceAllowance)
                .GreaterThanOrEqualTo(0).WithMessage("Conveyance allowance cannot be negative.");

            RuleFor(x => x.MedicalAllowance)
                .GreaterThanOrEqualTo(0).WithMessage("Medical allowance cannot be negative.");

            RuleFor(x => x.OtherAllowance)
                .GreaterThanOrEqualTo(0).WithMessage("Other allowance cannot be negative.");

            RuleFor(x => x.PF)
                .GreaterThanOrEqualTo(0).WithMessage("PF cannot be negative.");

            RuleFor(x => x.ProfessionalTax)
                .GreaterThanOrEqualTo(0).WithMessage("Professional tax cannot be negative.");

            RuleFor(x => x.TDS)
                .GreaterThanOrEqualTo(0).WithMessage("TDS cannot be negative.");

            RuleFor(x => x.ESI)
                .GreaterThanOrEqualTo(0).WithMessage("ESI cannot be negative.");

            RuleFor(x => x.InsuranceOtherDeduction)
                .GreaterThanOrEqualTo(0).WithMessage("Insurance / other deduction cannot be negative.");
        }
    }

    public class UpdateSalaryStructureRequestValidator : AbstractValidator<UpdateSalaryStructureRequest>
    {
        public UpdateSalaryStructureRequestValidator()
        {
            RuleFor(x => x.StructureName)
                .NotEmpty().WithMessage("Structure name is required.")
                .MaximumLength(100).WithMessage("Structure name cannot exceed 100 characters.");

            RuleFor(x => x.StaffType)
                .NotEmpty().WithMessage("Staff type is required.")
                .MaximumLength(50).WithMessage("Staff type cannot exceed 50 characters.");

            RuleFor(x => x.BasicPay)
                .GreaterThanOrEqualTo(0).WithMessage("Basic pay cannot be negative.");

            RuleFor(x => x.HRA)
                .GreaterThanOrEqualTo(0).WithMessage("HRA cannot be negative.");

            RuleFor(x => x.DA)
                .GreaterThanOrEqualTo(0).WithMessage("DA cannot be negative.");

            RuleFor(x => x.ConveyanceAllowance)
                .GreaterThanOrEqualTo(0).WithMessage("Conveyance allowance cannot be negative.");

            RuleFor(x => x.MedicalAllowance)
                .GreaterThanOrEqualTo(0).WithMessage("Medical allowance cannot be negative.");

            RuleFor(x => x.OtherAllowance)
                .GreaterThanOrEqualTo(0).WithMessage("Other allowance cannot be negative.");

            RuleFor(x => x.PF)
                .GreaterThanOrEqualTo(0).WithMessage("PF cannot be negative.");

            RuleFor(x => x.ProfessionalTax)
                .GreaterThanOrEqualTo(0).WithMessage("Professional tax cannot be negative.");

            RuleFor(x => x.TDS)
                .GreaterThanOrEqualTo(0).WithMessage("TDS cannot be negative.");

            RuleFor(x => x.ESI)
                .GreaterThanOrEqualTo(0).WithMessage("ESI cannot be negative.");

            RuleFor(x => x.InsuranceOtherDeduction)
                .GreaterThanOrEqualTo(0).WithMessage("Insurance / other deduction cannot be negative.");
        }
    }
}
