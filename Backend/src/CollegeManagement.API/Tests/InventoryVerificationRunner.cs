using System;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.DTOs.Inventory;
using CollegeManagement.API.Repositories.Interfaces.Inventory;
using CollegeManagement.API.Services.Interfaces.Inventory;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests
{
    public static class InventoryVerificationRunner
    {
        public static async Task RunAsync(IServiceProvider serviceProvider)
        {
            Console.WriteLine("================================================================================");
            Console.WriteLine("       VERIFYING INVENTORY MANAGEMENT END-TO-END BACKEND INTEGRATION            ");
            Console.WriteLine("================================================================================");

            using var scope = serviceProvider.CreateScope();
            var service = scope.ServiceProvider.GetRequiredService<IInventoryService>();

            int passed = 0;
            int failed = 0;

            // Test 1: Fetch Categories
            try
            {
                var categories = (await service.GetCategoriesAsync(true)).ToList();
                Console.WriteLine($"[TEST 1] Fetch Categories: Retrieved {categories.Count} categories.");
                if (categories.Count >= 15)
                {
                    Console.WriteLine("  PASS: Default categories verified.");
                    passed++;
                }
                else
                {
                    Console.WriteLine($"  FAIL: Expected at least 15 categories, got {categories.Count}");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  FAIL [TEST 1]: {ex.Message}");
                failed++;
            }

            // Test 2: Fetch Suppliers
            try
            {
                var suppliers = (await service.GetSuppliersAsync(true)).ToList();
                Console.WriteLine($"[TEST 2] Fetch Suppliers: Retrieved {suppliers.Count} suppliers.");
                if (suppliers.Count >= 5)
                {
                    Console.WriteLine("  PASS: Default suppliers verified.");
                    passed++;
                }
                else
                {
                    Console.WriteLine($"  FAIL: Expected at least 5 suppliers, got {suppliers.Count}");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  FAIL [TEST 2]: {ex.Message}");
                failed++;
            }

            // Test 3: Dashboard Summary
            try
            {
                var dashboard = await service.GetDashboardSummaryAsync();
                Console.WriteLine($"[TEST 3] Dashboard Summary: Total Items = {dashboard.Kpis.TotalItems}, Value = ₹{dashboard.Kpis.TotalStockValue}");
                Console.WriteLine("  PASS: Dashboard summary endpoint verified.");
                passed++;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  FAIL [TEST 3]: {ex.Message}");
                failed++;
            }

            // Test 4: Create Item
            ItemDto createdItem = null!;
            try
            {
                string uniqueCode = "TEST-LAP-" + Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper();
                var categories = (await service.GetCategoriesAsync()).ToList();
                int catId = categories.First(c => c.Name == "IT Equipment").CategoryId;

                createdItem = await service.CreateItemAsync(new CreateItemRequest
                {
                    Name = "Dell Precision Workstation",
                    Code = uniqueCode,
                    CategoryId = catId,
                    Unit = "Nos",
                    Type = "Asset",
                    Department = "Computer Science",
                    OpeningQuantity = 10,
                    UnitCost = 50000,
                    MinStock = 3,
                    MaxStock = 25,
                    ReorderQty = 5,
                    Status = "Active"
                }, 1, "Verification Admin");

                Console.WriteLine($"[TEST 4] Create Item: Created Item ID {createdItem.ItemId} ({createdItem.Code}) with Qty = {createdItem.Quantity}, UnitCost = ₹{createdItem.UnitCost}");
                if (createdItem.Quantity == 10 && createdItem.UnitCost == 50000)
                {
                    Console.WriteLine("  PASS: Item created with initial opening balance.");
                    passed++;
                }
                else
                {
                    Console.WriteLine("  FAIL: Item opening quantity or cost mismatch.");
                    failed++;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"  FAIL [TEST 4]: {ex.Message}");
                failed++;
            }

            // Test 5: Stock In (Weighted Average)
            if (createdItem != null)
            {
                try
                {
                    var suppliers = (await service.GetSuppliersAsync()).ToList();
                    int supId = suppliers.First().SupplierId;

                    // Receipt of 5 units @ 65000:
                    // New Qty = 10 + 5 = 15
                    // New Cost = (10*50000 + 5*65000) / 15 = (500000 + 325000) / 15 = 825000 / 15 = 55000
                    var receipt = await service.PostMovementAsync(new PostMovementRequest
                    {
                        ItemId = createdItem.ItemId,
                        MovementType = "Stock In",
                        Quantity = 5,
                        UnitCost = 65000,
                        TransactionDate = DateTime.UtcNow.Date,
                        SupplierId = supId,
                        PerformedBy = "Store Keeper",
                        Remarks = "Batch purchase"
                    }, 1, "Store Keeper");

                    var updatedItem = await service.GetItemByIdAsync(createdItem.ItemId);
                    Console.WriteLine($"[TEST 5] Stock In: Posted {receipt.TransactionNumber}. Updated Qty = {updatedItem!.Quantity}, Updated Weighted Cost = ₹{updatedItem.UnitCost}");

                    if (updatedItem.Quantity == 15 && Math.Abs(updatedItem.UnitCost - 55000) < 0.01m)
                    {
                        Console.WriteLine("  PASS: Moving weighted-average valuation verified perfectly (₹55,000 / unit).");
                        passed++;
                    }
                    else
                    {
                        Console.WriteLine($"  FAIL: Expected Qty 15 and Cost 55000, got {updatedItem.Quantity} and {updatedItem.UnitCost}");
                        failed++;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  FAIL [TEST 5]: {ex.Message}");
                    failed++;
                }

                // Test 6: Stock Out
                TransactionDto issueTxn = null!;
                try
                {
                    // Issue 3 units.
                    // New Qty = 15 - 3 = 12
                    // Cost remains 55000
                    issueTxn = await service.PostMovementAsync(new PostMovementRequest
                    {
                        ItemId = createdItem.ItemId,
                        MovementType = "Stock Out",
                        Quantity = 3,
                        TransactionDate = DateTime.UtcNow.Date,
                        Department = "Computer Science",
                        RecipientName = "Dr. Raman",
                        Purpose = "Lab installation",
                        IsReturnable = true,
                        ExpectedReturnDate = DateTime.UtcNow.Date.AddDays(30),
                        PerformedBy = "Store Keeper"
                    }, 1, "Store Keeper");

                    var updatedItem = await service.GetItemByIdAsync(createdItem.ItemId);
                    Console.WriteLine($"[TEST 6] Stock Out: Issued {issueTxn.TransactionNumber}. Updated Qty = {updatedItem!.Quantity}, Cost = ₹{updatedItem.UnitCost}");

                    if (updatedItem.Quantity == 12 && Math.Abs(updatedItem.UnitCost - 55000) < 0.01m)
                    {
                        Console.WriteLine("  PASS: Stock Out issued at current weighted cost without cost degradation.");
                        passed++;
                    }
                    else
                    {
                        Console.WriteLine($"  FAIL: Expected Qty 12 and Cost 55000, got {updatedItem.Quantity} and {updatedItem.UnitCost}");
                        failed++;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  FAIL [TEST 6]: {ex.Message}");
                    failed++;
                }

                // Test 7: Ledger Running Balances
                try
                {
                    var ledger = (await service.GetItemLedgerAsync(createdItem.ItemId, null, null)).ToList();
                    Console.WriteLine($"[TEST 7] Ledger: Retrieved {ledger.Count} entries.");
                    var lastEntry = ledger.LastOrDefault();
                    if (ledger.Count == 2 && lastEntry != null && lastEntry.RunningBalance == 12)
                    {
                        Console.WriteLine($"  PASS: Running balance reconciled at {lastEntry.RunningBalance} units.");
                        passed++;
                    }
                    else
                    {
                        Console.WriteLine($"  FAIL: Ledger mismatch. Count = {ledger.Count}, Last Balance = {lastEntry?.RunningBalance}");
                        failed++;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  FAIL [TEST 7]: {ex.Message}");
                    failed++;
                }

                // Test 8: Reversal of Latest Transaction
                try
                {
                    // Reversing the Stock Out (issueTxn)
                    // Restores quantity back to 15
                    var correction = await service.ReverseMovementAsync(issueTxn.TransactionId, 1, "Admin");
                    var updatedItem = await service.GetItemByIdAsync(createdItem.ItemId);
                    Console.WriteLine($"[TEST 8] Reversal: Created {correction.TransactionNumber}. Restored Qty = {updatedItem!.Quantity}");

                    if (updatedItem.Quantity == 15)
                    {
                        Console.WriteLine("  PASS: Reversal restored stock balance with compensating correction entry.");
                        passed++;
                    }
                    else
                    {
                        Console.WriteLine($"  FAIL: Expected restored Qty 15, got {updatedItem.Quantity}");
                        failed++;
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  FAIL [TEST 8]: {ex.Message}");
                    failed++;
                }
            }

            // Test 9: Reports Hub (8 Reports)
            string[] reportNames = new[]
            {
                "Stock Summary",
                "Stock Movement Report",
                "Low Stock Report",
                "Department-wise Issue Report",
                "Supplier Purchase Report",
                "Category-wise Inventory Value",
                "Expiry / Warranty Report",
                "Returnable Items Report"
            };

            foreach (var rpt in reportNames)
            {
                try
                {
                    var rptData = await service.GetReportDataAsync(new ReportRequest { ReportType = rpt });
                    int rowCount = rptData.Rows.Count();
                    Console.WriteLine($"[TEST 9] Report '{rpt}': {rptData.Columns.Count} columns, {rowCount} rows.");
                    passed++;
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"  FAIL Report '{rpt}': {ex.Message}");
                    failed++;
                }
            }

            Console.WriteLine("\n================================================================================");
            Console.WriteLine($"VERIFICATION COMPLETED: Passed = {passed}, Failed = {failed}");
            Console.WriteLine("================================================================================\n");
        }
    }
}
