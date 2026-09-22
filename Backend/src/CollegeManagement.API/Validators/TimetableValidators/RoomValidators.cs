using CollegeManagement.API.DTOs.Timetable;
using FluentValidation;

namespace CollegeManagement.API.Validators.TimetableValidators
{
    public class CreateRoomDtoValidator : AbstractValidator<CreateRoomDto>
    {
        public CreateRoomDtoValidator()
        {
            RuleFor(x => x.RoomCode)
                .NotEmpty()
                .WithMessage("Room number or room code is required.")
                .MaximumLength(50).WithMessage("Room code must not exceed 50 characters.");

            RuleFor(x => x.Capacity)
                .GreaterThan(0).WithMessage("Capacity must be greater than 0.");

            RuleFor(x => x.RoomType)
                .MaximumLength(50).WithMessage("Room type must not exceed 50 characters.");
        }
    }

    public class UpdateRoomDtoValidator : AbstractValidator<UpdateRoomDto>
    {
        public UpdateRoomDtoValidator()
        {
            RuleFor(x => x.RoomCode)
                .NotEmpty()
                .WithMessage("Room number or room code is required.")
                .MaximumLength(50).WithMessage("Room code must not exceed 50 characters.");

            RuleFor(x => x.Capacity)
                .GreaterThan(0).WithMessage("Capacity must be greater than 0.");

            RuleFor(x => x.RoomType)
                .MaximumLength(50).WithMessage("Room type must not exceed 50 characters.");
        }
    }
}
