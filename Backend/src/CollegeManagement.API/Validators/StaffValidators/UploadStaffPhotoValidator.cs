using CollegeManagement.API.DTOs.Staff;
using FluentValidation;

namespace CollegeManagement.API.Validators.StaffValidators
{
    public class UploadStaffPhotoValidator : AbstractValidator<UploadStaffPhotoDto>
    {
        public UploadStaffPhotoValidator()
        {
            RuleFor(x => x.StaffId)
                .GreaterThan(0).WithMessage("Valid Staff ID is required.");

            RuleFor(x => x.Photo)
                .NotNull().WithMessage("Photo file is required.");
        }
    }
}
