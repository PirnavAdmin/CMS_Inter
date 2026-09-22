using System;
using CollegeManagement.API.DTOs.Attendance.Requests;
using FluentValidation;

namespace CollegeManagement.API.Validators.Attendance
{
    /// <summary>
    /// Validator for <see cref="BulkAttendanceRequest"/> to ensure bulk attendance constraints are met.
    /// </summary>
    public class BulkAttendanceRequestValidator : AbstractValidator<BulkAttendanceRequest>
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="BulkAttendanceRequestValidator"/> class.
        /// </summary>
        public BulkAttendanceRequestValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.AttendanceDate)
                .NotEmpty().WithMessage("Attendance date is required.")
                .LessThanOrEqualTo(_ => DateTime.Today).WithMessage("Attendance date cannot be greater than today.");

            RuleFor(x => x.BoardId)
                .GreaterThan(0).WithMessage("Please select a board.");

            RuleFor(x => x.AcademicYearId)
                .GreaterThan(0).WithMessage("Please select an academic year.");

            RuleFor(x => x.AcademicLevelId)
                .GreaterThan(0).WithMessage("Please select an academic level.");

            RuleFor(x => x.GroupId)
                .GreaterThan(0).WithMessage("Please select a group.");

            RuleFor(x => x.SectionId)
                .GreaterThan(0).WithMessage("Please select a section.");

            RuleFor(x => x.SubjectId)
                .GreaterThan(0).WithMessage("Please select a subject.");

            RuleFor(x => x.FacultyId)
                .GreaterThan(0).WithMessage("Please select a faculty.");

            RuleFor(x => x.Students)
                .NotNull().WithMessage("Students list is required.")
                .NotEmpty().WithMessage("Students list cannot be empty.");

            RuleForEach(x => x.Students)
                .SetValidator(new AttendanceStudentRequestValidator());
        }
    }
}
