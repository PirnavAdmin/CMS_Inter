using FluentValidation;
using CollegeManagement.API.DTOs.Payroll;

namespace CollegeManagement.API.Validators.PayrollValidators
{
    public class CreateBonusRequestValidator : AbstractValidator<CreateBonusRequest>
    {
        public CreateBonusRequestValidator()
        {
            RuleFor(x => x.StaffId)
                .GreaterThan(0).WithMessage("Staff ID must be a valid positive integer.");

            RuleFor(x => x.BonusType)
                .NotEmpty().WithMessage("Bonus type is required.")
                .MaximumLength(50).WithMessage("Bonus type cannot exceed 50 characters.");

            RuleFor(x => x.Amount)
                .GreaterThan(0).WithMessage("Bonus amount must be greater than zero.");

            RuleFor(x => x.BonusMonth)
                .InclusiveBetween(1, 12).WithMessage("Bonus month must be between 1 and 12.");

            RuleFor(x => x.BonusYear)
                .GreaterThanOrEqualTo(2000).WithMessage("Bonus year must be 2000 or later.");
        }
    }

    public class CreateAdvanceRequestValidator : AbstractValidator<CreateAdvanceRequest>
    {
        public CreateAdvanceRequestValidator()
        {
            RuleFor(x => x.StaffId)
                .GreaterThan(0).WithMessage("Staff ID must be a valid positive integer.");

            RuleFor(x => x.AdvanceType)
                .NotEmpty().WithMessage("Advance type is required.")
                .MaximumLength(50).WithMessage("Advance type cannot exceed 50 characters.");

            RuleFor(x => x.Amount)
                .GreaterThan(0).WithMessage("Advance amount must be greater than zero.");

            RuleFor(x => x.RepaymentMonths)
                .InclusiveBetween(1, 120).WithMessage("Repayment months must be between 1 and 120.");

            RuleFor(x => x.StartMonth)
                .InclusiveBetween(1, 12).WithMessage("Start month must be between 1 and 12.");

            RuleFor(x => x.StartYear)
                .GreaterThanOrEqualTo(2000).WithMessage("Start year must be 2000 or later.");
        }
    }

    public class GenerateBulkPayslipRequestValidator : AbstractValidator<GenerateBulkPayslipRequest>
    {
        public GenerateBulkPayslipRequestValidator()
        {
            RuleFor(x => x.StaffIds)
                .NotEmpty().WithMessage("At least one staff member must be selected for bulk payslip generation.");

            RuleFor(x => x.PayrollMonth)
                .InclusiveBetween(1, 12).WithMessage("Payroll month must be between 1 and 12.");

            RuleFor(x => x.PayrollYear)
                .GreaterThanOrEqualTo(2000).WithMessage("Payroll year must be 2000 or later.");
        }
    }
}
