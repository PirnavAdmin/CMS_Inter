using CollegeManagement.API.DTOs.StaffAttendance;
using FluentValidation;

namespace CollegeManagement.API.Validators.StaffValidators
{
    public class CreateTimingConfigRequestValidator : AbstractValidator<CreateTimingConfigRequest>
    {
        public CreateTimingConfigRequestValidator()
        {
            RuleFor(x => x.ConfigName)
                .NotEmpty()
                .WithMessage("Configuration name is required.")
                .MaximumLength(100)
                .WithMessage("Configuration name cannot exceed 100 characters.");

            RuleFor(x => x.WorkStartTime)
                .NotEmpty()
                .WithMessage("Work start time is required.")
                .Matches(@"^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$")
                .WithMessage("Work start time must be in HH:mm format.");

            RuleFor(x => x.WorkEndTime)
                .NotEmpty()
                .WithMessage("Work end time is required.")
                .Matches(@"^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$")
                .WithMessage("Work end time must be in HH:mm format.");

            RuleFor(x => x.LateThreshold)
                .NotEmpty()
                .WithMessage("Late threshold time is required.")
                .Matches(@"^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$")
                .WithMessage("Late threshold time must be in HH:mm format.");

            RuleFor(x => x.EarlyCheckoutThreshold)
                .NotEmpty()
                .WithMessage("Early checkout threshold time is required.")
                .Matches(@"^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$")
                .WithMessage("Early checkout threshold time must be in HH:mm format.");

            RuleFor(x => x.GracePeriodMinutes)
                .InclusiveBetween(0, 120)
                .WithMessage("Grace period must be between 0 and 120 minutes.");

            RuleFor(x => x.MinWorkingHours)
                .InclusiveBetween(1.0m, 24.0m)
                .WithMessage("Minimum working hours must be between 1.0 and 24.0 hours.");

            RuleFor(x => x.Description)
                .MaximumLength(500)
                .When(x => !string.IsNullOrEmpty(x.Description))
                .WithMessage("Description cannot exceed 500 characters.");
        }
    }

    public class UpdateTimingConfigRequestValidator : AbstractValidator<UpdateTimingConfigRequest>
    {
        public UpdateTimingConfigRequestValidator()
        {
            Include(new CreateTimingConfigRequestValidator());
        }
    }
}
