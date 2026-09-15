using System;
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

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email address is required.")
                .EmailAddress().WithMessage("Please provide a valid email address.")
                .MaximumLength(150);

            RuleFor(x => x.Mobile)
                .NotEmpty().WithMessage("Mobile number is required.")
                .Matches(@"^[0-9+\-\s]{7,15}$").WithMessage("Mobile number must be a valid contact format.");

            RuleFor(x => x.Gender)
                .Must(g => string.IsNullOrWhiteSpace(g) || g == "Male" || g == "Female" || g == "Other")
                .WithMessage("Gender must be 'Male', 'Female', or 'Other' if specified.");

            RuleFor(x => x.Qualification)
                .MaximumLength(100);

            RuleFor(x => x.StaffType)
                .Must(x => string.IsNullOrEmpty(x) || x == "Teaching" || x == "Non-Teaching" || x == "Support")
                .WithMessage("StaffType must be either 'Teaching', 'Non-Teaching', or 'Support'.");
        }
    }
}
