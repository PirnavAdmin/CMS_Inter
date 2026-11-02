using CollegeManagement.API.DTOs.Staff;
using FluentValidation;

namespace CollegeManagement.API.Validators.StaffValidators
{
    public class CreateDepartmentDtoValidator : AbstractValidator<CreateDepartmentDto>
    {
        public CreateDepartmentDtoValidator()
        {
            RuleFor(x => x.DepartmentName)
                .NotEmpty().WithMessage("Department name is required.")
                .MaximumLength(100).WithMessage("Department name cannot exceed 100 characters.");

            RuleFor(x => x.DepartmentCode)
                .MaximumLength(20).WithMessage("Department code cannot exceed 20 characters.")
                .When(x => !string.IsNullOrWhiteSpace(x.DepartmentCode));

            RuleFor(x => x.StaffType)
                .Must(st => string.IsNullOrWhiteSpace(st) || 
                            st.Equals("Teaching", System.StringComparison.OrdinalIgnoreCase) || 
                            st.Equals("Non-Teaching", System.StringComparison.OrdinalIgnoreCase) || 
                            st.Equals("NonTeaching", System.StringComparison.OrdinalIgnoreCase) || 
                            st.Equals("Both", System.StringComparison.OrdinalIgnoreCase))
                .WithMessage("Staff type must be 'Teaching', 'Non-Teaching', or 'Both'.");

            RuleFor(x => x.Description)
                .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.")
                .When(x => !string.IsNullOrWhiteSpace(x.Description));
        }
    }

    public class UpdateDepartmentDtoValidator : AbstractValidator<UpdateDepartmentDto>
    {
        public UpdateDepartmentDtoValidator()
        {
            RuleFor(x => x.DepartmentName)
                .NotEmpty().WithMessage("Department name is required.")
                .MaximumLength(100).WithMessage("Department name cannot exceed 100 characters.");

            RuleFor(x => x.DepartmentCode)
                .MaximumLength(20).WithMessage("Department code cannot exceed 20 characters.")
                .When(x => !string.IsNullOrWhiteSpace(x.DepartmentCode));

            RuleFor(x => x.StaffType)
                .Must(st => string.IsNullOrWhiteSpace(st) || 
                            st.Equals("Teaching", System.StringComparison.OrdinalIgnoreCase) || 
                            st.Equals("Non-Teaching", System.StringComparison.OrdinalIgnoreCase) || 
                            st.Equals("NonTeaching", System.StringComparison.OrdinalIgnoreCase) || 
                            st.Equals("Both", System.StringComparison.OrdinalIgnoreCase))
                .WithMessage("Staff type must be 'Teaching', 'Non-Teaching', or 'Both'.");

            RuleFor(x => x.Description)
                .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.")
                .When(x => !string.IsNullOrWhiteSpace(x.Description));
        }
    }
}
