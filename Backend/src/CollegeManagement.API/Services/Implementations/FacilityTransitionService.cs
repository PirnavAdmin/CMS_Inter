using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Fees;
using CollegeManagement.API.Models;
using CollegeManagement.API.Models.Fee;
using CollegeManagement.API.Services.Interfaces;
using Dapper;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging;

namespace CollegeManagement.API.Services.Implementations
{
    public class FacilityTransitionService : IFacilityTransitionService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<FacilityTransitionService> _logger;

        public FacilityTransitionService(AppDbContext context, ILogger<FacilityTransitionService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<FacilityTransitionPreviewDto> PreviewHostelToTransportTransitionAsync(
            int studentId,
            long pickupPointId,
            DateTime? effectiveDate)
        {
            var student = await _context.Students
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.StudentId == studentId);

            if (student == null)
                throw new KeyNotFoundException($"Student with ID {studentId} was not found.");

            var pickupPoint = await _context.PickupPoints
                .AsNoTracking()
                .Include(p => p.TransportRoute)
                .FirstOrDefaultAsync(p => p.PickupPointId == pickupPointId && !p.IsDeleted);

            if (pickupPoint == null)
                throw new KeyNotFoundException($"Pickup point with ID {pickupPointId} was not found.");

            var transitionDate = effectiveDate ?? DateTime.UtcNow;

            // 1. Fetch active hostel allocation
            var dbConn = _context.Database.GetDbConnection();
            var activeHostel = await dbConn.QueryFirstOrDefaultAsync<dynamic>(@"
                SELECT AllocationId, StudentId, HostelId, RoomId, BedId, JoiningDate, Status 
                FROM hostel_student_allocations 
                WHERE StudentId = @sId AND Status = 'Active' 
                ORDER BY AllocationId DESC LIMIT 1",
                new { sId = studentId });

            DateTime joiningDate = activeHostel?.JoiningDate != null 
                ? (DateTime)activeHostel.JoiningDate 
                : (student.AdmissionDate != default ? student.AdmissionDate : new DateTime(transitionDate.Year, 6, 1));

            // 2. Calculate months stayed in hostel (Academic year assumed to be 10 active months: June to March)
            int totalAcademicMonths = 10;
            int diffMonths = ((transitionDate.Year - joiningDate.Year) * 12) + transitionDate.Month - joiningDate.Month;
            if (transitionDate.Day > 5)
            {
                diffMonths += 1; // Month started count
            }
            int monthsUsedHostel = Math.Clamp(diffMonths, 1, totalAcademicMonths);
            int remainingTransportMonths = Math.Max(1, totalAcademicMonths - monthsUsedHostel);

            // 3. Fetch active StudentFee
            var studentFee = await _context.StudentFees
                .AsNoTracking()
                .Include(sf => sf.Components)
                    .ThenInclude(c => c.FeeStructureComponent)
                        .ThenInclude(fsc => fsc.FeeType)
                .Include(sf => sf.PaymentPlans)
                    .ThenInclude(p => p.Installments)
                .Where(sf => sf.StudentId == studentId)
                .OrderByDescending(sf => sf.StudentFeeId)
                .FirstOrDefaultAsync();

            decimal originalAnnualHostelFee = 0m;
            decimal proratedHostelFee = 0m;
            decimal hostelPaidAmount = 0m;
            decimal excessHostelCredit = 0m;

            if (studentFee?.Components != null)
            {
                var hostelComp = studentFee.Components.FirstOrDefault(c =>
                    c.FeeStructureComponent?.FeeType?.Category?.Equals("Hostel", StringComparison.OrdinalIgnoreCase) == true ||
                    c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Hostel", StringComparison.OrdinalIgnoreCase) == true);

                if (hostelComp != null)
                {
                    originalAnnualHostelFee = hostelComp.Amount;
                    decimal monthlyHostelRate = originalAnnualHostelFee > 0 ? Math.Round(originalAnnualHostelFee / totalAcademicMonths, 2) : 0m;
                    proratedHostelFee = Math.Min(originalAnnualHostelFee, monthlyHostelRate * monthsUsedHostel);
                    hostelPaidAmount = hostelComp.PaidAmount;
                    excessHostelCredit = Math.Max(0m, hostelPaidAmount - proratedHostelFee);
                }
            }

            // 4. Calculate Transport Fee
            decimal monthlyTransportFee = pickupPoint.MonthlyFee > 0 ? pickupPoint.MonthlyFee : 1200m;
            decimal proratedTransportFee = monthlyTransportFee * remainingTransportMonths;
            decimal creditAppliedToTransport = Math.Min(excessHostelCredit, proratedTransportFee);
            decimal netTransportDue = Math.Max(0m, proratedTransportFee - creditAppliedToTransport);

            // 5. Overall Impact
            decimal previousTotalFee = studentFee?.TotalAmount ?? 0m;
            decimal previousPaid = studentFee?.PaidAmount ?? 0m;
            decimal previousBalance = studentFee?.BalanceAmount ?? 0m;

            decimal feeAdjustment = (proratedHostelFee - originalAnnualHostelFee) + proratedTransportFee;
            decimal newTotalFee = Math.Max(0m, previousTotalFee + feeAdjustment);
            decimal newBalance = Math.Max(0m, newTotalFee - previousPaid);

            var preview = new FacilityTransitionPreviewDto
            {
                StudentId = studentId,
                AdmissionNo = student.AdmissionNo ?? string.Empty,
                StudentName = student.StudentName ?? string.Empty,
                CurrentStudentType = student.StudentType ?? "Hosteller",

                FromFacility = "Hostel",
                HostelJoiningDate = joiningDate,
                TransitionDate = transitionDate,
                MonthsUsedHostel = monthsUsedHostel,
                OriginalAnnualHostelFee = originalAnnualHostelFee,
                ProratedHostelFee = proratedHostelFee,
                DiscontinuedHostelFeeSavings = Math.Max(0m, originalAnnualHostelFee - proratedHostelFee),
                HostelPaidAmount = hostelPaidAmount,
                ExcessHostelCredit = excessHostelCredit,

                ToFacility = "Transport",
                RouteId = pickupPoint.RouteId,
                RouteName = pickupPoint.TransportRoute?.RouteName ?? "Bus Route",
                PickupPointId = pickupPoint.PickupPointId,
                PickupPointName = pickupPoint.PickupPointName ?? "Stop",
                MonthlyTransportFee = monthlyTransportFee,
                RemainingTransportMonths = remainingTransportMonths,
                ProratedTransportFee = proratedTransportFee,
                CreditAppliedToTransport = creditAppliedToTransport,
                NetTransportDue = netTransportDue,

                PreviousTotalFee = previousTotalFee,
                NewTotalFee = newTotalFee,
                TotalPaidAmount = previousPaid,
                PreviousBalance = previousBalance,
                NewBalance = newBalance
            };

            // 6. Installment Preview
            var activePlan = studentFee?.PaymentPlans?.FirstOrDefault(p => p.IsActive);
            if (activePlan?.Installments != null && activePlan.Installments.Any())
            {
                var unpaidInstallments = activePlan.Installments
                    .Where(i => i.Status != "Paid" && i.BalanceAmount > 0)
                    .OrderBy(i => i.InstallmentNumber)
                    .ToList();

                decimal perInstallmentShare = unpaidInstallments.Count > 0
                    ? Math.Round(newBalance / unpaidInstallments.Count, 2)
                    : 0m;

                decimal allocatedTotal = 0m;
                for (int i = 0; i < unpaidInstallments.Count; i++)
                {
                    var inst = unpaidInstallments[i];
                    decimal instAmount = (i == unpaidInstallments.Count - 1)
                        ? (newBalance - allocatedTotal)
                        : perInstallmentShare;
                    allocatedTotal += instAmount;

                    preview.InstallmentsPreview.Add(new FacilityTransitionInstallmentPreviewDto
                    {
                        InstallmentNumber = inst.InstallmentNumber,
                        DueDate = inst.DueDate,
                        PreviousAmount = inst.Amount,
                        NewAmount = instAmount,
                        PaidAmount = inst.PaidAmount,
                        NewBalance = Math.Max(0m, instAmount - inst.PaidAmount),
                        Status = (instAmount - inst.PaidAmount) == 0 ? "Paid" : "Pending"
                    });
                }
            }

            return preview;
        }

        public async Task<FacilityTransitionResultDto> ExecuteHostelToTransportTransitionAsync(
            FacilityTransitionRequestDto request,
            string performedBy = "System")
        {
            var preview = await PreviewHostelToTransportTransitionAsync(
                request.StudentId,
                request.PickupPointId,
                request.EffectiveDate);

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var transitionDate = request.EffectiveDate ?? DateTime.UtcNow;

                // 1. Vacate active hostel allocation
                var dbConn = _context.Database.GetDbConnection();
                var activeAllocation = await dbConn.QueryFirstOrDefaultAsync<dynamic>(@"
                    SELECT AllocationId, BedId FROM hostel_student_allocations 
                    WHERE StudentId = @sId AND Status = 'Active' 
                    ORDER BY AllocationId DESC LIMIT 1",
                    new { sId = request.StudentId });

                if (activeAllocation != null)
                {
                    int allocationId = (int)activeAllocation.AllocationId;
                    int bedId = (int)activeAllocation.BedId;

                    await dbConn.ExecuteAsync(@"
                        UPDATE hostel_student_allocations 
                        SET Status = 'Vacated', UpdatedAt = NOW(), Remarks = CONCAT(COALESCE(Remarks, ''), ' [Switched to Bus Transport on ', CURDATE(), ']') 
                        WHERE AllocationId = @allocId",
                        new { allocId = allocationId }, transaction.GetDbTransaction());

                    await dbConn.ExecuteAsync(@"
                        UPDATE hostel_beds 
                        SET BedStatus = 'Available', UpdatedAt = NOW() 
                        WHERE BedId = @bId",
                        new { bId = bedId }, transaction.GetDbTransaction());
                }

                // 2. Deactivate any prior transport assignments & activate new one
                var priorTransport = await _context.StudentTransportAssignments
                    .Where(x => x.StudentId == request.StudentId && x.Status && !x.IsDeleted)
                    .ToListAsync();

                foreach (var pt in priorTransport)
                {
                    pt.Status = false;
                    pt.EffectiveTo = transitionDate;
                }

                var pickupPoint = await _context.PickupPoints.FindAsync(request.PickupPointId);

                var newTransport = new StudentTransportAssignment
                {
                    StudentId = request.StudentId,
                    AdmissionNo = preview.AdmissionNo,
                    RouteId = pickupPoint?.RouteId,
                    PickupPointId = request.PickupPointId,
                    VehicleAssignmentId = request.VehicleAssignmentId,
                    EffectiveFrom = transitionDate,
                    Status = true,
                    TransportType = "Both",
                    Remarks = $"Transitioned from Hostel on {transitionDate:yyyy-MM-dd}. {request.Remarks}".Trim()
                };
                _context.StudentTransportAssignments.Add(newTransport);

                // 3. Sync Student Master Record
                var student = await _context.Students.FirstOrDefaultAsync(s => s.StudentId == request.StudentId);
                if (student != null)
                {
                    student.StudentType = "Day Scholar";
                    student.TransportRequired = true;
                    student.RouteId = (int?)pickupPoint?.RouteId;
                    student.PickupPointId = (int)request.PickupPointId;
                    student.BusType = "Bus";

                    student.HostelId = null;
                    student.HostelBlock = null;
                    student.RoomId = null;
                    student.HostelRoom = null;
                    student.BedId = null;
                    student.HostelBed = null;
                    student.UpdatedAt = DateTime.UtcNow;
                }

                // 4. Update StudentFee & StudentFeeComponents
                var studentFee = await _context.StudentFees
                    .Include(sf => sf.Components)
                        .ThenInclude(c => c.FeeStructureComponent)
                            .ThenInclude(fsc => fsc.FeeType)
                    .Include(sf => sf.PaymentPlans)
                        .ThenInclude(pp => pp.Installments)
                    .Where(sf => sf.StudentId == request.StudentId)
                    .OrderByDescending(sf => sf.StudentFeeId)
                    .FirstOrDefaultAsync();

                if (studentFee != null)
                {
                    // A. Update Hostel Component (Prorate & stop further charges)
                    var hostelComp = studentFee.Components.FirstOrDefault(c =>
                        c.FeeStructureComponent?.FeeType?.Category?.Equals("Hostel", StringComparison.OrdinalIgnoreCase) == true ||
                        c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Hostel", StringComparison.OrdinalIgnoreCase) == true);

                    if (hostelComp != null)
                    {
                        hostelComp.Amount = preview.ProratedHostelFee;
                        hostelComp.PayableAmount = Math.Max(0m, preview.ProratedHostelFee - hostelComp.ConcessionAmount);
                        hostelComp.PaidAmount = Math.Min(hostelComp.PaidAmount, hostelComp.PayableAmount);
                        hostelComp.BalanceAmount = Math.Max(0m, hostelComp.PayableAmount - hostelComp.PaidAmount);
                        hostelComp.Status = hostelComp.BalanceAmount == 0 ? "Paid" : "Partial";
                    }

                    // B. Find or add Transport Component
                    var transportComp = studentFee.Components.FirstOrDefault(c =>
                        c.FeeStructureComponent?.FeeType?.Category?.Equals("Transport", StringComparison.OrdinalIgnoreCase) == true ||
                        c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Transport", StringComparison.OrdinalIgnoreCase) == true ||
                        c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Bus", StringComparison.OrdinalIgnoreCase) == true);

                    if (transportComp != null)
                    {
                        transportComp.Amount = preview.ProratedTransportFee;
                        transportComp.PayableAmount = preview.ProratedTransportFee;
                        transportComp.PaidAmount = preview.CreditAppliedToTransport;
                        transportComp.BalanceAmount = preview.NetTransportDue;
                        transportComp.Status = preview.NetTransportDue == 0 ? "Paid" : (preview.CreditAppliedToTransport > 0 ? "Partial" : "Pending");
                    }
                    else
                    {
                        // Ensure FeeType exists
                        var transportFeeType = await _context.FeeTypes
                            .FirstOrDefaultAsync(ft => ft.Category == "Transport" || ft.FeeTypeName.Contains("Transport"));

                        if (transportFeeType == null)
                        {
                            transportFeeType = new FeeType
                            {
                                FeeTypeCode = "FEE_TRANS",
                                FeeTypeName = "Transport / Bus Fee",
                                Category = "Transport",
                                IsActive = true,
                                CreatedAt = DateTime.UtcNow
                            };
                            _context.FeeTypes.Add(transportFeeType);
                            await _context.SaveChangesAsync();
                        }

                        // Ensure FeeStructureComponent exists
                        var fsc = await _context.FeeStructureComponents
                            .FirstOrDefaultAsync(c => c.FeeStructureId == studentFee.FeeStructureId && c.FeeTypeId == transportFeeType.FeeTypeId);

                        if (fsc == null)
                        {
                            fsc = new FeeStructureComponent
                            {
                                FeeStructureId = studentFee.FeeStructureId,
                                FeeTypeId = transportFeeType.FeeTypeId,
                                Amount = preview.ProratedTransportFee,
                                IsMandatory = false,
                                IsActive = true,
                                CreatedAt = DateTime.UtcNow
                            };
                            _context.FeeStructureComponents.Add(fsc);
                            await _context.SaveChangesAsync();
                        }

                        // Add StudentFeeComponent
                        _context.StudentFeeComponents.Add(new StudentFeeComponent
                        {
                            StudentFeeId = studentFee.StudentFeeId,
                            FeeStructureComponentId = fsc.FeeStructureComponentId,
                            Amount = preview.ProratedTransportFee,
                            ConcessionAmount = 0m,
                            PayableAmount = preview.ProratedTransportFee,
                            PaidAmount = preview.CreditAppliedToTransport,
                            BalanceAmount = preview.NetTransportDue,
                            Status = preview.NetTransportDue == 0 ? "Paid" : (preview.CreditAppliedToTransport > 0 ? "Partial" : "Pending")
                        });
                    }

                    // C. Update StudentFee master totals
                    studentFee.TotalAmount = preview.NewTotalFee;
                    studentFee.PayableAmount = Math.Max(0m, preview.NewTotalFee - studentFee.ConcessionAmount);
                    studentFee.BalanceAmount = preview.NewBalance;
                    studentFee.Status = preview.NewBalance == 0 ? "Paid" : (studentFee.PaidAmount > 0 ? "Partial" : "Pending");
                    studentFee.UpdatedAt = DateTime.UtcNow;

                    // D. Recalculate Installments
                    var activePlan = studentFee.PaymentPlans?.FirstOrDefault(p => p.IsActive);
                    if (activePlan?.Installments != null && activePlan.Installments.Any())
                    {
                        var unpaid = activePlan.Installments
                            .Where(i => i.Status != "Paid" && i.BalanceAmount > 0)
                            .OrderBy(i => i.InstallmentNumber)
                            .ToList();

                        if (unpaid.Any())
                        {
                            decimal share = Math.Round(preview.NewBalance / unpaid.Count, 2);
                            decimal allocated = 0m;
                            for (int i = 0; i < unpaid.Count; i++)
                            {
                                decimal instAmt = (i == unpaid.Count - 1)
                                    ? (preview.NewBalance - allocated)
                                    : share;
                                allocated += instAmt;

                                unpaid[i].Amount = instAmt;
                                unpaid[i].BalanceAmount = Math.Max(0m, instAmt - unpaid[i].PaidAmount);
                                unpaid[i].Status = unpaid[i].BalanceAmount == 0 ? "Paid" : "Pending";
                            }
                        }
                    }
                }

                // 5. Record History
                var history = new FacilityTransitionHistory
                {
                    StudentId = request.StudentId,
                    FromFacility = "Hostel",
                    ToFacility = "Transport",
                    TransitionDate = transitionDate,
                    MonthsUsedFromFacility = preview.MonthsUsedHostel,
                    ProratedFromFee = preview.ProratedHostelFee,
                    MonthsUsedToFacility = preview.RemainingTransportMonths,
                    ProratedToFee = preview.ProratedTransportFee,
                    ExcessCreditTransferred = preview.CreditAppliedToTransport,
                    PreviousTotalFee = preview.PreviousTotalFee,
                    NewTotalFee = preview.NewTotalFee,
                    PreviousBalance = preview.PreviousBalance,
                    NewBalance = preview.NewBalance,
                    Remarks = request.Remarks,
                    PerformedBy = performedBy,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Set<FacilityTransitionHistory>().Add(history);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Successfully completed facility transition for Student #{StudentId} from Hostel to Transport.", request.StudentId);

                return new FacilityTransitionResultDto
                {
                    Success = true,
                    Message = "Facility transition from Hostel to Transport completed successfully. Prorated fees and excess payments updated.",
                    TransitionId = history.TransitionId,
                    Breakdown = preview
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to execute facility transition for Student #{StudentId}", request.StudentId);
                throw;
            }
        }

        public async Task<TransportToHostelPreviewDto> PreviewTransportToHostelTransitionAsync(
            int studentId,
            int hostelId,
            int roomId,
            int bedId,
            DateTime? effectiveDate,
            decimal? customAnnualFee = null)
        {
            var student = await _context.Students
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.StudentId == studentId);

            if (student == null)
                throw new KeyNotFoundException($"Student with ID {studentId} was not found.");

            var dbConn = _context.Database.GetDbConnection();
            var bedInfo = await dbConn.QueryFirstOrDefaultAsync<dynamic>(@"
                SELECT 
                    b.BedId, b.BedNumber, b.BedStatus,
                    rm.RoomId, rm.RoomNumber, rm.RoomTypeId,
                    hb.HostelId, hb.HostelName
                FROM hostel_beds b
                JOIN room_masters rm ON b.RoomId = rm.RoomId
                JOIN hostel_blocks hb ON rm.HostelId = hb.HostelId
                WHERE b.BedId = @bId AND rm.RoomId = @rId AND hb.HostelId = @hId",
                new { bId = bedId, rId = roomId, hId = hostelId });

            if (bedInfo == null)
                throw new KeyNotFoundException($"Specified Bed #{bedId}, Room #{roomId}, or Hostel #{hostelId} was not found.");

            var transitionDate = effectiveDate ?? DateTime.UtcNow;

            // 1. Fetch active transport assignment to determine usage duration
            var activeTransport = await _context.StudentTransportAssignments
                .AsNoTracking()
                .Where(t => t.StudentId == studentId && t.Status && !t.IsDeleted)
                .OrderByDescending(t => t.StudentTransportAssignmentId)
                .FirstOrDefaultAsync();

            DateTime transportStartDate = activeTransport?.EffectiveFrom 
                ?? (student.AdmissionDate != default ? student.AdmissionDate : new DateTime(transitionDate.Year, 6, 1));

            // 2. Calculate months used for transport (Academic year assumed 10 months: June to March)
            int totalAcademicMonths = 10;
            int diffMonths = ((transitionDate.Year - transportStartDate.Year) * 12) + transitionDate.Month - transportStartDate.Month;
            if (transitionDate.Day > 5)
            {
                diffMonths += 1;
            }
            int monthsUsedTransport = Math.Clamp(diffMonths, 1, totalAcademicMonths);
            int remainingHostelMonths = Math.Max(1, totalAcademicMonths - monthsUsedTransport);

            // 3. Fetch active StudentFee
            var studentFee = await _context.StudentFees
                .AsNoTracking()
                .Include(sf => sf.Components)
                    .ThenInclude(c => c.FeeStructureComponent)
                        .ThenInclude(fsc => fsc.FeeType)
                .Include(sf => sf.PaymentPlans)
                    .ThenInclude(p => p.Installments)
                .Where(sf => sf.StudentId == studentId)
                .OrderByDescending(sf => sf.StudentFeeId)
                .FirstOrDefaultAsync();

            decimal originalAnnualTransportFee = 0m;
            decimal proratedTransportFee = 0m;
            decimal transportPaidAmount = 0m;
            decimal excessTransportCredit = 0m;

            if (studentFee?.Components != null)
            {
                var transportComp = studentFee.Components.FirstOrDefault(c =>
                    c.FeeStructureComponent?.FeeType?.Category?.Equals("Transport", StringComparison.OrdinalIgnoreCase) == true ||
                    c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Transport", StringComparison.OrdinalIgnoreCase) == true ||
                    c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Bus", StringComparison.OrdinalIgnoreCase) == true);

                if (transportComp != null)
                {
                    originalAnnualTransportFee = transportComp.Amount;
                    decimal monthlyTransportRate = originalAnnualTransportFee > 0
                        ? Math.Round(originalAnnualTransportFee / totalAcademicMonths, 2)
                        : 0m;
                    proratedTransportFee = Math.Min(originalAnnualTransportFee, monthlyTransportRate * monthsUsedTransport);
                    transportPaidAmount = transportComp.PaidAmount;
                    excessTransportCredit = Math.Max(0m, transportPaidAmount - proratedTransportFee);
                }
            }

            // 4. Calculate Annual & Prorated Hostel Fee
            decimal annualHostelFee = 0m;
            if (customAnnualFee.HasValue && customAnnualFee.Value > 0)
            {
                annualHostelFee = customAnnualFee.Value;
            }
            else if (studentFee?.FeeStructureId > 0)
            {
                var hostelFsc = await _context.FeeStructureComponents
                    .AsNoTracking()
                    .Include(c => c.FeeType)
                    .FirstOrDefaultAsync(c => c.FeeStructureId == studentFee.FeeStructureId &&
                        (c.FeeType.Category == "Hostel" || c.FeeType.FeeTypeName.Contains("Hostel")));

                if (hostelFsc != null && hostelFsc.Amount > 0)
                {
                    annualHostelFee = hostelFsc.Amount;
                }
            }

            if (annualHostelFee == 0m)
            {
                try
                {
                    var feeConfig = await dbConn.QueryFirstOrDefaultAsync<dynamic>(@"
                        SELECT HostelFeeAmount FROM hostel_fee_configs 
                        WHERE HostelId = @hId AND Status = 'Active' 
                        ORDER BY FeeConfigId DESC LIMIT 1",
                        new { hId = hostelId });

                    if (feeConfig != null && feeConfig.HostelFeeAmount > 0)
                    {
                        annualHostelFee = (decimal)feeConfig.HostelFeeAmount;
                    }
                }
                catch
                {
                    // Ignore if table or proc is absent
                }
            }

            if (annualHostelFee == 0m)
            {
                annualHostelFee = 60000m; // Default annual hostel baseline
            }

            decimal monthlyHostelRate = Math.Round(annualHostelFee / totalAcademicMonths, 2);
            decimal proratedHostelFee = monthlyHostelRate * remainingHostelMonths;
            decimal creditAppliedToHostel = Math.Min(excessTransportCredit, proratedHostelFee);
            decimal netHostelDue = Math.Max(0m, proratedHostelFee - creditAppliedToHostel);

            // 5. Overall Impact
            decimal previousTotalFee = studentFee?.TotalAmount ?? 0m;
            decimal previousPaid = studentFee?.PaidAmount ?? 0m;
            decimal previousBalance = studentFee?.BalanceAmount ?? 0m;

            decimal feeAdjustment = (proratedTransportFee - originalAnnualTransportFee) + proratedHostelFee;
            decimal newTotalFee = Math.Max(0m, previousTotalFee + feeAdjustment);
            decimal newBalance = Math.Max(0m, newTotalFee - previousPaid);

            var preview = new TransportToHostelPreviewDto
            {
                StudentId = studentId,
                AdmissionNo = student.AdmissionNo ?? string.Empty,
                StudentName = student.StudentName ?? string.Empty,
                CurrentStudentType = student.StudentType ?? "Day Scholar",

                FromFacility = "Transport",
                TransportStartDate = transportStartDate,
                TransitionDate = transitionDate,
                MonthsUsedTransport = monthsUsedTransport,
                OriginalAnnualTransportFee = originalAnnualTransportFee,
                ProratedTransportFee = proratedTransportFee,
                DiscontinuedTransportFeeSavings = Math.Max(0m, originalAnnualTransportFee - proratedTransportFee),
                TransportPaidAmount = transportPaidAmount,
                ExcessTransportCredit = excessTransportCredit,

                ToFacility = "Hostel",
                HostelId = hostelId,
                HostelName = (string)bedInfo.HostelName ?? "Hostel Block",
                RoomId = roomId,
                RoomNumber = (string)bedInfo.RoomNumber ?? "Room",
                BedId = bedId,
                BedNumber = (string)bedInfo.BedNumber ?? "Bed",
                AnnualHostelFee = annualHostelFee,
                MonthlyHostelRate = monthlyHostelRate,
                RemainingHostelMonths = remainingHostelMonths,
                ProratedHostelFee = proratedHostelFee,
                CreditAppliedToHostel = creditAppliedToHostel,
                NetHostelDue = netHostelDue,

                PreviousTotalFee = previousTotalFee,
                NewTotalFee = newTotalFee,
                TotalPaidAmount = previousPaid,
                PreviousBalance = previousBalance,
                NewBalance = newBalance
            };

            // 6. Installments Preview
            var activePlan = studentFee?.PaymentPlans?.FirstOrDefault(p => p.IsActive);
            if (activePlan?.Installments != null && activePlan.Installments.Any())
            {
                var unpaidInstallments = activePlan.Installments
                    .Where(i => i.Status != "Paid" && i.BalanceAmount > 0)
                    .OrderBy(i => i.InstallmentNumber)
                    .ToList();

                decimal perInstallmentShare = unpaidInstallments.Count > 0
                    ? Math.Round(newBalance / unpaidInstallments.Count, 2)
                    : 0m;

                decimal allocatedTotal = 0m;
                for (int i = 0; i < unpaidInstallments.Count; i++)
                {
                    var inst = unpaidInstallments[i];
                    decimal instAmount = (i == unpaidInstallments.Count - 1)
                        ? (newBalance - allocatedTotal)
                        : perInstallmentShare;
                    allocatedTotal += instAmount;

                    preview.InstallmentsPreview.Add(new FacilityTransitionInstallmentPreviewDto
                    {
                        InstallmentNumber = inst.InstallmentNumber,
                        DueDate = inst.DueDate,
                        PreviousAmount = inst.Amount,
                        NewAmount = instAmount,
                        PaidAmount = inst.PaidAmount,
                        NewBalance = Math.Max(0m, instAmount - inst.PaidAmount),
                        Status = (instAmount - inst.PaidAmount) == 0 ? "Paid" : "Pending"
                    });
                }
            }

            return preview;
        }

        public async Task<TransportToHostelResultDto> ExecuteTransportToHostelTransitionAsync(
            TransportToHostelRequestDto request,
            string performedBy = "System")
        {
            var preview = await PreviewTransportToHostelTransitionAsync(
                request.StudentId,
                request.HostelId,
                request.RoomId,
                request.BedId,
                request.EffectiveDate,
                request.CustomAnnualHostelFee);

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var transitionDate = request.EffectiveDate ?? DateTime.UtcNow;
                var dbConn = _context.Database.GetDbConnection();

                // 1. Verify Bed Availability
                var bedStatus = await dbConn.QueryFirstOrDefaultAsync<string>(@"
                    SELECT BedStatus FROM hostel_beds WHERE BedId = @bId",
                    new { bId = request.BedId }, transaction.GetDbTransaction());

                if (bedStatus == null)
                    throw new KeyNotFoundException($"Bed with ID {request.BedId} was not found.");

                if (!string.Equals(bedStatus, "Available", StringComparison.OrdinalIgnoreCase))
                    throw new InvalidOperationException($"Selected Bed #{request.BedId} is currently '{bedStatus}' and cannot be allocated.");

                // 2. Mark Bed as Occupied & create active allocation
                await dbConn.ExecuteAsync(@"
                    UPDATE hostel_beds 
                    SET BedStatus = 'Occupied', UpdatedAt = NOW() 
                    WHERE BedId = @bId",
                    new { bId = request.BedId }, transaction.GetDbTransaction());

                await dbConn.ExecuteAsync(@"
                    INSERT INTO hostel_student_allocations 
                        (StudentId, HostelId, RoomId, BedId, JoiningDate, Status, Remarks, CreatedAt)
                    VALUES 
                        (@sId, @hId, @rId, @bId, @jDate, 'Active', @remarks, NOW())",
                    new 
                    { 
                        sId = request.StudentId, 
                        hId = request.HostelId, 
                        rId = request.RoomId, 
                        bId = request.BedId, 
                        jDate = transitionDate, 
                        remarks = $"Transitioned from Bus Transport on {transitionDate:yyyy-MM-dd}. {request.Remarks}".Trim() 
                    }, transaction.GetDbTransaction());

                // 3. Deactivate any prior active transport assignments
                var activeTransport = await _context.StudentTransportAssignments
                    .Where(x => x.StudentId == request.StudentId && x.Status && !x.IsDeleted)
                    .ToListAsync();

                foreach (var at in activeTransport)
                {
                    at.Status = false;
                    at.EffectiveTo = transitionDate;
                    at.Remarks = $"{at.Remarks} [Switched to Hostel on {transitionDate:yyyy-MM-dd}]".Trim();
                }

                // 4. Sync Student Master Record
                var student = await _context.Students.FirstOrDefaultAsync(s => s.StudentId == request.StudentId);
                if (student != null)
                {
                    student.StudentType = "Hosteller";
                    student.TransportRequired = false;
                    student.RouteId = null;
                    student.PickupPointId = null;
                    student.BusType = null;

                    student.HostelId = request.HostelId;
                    student.HostelBlock = preview.HostelName;
                    student.RoomId = request.RoomId;
                    student.HostelRoom = preview.RoomNumber;
                    student.BedId = request.BedId;
                    student.HostelBed = preview.BedNumber;
                    student.UpdatedAt = DateTime.UtcNow;
                }

                // 5. Update StudentFee & StudentFeeComponents
                var studentFee = await _context.StudentFees
                    .Include(sf => sf.Components)
                        .ThenInclude(c => c.FeeStructureComponent)
                            .ThenInclude(fsc => fsc.FeeType)
                    .Include(sf => sf.PaymentPlans)
                        .ThenInclude(pp => pp.Installments)
                    .Where(sf => sf.StudentId == request.StudentId)
                    .OrderByDescending(sf => sf.StudentFeeId)
                    .FirstOrDefaultAsync();

                if (studentFee != null)
                {
                    // A. Update Transport Component (Prorate down)
                    var transportComp = studentFee.Components.FirstOrDefault(c =>
                        c.FeeStructureComponent?.FeeType?.Category?.Equals("Transport", StringComparison.OrdinalIgnoreCase) == true ||
                        c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Transport", StringComparison.OrdinalIgnoreCase) == true ||
                        c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Bus", StringComparison.OrdinalIgnoreCase) == true);

                    if (transportComp != null)
                    {
                        transportComp.Amount = preview.ProratedTransportFee;
                        transportComp.PayableAmount = Math.Max(0m, preview.ProratedTransportFee - transportComp.ConcessionAmount);
                        transportComp.PaidAmount = Math.Min(transportComp.PaidAmount, transportComp.PayableAmount);
                        transportComp.BalanceAmount = Math.Max(0m, transportComp.PayableAmount - transportComp.PaidAmount);
                        transportComp.Status = transportComp.BalanceAmount == 0 ? "Paid" : "Partial";
                    }

                    // B. Find or add Hostel Component
                    var hostelComp = studentFee.Components.FirstOrDefault(c =>
                        c.FeeStructureComponent?.FeeType?.Category?.Equals("Hostel", StringComparison.OrdinalIgnoreCase) == true ||
                        c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Hostel", StringComparison.OrdinalIgnoreCase) == true);

                    if (hostelComp != null)
                    {
                        hostelComp.Amount = preview.ProratedHostelFee;
                        hostelComp.PayableAmount = preview.ProratedHostelFee;
                        hostelComp.PaidAmount = preview.CreditAppliedToHostel;
                        hostelComp.BalanceAmount = preview.NetHostelDue;
                        hostelComp.Status = preview.NetHostelDue == 0 ? "Paid" : (preview.CreditAppliedToHostel > 0 ? "Partial" : "Pending");
                    }
                    else
                    {
                        var hostelFeeType = await _context.FeeTypes
                            .FirstOrDefaultAsync(ft => ft.Category == "Hostel" || ft.FeeTypeName.Contains("Hostel"));

                        if (hostelFeeType == null)
                        {
                            hostelFeeType = new FeeType
                            {
                                FeeTypeCode = "FEE_HOSTEL",
                                FeeTypeName = "Hostel Accommodation Fee",
                                Category = "Hostel",
                                IsActive = true,
                                CreatedAt = DateTime.UtcNow
                            };
                            _context.FeeTypes.Add(hostelFeeType);
                            await _context.SaveChangesAsync();
                        }

                        var fsc = await _context.FeeStructureComponents
                            .FirstOrDefaultAsync(c => c.FeeStructureId == studentFee.FeeStructureId && c.FeeTypeId == hostelFeeType.FeeTypeId);

                        if (fsc == null)
                        {
                            fsc = new FeeStructureComponent
                            {
                                FeeStructureId = studentFee.FeeStructureId,
                                FeeTypeId = hostelFeeType.FeeTypeId,
                                Amount = preview.ProratedHostelFee,
                                IsMandatory = false,
                                IsActive = true,
                                CreatedAt = DateTime.UtcNow
                            };
                            _context.FeeStructureComponents.Add(fsc);
                            await _context.SaveChangesAsync();
                        }

                        _context.StudentFeeComponents.Add(new StudentFeeComponent
                        {
                            StudentFeeId = studentFee.StudentFeeId,
                            FeeStructureComponentId = fsc.FeeStructureComponentId,
                            Amount = preview.ProratedHostelFee,
                            ConcessionAmount = 0m,
                            PayableAmount = preview.ProratedHostelFee,
                            PaidAmount = preview.CreditAppliedToHostel,
                            BalanceAmount = preview.NetHostelDue,
                            Status = preview.NetHostelDue == 0 ? "Paid" : (preview.CreditAppliedToHostel > 0 ? "Partial" : "Pending")
                        });
                    }

                    // C. Update StudentFee master totals
                    studentFee.TotalAmount = preview.NewTotalFee;
                    studentFee.PayableAmount = Math.Max(0m, preview.NewTotalFee - studentFee.ConcessionAmount);
                    studentFee.BalanceAmount = preview.NewBalance;
                    studentFee.Status = preview.NewBalance == 0 ? "Paid" : (studentFee.PaidAmount > 0 ? "Partial" : "Pending");
                    studentFee.UpdatedAt = DateTime.UtcNow;

                    // D. Recalculate Installments
                    var activePlan = studentFee.PaymentPlans?.FirstOrDefault(p => p.IsActive);
                    if (activePlan?.Installments != null && activePlan.Installments.Any())
                    {
                        var unpaid = activePlan.Installments
                            .Where(i => i.Status != "Paid" && i.BalanceAmount > 0)
                            .OrderBy(i => i.InstallmentNumber)
                            .ToList();

                        if (unpaid.Any())
                        {
                            decimal share = Math.Round(preview.NewBalance / unpaid.Count, 2);
                            decimal allocated = 0m;
                            for (int i = 0; i < unpaid.Count; i++)
                            {
                                decimal instAmt = (i == unpaid.Count - 1)
                                    ? (preview.NewBalance - allocated)
                                    : share;
                                allocated += instAmt;

                                unpaid[i].Amount = instAmt;
                                unpaid[i].BalanceAmount = Math.Max(0m, instAmt - unpaid[i].PaidAmount);
                                unpaid[i].Status = unpaid[i].BalanceAmount == 0 ? "Paid" : "Pending";
                            }
                        }
                    }
                }

                // 6. Record History
                var history = new FacilityTransitionHistory
                {
                    StudentId = request.StudentId,
                    FromFacility = "Transport",
                    ToFacility = "Hostel",
                    TransitionDate = transitionDate,
                    MonthsUsedFromFacility = preview.MonthsUsedTransport,
                    ProratedFromFee = preview.ProratedTransportFee,
                    MonthsUsedToFacility = preview.RemainingHostelMonths,
                    ProratedToFee = preview.ProratedHostelFee,
                    ExcessCreditTransferred = preview.CreditAppliedToHostel,
                    PreviousTotalFee = preview.PreviousTotalFee,
                    NewTotalFee = preview.NewTotalFee,
                    PreviousBalance = preview.PreviousBalance,
                    NewBalance = preview.NewBalance,
                    Remarks = request.Remarks,
                    PerformedBy = performedBy,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Set<FacilityTransitionHistory>().Add(history);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Successfully completed facility transition for Student #{StudentId} from Transport to Hostel (Bed #{BedId}).", request.StudentId, request.BedId);

                return new TransportToHostelResultDto
                {
                    Success = true,
                    Message = $"Facility transition from Transport to Hostel completed successfully. Allocated Bed '{preview.BedNumber}' in Room '{preview.RoomNumber}'.",
                    TransitionId = history.TransitionId,
                    Breakdown = preview
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to execute facility transition for Student #{StudentId} from Transport to Hostel", request.StudentId);
                throw;
            }
        }

        public async Task<DiscontinueFacilityPreviewDto> PreviewDiscontinuationToSelfAsync(
            int studentId,
            string fromFacility,
            DateTime? effectiveDate)
        {
            var student = await _context.Students
                .AsNoTracking()
                .FirstOrDefaultAsync(s => s.StudentId == studentId);

            if (student == null)
                throw new KeyNotFoundException($"Student with ID {studentId} was not found.");

            var transitionDate = effectiveDate ?? DateTime.UtcNow;
            var isHostel = fromFacility.Equals("Hostel", StringComparison.OrdinalIgnoreCase);

            DateTime startDate;
            var dbConn = _context.Database.GetDbConnection();

            if (isHostel)
            {
                var activeHostel = await dbConn.QueryFirstOrDefaultAsync<dynamic>(@"
                    SELECT JoiningDate FROM hostel_student_allocations 
                    WHERE StudentId = @sId AND Status = 'Active' 
                    ORDER BY AllocationId DESC LIMIT 1",
                    new { sId = studentId });

                startDate = activeHostel?.JoiningDate != null 
                    ? (DateTime)activeHostel.JoiningDate 
                    : (student.AdmissionDate != default ? student.AdmissionDate : new DateTime(transitionDate.Year, 6, 1));
            }
            else
            {
                var activeTransport = await _context.StudentTransportAssignments
                    .AsNoTracking()
                    .Where(t => t.StudentId == studentId && t.Status && !t.IsDeleted)
                    .OrderByDescending(t => t.StudentTransportAssignmentId)
                    .FirstOrDefaultAsync();

                startDate = activeTransport?.EffectiveFrom 
                    ?? (student.AdmissionDate != default ? student.AdmissionDate : new DateTime(transitionDate.Year, 6, 1));
            }

            int totalAcademicMonths = 10;
            int diffMonths = ((transitionDate.Year - startDate.Year) * 12) + transitionDate.Month - startDate.Month;
            if (transitionDate.Day > 5)
            {
                diffMonths += 1;
            }
            int monthsUsed = Math.Clamp(diffMonths, 1, totalAcademicMonths);

            // Fetch StudentFee
            var studentFee = await _context.StudentFees
                .AsNoTracking()
                .Include(sf => sf.Components)
                    .ThenInclude(c => c.FeeStructureComponent)
                        .ThenInclude(fsc => fsc.FeeType)
                .Include(sf => sf.PaymentPlans)
                    .ThenInclude(p => p.Installments)
                .Where(sf => sf.StudentId == studentId)
                .OrderByDescending(sf => sf.StudentFeeId)
                .FirstOrDefaultAsync();

            decimal originalAnnualFee = 0m;
            decimal proratedUsedFee = 0m;
            decimal facilityPaidAmount = 0m;
            decimal excessCredit = 0m;

            if (studentFee?.Components != null)
            {
                StudentFeeComponent? targetComp;
                if (isHostel)
                {
                    targetComp = studentFee.Components.FirstOrDefault(c =>
                        c.FeeStructureComponent?.FeeType?.Category?.Equals("Hostel", StringComparison.OrdinalIgnoreCase) == true ||
                        c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Hostel", StringComparison.OrdinalIgnoreCase) == true);
                }
                else
                {
                    targetComp = studentFee.Components.FirstOrDefault(c =>
                        c.FeeStructureComponent?.FeeType?.Category?.Equals("Transport", StringComparison.OrdinalIgnoreCase) == true ||
                        c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Transport", StringComparison.OrdinalIgnoreCase) == true ||
                        c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Bus", StringComparison.OrdinalIgnoreCase) == true);
                }

                if (targetComp != null)
                {
                    originalAnnualFee = targetComp.Amount;
                    decimal monthlyRate = originalAnnualFee > 0
                        ? Math.Round(originalAnnualFee / totalAcademicMonths, 2)
                        : (isHostel ? 6000m : 1200m);
                    proratedUsedFee = Math.Min(originalAnnualFee, monthlyRate * monthsUsed);
                    facilityPaidAmount = targetComp.PaidAmount;
                    excessCredit = Math.Max(0m, facilityPaidAmount - proratedUsedFee);
                }
            }

            decimal discontinuedFeeSavings = Math.Max(0m, originalAnnualFee - proratedUsedFee);

            // Check if excess credit can be adjusted towards other pending dues (e.g. Tuition Fee)
            decimal creditAdjusted = 0m;
            decimal remainingCredit = excessCredit;

            if (remainingCredit > 0 && studentFee?.Components != null)
            {
                var otherDueComps = studentFee.Components
                    .Where(c => (isHostel
                        ? (c.FeeStructureComponent?.FeeType?.Category?.Equals("Hostel", StringComparison.OrdinalIgnoreCase) != true &&
                           c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Hostel", StringComparison.OrdinalIgnoreCase) != true)
                        : (c.FeeStructureComponent?.FeeType?.Category?.Equals("Transport", StringComparison.OrdinalIgnoreCase) != true &&
                           c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Transport", StringComparison.OrdinalIgnoreCase) != true &&
                           c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Bus", StringComparison.OrdinalIgnoreCase) != true))
                        && c.BalanceAmount > 0)
                    .ToList();

                foreach (var oc in otherDueComps)
                {
                    decimal apply = Math.Min(remainingCredit, oc.BalanceAmount);
                    creditAdjusted += apply;
                    remainingCredit -= apply;
                    if (remainingCredit <= 0) break;
                }
            }

            decimal previousTotalFee = studentFee?.TotalAmount ?? 0m;
            decimal previousPaid = studentFee?.PaidAmount ?? 0m;
            decimal previousBalance = studentFee?.BalanceAmount ?? 0m;

            decimal newTotalFee = Math.Max(0m, previousTotalFee - discontinuedFeeSavings);
            decimal newBalance = Math.Max(0m, newTotalFee - previousPaid);

            var preview = new DiscontinueFacilityPreviewDto
            {
                StudentId = studentId,
                AdmissionNo = student.AdmissionNo ?? string.Empty,
                StudentName = student.StudentName ?? string.Empty,
                CurrentStudentType = student.StudentType ?? (isHostel ? "Hosteller" : "Day Scholar"),

                FromFacility = isHostel ? "Hostel" : "Transport",
                ToFacility = "Self Transport",
                StartDate = startDate,
                DiscontinuationDate = transitionDate,
                MonthsUsed = monthsUsed,

                OriginalAnnualFee = originalAnnualFee,
                ProratedUsedFee = proratedUsedFee,
                DiscontinuedFeeSavings = discontinuedFeeSavings,
                FacilityPaidAmount = facilityPaidAmount,
                ExcessCredit = excessCredit,
                CreditAdjustedToTuitionOrGeneral = creditAdjusted,
                RefundableCreditRemaining = remainingCredit,

                PreviousTotalFee = previousTotalFee,
                NewTotalFee = newTotalFee,
                TotalPaidAmount = previousPaid,
                PreviousBalance = previousBalance,
                NewBalance = newBalance
            };

            // Recalculate Installments Preview
            var activePlan = studentFee?.PaymentPlans?.FirstOrDefault(p => p.IsActive);
            if (activePlan?.Installments != null && activePlan.Installments.Any())
            {
                var unpaidInstallments = activePlan.Installments
                    .Where(i => i.Status != "Paid" && i.BalanceAmount > 0)
                    .OrderBy(i => i.InstallmentNumber)
                    .ToList();

                decimal perInstallmentShare = unpaidInstallments.Count > 0
                    ? Math.Round(newBalance / unpaidInstallments.Count, 2)
                    : 0m;

                decimal allocatedTotal = 0m;
                for (int i = 0; i < unpaidInstallments.Count; i++)
                {
                    var inst = unpaidInstallments[i];
                    decimal instAmount = (i == unpaidInstallments.Count - 1)
                        ? (newBalance - allocatedTotal)
                        : perInstallmentShare;
                    allocatedTotal += instAmount;

                    preview.InstallmentsPreview.Add(new FacilityTransitionInstallmentPreviewDto
                    {
                        InstallmentNumber = inst.InstallmentNumber,
                        DueDate = inst.DueDate,
                        PreviousAmount = inst.Amount,
                        NewAmount = instAmount,
                        PaidAmount = inst.PaidAmount,
                        NewBalance = Math.Max(0m, instAmount - inst.PaidAmount),
                        Status = (instAmount - inst.PaidAmount) == 0 ? "Paid" : "Pending"
                    });
                }
            }

            return preview;
        }

        public async Task<DiscontinueFacilityResultDto> ExecuteDiscontinuationToSelfAsync(
            DiscontinueFacilityRequestDto request,
            string performedBy = "System")
        {
            var preview = await PreviewDiscontinuationToSelfAsync(
                request.StudentId,
                request.FromFacility,
                request.EffectiveDate);

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var transitionDate = request.EffectiveDate ?? DateTime.UtcNow;
                var dbConn = _context.Database.GetDbConnection();
                var isHostel = request.FromFacility.Equals("Hostel", StringComparison.OrdinalIgnoreCase);

                if (isHostel)
                {
                    // 1. Release active hostel allocation & bed
                    var activeAllocation = await dbConn.QueryFirstOrDefaultAsync<dynamic>(@"
                        SELECT AllocationId, BedId FROM hostel_student_allocations 
                        WHERE StudentId = @sId AND Status = 'Active' 
                        ORDER BY AllocationId DESC LIMIT 1",
                        new { sId = request.StudentId });

                    if (activeAllocation != null)
                    {
                        int allocationId = (int)activeAllocation.AllocationId;
                        int bedId = (int)activeAllocation.BedId;

                        await dbConn.ExecuteAsync(@"
                            UPDATE hostel_student_allocations 
                            SET Status = 'Vacated', UpdatedAt = NOW(), Remarks = CONCAT(COALESCE(Remarks, ''), ' [Discontinued to Self/Day Scholar on ', CURDATE(), ']') 
                            WHERE AllocationId = @allocId",
                            new { allocId = allocationId }, transaction.GetDbTransaction());

                        await dbConn.ExecuteAsync(@"
                            UPDATE hostel_beds 
                            SET BedStatus = 'Available', UpdatedAt = NOW() 
                            WHERE BedId = @bId",
                            new { bId = bedId }, transaction.GetDbTransaction());
                    }
                }
                else
                {
                    // 2. Deactivate active transport assignments
                    var activeTransports = await _context.StudentTransportAssignments
                        .Where(x => x.StudentId == request.StudentId && x.Status && !x.IsDeleted)
                        .ToListAsync();

                    foreach (var at in activeTransports)
                    {
                        at.Status = false;
                        at.EffectiveTo = transitionDate;
                        at.Remarks = $"{at.Remarks} [Discontinued Bus Transport to Self on {transitionDate:yyyy-MM-dd}]".Trim();
                    }
                }

                // 3. Sync Student Master Record to Day Scholar + Self Transport
                var student = await _context.Students.FirstOrDefaultAsync(s => s.StudentId == request.StudentId);
                if (student != null)
                {
                    student.StudentType = "Day Scholar";
                    student.TransportRequired = false;
                    student.BusType = "Self";
                    student.RouteId = null;
                    student.PickupPointId = null;
                    student.BusRoute = null;
                    student.PickupPoint = null;

                    if (isHostel)
                    {
                        student.HostelId = null;
                        student.HostelBlock = null;
                        student.RoomId = null;
                        student.HostelRoom = null;
                        student.BedId = null;
                        student.HostelBed = null;
                    }
                    student.UpdatedAt = DateTime.UtcNow;
                }

                // 4. Update StudentFee & StudentFeeComponents
                var studentFee = await _context.StudentFees
                    .Include(sf => sf.Components)
                        .ThenInclude(c => c.FeeStructureComponent)
                            .ThenInclude(fsc => fsc.FeeType)
                    .Include(sf => sf.PaymentPlans)
                        .ThenInclude(pp => pp.Installments)
                    .Where(sf => sf.StudentId == request.StudentId)
                    .OrderByDescending(sf => sf.StudentFeeId)
                    .FirstOrDefaultAsync();

                if (studentFee != null)
                {
                    StudentFeeComponent? targetComp;
                    if (isHostel)
                    {
                        targetComp = studentFee.Components.FirstOrDefault(c =>
                            c.FeeStructureComponent?.FeeType?.Category?.Equals("Hostel", StringComparison.OrdinalIgnoreCase) == true ||
                            c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Hostel", StringComparison.OrdinalIgnoreCase) == true);
                    }
                    else
                    {
                        targetComp = studentFee.Components.FirstOrDefault(c =>
                            c.FeeStructureComponent?.FeeType?.Category?.Equals("Transport", StringComparison.OrdinalIgnoreCase) == true ||
                            c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Transport", StringComparison.OrdinalIgnoreCase) == true ||
                            c.FeeStructureComponent?.FeeType?.FeeTypeName?.Contains("Bus", StringComparison.OrdinalIgnoreCase) == true);
                    }

                    if (targetComp != null)
                    {
                        targetComp.Amount = preview.ProratedUsedFee;
                        targetComp.PayableAmount = Math.Max(0m, preview.ProratedUsedFee - targetComp.ConcessionAmount);
                        targetComp.PaidAmount = Math.Min(targetComp.PaidAmount, targetComp.PayableAmount);
                        targetComp.BalanceAmount = Math.Max(0m, targetComp.PayableAmount - targetComp.PaidAmount);
                        targetComp.Status = targetComp.BalanceAmount == 0 ? "Paid" : "Partial";
                    }

                    // Apply excess credit to other pending components (Tuition, etc.)
                    decimal creditToApply = preview.ExcessCredit;
                    if (creditToApply > 0)
                    {
                        var otherComps = studentFee.Components
                            .Where(c => c != targetComp && c.BalanceAmount > 0)
                            .ToList();

                        foreach (var oc in otherComps)
                        {
                            decimal apply = Math.Min(creditToApply, oc.BalanceAmount);
                            oc.PaidAmount += apply;
                            oc.BalanceAmount -= apply;
                            oc.Status = oc.BalanceAmount == 0 ? "Paid" : "Partial";
                            creditToApply -= apply;
                            if (creditToApply <= 0) break;
                        }
                    }

                    // Update StudentFee master totals
                    studentFee.TotalAmount = preview.NewTotalFee;
                    studentFee.PayableAmount = Math.Max(0m, preview.NewTotalFee - studentFee.ConcessionAmount);
                    studentFee.BalanceAmount = preview.NewBalance;
                    studentFee.Status = preview.NewBalance == 0 ? "Paid" : (studentFee.PaidAmount > 0 ? "Partial" : "Pending");
                    studentFee.UpdatedAt = DateTime.UtcNow;

                    // Recalculate Installments
                    var activePlan = studentFee.PaymentPlans?.FirstOrDefault(p => p.IsActive);
                    if (activePlan?.Installments != null && activePlan.Installments.Any())
                    {
                        var unpaid = activePlan.Installments
                            .Where(i => i.Status != "Paid" && i.BalanceAmount > 0)
                            .OrderBy(i => i.InstallmentNumber)
                            .ToList();

                        if (unpaid.Any())
                        {
                            decimal share = Math.Round(preview.NewBalance / unpaid.Count, 2);
                            decimal allocated = 0m;
                            for (int i = 0; i < unpaid.Count; i++)
                            {
                                decimal instAmt = (i == unpaid.Count - 1)
                                    ? (preview.NewBalance - allocated)
                                    : share;
                                allocated += instAmt;

                                unpaid[i].Amount = instAmt;
                                unpaid[i].BalanceAmount = Math.Max(0m, instAmt - unpaid[i].PaidAmount);
                                unpaid[i].Status = unpaid[i].BalanceAmount == 0 ? "Paid" : "Pending";
                            }
                        }
                    }
                }

                // 5. Record History
                var history = new FacilityTransitionHistory
                {
                    StudentId = request.StudentId,
                    FromFacility = preview.FromFacility,
                    ToFacility = "Self Transport",
                    TransitionDate = transitionDate,
                    MonthsUsedFromFacility = preview.MonthsUsed,
                    ProratedFromFee = preview.ProratedUsedFee,
                    MonthsUsedToFacility = 0,
                    ProratedToFee = 0,
                    ExcessCreditTransferred = preview.CreditAdjustedToTuitionOrGeneral,
                    PreviousTotalFee = preview.PreviousTotalFee,
                    NewTotalFee = preview.NewTotalFee,
                    PreviousBalance = preview.PreviousBalance,
                    NewBalance = preview.NewBalance,
                    Remarks = request.Remarks,
                    PerformedBy = performedBy,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Set<FacilityTransitionHistory>().Add(history);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                _logger.LogInformation("Successfully completed discontinuation of {Facility} for Student #{StudentId} to Self Transport.", preview.FromFacility, request.StudentId);

                return new DiscontinueFacilityResultDto
                {
                    Success = true,
                    Message = $"Successfully discontinued {preview.FromFacility}. Student transitioned to Self Transport / Day Scholar. Total fee reduced by ₹{preview.DiscontinuedFeeSavings:N2}.",
                    TransitionId = history.TransitionId,
                    Breakdown = preview
                };
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to execute discontinuation of facility for Student #{StudentId}", request.StudentId);
                throw;
            }
        }

        public async Task<IEnumerable<FacilityTransitionHistory>> GetTransitionHistoryAsync(int studentId)
        {
            return await _context.Set<FacilityTransitionHistory>()
                .AsNoTracking()
                .Where(h => h.StudentId == studentId)
                .OrderByDescending(h => h.TransitionId)
                .ToListAsync();
        }
    }
}
