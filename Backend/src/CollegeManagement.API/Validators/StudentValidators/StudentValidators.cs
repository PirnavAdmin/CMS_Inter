using CollegeManagement.API.DTOs.Students;
using FluentValidation;

namespace CollegeManagement.API.Validators.StudentValidators
{
    // =========================================================
    // CHANGE SECTION
    // =========================================================

    public class ChangeSectionRequestValidator
        : AbstractValidator<ChangeSectionRequest>
    {
        public ChangeSectionRequestValidator()
        {
            RuleFor(x => x.SectionId)
                .GreaterThan(0)
                .WithMessage("Valid SectionId is required.");

            RuleFor(x => x.Remarks)
                .MaximumLength(1000)
                .WithMessage("Remarks cannot exceed 1000 characters.");
        }
    }


    // =========================================================
    // CHANGE GROUP
    // =========================================================

    public class ChangeGroupRequestValidator
        : AbstractValidator<ChangeGroupRequest>
    {
        public ChangeGroupRequestValidator()
        {
            RuleFor(x => x.GroupId)
                .GreaterThan(0)
                .WithMessage("Valid GroupId is required.");

            RuleFor(x => x.ProgramId)
                .GreaterThan(0)
                .WithMessage("Valid ProgramId is required.");

            RuleFor(x => x.Remarks)
                .MaximumLength(1000)
                .WithMessage("Remarks cannot exceed 1000 characters.");
        }
    }


    // =========================================================
    // TRANSFER STUDENT
    // =========================================================

    public class TransferStudentRequestValidator
        : AbstractValidator<TransferStudentRequest>
    {
        public TransferStudentRequestValidator()
        {
            RuleFor(x => x.TransferReason)
                .NotEmpty()
                .WithMessage("TransferReason is required.")
                .MaximumLength(500)
                .WithMessage("TransferReason cannot exceed 500 characters.");

            RuleFor(x => x.Remarks)
                .MaximumLength(1000)
                .WithMessage("Remarks cannot exceed 1000 characters.");
        }
    }


    // =========================================================
    // SUSPEND STUDENT
    // =========================================================

    public class SuspendStudentRequestValidator
        : AbstractValidator<SuspendStudentRequest>
    {
        public SuspendStudentRequestValidator()
        {
            RuleFor(x => x.Reason)
                .NotEmpty()
                .WithMessage("Reason is required.")
                .MaximumLength(500)
                .WithMessage("Reason cannot exceed 500 characters.");

            RuleFor(x => x.Remarks)
                .MaximumLength(1000)
                .WithMessage("Remarks cannot exceed 1000 characters.");
        }
    }


    // =========================================================
    // UPDATE STUDENT
    // =========================================================

    public class UpdateStudentRequestValidator
        : AbstractValidator<UpdateStudentRequest>
    {
        public UpdateStudentRequestValidator()
        {
            When(x => !string.IsNullOrWhiteSpace(x.StudentName), () =>
            {
                RuleFor(x => x.StudentName)
                    .MaximumLength(150)
                    .WithMessage("StudentName cannot exceed 150 characters.");
            });

            When(x => !string.IsNullOrWhiteSpace(x.Email), () =>
            {
                RuleFor(x => x.Email)
                    .EmailAddress()
                    .WithMessage("Invalid Email address.")
                    .MaximumLength(150)
                    .WithMessage("Email cannot exceed 150 characters.");
            });

            When(x => !string.IsNullOrWhiteSpace(x.MobileNumber), () =>
            {
                RuleFor(x => x.MobileNumber)
                    .Matches(@"^[6-9][0-9]{9}$")
                    .WithMessage("MobileNumber must be a valid 10-digit number.");
            });

            When(x => !string.IsNullOrWhiteSpace(x.AadhaarNumber), () =>
            {
                RuleFor(x => x.AadhaarNumber)
                    .Matches(@"^[0-9]{12}$")
                    .WithMessage("AadhaarNumber must be 12 digits.");
            });

            RuleFor(x => x.Photo)
                .MaximumLength(500)
                .When(x => x.Photo != null)
                .WithMessage("Photo cannot exceed 500 characters.");

            RuleFor(x => x.Address)
                .MaximumLength(500)
                .When(x => x.Address != null)
                .WithMessage("Address cannot exceed 500 characters.");

            RuleFor(x => x.City)
                .MaximumLength(100)
                .When(x => x.City != null)
                .WithMessage("City cannot exceed 100 characters.");

            RuleFor(x => x.District)
                .MaximumLength(100)
                .When(x => x.District != null)
                .WithMessage("District cannot exceed 100 characters.");

            RuleFor(x => x.State)
                .MaximumLength(100)
                .When(x => x.State != null)
                .WithMessage("State cannot exceed 100 characters.");

            RuleFor(x => x.Pincode)
                .MaximumLength(20)
                .When(x => x.Pincode != null)
                .WithMessage("Pincode cannot exceed 20 characters.");

            RuleFor(x => x.FatherEmail)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.FatherEmail))
                .WithMessage("Invalid Father Email address.");

            RuleFor(x => x.MotherEmail)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.MotherEmail))
                .WithMessage("Invalid Mother Email address.");

            RuleFor(x => x.GuardianEmail)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.GuardianEmail))
                .WithMessage("Invalid Guardian Email address.");
        }
    }

    // =========================================================
    // STUDENT SELF PROFILE
    // =========================================================

    public class StudentSelfProfileDtoValidator
        : AbstractValidator<CollegeManagement.API.DTOs.Students.Requests.StudentSelfProfileDto>
    {
        public StudentSelfProfileDtoValidator()
        {
            When(x => !string.IsNullOrWhiteSpace(x.Email), () =>
            {
                RuleFor(x => x.Email)
                    .EmailAddress()
                    .WithMessage("Invalid Email address.")
                    .MaximumLength(150)
                    .WithMessage("Email cannot exceed 150 characters.");
            });

            RuleFor(x => x.FatherEmail)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.FatherEmail))
                .WithMessage("Invalid Father Email address.");

            RuleFor(x => x.MotherEmail)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.MotherEmail))
                .WithMessage("Invalid Mother Email address.");

            RuleFor(x => x.GuardianEmail)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.GuardianEmail))
                .WithMessage("Invalid Guardian Email address.");
        }
    }

    // =========================================================
    // CREATE STUDENT ADMISSION
    // =========================================================

    public class CreateStudentAdmissionRequestValidator
        : AbstractValidator<CollegeManagement.API.DTOs.StudentAdmission.CreateStudentAdmissionRequest>
    {
        public CreateStudentAdmissionRequestValidator()
        {
            RuleFor(x => x.FirstName)
                .NotEmpty()
                .WithMessage("First name is required.")
                .MaximumLength(100);

            RuleFor(x => x.StudentEmail)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.StudentEmail))
                .WithMessage("Invalid Student Email address.");

            RuleFor(x => x.FatherEmail)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.FatherEmail))
                .WithMessage("Invalid Father Email address.");

            RuleFor(x => x.MotherEmail)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.MotherEmail))
                .WithMessage("Invalid Mother Email address.");

            RuleFor(x => x.GuardianEmail)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.GuardianEmail))
                .WithMessage("Invalid Guardian Email address.");
        }
    }

    // =========================================================
    // UPDATE STUDENT ADMISSION
    // =========================================================

    public class UpdateStudentAdmissionRequestValidator
        : AbstractValidator<CollegeManagement.API.DTOs.StudentAdmission.UpdateStudentAdmissionRequest>
    {
        public UpdateStudentAdmissionRequestValidator()
        {
            RuleFor(x => x.FirstName)
                .NotEmpty()
                .WithMessage("First name is required.")
                .MaximumLength(100);

            RuleFor(x => x.StudentEmail)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.StudentEmail))
                .WithMessage("Invalid Student Email address.");

            RuleFor(x => x.FatherEmail)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.FatherEmail))
                .WithMessage("Invalid Father Email address.");

            RuleFor(x => x.MotherEmail)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.MotherEmail))
                .WithMessage("Invalid Mother Email address.");

            RuleFor(x => x.GuardianEmail)
                .EmailAddress()
                .When(x => !string.IsNullOrWhiteSpace(x.GuardianEmail))
                .WithMessage("Invalid Guardian Email address.");
        }
    }

}