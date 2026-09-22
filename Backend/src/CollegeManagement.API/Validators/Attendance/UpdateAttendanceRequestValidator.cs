using System;
using CollegeManagement.API.DTOs.Attendance.Requests;
using FluentValidation;

namespace CollegeManagement.API.Validators.Attendance
{
    /// <summary>
    /// Validator for <see cref="UpdateAttendanceRequest"/> to ensure standard attendance update constraints.
    /// </summary>
    public class UpdateAttendanceRequestValidator : AbstractValidator<UpdateAttendanceRequest>
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="UpdateAttendanceRequestValidator"/> class.
        /// </summary>
        public UpdateAttendanceRequestValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.AttendanceId)
                .GreaterThan(0).WithMessage("Attendance ID must be greater than 0.");

            RuleFor(x => x.Status)
                .IsInEnum().WithMessage("Please select a valid attendance status.");

            RuleFor(x => x.Remarks)
                .MaximumLength(500).WithMessage("Remarks cannot exceed 500 characters.");
        }
    }
}
