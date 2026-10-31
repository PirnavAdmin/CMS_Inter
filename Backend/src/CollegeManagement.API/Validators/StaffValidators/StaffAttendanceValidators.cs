using System;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using FluentValidation;

namespace CollegeManagement.API.Validators.StaffValidators
{
    public class StaffAttendanceEntryDtoValidator : AbstractValidator<StaffAttendanceEntryDto>
    {
        public StaffAttendanceEntryDtoValidator()
        {
            RuleFor(x => x.FacultyId)
                .GreaterThan(0)
                .WithMessage("Faculty ID must be greater than 0.");

            RuleFor(x => x.Status)
                .IsInEnum()
                .WithMessage("A valid attendance status is required.");

            RuleFor(x => x.Remarks)
                .MaximumLength(500)
                .When(x => !string.IsNullOrEmpty(x.Remarks))
                .WithMessage("Remarks cannot exceed 500 characters.");

            RuleFor(x => x.DeviceId)
                .MaximumLength(100)
                .When(x => !string.IsNullOrEmpty(x.DeviceId))
                .WithMessage("Device ID cannot exceed 100 characters.");
        }
    }

    public class BulkSaveStaffAttendanceRequestValidator : AbstractValidator<BulkSaveStaffAttendanceRequest>
    {
        public BulkSaveStaffAttendanceRequestValidator()
        {
            RuleFor(x => x.AttendanceDate)
                .NotEmpty()
                .WithMessage("Attendance date is required.")
                .LessThanOrEqualTo(DateTime.UtcNow.AddDays(1))
                .WithMessage("Attendance date cannot be in the future.");

            RuleFor(x => x.StaffType)
                .IsInEnum()
                .WithMessage("A valid staff type is required.");

            RuleFor(x => x.StaffAttendances)
                .NotEmpty()
                .WithMessage("At least one staff attendance record is required.");

            RuleForEach(x => x.StaffAttendances)
                .SetValidator(new StaffAttendanceEntryDtoValidator());
        }
    }

    public class UpdateStaffAttendanceRequestValidator : AbstractValidator<UpdateStaffAttendanceRequest>
    {
        public UpdateStaffAttendanceRequestValidator()
        {
            RuleFor(x => x.FacultyId)
                .GreaterThan(0)
                .WithMessage("Faculty ID must be greater than 0.");

            RuleFor(x => x.AttendanceDate)
                .NotEmpty()
                .WithMessage("Attendance date is required.")
                .LessThanOrEqualTo(DateTime.UtcNow.AddDays(1))
                .WithMessage("Attendance date cannot be in the future.");

            RuleFor(x => x.Status)
                .IsInEnum()
                .WithMessage("A valid attendance status is required.");

            RuleFor(x => x.Remarks)
                .MaximumLength(500)
                .When(x => !string.IsNullOrEmpty(x.Remarks))
                .WithMessage("Remarks cannot exceed 500 characters.");
        }
    }

    public class LoadStaffAttendanceRequestValidator : AbstractValidator<LoadStaffAttendanceRequest>
    {
        public LoadStaffAttendanceRequestValidator()
        {
            RuleFor(x => x)
                .Must(x => x.AttendanceDate.HasValue || !string.IsNullOrWhiteSpace(x.Date))
                .WithMessage("Attendance date must be specified.");
        }
    }

    public class StaffPunchRequestValidator : AbstractValidator<StaffPunchRequest>
    {
        public StaffPunchRequestValidator()
        {
            RuleFor(x => x.VerificationMethod)
                .IsInEnum()
                .WithMessage("A valid verification method is required.");

            RuleFor(x => x.DeviceId)
                .MaximumLength(100)
                .When(x => !string.IsNullOrEmpty(x.DeviceId))
                .WithMessage("Device ID cannot exceed 100 characters.");

            RuleFor(x => x.Remarks)
                .MaximumLength(500)
                .When(x => !string.IsNullOrEmpty(x.Remarks))
                .WithMessage("Remarks cannot exceed 500 characters.");
        }
    }

    public class SubmitRegularizationRequestValidator : AbstractValidator<SubmitRegularizationRequest>
    {
        public SubmitRegularizationRequestValidator()
        {
            RuleFor(x => x.AttendanceDate)
                .NotEmpty()
                .WithMessage("Attendance date is required.")
                .LessThanOrEqualTo(DateTime.UtcNow.AddDays(1))
                .WithMessage("Attendance date cannot be in the future.");

            RuleFor(x => x.Reason)
                .NotEmpty()
                .WithMessage("Reason for regularization is required.")
                .MinimumLength(5)
                .WithMessage("Reason must be at least 5 characters.")
                .MaximumLength(500)
                .WithMessage("Reason cannot exceed 500 characters.");

            RuleFor(x => x.RequestedInTime)
                .Matches(@"^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$")
                .When(x => !string.IsNullOrWhiteSpace(x.RequestedInTime))
                .WithMessage("Requested In-Time must be a valid time format (HH:mm or HH:mm:ss).");

            RuleFor(x => x.RequestedOutTime)
                .Matches(@"^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$")
                .When(x => !string.IsNullOrWhiteSpace(x.RequestedOutTime))
                .WithMessage("Requested Out-Time must be a valid time format (HH:mm or HH:mm:ss).");
        }
    }

    public class ReviewRegularizationRequestValidator : AbstractValidator<ReviewRegularizationRequest>
    {
        public ReviewRegularizationRequestValidator()
        {
            RuleFor(x => x.Status)
                .NotEmpty()
                .WithMessage("Review status is required.")
                .Must(s => s.Equals("Approved", StringComparison.OrdinalIgnoreCase) || s.Equals("Rejected", StringComparison.OrdinalIgnoreCase))
                .WithMessage("Status must be either 'Approved' or 'Rejected'.");

            RuleFor(x => x.AdminRemarks)
                .MaximumLength(500)
                .When(x => !string.IsNullOrEmpty(x.AdminRemarks))
                .WithMessage("Admin remarks cannot exceed 500 characters.");
        }
    }
}
