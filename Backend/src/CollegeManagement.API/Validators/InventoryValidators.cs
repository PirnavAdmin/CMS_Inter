using System;
using CollegeManagement.API.DTOs.Inventory;
using FluentValidation;

namespace CollegeManagement.API.Validators.Inventory
{
    public class CreateItemRequestValidator : AbstractValidator<CreateItemRequest>
    {
        public CreateItemRequestValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Item Name is required.")
                .MaximumLength(150).WithMessage("Item Name cannot exceed 150 characters.");

            RuleFor(x => x.Code)
                .NotEmpty().WithMessage("Item Code is required.")
                .MaximumLength(50).WithMessage("Item Code cannot exceed 50 characters.");

            RuleFor(x => x.CategoryId)
                .GreaterThan(0).WithMessage("Choose an active category.");

            RuleFor(x => x.Unit)
                .NotEmpty().WithMessage("Unit of Measurement is required.")
                .MaximumLength(50).WithMessage("Unit cannot exceed 50 characters.");

            RuleFor(x => x.OpeningQuantity)
                .GreaterThanOrEqualTo(0).WithMessage("Opening quantity must be non-negative.");

            RuleFor(x => x.UnitCost)
                .GreaterThanOrEqualTo(0).WithMessage("Unit cost must be non-negative.");

            RuleFor(x => x.MinStock)
                .GreaterThanOrEqualTo(0).WithMessage("Minimum stock must be non-negative.");

            RuleFor(x => x)
                .Must(x => !x.MaxStock.HasValue || x.MaxStock.Value >= x.MinStock)
                .WithMessage("Maximum stock must be at least minimum stock.")
                .When(x => x.MaxStock.HasValue);
        }
    }

    public class UpdateItemRequestValidator : AbstractValidator<UpdateItemRequest>
    {
        public UpdateItemRequestValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Item Name is required.")
                .MaximumLength(150).WithMessage("Item Name cannot exceed 150 characters.");

            RuleFor(x => x.Code)
                .NotEmpty().WithMessage("Item Code is required.")
                .MaximumLength(50).WithMessage("Item Code cannot exceed 50 characters.");

            RuleFor(x => x.CategoryId)
                .GreaterThan(0).WithMessage("Choose an active category.");

            RuleFor(x => x.Unit)
                .NotEmpty().WithMessage("Unit of Measurement is required.")
                .MaximumLength(50).WithMessage("Unit cannot exceed 50 characters.");

            RuleFor(x => x.MinStock)
                .GreaterThanOrEqualTo(0).WithMessage("Minimum stock must be non-negative.");

            RuleFor(x => x)
                .Must(x => !x.MaxStock.HasValue || x.MaxStock.Value >= x.MinStock)
                .WithMessage("Maximum stock must be at least minimum stock.")
                .When(x => x.MaxStock.HasValue);
        }
    }

    public class CreateCategoryRequestValidator : AbstractValidator<CreateCategoryRequest>
    {
        public CreateCategoryRequestValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Category Name is required.")
                .MaximumLength(100).WithMessage("Category Name cannot exceed 100 characters.");

            RuleFor(x => x.Code)
                .NotEmpty().WithMessage("Category Code is required.")
                .MaximumLength(50).WithMessage("Category Code cannot exceed 50 characters.");

            RuleFor(x => x.Department)
                .MaximumLength(100).WithMessage("Department cannot exceed 100 characters.");

            RuleFor(x => x.Status)
                .Must(s => string.IsNullOrEmpty(s) || s == "Active" || s == "Inactive")
                .WithMessage("Status must be either 'Active' or 'Inactive'.");
        }
    }

    public class CreateSupplierRequestValidator : AbstractValidator<CreateSupplierRequest>
    {
        public CreateSupplierRequestValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Supplier Name is required.")
                .MaximumLength(150).WithMessage("Supplier Name cannot exceed 150 characters.");

            RuleFor(x => x.Code)
                .NotEmpty().WithMessage("Supplier Code is required.")
                .MaximumLength(50).WithMessage("Supplier Code cannot exceed 50 characters.");

            RuleFor(x => x.ContactPerson)
                .NotEmpty().WithMessage("Contact Person is required.")
                .MaximumLength(100).WithMessage("Contact Person cannot exceed 100 characters.");

            RuleFor(x => x.Phone)
                .NotEmpty().WithMessage("Phone is required.")
                .Matches(@"^\+?[\d\s()-]{10,16}$").WithMessage("Enter a valid phone number.");

            RuleFor(x => x.AlternatePhone)
                .Matches(@"^\+?[\d\s()-]{10,16}$").WithMessage("Enter a valid phone number.")
                .When(x => !string.IsNullOrWhiteSpace(x.AlternatePhone));

            RuleFor(x => x.Email)
                .EmailAddress().WithMessage("Enter a valid email address.")
                .When(x => !string.IsNullOrWhiteSpace(x.Email));
        }
    }

    public class PostMovementRequestValidator : AbstractValidator<PostMovementRequest>
    {
        public PostMovementRequestValidator()
        {
            RuleFor(x => x.ItemId)
                .GreaterThan(0).WithMessage("Choose an active inventory item.");

            RuleFor(x => x.MovementType)
                .NotEmpty().WithMessage("Movement Type is required.")
                .Must(t => t == "Stock In" || t == "Stock Out")
                .WithMessage("Movement Type must be 'Stock In' or 'Stock Out'.");

            RuleFor(x => x.Quantity)
                .GreaterThan(0).WithMessage("Quantity must be greater than zero.");

            RuleFor(x => x.UnitCost)
                .GreaterThanOrEqualTo(0).WithMessage("Unit cost must be non-negative.");

            RuleFor(x => x.TransactionDate)
                .Must(d => d.Date <= DateTime.UtcNow.Date)
                .WithMessage("Transaction date cannot be in the future.");

            RuleFor(x => x)
                .Must(x => !x.IsReturnable || (x.ExpectedReturnDate.HasValue && x.ExpectedReturnDate.Value.Date >= x.TransactionDate.Date))
                .WithMessage("Expected return date cannot precede issue date.")
                .When(x => x.MovementType == "Stock Out" && x.IsReturnable);
        }
    }

    public class ReportRequestValidator : AbstractValidator<ReportRequest>
    {
        public ReportRequestValidator()
        {
            RuleFor(x => x.ReportType)
                .NotEmpty().WithMessage("Report Type is required.");

            RuleFor(x => x)
                .Must(x => !x.DateFrom.HasValue || !x.DateTo.HasValue || x.DateFrom.Value.Date <= x.DateTo.Value.Date)
                .WithMessage("Date from cannot be later than date to.")
                .When(x => x.DateFrom.HasValue && x.DateTo.HasValue);
        }
    }
}
