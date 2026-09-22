using CollegeManagement.API.DTOs.Marks;
using FluentValidation;

namespace CollegeManagement.API.Validators.MarksValidators
{
    public class SaveMarkDtoValidator : AbstractValidator<SaveMarkDto>
    {
        public SaveMarkDtoValidator()
        {
            RuleLevelCascadeMode = CascadeMode.Stop;

            RuleFor(x => x.Board)
                .NotEmpty().WithMessage("Board is required.");

            RuleFor(x => x.AcademicYearId)
                .GreaterThan(0).WithMessage("Academic Year ID must be greater than 0.");

            RuleFor(x => x.AcademicLevel)
                .NotEmpty().WithMessage("Academic Level is required.");

            RuleFor(x => x.GroupId)
                .GreaterThan(0).WithMessage("Group ID must be greater than 0.");

            RuleFor(x => x.SectionId)
                .GreaterThan(0).WithMessage("Section ID must be greater than 0.");

            RuleFor(x => x.ExaminationId)
                .GreaterThan(0).WithMessage("Examination ID must be greater than 0.");

            RuleFor(x => x.SubjectId)
                .GreaterThan(0).WithMessage("Subject ID must be greater than 0.");

            RuleFor(x => x.StudentId)
                .GreaterThan(0).WithMessage("Valid Student ID is required.");

            RuleFor(x => x.RollNo)
                .NotEmpty().WithMessage("Roll No is required.")
                .MaximumLength(50).WithMessage("Roll No cannot exceed 50 characters.");

            RuleFor(x => x.StudentName)
                .NotEmpty().WithMessage("Student Name is required.")
                .MaximumLength(150).WithMessage("Student Name cannot exceed 150 characters.");

            RuleFor(x => x.InternalMarks)
                .GreaterThanOrEqualTo(0).WithMessage("Internal marks cannot be negative.");

            RuleFor(x => x.PracticalMarks)
                .GreaterThanOrEqualTo(0).WithMessage("Practical marks cannot be negative.");

            RuleFor(x => x.TheoryMarks)
                .GreaterThanOrEqualTo(0).WithMessage("Theory marks cannot be negative.");

            RuleFor(x => x.PassingMarks)
                .GreaterThanOrEqualTo(0).WithMessage("Passing marks cannot be negative.");
        }
    }
}