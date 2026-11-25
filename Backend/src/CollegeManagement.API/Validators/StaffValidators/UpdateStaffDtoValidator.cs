using System;
using System.Text.RegularExpressions;
using CollegeManagement.API.DTOs.Staff;
using FluentValidation;

namespace CollegeManagement.API.Validators.StaffValidators
{
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
                .Matches(@"^[0-9+\-\s]{7,15}$").WithMessage("Mobile number must be a valid contact format.");

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
                    .NotEmpty().WithMessage("Email is required.")
                    .EmailAddress().WithMessage("A valid email address is required.")
                    .MaximumLength(150);
            });

            When(x => ((x.Department != null && x.Department.IndexOf("transport", StringComparison.OrdinalIgnoreCase) >= 0) || (x.DepartmentId.HasValue && x.DepartmentId.Value == 79)) &&
                      ((x.Designation != null && x.Designation.IndexOf("driver", StringComparison.OrdinalIgnoreCase) >= 0) || string.Equals(x.RoleName?.Trim(), "Driver", StringComparison.OrdinalIgnoreCase)), () =>
            {
                RuleFor(x => x.DrivingLicenseNumber)
                    .NotEmpty().WithMessage("Driving License number is required for Transport Drivers.")
                    .Must(dl =>
                    {
                        if (string.IsNullOrWhiteSpace(dl)) return false;
                        var clean = Regex.Replace(dl.ToUpperInvariant(), @"[-/\s]", "");
                        return clean.Length >= 8 && clean.Length <= 20;
                    })
                    .WithMessage("Driving License number must be a valid format (e.g. AP0920210001234).");
            });

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

            RuleFor(x => x.Aadhaar)
                .Must(a => string.IsNullOrWhiteSpace(a) || Regex.IsMatch(Regex.Replace(a, @"\D", ""), @"^\d{12}$"))
                .WithMessage("Aadhaar number must contain exactly 12 digits.");

            RuleFor(x => x.PanNumber)
                .Must(p => string.IsNullOrWhiteSpace(p) || Regex.IsMatch(p.Trim().ToUpperInvariant(), @"^[A-Z]{5}[0-9]{4}[A-Z]{1}$"))
                .WithMessage("PAN must follow standard 10-character format (5 uppercase letters, 4 digits, 1 uppercase letter, e.g. ABCDE1234F).");
        }
    }
}
