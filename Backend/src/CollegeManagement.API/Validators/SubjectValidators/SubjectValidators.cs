using CollegeManagement.API.DTOs.Subject;
using FluentValidation;

namespace CollegeManagement.API.Validators.SubjectValidators
{
    public class CreateSubjectDtoValidator : AbstractValidator<CreateSubjectDto>
    {
        public CreateSubjectDtoValidator()
        {
            RuleFor(x => x.BoardId)
                .GreaterThan(0).WithMessage("Valid BoardId is required.");

            RuleFor(x => x.GroupId)
                .GreaterThan(0).WithMessage("Valid GroupId is required.");

            RuleFor(x => x.AcademicLevelId)
                .GreaterThan(0).WithMessage("Valid AcademicLevelId is required.");

            RuleFor(x => x.SubjectName)
                .NotEmpty().WithMessage("Subject name is required.")
                .MaximumLength(150).WithMessage("Subject name cannot exceed 150 characters.");

            RuleFor(x => x.SubjectCode)
                .NotEmpty().WithMessage("Subject code is required.")
                .MaximumLength(50).WithMessage("Subject code cannot exceed 50 characters.")
                .Matches(@"^[A-Za-z0-9_-]+$").WithMessage("Subject code can contain only letters, numbers, hyphen and underscore.");

            RuleFor(x => x.SubjectType)
                .NotEmpty().WithMessage("Subject type is required.")
                .MaximumLength(50).WithMessage("Subject type cannot exceed 50 characters.");

            RuleFor(x => x.TotalMarks)
                .GreaterThan(0).WithMessage("Total marks must be greater than 0.")
                .LessThanOrEqualTo(1000).WithMessage("Total marks cannot exceed 1000.");

            RuleFor(x => x.InternalMarks)
                .GreaterThanOrEqualTo(0).WithMessage("Internal marks cannot be negative.")
                .LessThanOrEqualTo(1000).WithMessage("Internal marks cannot exceed 1000.");

            RuleFor(x => x.PracticalMarks)
                .GreaterThanOrEqualTo(0).WithMessage("Practical marks cannot be negative.")
                .LessThanOrEqualTo(1000).WithMessage("Practical marks cannot exceed 1000.");

            RuleFor(x => x.ExternalMarks)
                .GreaterThanOrEqualTo(0).WithMessage("External marks cannot be negative.")
                .LessThanOrEqualTo(1000).WithMessage("External marks cannot exceed 1000.");

            RuleFor(x => x.PassingMarks)
                .GreaterThanOrEqualTo(0).WithMessage("Passing marks cannot be negative.")
                .LessThanOrEqualTo(x => x.TotalMarks).WithMessage("Passing marks cannot exceed total marks.");
        }
    }

    public class UpdateSubjectDtoValidator : AbstractValidator<UpdateSubjectDto>
    {
        public UpdateSubjectDtoValidator()
        {
            RuleFor(x => x.BoardId)
                .GreaterThan(0).WithMessage("Valid BoardId is required.");

            RuleFor(x => x.GroupId)
                .GreaterThan(0).WithMessage("Valid GroupId is required.");

            RuleFor(x => x.AcademicLevelId)
                .GreaterThan(0).WithMessage("Valid AcademicLevelId is required.");

            RuleFor(x => x.SubjectName)
                .NotEmpty().WithMessage("Subject name is required.")
                .MaximumLength(150).WithMessage("Subject name cannot exceed 150 characters.");

            RuleFor(x => x.SubjectCode)
                .NotEmpty().WithMessage("Subject code is required.")
                .MaximumLength(50).WithMessage("Subject code cannot exceed 50 characters.")
                .Matches(@"^[A-Za-z0-9_-]+$").WithMessage("Subject code can contain only letters, numbers, hyphen and underscore.");

            RuleFor(x => x.SubjectType)
                .NotEmpty().WithMessage("Subject type is required.")
                .MaximumLength(50).WithMessage("Subject type cannot exceed 50 characters.");

            RuleFor(x => x.TotalMarks)
                .GreaterThan(0).WithMessage("Total marks must be greater than 0.")
                .LessThanOrEqualTo(1000).WithMessage("Total marks cannot exceed 1000.");

            RuleFor(x => x.InternalMarks)
                .GreaterThanOrEqualTo(0).WithMessage("Internal marks cannot be negative.")
                .LessThanOrEqualTo(1000).WithMessage("Internal marks cannot exceed 1000.");

            RuleFor(x => x.PracticalMarks)
                .GreaterThanOrEqualTo(0).WithMessage("Practical marks cannot be negative.")
                .LessThanOrEqualTo(1000).WithMessage("Practical marks cannot exceed 1000.");

            RuleFor(x => x.ExternalMarks)
                .GreaterThanOrEqualTo(0).WithMessage("External marks cannot be negative.")
                .LessThanOrEqualTo(1000).WithMessage("External marks cannot exceed 1000.");

            RuleFor(x => x.PassingMarks)
                .GreaterThanOrEqualTo(0).WithMessage("Passing marks cannot be negative.")
                .LessThanOrEqualTo(x => x.TotalMarks).WithMessage("Passing marks cannot exceed total marks.");
        }
    }
}
