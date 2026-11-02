using System;
using System.Linq;
using FluentValidation;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.DTOs;

namespace CollegeManagement.API.Validators.FeeValidators
{
    public class CreateFeeTypeRequestValidator : AbstractValidator<CreateFeeTypeRequest>
    {
        private static readonly string[] AllowedCategories = 
        {
            "Admission", "Academic", "Examination", "Transport", "Hostel", 
            "Activities", "Activity", "Facility", "Other", "Miscellaneous"
        };

        public CreateFeeTypeRequestValidator()
        {
            RuleFor(x => x.FeeTypeName)
                .NotEmpty().WithMessage("Fee type name is required.")
                .MaximumLength(100).WithMessage("Fee type name cannot exceed 100 characters.");

            RuleFor(x => x.Category)
                .NotEmpty().WithMessage("Category is required.")
                .Must(c => AllowedCategories.Contains(c?.Trim(), StringComparer.OrdinalIgnoreCase))
                .WithMessage("Category must be one of: Admission, Academic, Examination, Transport, Hostel, Activities, Activity, Facility, Other, Miscellaneous.");
        }
    }

    public class CreateFeeStructureRequestValidator : AbstractValidator<CreateFeeStructureRequest>
    {
        public CreateFeeStructureRequestValidator()
        {
            RuleFor(x => x.BoardId)
                .GreaterThan(0).WithMessage("Board ID is required.");

            RuleFor(x => x.AcademicYearId)
                .GreaterThan(0).WithMessage("Academic Year ID is required.");

            RuleFor(x => x.GroupId)
                .GreaterThan(0).WithMessage("Group ID is required.");

            RuleFor(x => x.Items)
                .NotEmpty().WithMessage("At least one fee structure item is required.");

            RuleForEach(x => x.Items).SetValidator(new CreateFeeStructureItemRequestValidator());
        }
    }

    public class CreateFeeStructureItemRequestValidator : AbstractValidator<CreateFeeStructureItemRequest>
    {
        public CreateFeeStructureItemRequestValidator()
        {
            RuleFor(x => x.FeeTypeId)
                .GreaterThan(0).WithMessage("Fee Type ID is required.");

            RuleFor(x => x.Amount)
                .GreaterThan(0).WithMessage("Fee component amount must be greater than zero.");

            RuleFor(x => x.Rule)
                .NotEmpty().WithMessage("Rule is required.")
                .Must(r => string.Equals(r?.Trim(), "Mandatory", StringComparison.OrdinalIgnoreCase) || 
                           string.Equals(r?.Trim(), "Optional", StringComparison.OrdinalIgnoreCase))
                .WithMessage("Rule must be 'Mandatory' or 'Optional'.");
        }
    }

    public class CreateFeePaymentRequestValidator : AbstractValidator<CreateFeePaymentRequest>
    {
        public CreateFeePaymentRequestValidator()
        {
            RuleFor(x => x.StudentId)
                .GreaterThan(0).WithMessage("Student ID is required.");

            RuleFor(x => x.StudentFeeId)
                .GreaterThan(0).WithMessage("Student Fee ID is required.");

            RuleFor(x => x.Amount)
                .GreaterThan(0).WithMessage("Payment amount must be greater than zero.");

            RuleFor(x => x.PaymentMode)
                .NotEmpty().WithMessage("Payment mode is required.")
                .MaximumLength(30).WithMessage("Payment mode cannot exceed 30 characters.");

            RuleFor(x => x.Discount)
                .GreaterThanOrEqualTo(0).WithMessage("Discount cannot be negative.");

            RuleFor(x => x.Fine)
                .GreaterThanOrEqualTo(0).WithMessage("Fine cannot be negative.");
        }
    }

    public class ApplyFeeConcessionRequestValidator : AbstractValidator<ApplyFeeConcessionRequest>
    {
        public ApplyFeeConcessionRequestValidator()
        {
            RuleFor(x => x.StudentId)
                .GreaterThan(0).WithMessage("Student ID is required.");

            RuleFor(x => x.StudentFeeId)
                .GreaterThan(0).WithMessage("Student Fee ID is required.");

            RuleFor(x => x.DiscountValue)
                .GreaterThanOrEqualTo(0).When(x => x.DiscountValue.HasValue)
                .WithMessage("Discount value cannot be negative.");
        }
    }

    public class CreateFineRuleRequestValidator : AbstractValidator<CreateFineRuleRequest>
    {
        public CreateFineRuleRequestValidator()
        {
            RuleFor(x => x.FineRuleName)
                .NotEmpty().WithMessage("Fine rule name is required.")
                .MaximumLength(150).WithMessage("Fine rule name cannot exceed 150 characters.");

            RuleFor(x => x.ApplicableFeeId)
                .GreaterThan(0).WithMessage("Applicable fee type ID is required.");

            RuleFor(x => x.FineType)
                .NotEmpty().WithMessage("Fine type is required.")
                .MaximumLength(50).WithMessage("Fine type cannot exceed 50 characters.");

            RuleFor(x => x.FineAmount)
                .GreaterThanOrEqualTo(0).WithMessage("Fine amount cannot be negative.");

            RuleFor(x => x.GracePeriod)
                .GreaterThanOrEqualTo(0).WithMessage("Grace period cannot be negative.");
        }
    }
}
