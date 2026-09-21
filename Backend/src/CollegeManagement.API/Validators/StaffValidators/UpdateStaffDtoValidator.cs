using System;
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
                .MaximumLength(100);

            RuleFor(x => x.LastName)
                .NotEmpty().WithMessage("Last name is required.")
                .MaximumLength(100);

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
        }
    }
}
