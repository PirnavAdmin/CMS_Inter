using System;
using CollegeManagement.API.DTOs.Holiday;
using FluentValidation;

namespace CollegeManagement.API.Validators.Holiday
{
    public class CreateHolidayRequestValidator : AbstractValidator<CreateHolidayRequest>
    {
        public CreateHolidayRequestValidator()
        {
            RuleFor(x => x.HolidayName)
                .NotEmpty().WithMessage("Holiday name is required.")
                .MaximumLength(150).WithMessage("Holiday name cannot exceed 150 characters.");

            RuleFor(x => x.HolidayType)
                .NotEmpty().WithMessage("Holiday type is required.")
                .MaximumLength(50).WithMessage("Holiday type cannot exceed 50 characters.");

            RuleFor(x => x.AppliesTo)
                .NotEmpty().WithMessage("Applies To is required.")
                .MaximumLength(50).WithMessage("Applies To cannot exceed 50 characters.");

            RuleFor(x => x.DateType)
                .NotEmpty().WithMessage("Date Type is required.")
                .Must(x => x == "Single Day" || x == "Date Range" || x == "Single Date")
                .WithMessage("Date Type must be 'Single Day', 'Single Date', or 'Date Range'.");

            RuleFor(x => x.StartDate)
                .NotEmpty().WithMessage("Start date is required.");

            When(x => x.DateType == "Date Range", () =>
            {
                RuleFor(x => x.EndDate)
                    .NotNull().WithMessage("End date is required for Date Range holidays.")
                    .Must((req, endDate) => endDate.HasValue && endDate.Value >= req.StartDate)
                    .WithMessage("End date must be on or after start date.");
            });

            RuleFor(x => x.Status)
                .NotEmpty().WithMessage("Status is required.")
                .Must(x => x == "Active" || x == "Inactive" || x == "Completed" || x == "Upcoming")
                .WithMessage("Status must be 'Active', 'Inactive', 'Upcoming', or 'Completed'.");

            When(x => !string.IsNullOrEmpty(x.Description), () =>
            {
                RuleFor(x => x.Description)
                    .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.");
            });

            When(x => x.CampusId.HasValue, () =>
            {
                RuleFor(x => x.CampusId!.Value)
                    .GreaterThan(0).WithMessage("Campus ID must be greater than 0.");
            });
        }
    }

    public class UpdateHolidayRequestValidator : AbstractValidator<UpdateHolidayRequest>
    {
        public UpdateHolidayRequestValidator()
        {
            RuleFor(x => x.HolidayName)
                .NotEmpty().WithMessage("Holiday name is required.")
                .MaximumLength(150).WithMessage("Holiday name cannot exceed 150 characters.");

            RuleFor(x => x.HolidayType)
                .NotEmpty().WithMessage("Holiday type is required.")
                .MaximumLength(50).WithMessage("Holiday type cannot exceed 50 characters.");

            RuleFor(x => x.AppliesTo)
                .NotEmpty().WithMessage("Applies To is required.")
                .MaximumLength(50).WithMessage("Applies To cannot exceed 50 characters.");

            RuleFor(x => x.DateType)
                .NotEmpty().WithMessage("Date Type is required.")
                .Must(x => x == "Single Day" || x == "Date Range" || x == "Single Date")
                .WithMessage("Date Type must be 'Single Day', 'Single Date', or 'Date Range'.");

            RuleFor(x => x.StartDate)
                .NotEmpty().WithMessage("Start date is required.");

            When(x => x.DateType == "Date Range", () =>
            {
                RuleFor(x => x.EndDate)
                    .NotNull().WithMessage("End date is required for Date Range holidays.")
                    .Must((req, endDate) => endDate.HasValue && endDate.Value >= req.StartDate)
                    .WithMessage("End date must be on or after start date.");
            });

            RuleFor(x => x.Status)
                .NotEmpty().WithMessage("Status is required.")
                .Must(x => x == "Active" || x == "Inactive" || x == "Completed" || x == "Upcoming")
                .WithMessage("Status must be 'Active', 'Inactive', 'Upcoming', or 'Completed'.");

            When(x => !string.IsNullOrEmpty(x.Description), () =>
            {
                RuleFor(x => x.Description)
                    .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.");
            });
        }
    }

    public class HolidayFilterRequestValidator : AbstractValidator<HolidayFilterRequest>
    {
        public HolidayFilterRequestValidator()
        {
            RuleFor(x => x.Page)
                .GreaterThanOrEqualTo(1).WithMessage("Page number must be at least 1.");

            RuleFor(x => x.PageSize)
                .InclusiveBetween(1, 1000).WithMessage("Page size must be between 1 and 1000.");
        }
    }
}
