using System;
using CollegeManagement.API.DTOs.Attendance.Requests;
using FluentValidation;

namespace CollegeManagement.API.Validators.Attendance
{
    public class AdminBulkSaveStudentAttendanceRequestValidator : AbstractValidator<AdminBulkSaveStudentAttendanceRequest>
    {
        public AdminBulkSaveStudentAttendanceRequestValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.AttendanceDate)
                .NotEmpty().WithMessage("Attendance date is required.")
                .LessThanOrEqualTo(_ => DateTime.Today.AddDays(1)).WithMessage("Attendance date cannot be in the future.");

            RuleFor(x => x.Attendances)
                .NotNull().WithMessage("Attendances collection is required.")
                .Must(list => list != null && list.Count > 0).WithMessage("Attendances collection cannot be empty.");

            RuleForEach(x => x.Attendances).ChildRules(att =>
            {
                att.RuleFor(a => a.StudentId)
                    .GreaterThan(0).WithMessage("Invalid Student ID.");

                att.RuleFor(a => a.Remarks)
                    .MaximumLength(500).WithMessage("Remarks cannot exceed 500 characters.");
            });
        }
    }

    public class StudentMonthlyReportRequestValidator : AbstractValidator<StudentMonthlyReportRequest>
    {
        public StudentMonthlyReportRequestValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.Month)
                .InclusiveBetween(1, 12).When(x => x.Month.HasValue)
                .WithMessage("Month must be between 1 and 12.");

            RuleFor(x => x.Year)
                .InclusiveBetween(2000, 2100).When(x => x.Year.HasValue)
                .WithMessage("Year must be between 2000 and 2100.");
        }
    }
}
