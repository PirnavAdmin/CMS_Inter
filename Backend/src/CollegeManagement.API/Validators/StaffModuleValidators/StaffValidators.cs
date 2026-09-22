using System;
using System.Text.RegularExpressions;
using CollegeManagement.API.DTOs.Staff;
using FluentValidation;

namespace CollegeManagement.API.Validators.StaffModuleValidators
{
    public class CreateStaffDtoValidator : AbstractValidator<CreateStaffDto>
    {
        public CreateStaffDtoValidator()
        {
            RuleFor(x => x.FirstName)
                .NotEmpty().WithMessage("First name is required.")
                .MaximumLength(100).WithMessage("First name cannot exceed 100 characters.");

            RuleFor(x => x.LastName)
                .NotEmpty().WithMessage("Last name is required.")
                .MaximumLength(100).WithMessage("Last name cannot exceed 100 characters.");

            RuleFor(x => x.Gender)
                .Must(g => string.IsNullOrWhiteSpace(g) || g == "Male" || g == "Female" || g == "Other")
                .WithMessage("Gender must be 'Male', 'Female', or 'Other' if specified.");

            RuleFor(x => x.DateOfBirth)
                .Must(dob => !dob.HasValue || dob.Value < DateTime.UtcNow)
                .WithMessage("Date of birth must be in the past if specified.");

            RuleFor(x => x.Mobile)
                .NotEmpty().WithMessage("Mobile number is required.")
                .Matches(@"^[0-9+ ]{10,15}$").WithMessage("Mobile number must be between 10 and 15 valid digits.");

            When(x => string.Equals(x.StaffType, "Non-Teaching", StringComparison.OrdinalIgnoreCase) ||
                      string.Equals(x.StaffType, "NonTeaching", StringComparison.OrdinalIgnoreCase) ||
                      string.Equals(x.StaffType, "Non Teaching", StringComparison.OrdinalIgnoreCase), () =>
            {
                RuleFor(x => x.Email)
                    .EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email))
                    .WithMessage("A valid email address is required if specified.")
                    .MaximumLength(150).WithMessage("Email cannot exceed 150 characters.");
            }).Otherwise(() =>
            {
                RuleFor(x => x.Email)
                    .NotEmpty().WithMessage("Email is required.")
                    .EmailAddress().WithMessage("A valid email address is required.")
                    .MaximumLength(150).WithMessage("Email cannot exceed 150 characters.");
            });

            RuleFor(x => x.DrivingLicenseNumber)
                .Must(dl =>
                {
                    if (string.IsNullOrWhiteSpace(dl)) return true;
                    var clean = Regex.Replace(dl.ToUpperInvariant(), @"[-/\s]", "");
                    return clean.Length >= 15 && clean.Length <= 16 &&
                           Regex.IsMatch(clean, @"^[A-Z]{2}[0-9]{2}(19|20)\d{2}\d{7}$|^[A-Z]{2}[0-9]{13,14}$");
                })
                .WithMessage("Driving License number must be a valid 15-16 character Indian DL (e.g. AP0920210001234).");

            RuleFor(x => x.Qualification)
                .MaximumLength(100).WithMessage("Qualification cannot exceed 100 characters.");

            RuleFor(x => x.Experience)
                .GreaterThanOrEqualTo(0).WithMessage("Experience cannot be negative.");
        }
    }

    public class UpdateStaffDtoValidator : AbstractValidator<UpdateStaffDto>
    {
        public UpdateStaffDtoValidator()
        {
            RuleFor(x => x.FirstName)
                .NotEmpty().WithMessage("First name is required.")
                .MaximumLength(100).WithMessage("First name cannot exceed 100 characters.");

            RuleFor(x => x.LastName)
                .NotEmpty().WithMessage("Last name is required.")
                .MaximumLength(100).WithMessage("Last name cannot exceed 100 characters.");

            RuleFor(x => x.Gender)
                .NotEmpty().WithMessage("Gender is required.")
                .Must(g => g == "Male" || g == "Female" || g == "Other")
                .WithMessage("Gender must be 'Male', 'Female', or 'Other'.");

            RuleFor(x => x.DateOfBirth)
                .NotEmpty().WithMessage("Date of birth is required.")
                .Must(dob => dob < DateTime.UtcNow)
                .WithMessage("Date of birth must be in the past.");

            RuleFor(x => x.Mobile)
                .NotEmpty().WithMessage("Mobile number is required.")
                .Matches(@"^[0-9+ ]{10,15}$").WithMessage("Mobile number must be between 10 and 15 valid digits.");

            When(x => string.Equals(x.StaffType, "Non-Teaching", StringComparison.OrdinalIgnoreCase) ||
                      string.Equals(x.StaffType, "NonTeaching", StringComparison.OrdinalIgnoreCase) ||
                      string.Equals(x.StaffType, "Non Teaching", StringComparison.OrdinalIgnoreCase), () =>
            {
                RuleFor(x => x.Email)
                    .EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email))
                    .WithMessage("A valid email address is required if specified.")
                    .MaximumLength(150).WithMessage("Email cannot exceed 150 characters.");
            }).Otherwise(() =>
            {
                RuleFor(x => x.Email)
                    .NotEmpty().WithMessage("Email is required.")
                    .EmailAddress().WithMessage("A valid email address is required.")
                    .MaximumLength(150).WithMessage("Email cannot exceed 150 characters.");
            });

            RuleFor(x => x.DrivingLicenseNumber)
                .Must(dl =>
                {
                    if (string.IsNullOrWhiteSpace(dl)) return true;
                    var clean = Regex.Replace(dl.ToUpperInvariant(), @"[-/\s]", "");
                    return clean.Length >= 15 && clean.Length <= 16 &&
                           Regex.IsMatch(clean, @"^[A-Z]{2}[0-9]{2}(19|20)\d{2}\d{7}$|^[A-Z]{2}[0-9]{13,14}$");
                })
                .WithMessage("Driving License number must be a valid 15-16 character Indian DL (e.g. AP0920210001234).");

            When(x => string.Equals(x.StaffType, "Non-Teaching", StringComparison.OrdinalIgnoreCase) ||
                      string.Equals(x.StaffType, "NonTeaching", StringComparison.OrdinalIgnoreCase) ||
                      string.Equals(x.StaffType, "Non Teaching", StringComparison.OrdinalIgnoreCase), () =>
            {
                RuleFor(x => x.Qualification)
                    .MaximumLength(100).WithMessage("Qualification cannot exceed 100 characters.");
            }).Otherwise(() =>
            {
                RuleFor(x => x.Qualification)
                    .NotEmpty().WithMessage("Qualification is required.")
                    .MaximumLength(100).WithMessage("Qualification cannot exceed 100 characters.");
            });

            RuleFor(x => x.JoiningDate)
                .NotEmpty().WithMessage("Joining date is required.");

            RuleFor(x => x.Experience)
                .GreaterThanOrEqualTo(0).WithMessage("Experience cannot be negative.");

            RuleFor(x => x.Status)
                .NotEmpty().WithMessage("Status is required.")
                .Must(s => s == "Active" || s == "Inactive")
                .WithMessage("Status must be 'Active' or 'Inactive'.");
        }
    }

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
}
