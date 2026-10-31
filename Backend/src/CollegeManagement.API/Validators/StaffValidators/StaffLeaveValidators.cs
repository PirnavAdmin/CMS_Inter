using System;
using CollegeManagement.API.DTOs.StaffAttendance.Requests;
using CollegeManagement.API.Enums;
using FluentValidation;

namespace CollegeManagement.API.Validators.StaffValidators
{
    public class CreateStaffLeaveRequestValidator : AbstractValidator<CreateStaffLeaveRequest>
    {
        public CreateStaffLeaveRequestValidator()
        {
            RuleFor(x => x.StartDate)
                .NotEmpty()
                .WithMessage("Start date is required.");

            RuleFor(x => x.EndDate)
                .NotEmpty()
                .WithMessage("End date is required.")
                .GreaterThanOrEqualTo(x => x.StartDate)
                .WithMessage("End date must be greater than or equal to start date.");

            RuleFor(x => x.LeaveType)
                .IsInEnum()
                .WithMessage("A valid leave type is required.");

            RuleFor(x => x.Reason)
                .MaximumLength(1000)
                .When(x => !string.IsNullOrEmpty(x.Reason))
                .WithMessage("Reason cannot exceed 1000 characters.");
        }
    }

    public class StaffLeaveActionRequestValidator : AbstractValidator<StaffLeaveActionRequest>
    {
        public StaffLeaveActionRequestValidator()
        {
            RuleFor(x => x.Status)
                .IsInEnum()
                .WithMessage("A valid leave status is required.")
                .Must(s => s == LeaveStatus.Approved || s == LeaveStatus.Rejected)
                .WithMessage("Status must be either Approved or Rejected.");

            RuleFor(x => x.RejectionReason)
                .MaximumLength(500)
                .When(x => !string.IsNullOrEmpty(x.RejectionReason))
                .WithMessage("Rejection reason cannot exceed 500 characters.");
        }
    }
}
