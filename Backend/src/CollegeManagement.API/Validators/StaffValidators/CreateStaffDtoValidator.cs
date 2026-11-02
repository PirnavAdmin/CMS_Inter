using System;
using System.Text.RegularExpressions;
using CollegeManagement.API.DTOs.Staff;
using FluentValidation;

namespace CollegeManagement.API.Validators.StaffValidators
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

            When(x => string.Equals(x.StaffType, "Non-Teaching", StringComparison.OrdinalIgnoreCase) ||
                      string.Equals(x.StaffType, "NonTeaching", StringComparison.OrdinalIgnoreCase) ||
                      string.Equals(x.StaffType, "Non Teaching", StringComparison.OrdinalIgnoreCase), () =>
            {
                RuleFor(x => x.Email)
                    .EmailAddress().When(x => !string.IsNullOrWhiteSpace(x.Email))
                    .WithMessage("Please provide a valid email address if specified.")
                    .MaximumLength(150);
            }).Otherwise(() =>
            {
                RuleFor(x => x.Email)
                    .NotEmpty().WithMessage("Email address is required.")
                    .EmailAddress().WithMessage("Please provide a valid email address.")
                    .MaximumLength(150);
            });

            RuleFor(x => x.Mobile)
                .NotEmpty().WithMessage("Mobile number is required.")
                .Matches(@"^[0-9+\-\s]{7,15}$").WithMessage("Mobile number must be a valid contact format.");

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

            RuleFor(x => x.StaffType)
                .Must(x => string.IsNullOrEmpty(x) || x == "Teaching" || x == "Non-Teaching" || x == "Support")
                .WithMessage("StaffType must be either 'Teaching', 'Non-Teaching', or 'Support'.");
        }
    }
}
