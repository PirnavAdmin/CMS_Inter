using CollegeManagement.API.DTOs.Attendance.Requests;
using FluentValidation;

namespace CollegeManagement.API.Validators.Attendance
{
    /// <summary>
    /// Validator for <see cref="AttendanceStudentRequest"/> to ensure student-level attendance constraints.
    /// </summary>
    public class AttendanceStudentRequestValidator : AbstractValidator<AttendanceStudentRequest>
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="AttendanceStudentRequestValidator"/> class.
        /// </summary>
        public AttendanceStudentRequestValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.StudentId)
                .GreaterThan(0).WithMessage("Please select a student.");

            RuleFor(x => x.Status)
                .IsInEnum().WithMessage("Please select a valid attendance status.");

            RuleFor(x => x.Remarks)
                .MaximumLength(500).WithMessage("Remarks cannot exceed 500 characters.");
        }
    }
}
