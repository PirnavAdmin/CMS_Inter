using System;
using System.Text.RegularExpressions;
using CollegeManagement.API.DTOs.StudentAdmission;
using FluentValidation;

namespace CollegeManagement.API.Validators.StudentAdmission
{
    public class CreateStudentAdmissionRequestValidator : AbstractValidator<CreateStudentAdmissionRequest>
    {
        public CreateStudentAdmissionRequestValidator()
        {
            RuleFor(x => x.FirstName)
                .NotEmpty().WithMessage("First name is required.")
                .MaximumLength(100).WithMessage("First name cannot exceed 100 characters.");

            RuleFor(x => x.LastName)
                .MaximumLength(100).WithMessage("Last name cannot exceed 100 characters.")
                .When(x => !string.IsNullOrWhiteSpace(x.LastName));

            RuleFor(x => x.Gender)
                .NotEmpty().WithMessage("Gender is required.")
                .Must(g => g == "Male" || g == "Female" || g == "Other")
                .WithMessage("Gender must be 'Male', 'Female', or 'Other'.");

            RuleFor(x => x.DateOfBirth)
                .NotEmpty().WithMessage("Date of birth is required.")
                .LessThan(DateTime.Today).WithMessage("Date of birth must be in the past.");

            RuleFor(x => x.BoardId)
                .GreaterThan(0).WithMessage("Valid Board is required.");

            RuleFor(x => x.AcademicYearId)
                .GreaterThan(0).WithMessage("Valid Academic Year is required.");

            RuleFor(x => x.AcademicLevelId)
                .GreaterThan(0).WithMessage("Valid Academic Level is required.");

            RuleFor(x => x.GroupId)
                .GreaterThan(0).WithMessage("Valid Group is required.");

            RuleFor(x => x.ProgramId)
                .GreaterThan(0).WithMessage("Valid Program is required.");

            RuleFor(x => x.StudentEmail)
                .EmailAddress().WithMessage("A valid student email address is required.")
                .When(x => !string.IsNullOrWhiteSpace(x.StudentEmail));

            RuleFor(x => x.ParentGuardianEmail)
                .EmailAddress().WithMessage("A valid parent/guardian email address is required.")
                .When(x => !string.IsNullOrWhiteSpace(x.ParentGuardianEmail));

            RuleFor(x => x.StudentMobileNumber)
                .Matches(@"^[0-9]{10}$").WithMessage("Student mobile number must be exactly 10 digits.")
                .When(x => !string.IsNullOrWhiteSpace(x.StudentMobileNumber));

            RuleFor(x => x.FatherMobile)
                .Matches(@"^[0-9]{10}$").WithMessage("Father mobile number must be exactly 10 digits.")
                .When(x => !string.IsNullOrWhiteSpace(x.FatherMobile));

            RuleFor(x => x.MotherMobile)
                .Matches(@"^[0-9]{10}$").WithMessage("Mother mobile number must be exactly 10 digits.")
                .When(x => !string.IsNullOrWhiteSpace(x.MotherMobile));

            RuleFor(x => x.GuardianMobile)
                .Matches(@"^[0-9]{10}$").WithMessage("Guardian mobile number must be exactly 10 digits.")
                .When(x => !string.IsNullOrWhiteSpace(x.GuardianMobile));

            RuleFor(x => x.AadhaarNumber)
                .Matches(@"^[0-9]{12}$").WithMessage("Aadhaar number must be exactly 12 digits.")
                .When(x => !string.IsNullOrWhiteSpace(x.AadhaarNumber));

            RuleFor(x => x.Pincode)
                .Matches(@"^[0-9]{6}$").WithMessage("Pincode must be exactly 6 digits.")
                .When(x => !string.IsNullOrWhiteSpace(x.Pincode));

            RuleFor(x => x.AnnualIncome)
                .GreaterThanOrEqualTo(0).WithMessage("Annual income cannot be negative.")
                .When(x => x.AnnualIncome.HasValue);

            RuleFor(x => x.PreviousPercentage)
                .InclusiveBetween(0, 100).WithMessage("Previous percentage must be between 0 and 100.")
                .When(x => x.PreviousPercentage.HasValue);
        }
    }

    public class UpdateStudentAdmissionRequestValidator : AbstractValidator<UpdateStudentAdmissionRequest>
    {
        public UpdateStudentAdmissionRequestValidator()
        {
            RuleFor(x => x.FirstName)
                .NotEmpty().WithMessage("First name is required.")
                .MaximumLength(100).WithMessage("First name cannot exceed 100 characters.");

            RuleFor(x => x.LastName)
                .MaximumLength(100).WithMessage("Last name cannot exceed 100 characters.")
                .When(x => !string.IsNullOrWhiteSpace(x.LastName));

            RuleFor(x => x.BoardId)
                .GreaterThan(0).WithMessage("Valid Board is required.");

            RuleFor(x => x.AcademicYearId)
                .GreaterThan(0).WithMessage("Valid Academic Year is required.");

            RuleFor(x => x.AcademicLevelId)
                .GreaterThan(0).WithMessage("Valid Academic Level is required.");

            RuleFor(x => x.GroupId)
                .GreaterThan(0).WithMessage("Valid Group is required.");

            RuleFor(x => x.ProgramId)
                .GreaterThan(0).WithMessage("Valid Program is required.");

            RuleFor(x => x.StudentEmail)
                .EmailAddress().WithMessage("A valid student email address is required.")
                .When(x => !string.IsNullOrWhiteSpace(x.StudentEmail));

            RuleFor(x => x.ParentGuardianEmail)
                .EmailAddress().WithMessage("A valid parent/guardian email address is required.")
                .When(x => !string.IsNullOrWhiteSpace(x.ParentGuardianEmail));

            RuleFor(x => x.StudentMobileNumber)
                .Matches(@"^[0-9]{10}$").WithMessage("Student mobile number must be exactly 10 digits.")
                .When(x => !string.IsNullOrWhiteSpace(x.StudentMobileNumber));

            RuleFor(x => x.Pincode)
                .Matches(@"^[0-9]{6}$").WithMessage("Pincode must be exactly 6 digits.")
                .When(x => !string.IsNullOrWhiteSpace(x.Pincode));
        }
    }

    public class ApproveStudentAdmissionRequestValidator : AbstractValidator<ApproveStudentAdmissionRequest>
    {
        public ApproveStudentAdmissionRequestValidator()
        {
            RuleFor(x => x.AdmissionId)
                .GreaterThan(0).WithMessage("Valid AdmissionId is required.");
        }
    }

    public class RejectStudentAdmissionRequestValidator : AbstractValidator<RejectStudentAdmissionRequest>
    {
        public RejectStudentAdmissionRequestValidator()
        {
            RuleFor(x => x.AdmissionId)
                .GreaterThan(0).WithMessage("Valid AdmissionId is required.");

            RuleFor(x => x.RejectionReason)
                .NotEmpty().WithMessage("Rejection reason is required.")
                .MaximumLength(500).WithMessage("Rejection reason cannot exceed 500 characters.");

            RuleFor(x => x.Remarks)
                .MaximumLength(1000).WithMessage("Remarks cannot exceed 1000 characters.")
                .When(x => !string.IsNullOrWhiteSpace(x.Remarks));
        }
    }

    public class VerifyStudentAdmissionRequestValidator : AbstractValidator<VerifyStudentAdmissionRequest>
    {
        public VerifyStudentAdmissionRequestValidator()
        {
            RuleFor(x => x.AdmissionId)
                .GreaterThan(0).WithMessage("Valid AdmissionId is required.");
        }
    }

    public class AllocateSectionRequestValidator : AbstractValidator<AllocateSectionRequest>
    {
        public AllocateSectionRequestValidator()
        {
            RuleFor(x => x.AdmissionId)
                .GreaterThan(0).WithMessage("Valid AdmissionId is required.");

            RuleFor(x => x.SectionId)
                .GreaterThan(0).WithMessage("Valid SectionId is required.");
        }
    }

    public class BulkSectionAllocationRequestValidator : AbstractValidator<BulkSectionAllocationRequest>
    {
        public BulkSectionAllocationRequestValidator()
        {
            RuleFor(x => x.SectionId)
                .GreaterThan(0).WithMessage("Valid SectionId is required.");

            RuleFor(x => x.AdmissionIds)
                .NotEmpty().WithMessage("At least one admission ID must be selected.");
        }
    }

    public class BulkRollNumberAllocationRequestValidator : AbstractValidator<BulkRollNumberAllocationRequest>
    {
        public BulkRollNumberAllocationRequestValidator()
        {
            RuleFor(x => x.SectionId)
                .GreaterThan(0).WithMessage("Valid SectionId is required.");

            RuleFor(x => x.StartingRollNumber)
                .GreaterThan(0).WithMessage("Starting roll number must be greater than zero.");

            RuleFor(x => x.AdmissionIds)
                .NotEmpty().WithMessage("At least one admission ID must be selected.");
        }
    }

    public class SaveAdmissionFeeSelectionsRequestValidator : AbstractValidator<SaveAdmissionFeeSelectionsRequest>
    {
        public SaveAdmissionFeeSelectionsRequestValidator()
        {
            RuleFor(x => x.SelectedFeeStructureComponentIds)
                .NotNull().WithMessage("Selected fee structure component IDs cannot be null.");
        }
    }
}
