using System;
using FluentValidation;
using CollegeManagement.API.DTOs.Reimbursement;

namespace CollegeManagement.API.Validators.ReimbursementValidators
{
    public class CreateReimbursementClaimRequestValidator : AbstractValidator<CreateReimbursementClaimRequest>
    {
        public CreateReimbursementClaimRequestValidator()
        {
            RuleFor(x => x.Amount)
                .GreaterThan(0).WithMessage("Claim amount must be greater than zero.")
                .LessThan(10000000).WithMessage("Claim amount exceeds reasonable bounds.");

            RuleFor(x => x.ExpenseCategory)
                .NotEmpty().WithMessage("Expense category is required.")
                .MaximumLength(100).WithMessage("Expense category cannot exceed 100 characters.");

            RuleFor(x => x.Purpose)
                .NotEmpty().WithMessage("Purpose is required.")
                .MinimumLength(5).WithMessage("Purpose must be at least 5 characters.")
                .MaximumLength(2000).WithMessage("Purpose cannot exceed 2000 characters.");

            RuleFor(x => x.ExpenseDate)
                .NotEmpty().WithMessage("Expense date is required.")
                .LessThanOrEqualTo(DateTime.Today.AddDays(1)).WithMessage("Expense date cannot be in the future.");

            RuleFor(x => x.PreferredPaymentMethod)
                .NotEmpty().WithMessage("Preferred payment method is required.")
                .MaximumLength(50).WithMessage("Payment method cannot exceed 50 characters.");

            RuleFor(x => x.AdditionalNotes)
                .MaximumLength(500).WithMessage("Additional notes cannot exceed 500 characters.");
        }
    }

    public class VerifyClaimRequestValidator : AbstractValidator<VerifyClaimRequest>
    {
        public VerifyClaimRequestValidator()
        {
            RuleFor(x => x.ApprovedAmount)
                .GreaterThan(0).When(x => x.ApprovedAmount.HasValue)
                .WithMessage("Approved amount must be greater than zero if specified.");

            RuleFor(x => x.ReviewNotes)
                .MaximumLength(500).WithMessage("Review notes cannot exceed 500 characters.");
        }
    }

    public class RejectClaimRequestValidator : AbstractValidator<RejectClaimRequest>
    {
        public RejectClaimRequestValidator()
        {
            RuleFor(x => x.RejectNotes)
                .NotEmpty().WithMessage("Rejection reason or notes are required.")
                .MaximumLength(500).WithMessage("Rejection notes cannot exceed 500 characters.");
        }
    }

    public class MarkPaidClaimRequestValidator : AbstractValidator<MarkPaidClaimRequest>
    {
        public MarkPaidClaimRequestValidator()
        {
            RuleFor(x => x.PaymentReference)
                .NotEmpty().WithMessage("Payment reference is required.")
                .MaximumLength(100).WithMessage("Payment reference cannot exceed 100 characters.");
        }
    }
}
