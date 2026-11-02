using System;
using System.Data;
using MySqlConnector;

class Program
{
    static void Main()
    {
        string connStr = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;";
        using (var conn = new MySqlConnection(connStr))
        {
            try {
                conn.Open();
                Console.WriteLine("=== STEP 1: IDEMPOTENT DATABASE SEED ===");

                // 1. Roles: Ensure Role 16 (Inventory Manager) is active
                int inventoryRoleId = 0;
                using (var cmd = new MySqlCommand("SELECT RoleId, RoleName, IsActive FROM `Roles` WHERE RoleName = 'Inventory Manager' LIMIT 1;", conn))
                using (var reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        inventoryRoleId = Convert.ToInt32(reader["RoleId"]);
                        Console.WriteLine($"Found existing 'Inventory Manager' role with RoleId: {inventoryRoleId}, IsActive: {reader["IsActive"]}");
                    }
                }

                if (inventoryRoleId == 0)
                {
                    using (var cmd = new MySqlCommand(@"
INSERT INTO `Roles` (`RoleName`, `Description`, `IsSystemRole`, `IsActive`)
VALUES ('Inventory Manager', 'Stores and inventory stock operations', 0, 1);
SELECT LAST_INSERT_ID();", conn))
                    {
                        inventoryRoleId = Convert.ToInt32(cmd.ExecuteScalar());
                        Console.WriteLine($"Created new 'Inventory Manager' role with RoleId: {inventoryRoleId}");
                    }
                }
                else
                {
                    using (var cmd = new MySqlCommand("UPDATE `Roles` SET `IsActive` = 1, `Description` = 'Stores and inventory stock operations' WHERE `RoleId` = @id;", conn))
                    {
                        cmd.Parameters.AddWithValue("@id", inventoryRoleId);
                        cmd.ExecuteNonQuery();
                        Console.WriteLine($"Updated 'Inventory Manager' role {inventoryRoleId} to active.");
                    }
                }

                // 2. Department: Stores & Inventory
                int departmentId = 0;
                using (var cmd = new MySqlCommand("SELECT DepartmentId, DepartmentName FROM `Departments` WHERE DepartmentName = 'Stores & Inventory' LIMIT 1;", conn))
                using (var reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        departmentId = Convert.ToInt32(reader["DepartmentId"]);
                        Console.WriteLine($"Found existing 'Stores & Inventory' DepartmentId: {departmentId}");
                    }
                }

                if (departmentId == 0)
                {
                    using (var cmd = new MySqlCommand(@"
INSERT INTO `Departments` (`DepartmentName`, `DepartmentCode`, `StaffType`, `Description`, `IsActive`, `CreatedAt`)
VALUES ('Stores & Inventory', 'DEP_STORES_INV', 'Non-Teaching', 'Central stores, warehouse and asset management', 1, UTC_TIMESTAMP());
SELECT LAST_INSERT_ID();", conn))
                    {
                        departmentId = Convert.ToInt32(cmd.ExecuteScalar());
                        Console.WriteLine($"Created new 'Stores & Inventory' Department with DepartmentId: {departmentId}");
                    }
                }
                else
                {
                    using (var cmd = new MySqlCommand("UPDATE `Departments` SET `IsActive` = 1, `StaffType` = 'Non-Teaching' WHERE `DepartmentId` = @id;", conn))
                    {
                        cmd.Parameters.AddWithValue("@id", departmentId);
                        cmd.ExecuteNonQuery();
                        Console.WriteLine($"Ensured Department {departmentId} is Active and Non-Teaching.");
                    }
                }

                // 3. Designation: Inventory Manager linked to Stores & Inventory
                int designationId = 0;
                using (var cmd = new MySqlCommand("SELECT Id, Name, DepartmentId FROM `Designations` WHERE Name = 'Inventory Manager' LIMIT 1;", conn))
                using (var reader = cmd.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        designationId = Convert.ToInt32(reader["Id"]);
                        Console.WriteLine($"Found existing 'Inventory Manager' Designation with Id: {designationId}, DeptId: {reader["DepartmentId"]}");
                    }
                }

                if (designationId == 0)
                {
                    using (var cmd = new MySqlCommand(@"
INSERT INTO `Designations` (`Name`, `DepartmentId`, `StaffType`, `IsActive`, `CreatedAt`)
VALUES ('Inventory Manager', @deptId, 'Non-Teaching', 1, UTC_TIMESTAMP());
SELECT LAST_INSERT_ID();", conn))
                    {
                        cmd.Parameters.AddWithValue("@deptId", departmentId);
                        designationId = Convert.ToInt32(cmd.ExecuteScalar());
                        Console.WriteLine($"Created new 'Inventory Manager' Designation with Id: {designationId} linked to DepartmentId: {departmentId}");
                    }
                }
                else
                {
                    using (var cmd = new MySqlCommand("UPDATE `Designations` SET `DepartmentId` = @deptId, `StaffType` = 'Non-Teaching', `IsActive` = 1 WHERE `Id` = @id;", conn))
                    {
                        cmd.Parameters.AddWithValue("@deptId", departmentId);
                        cmd.Parameters.AddWithValue("@id", designationId);
                        cmd.ExecuteNonQuery();
                        Console.WriteLine($"Updated Designation {designationId} to link to DepartmentId: {departmentId}.");
                    }
                }

                Console.WriteLine("\n=== SEED SUMMARY ===");
                Console.WriteLine($"RoleId: {inventoryRoleId} (Inventory Manager)");
                Console.WriteLine($"DepartmentId: {departmentId} (Stores & Inventory)");
                Console.WriteLine($"DesignationId: {designationId} (Inventory Manager)");

            } catch(Exception ex) {
                Console.WriteLine("ERROR: " + ex.ToString());
            }
        }
    }
}
