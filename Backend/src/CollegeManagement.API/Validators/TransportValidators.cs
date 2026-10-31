using System;
using CollegeManagement.API.Dtos.Transport;
using CollegeManagement.API.Dtos.Transport.Attendant;
using CollegeManagement.API.Dtos.Transport.Driver;
using CollegeManagement.API.Dtos.Transport.PickupPoint;
using CollegeManagement.API.Dtos.Transport.StudentTransportAssignment;
using CollegeManagement.API.Dtos.Transport.Vehicle;
using CollegeManagement.API.Dtos.Transport.VehicleAssignment;
using CollegeManagement.API.Dtos.Transport.VehicleMaintenance;
using FluentValidation;

namespace CollegeManagement.API.Validators
{
    // ==========================================
    // 1. ROUTE VALIDATORS
    // ==========================================
    public class CreateTransportRouteDtoValidator : AbstractValidator<CreateTransportRouteDto>
    {
        public CreateTransportRouteDtoValidator()
        {
            RuleFor(x => x.RouteCode)
                .NotEmpty().WithMessage("Route code is required.")
                .MaximumLength(50).WithMessage("Route code cannot exceed 50 characters.");

            RuleFor(x => x.RouteName)
                .NotEmpty().WithMessage("Route name is required.")
                .MaximumLength(150).WithMessage("Route name cannot exceed 150 characters.");

            RuleFor(x => x.DistanceKm)
                .GreaterThanOrEqualTo(0).WithMessage("Distance cannot be negative.");

            RuleFor(x => x.EstimatedDurationMinutes)
                .GreaterThan(0).WithMessage("Estimated duration must be greater than zero.");
        }
    }

    public class UpdateTransportRouteDtoValidator : AbstractValidator<UpdateTransportRouteDto>
    {
        public UpdateTransportRouteDtoValidator()
        {
            RuleFor(x => x.RouteCode)
                .NotEmpty().WithMessage("Route code is required.")
                .MaximumLength(50).WithMessage("Route code cannot exceed 50 characters.");

            RuleFor(x => x.RouteName)
                .NotEmpty().WithMessage("Route name is required.")
                .MaximumLength(150).WithMessage("Route name cannot exceed 150 characters.");

            RuleFor(x => x.DistanceKm)
                .GreaterThanOrEqualTo(0).WithMessage("Distance cannot be negative.");

            RuleFor(x => x.EstimatedDurationMinutes)
                .GreaterThan(0).WithMessage("Estimated duration must be greater than zero.");
        }
    }

    // ==========================================
    // 2. PICKUP POINT VALIDATORS
    // ==========================================
    public class CreatePickupPointDtoValidator : AbstractValidator<CreatePickupPointDto>
    {
        public CreatePickupPointDtoValidator()
        {
            RuleFor(x => x.RouteId)
                .GreaterThan(0).WithMessage("RouteId is required and must be greater than zero.");

            RuleFor(x => x.PickupPointName)
                .NotEmpty().WithMessage("Pickup point name is required.")
                .MaximumLength(150).WithMessage("Pickup point name cannot exceed 150 characters.");

            RuleFor(x => x.SequenceNo)
                .GreaterThanOrEqualTo(0).WithMessage("Sequence number cannot be negative.");
        }
    }

    public class UpdatePickupPointDtoValidator : AbstractValidator<UpdatePickupPointDto>
    {
        public UpdatePickupPointDtoValidator()
        {
            RuleFor(x => x.PickupPointName)
                .NotEmpty().WithMessage("Pickup point name is required.")
                .MaximumLength(150).WithMessage("Pickup point name cannot exceed 150 characters.");

            RuleFor(x => x.SequenceNo)
                .GreaterThanOrEqualTo(0).WithMessage("Sequence number cannot be negative.");
        }
    }

    // ==========================================
    // 3. VEHICLE VALIDATORS
    // ==========================================
    public class CreateTransportVehicleDtoValidator : AbstractValidator<CreateTransportVehicleDto>
    {
        public CreateTransportVehicleDtoValidator()
        {
            RuleFor(x => x.VehicleNumber)
                .NotEmpty().WithMessage("Vehicle number is required.")
                .MaximumLength(50).WithMessage("Vehicle number cannot exceed 50 characters.");

            RuleFor(x => x.RegistrationNumber)
                .NotEmpty().WithMessage("Registration number is required.")
                .MaximumLength(50).WithMessage("Registration number cannot exceed 50 characters.");

            RuleFor(x => x.Capacity)
                .GreaterThan(0).WithMessage("Capacity must be greater than zero.")
                .LessThanOrEqualTo(150).WithMessage("Capacity cannot exceed 150 passengers.");
        }
    }

    public class UpdateTransportVehicleDtoValidator : AbstractValidator<UpdateTransportVehicleDto>
    {
        public UpdateTransportVehicleDtoValidator()
        {
            RuleFor(x => x.VehicleNumber)
                .NotEmpty().WithMessage("Vehicle number is required.")
                .MaximumLength(50).WithMessage("Vehicle number cannot exceed 50 characters.");

            RuleFor(x => x.RegistrationNumber)
                .NotEmpty().WithMessage("Registration number is required.")
                .MaximumLength(50).WithMessage("Registration number cannot exceed 50 characters.");

            RuleFor(x => x.Capacity)
                .GreaterThan(0).WithMessage("Capacity must be greater than zero.")
                .LessThanOrEqualTo(150).WithMessage("Capacity cannot exceed 150 passengers.");
        }
    }

    // ==========================================
    // 4. DRIVER VALIDATORS
    // ==========================================
    public class CreateTransportDriverDtoValidator : AbstractValidator<CreateTransportDriverDto>
    {
        public CreateTransportDriverDtoValidator()
        {
            RuleFor(x => x.LicenseNumber)
                .NotEmpty().WithMessage("Driving license number is required.")
                .MaximumLength(50).WithMessage("License number cannot exceed 50 characters.");

            RuleFor(x => x.StaffId)
                .Must((dto, staffId) => staffId.HasValue && staffId.Value > 0 || !string.IsNullOrWhiteSpace(dto.EmployeeId) || !string.IsNullOrWhiteSpace(dto.DriverName))
                .WithMessage("Driver identity requires a valid StaffId, EmployeeId, or DriverName.");
        }
    }

    public class UpdateTransportDriverDtoValidator : AbstractValidator<UpdateTransportDriverDto>
    {
        public UpdateTransportDriverDtoValidator()
        {
            RuleFor(x => x.LicenseNumber)
                .NotEmpty().WithMessage("Driving license number is required.")
                .MaximumLength(50).WithMessage("License number cannot exceed 50 characters.");
        }
    }

    // ==========================================
    // 5. ATTENDANT VALIDATORS
    // ==========================================
    public class CreateTransportAttendantDtoValidator : AbstractValidator<CreateTransportAttendantDto>
    {
        public CreateTransportAttendantDtoValidator()
        {
            RuleFor(x => x.AttendantName)
                .NotEmpty().WithMessage("Attendant name is required.")
                .MaximumLength(100).WithMessage("Attendant name cannot exceed 100 characters.");

            RuleFor(x => x.MobileNumber)
                .NotEmpty().WithMessage("Mobile number is required.")
                .Matches(@"^[0-9\+\-\s]{7,20}$").WithMessage("Invalid mobile number format.");
        }
    }

    public class UpdateTransportAttendantDtoValidator : AbstractValidator<UpdateTransportAttendantDto>
    {
        public UpdateTransportAttendantDtoValidator()
        {
            RuleFor(x => x.AttendantName)
                .NotEmpty().WithMessage("Attendant name is required.")
                .MaximumLength(100).WithMessage("Attendant name cannot exceed 100 characters.");
        }
    }

    // ==========================================
    // 6. VEHICLE ASSIGNMENT VALIDATORS
    // ==========================================
    public class CreateTransportVehicleAssignmentDtoValidator : AbstractValidator<CreateTransportVehicleAssignmentDto>
    {
        public CreateTransportVehicleAssignmentDtoValidator()
        {
            RuleFor(x => x.RouteId)
                .GreaterThan(0).WithMessage("RouteId is required.");

            RuleFor(x => x.VehicleId)
                .GreaterThan(0).WithMessage("VehicleId is required.");

            RuleFor(x => x.DriverId)
                .GreaterThan(0).WithMessage("DriverId is required.");
        }
    }

    public class UpdateTransportVehicleAssignmentDtoValidator : AbstractValidator<UpdateTransportVehicleAssignmentDto>
    {
        public UpdateTransportVehicleAssignmentDtoValidator()
        {
            RuleFor(x => x.RouteId)
                .GreaterThan(0).WithMessage("RouteId is required.");

            RuleFor(x => x.VehicleId)
                .GreaterThan(0).WithMessage("VehicleId is required.");

            RuleFor(x => x.DriverId)
                .GreaterThan(0).WithMessage("DriverId is required.");
        }
    }

    // ==========================================
    // 7. VEHICLE MAINTENANCE VALIDATORS
    // ==========================================
    public class CreateVehicleMaintenanceDtoValidator : AbstractValidator<CreateVehicleMaintenanceDto>
    {
        public CreateVehicleMaintenanceDtoValidator()
        {
            RuleFor(x => x.VehicleId)
                .GreaterThan(0).WithMessage("VehicleId is required.");

            RuleFor(x => x.ServiceType)
                .NotEmpty().WithMessage("Service type is required.")
                .MaximumLength(150).WithMessage("Service type cannot exceed 150 characters.");

            RuleFor(x => x.Cost)
                .GreaterThanOrEqualTo(0).WithMessage("Maintenance cost cannot be negative.");

            RuleFor(x => x.ServiceDate)
                .LessThanOrEqualTo(DateTime.UtcNow.AddDays(1)).WithMessage("Service date cannot be in the future.");
        }
    }

    public class UpdateVehicleMaintenanceDtoValidator : AbstractValidator<UpdateVehicleMaintenanceDto>
    {
        public UpdateVehicleMaintenanceDtoValidator()
        {
            RuleFor(x => x.VehicleId)
                .GreaterThan(0).WithMessage("VehicleId is required.");

            RuleFor(x => x.Cost)
                .GreaterThanOrEqualTo(0).WithMessage("Maintenance cost cannot be negative.");
        }
    }

    // ==========================================
    // 8. STUDENT TRANSPORT ASSIGNMENT VALIDATORS
    // ==========================================
    public class CreateStudentTransportAssignmentDtoValidator : AbstractValidator<CreateStudentTransportAssignmentDto>
    {
        public CreateStudentTransportAssignmentDtoValidator()
        {
            RuleFor(x => x.RouteId)
                .GreaterThan(0).WithMessage("RouteId is required.");

            RuleFor(x => x.PickupPointId)
                .GreaterThan(0).WithMessage("PickupPointId is required.");

            RuleFor(x => x.AdmissionNo)
                .NotEmpty().WithMessage("Admission number is required.");
        }
    }

    public class UpdateStudentTransportAssignmentDtoValidator : AbstractValidator<UpdateStudentTransportAssignmentDto>
    {
        public UpdateStudentTransportAssignmentDtoValidator()
        {
            RuleFor(x => x.RouteId)
                .GreaterThan(0).WithMessage("RouteId is required.");

            RuleFor(x => x.PickupPointId)
                .GreaterThan(0).WithMessage("PickupPointId is required.");
        }
    }
}
