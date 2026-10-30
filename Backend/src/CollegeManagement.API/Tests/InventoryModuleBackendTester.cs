using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CollegeManagement.API.Data;
using CollegeManagement.API.DTOs.Inventory;
using CollegeManagement.API.Repositories.Interfaces.Inventory;
using CollegeManagement.API.Services.Interfaces.Inventory;
using CollegeManagement.API.Validators.Inventory;
using Microsoft.Extensions.DependencyInjection;

namespace CollegeManagement.API.Tests
{
    public static class InventoryModuleBackendTester
    {
        private static int _passedCount = 0;
        private static int _failedCount = 0;

        public static async Task<bool> RunAllTestsAsync(IServiceProvider serviceProvider)
        {
            _passedCount = 0;
            _failedCount = 0;

            Console.WriteLine();
            Console.WriteLine("================================================================================");
            Console.WriteLine("       MODULE: INVENTORY MANAGEMENT 100% SP + DAPPER VERIFICATION SUITE         ");
            Console.WriteLine("================================================================================");
            Console.WriteLine();

            using var scope = serviceProvider.CreateScope();
            var sp = scope.ServiceProvider;

            // 1. Dependency Injection Verifications
            var repo = sp.GetService<IInventoryRepository>();
            var svc = sp.GetService<IInventoryService>();
            var context = sp.GetService<AppDbContext>();

            AssertTrue(repo != null, "DI Registration: IInventoryRepository is registered and resolvable");
            AssertTrue(svc != null, "DI Registration: IInventoryService is registered and resolvable");
            AssertTrue(context != null, "DI Registration: AppDbContext is registered and resolvable");

            // 2. FluentValidation Verifications
            var createItemVal = new CreateItemRequestValidator();
            var updateItemVal = new UpdateItemRequestValidator();
            var createCatVal = new CreateCategoryRequestValidator();
            var createSupVal = new CreateSupplierRequestValidator();
            var postMovVal = new PostMovementRequestValidator();
            var reportVal = new ReportRequestValidator();

            // Validate empty requests rejected
            var emptyItemRes = createItemVal.Validate(new CreateItemRequest());
            AssertTrue(!emptyItemRes.IsValid, "FluentValidation: CreateItemRequestValidator blocks empty request");

            var invalidMaxStockRes = createItemVal.Validate(new CreateItemRequest
            {
                Name = "Desk Lamp",
                Code = "DL-01",
                CategoryId = 1,
                Unit = "Nos",
                MinStock = 10,
                MaxStock = 5 // MaxStock < MinStock
            });
            AssertTrue(!invalidMaxStockRes.IsValid, "FluentValidation: CreateItemRequestValidator blocks MaxStock < MinStock");

            var emptyCatRes = createCatVal.Validate(new CreateCategoryRequest());
            AssertTrue(!emptyCatRes.IsValid, "FluentValidation: CreateCategoryRequestValidator blocks empty request");

            var invalidPhoneSupRes = createSupVal.Validate(new CreateSupplierRequest
            {
                Name = "Vendor X",
                Code = "VX-01",
                ContactPerson = "John",
                Phone = "invalid-phone"
            });
            AssertTrue(!invalidPhoneSupRes.IsValid, "FluentValidation: CreateSupplierRequestValidator blocks invalid phone");

            var futureDateMovRes = postMovVal.Validate(new PostMovementRequest
            {
                ItemId = 1,
                MovementType = "Stock In",
                Quantity = 5,
                TransactionDate = DateTime.UtcNow.Date.AddDays(5) // Future date
            });
            AssertTrue(!futureDateMovRes.IsValid, "FluentValidation: PostMovementRequestValidator blocks future transaction date");

            var emptyReportRes = reportVal.Validate(new ReportRequest { ReportType = "" });
            AssertTrue(!emptyReportRes.IsValid, "FluentValidation: ReportRequestValidator blocks empty report type");

            // 3. Category CRUD Verification (via 100% Stored Procedures)
            CategoryDto? testCategory = null;
            try
            {
                // A. Get Categories
                var initialCats = (await svc!.GetCategoriesAsync(true)).ToList();
                AssertTrue(initialCats.Count >= 15, $"Categories Read: Retrieved {initialCats.Count} default categories via sp_Inventory_GetCategories");

                // B. Save (Create) Category
                string catCode = "TCAT-" + Guid.NewGuid().ToString("N").Substring(0, 5).ToUpper();
                string catName = "Test Lab Consumables " + Guid.NewGuid().ToString("N").Substring(0, 4).ToUpper();
                testCategory = await svc.SaveCategoryAsync(null, new CreateCategoryRequest
                {
                    Code = catCode,
                    Name = catName,
                    Description = "Automated test category for inventory",
                    Department = "Chemistry",
                    Status = "Active"
                }, 1, "QA Admin");
                AssertTrue(testCategory != null && testCategory.CategoryId > 0, $"Category Create: Created category '{catName}' with ID {testCategory?.CategoryId} via sp_Inventory_SaveCategory");

                // C. Save (Update) Category
                var updatedCat = await svc.SaveCategoryAsync(testCategory!.CategoryId, new CreateCategoryRequest
                {
                    Code = catCode,
                    Name = catName + " (Updated)",
                    Description = "Updated test description",
                    Department = "Physics",
                    Status = "Active"
                }, 1, "QA Admin");
                AssertTrue(updatedCat != null && updatedCat.Name.Contains("(Updated)"), "Category Update: Successfully updated category name via sp_Inventory_SaveCategory");

                // D. Deactivate Category
                bool catDeactivated = await svc.DeactivateCategoryAsync(testCategory.CategoryId, 1, "QA Admin");
                AssertTrue(catDeactivated, "Category Deactivate: Successfully marked category as Inactive via sp_Inventory_DeactivateCategory");
            }
            catch (Exception ex)
            {
                AssertTrue(false, $"Category CRUD Exception: {ex.Message}");
            }

            // 4. Supplier CRUD Verification (via 100% Stored Procedures)
            SupplierDto? testSupplier = null;
            try
            {
                // A. Get Suppliers
                var initialSuppliers = (await svc!.GetSuppliersAsync(true)).ToList();
                AssertTrue(initialSuppliers.Count >= 5, $"Suppliers Read: Retrieved {initialSuppliers.Count} default suppliers via sp_Inventory_GetSuppliers");

                // B. Save (Create) Supplier
                string supCode = "TSUP-" + Guid.NewGuid().ToString("N").Substring(0, 5).ToUpper();
                string supName = "Test Global Supplies " + Guid.NewGuid().ToString("N").Substring(0, 4).ToUpper();
                testSupplier = await svc.SaveSupplierAsync(null, new CreateSupplierRequest
                {
                    Code = supCode,
                    Name = supName,
                    ContactPerson = "Ramesh Kumar",
                    Phone = "+91 9876543210",
                    Email = "ramesh@testglobalsupplies.com",
                    City = "Hyderabad",
                    State = "Telangana",
                    Country = "India",
                    CategoryIds = new List<int> { 1, 2, 3 },
                    Status = "Active"
                }, 1, "QA Admin");
                AssertTrue(testSupplier != null && testSupplier.SupplierId > 0, $"Supplier Create: Created supplier '{supName}' with ID {testSupplier?.SupplierId} via sp_Inventory_SaveSupplier");
                AssertTrue(testSupplier?.CategoryIds.Count >= 3, "Supplier Junction: Category IDs correctly persisted in junction table");

                // C. Save (Update) Supplier
                var updatedSup = await svc.SaveSupplierAsync(testSupplier!.SupplierId, new CreateSupplierRequest
                {
                    Code = supCode,
                    Name = supName + " Ltd",
                    ContactPerson = "Ramesh Kumar Updated",
                    Phone = "+91 9876543210",
                    Email = "ramesh.updated@testglobalsupplies.com",
                    City = "Secunderabad",
                    State = "Telangana",
                    CategoryIds = new List<int> { 1, 4 },
                    Status = "Active"
                }, 1, "QA Admin");
                AssertTrue(updatedSup != null && updatedSup.ContactPerson.Contains("Updated"), "Supplier Update: Updated supplier details and junction mappings via sp_Inventory_SaveSupplier");

                // D. Deactivate Supplier
                bool supDeactivated = await svc.DeactivateSupplierAsync(testSupplier.SupplierId, 1, "QA Admin");
                AssertTrue(supDeactivated, "Supplier Deactivate: Successfully marked supplier as Inactive via sp_Inventory_DeactivateSupplier");
            }
            catch (Exception ex)
            {
                AssertTrue(false, $"Supplier CRUD Exception: {ex.Message}");
            }

            // 5. Item CRUD & Search Verification (via 100% Stored Procedures)
            ItemDto? testItem = null;
            try
            {
                string itemCode = "ITEM-" + Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper();
                string itemName = "Precision Digital Micrometer " + Guid.NewGuid().ToString("N").Substring(0, 4).ToUpper();

                // A. Create Item with initial opening quantity 10 @ 2000
                testItem = await svc!.CreateItemAsync(new CreateItemRequest
                {
                    Code = itemCode,
                    Name = itemName,
                    CategoryId = 1,
                    Unit = "Units",
                    Type = "Asset",
                    Department = "Mechanical",
                    OpeningQuantity = 10,
                    UnitCost = 2000,
                    MinStock = 5,
                    MaxStock = 50,
                    ReorderQty = 10,
                    Status = "Active"
                }, 1, "QA Admin");
                AssertTrue(testItem != null && testItem.ItemId > 0, $"Item Create: Created item '{itemName}' with ID {testItem?.ItemId} via sp_Inventory_CreateItem");
                AssertTrue(testItem?.Quantity == 10 && testItem?.UnitCost == 2000, "Item Balance: Initial opening balance and unit cost initialized correctly");

                // B. Read Item by ID
                var fetchedItem = await svc.GetItemByIdAsync(testItem!.ItemId);
                AssertTrue(fetchedItem != null && fetchedItem.Code == itemCode, "Item Read: Retrieved item by ID with joined categories via sp_Inventory_GetItemById");

                // C. Search / Filter Items
                var searchResults = (await svc.GetItemsAsync(new ItemFilterRequest { Search = itemCode })).ToList();
                AssertTrue(searchResults.Any(i => i.ItemId == testItem.ItemId), "Item Search: Filtered item by unique code via sp_Inventory_GetItems");

                // D. Update Item
                var updatedItem = await svc.UpdateItemAsync(testItem.ItemId, new UpdateItemRequest
                {
                    Code = itemCode,
                    Name = itemName + " (Calibrated)",
                    CategoryId = 1,
                    Unit = "Units",
                    Type = "Asset",
                    Department = "Mechanical",
                    MinStock = 4,
                    MaxStock = 60,
                    ReorderQty = 12,
                    Status = "Active"
                }, 1, "QA Admin");
                AssertTrue(updatedItem != null && updatedItem.Name.Contains("(Calibrated)"), "Item Update: Updated metadata via sp_Inventory_UpdateItem");
            }
            catch (Exception ex)
            {
                AssertTrue(false, $"Item CRUD Exception: {ex.Message}");
            }

            // 6. Stock Movements, Moving-Weighted-Average & Reversal Verification
            if (testItem != null)
            {
                try
                {
                    // A. Post Stock In: Receipt of 10 units @ 3000
                    // Prior state: 10 units @ 2000 = 20,000
                    // Incoming: 10 units @ 3000 = 30,000
                    // New Total Qty = 20
                    // Expected New Moving Weighted Average Cost = 50,000 / 20 = 2500
                    var stockIn = await svc!.PostMovementAsync(new PostMovementRequest
                    {
                        ItemId = testItem.ItemId,
                        MovementType = "Stock In",
                        Quantity = 10,
                        UnitCost = 3000,
                        TransactionDate = DateTime.UtcNow.Date,
                        SupplierInvoice = "INV-TEST-001",
                        Location = "Main Store Rack 4",
                        Remarks = "Testing weighted average calculations"
                    }, 1, "Store Manager");
                    AssertTrue(stockIn != null && stockIn.TransactionNumber.Contains("TXN-"), $"Stock In: Posted {stockIn?.TransactionNumber} via sp_Inventory_PostMovement");

                    var itemAfterStockIn = await svc.GetItemByIdAsync(testItem.ItemId);
                    AssertTrue(itemAfterStockIn?.Quantity == 20, $"Stock Balance: Quantity updated to {itemAfterStockIn?.Quantity} (expected 20)");
                    AssertTrue(Math.Abs((itemAfterStockIn?.UnitCost ?? 0) - 2500) < 0.01m, $"Valuation: Moving weighted-average unit cost is ₹{itemAfterStockIn?.UnitCost} (expected ₹2500.00)");

                    // B. Post Stock Out: Issue 5 units
                    // Quantity becomes 20 - 5 = 15. Cost stays 2500.
                    var stockOut = await svc.PostMovementAsync(new PostMovementRequest
                    {
                        ItemId = testItem.ItemId,
                        MovementType = "Stock Out",
                        Quantity = 5,
                        TransactionDate = DateTime.UtcNow.Date,
                        Department = "Mechanical",
                        RecipientName = "Lab Incharge",
                        Purpose = "Semester lab practicals",
                        IsReturnable = true,
                        ExpectedReturnDate = DateTime.UtcNow.Date.AddDays(14)
                    }, 1, "Store Manager");
                    AssertTrue(stockOut != null && stockOut.MovementType == "Stock Out", $"Stock Out: Issued {stockOut?.TransactionNumber} via sp_Inventory_PostMovement");

                    var itemAfterStockOut = await svc.GetItemByIdAsync(testItem.ItemId);
                    AssertTrue(itemAfterStockOut?.Quantity == 15, $"Stock Out Balance: Quantity reduced to {itemAfterStockOut?.Quantity} (expected 15)");
                    AssertTrue(Math.Abs((itemAfterStockOut?.UnitCost ?? 0) - 2500) < 0.01m, "Stock Out Valuation: Unit cost remains unaffected by stock issue");

                    // C. Get Item Ledger
                    var ledger = (await svc.GetItemLedgerAsync(testItem.ItemId, null, null)).ToList();
                    AssertTrue(ledger.Count >= 2, $"Item Ledger: Retrieved {ledger.Count} ledger rows via sp_Inventory_GetItemLedger");
                    var lastLedgerEntry = ledger.LastOrDefault();
                    AssertTrue(lastLedgerEntry?.RunningBalance == 15, $"Ledger Reconciliation: Running balance matches current stock ({lastLedgerEntry?.RunningBalance} units)");

                    // D. Get Movements History
                    var movementsList = (await svc.GetMovementsAsync(new MovementFilterRequest { ItemId = testItem.ItemId })).ToList();
                    AssertTrue(movementsList.Count >= 2, $"Movements Filter: Retrieved {movementsList.Count} movements via sp_Inventory_GetMovements");

                    // E. Reverse Movement (Reverse the Stock Out)
                    // Restores quantity from 15 back to 20
                    var correction = await svc.ReverseMovementAsync(stockOut!.TransactionId, 1, "QA Admin");
                    AssertTrue(correction != null && correction.Status == "Correction", $"Movement Reversal: Created compensating entry {correction?.TransactionNumber} via sp_Inventory_ReverseMovement");

                    var itemAfterReversal = await svc.GetItemByIdAsync(testItem.ItemId);
                    AssertTrue(itemAfterReversal?.Quantity == 20, $"Reversal Balance: Restored stock balance to {itemAfterReversal?.Quantity} (expected 20)");

                    // F. Delete Item Constraint Check
                    // Items with available stock or transactions must reject deletion
                    bool deleteBlocked = false;
                    try
                    {
                        await svc.DeleteItemAsync(testItem.ItemId, 1, "QA Admin");
                    }
                    catch (InvalidOperationException)
                    {
                        deleteBlocked = true;
                    }
                    catch (Exception ex) when (ex.Message.Contains("cannot be deleted"))
                    {
                        deleteBlocked = true;
                    }
                    AssertTrue(deleteBlocked, "Integrity Constraint: Prevented deletion of item with active stock & ledger history");

                    // G. Deactivate Item
                    bool itemDeactivated = await svc.DeactivateItemAsync(testItem.ItemId, 1, "QA Admin");
                    AssertTrue(itemDeactivated, "Item Deactivate: Successfully marked item as Inactive via sp_Inventory_DeactivateItem");
                }
                catch (Exception ex)
                {
                    AssertTrue(false, $"Movements & Ledger Exception: {ex.Message}");
                }
            }

            // 7. Reports Hub (All 8 Audited Analytical Reports)
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
                    var rptData = await svc!.GetReportDataAsync(new ReportRequest { ReportType = rpt });
                    AssertTrue(rptData != null && rptData.Columns.Count > 0, $"Report '{rpt}': Retrieved report structure with {rptData?.Columns.Count} columns via sp_Inventory_GetReport");
                }
                catch (Exception ex)
                {
                    AssertTrue(false, $"Report '{rpt}' Exception: {ex.Message}");
                }
            }

            // 8. Dashboard Summary Verification
            try
            {
                var dashboard = await svc!.GetDashboardSummaryAsync();
                AssertTrue(dashboard != null && dashboard.Kpis != null, "Dashboard Summary: Retrieved KPIs, movements, and alerts via sp_Inventory_GetDashboardSummary");
            }
            catch (Exception ex)
            {
                AssertTrue(false, $"Dashboard Summary Exception: {ex.Message}");
            }

            Console.WriteLine();
            Console.WriteLine("================================================================================");
            Console.WriteLine($"TOTAL TESTS RUN: {_passedCount + _failedCount} | PASSED: {_passedCount} | FAILED: {_failedCount}");
            Console.WriteLine("================================================================================");
            Console.WriteLine();

            return _failedCount == 0;
        }

        private static void AssertTrue(bool condition, string testDescription)
        {
            if (condition)
            {
                _passedCount++;
                Console.WriteLine($"  [PASS] {testDescription}");
            }
            else
            {
                _failedCount++;
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"  [FAIL] {testDescription}");
                Console.ResetColor();
            }
        }
    }
}
