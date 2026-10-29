using System;
using CollegeManagement.API.DTOs.Reimbursement;
using FluentValidation;

namespace CollegeManagement.API.Validators.Reimbursement
{
    public class CreateReimbursementClaimRequestValidator : AbstractValidator<CreateReimbursementClaimRequest>
    {
        public CreateReimbursementClaimRequestValidator()
        {
            RuleFor(x => x.Amount)
                .GreaterThan(0)
                .WithMessage("Claim amount must be greater than zero.")
                .LessThanOrEqualTo(1000000m)
                .WithMessage("Claim amount cannot exceed ₹10,00,000 per request.");

            RuleFor(x => x.ExpenseCategory)
                .NotEmpty()
                .WithMessage("Expense category is required.")
                .MaximumLength(100)
                .WithMessage("Expense category cannot exceed 100 characters.");

            RuleFor(x => x.Purpose)
                .NotEmpty()
                .WithMessage("Purpose / description of expense is required.")
                .MinimumLength(5)
                .WithMessage("Purpose must be at least 5 characters long.")
                .MaximumLength(1000)
                .WithMessage("Purpose cannot exceed 1000 characters.");

            RuleFor(x => x.ExpenseDate)
                .NotEmpty()
                .WithMessage("Expense date is required.")
                .Must(date => date <= DateTime.UtcNow.Date.AddDays(1))
                .WithMessage("Expense date cannot be in the future.");

            RuleFor(x => x.PreferredPaymentMethod)
                .MaximumLength(50)
                .WithMessage("Preferred payment method cannot exceed 50 characters.");

            RuleFor(x => x.AdditionalNotes)
                .MaximumLength(500)
                .WithMessage("Additional notes cannot exceed 500 characters.");
        }
    }

    public class VerifyClaimRequestValidator : AbstractValidator<VerifyClaimRequest>
    {
        public VerifyClaimRequestValidator()
        {
            RuleFor(x => x.ApprovedAmount)
                .GreaterThan(0)
                .When(x => x.ApprovedAmount.HasValue)
                .WithMessage("Approved amount must be greater than zero when provided.");

            RuleFor(x => x.ReviewNotes)
                .MaximumLength(500)
                .WithMessage("Review notes cannot exceed 500 characters.");

            RuleFor(x => x.Notes)
                .MaximumLength(500)
                .WithMessage("Notes cannot exceed 500 characters.");
        }
    }

    public class RequestClarificationRequestValidator : AbstractValidator<RequestClarificationRequest>
    {
        public RequestClarificationRequestValidator()
        {
            RuleFor(x => x)
                .Must(x => !string.IsNullOrWhiteSpace(x.ClarificationNotes) || !string.IsNullOrWhiteSpace(x.Notes))
                .WithMessage("Clarification notes must be provided.");

            RuleFor(x => x.ClarificationNotes)
                .MaximumLength(500)
                .WithMessage("Clarification notes cannot exceed 500 characters.");

            RuleFor(x => x.Notes)
                .MaximumLength(500)
                .WithMessage("Notes cannot exceed 500 characters.");
        }
    }

    public class RejectClaimRequestValidator : AbstractValidator<RejectClaimRequest>
    {
        public RejectClaimRequestValidator()
        {
            RuleFor(x => x)
                .Must(x => !string.IsNullOrWhiteSpace(x.RejectNotes) || !string.IsNullOrWhiteSpace(x.Notes))
                .WithMessage("Rejection reason / notes must be provided.");

            RuleFor(x => x.RejectNotes)
                .MaximumLength(500)
                .WithMessage("Rejection notes cannot exceed 500 characters.");

            RuleFor(x => x.Notes)
                .MaximumLength(500)
                .WithMessage("Notes cannot exceed 500 characters.");
        }
    }

    public class MarkPaidClaimRequestValidator : AbstractValidator<MarkPaidClaimRequest>
    {
        public MarkPaidClaimRequestValidator()
        {
            RuleFor(x => x)
                .Must(x => !string.IsNullOrWhiteSpace(x.PaymentReference) || !string.IsNullOrWhiteSpace(x.PaymentRef) || !string.IsNullOrWhiteSpace(x.Remarks))
                .WithMessage("Payment reference or remarks must be provided.");

            RuleFor(x => x.PaymentReference)
                .MaximumLength(100)
                .WithMessage("Payment reference cannot exceed 100 characters.");

            RuleFor(x => x.PaymentRef)
                .MaximumLength(100)
                .WithMessage("Payment reference cannot exceed 100 characters.");

            RuleFor(x => x.Remarks)
                .MaximumLength(500)
                .WithMessage("Remarks cannot exceed 500 characters.");
        }
    }
}
