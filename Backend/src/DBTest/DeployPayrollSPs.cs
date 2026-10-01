using System;
using System.Data;
using System.Threading.Tasks;
using MySqlConnector;

namespace DBTest
{
    public static class DeployPayrollSPs
    {
        private const string ConnectionString = "Server=srv1061.hstgr.io;Port=3306;Database=u819242402_CLM_System;User=u819242402_CLM;Password=Clm@2026;SslMode=None;Allow User Variables=true;ConnectionTimeout=60;KeepAlive=5;ConvertZeroDateTime=True;Pooling=true;MinimumPoolSize=2;MaximumPoolSize=100;ConnectionLifeTime=300;ConnectionIdleTimeout=120;";

        public static async Task RunAsync()
        {
            Console.WriteLine("=========================================================");
            Console.WriteLine("  DEPLOYING PAYROLL SALARY ASSIGNMENT STORED PROCEDURES  ");
            Console.WriteLine("=========================================================");

            using var conn = new MySqlConnection(ConnectionString);
            await conn.OpenAsync();
            Console.WriteLine("Connected to MySQL database successfully.");

            // 1. sp_PayrollStaffSalary_GetAll
            Console.WriteLine("Deploying sp_PayrollStaffSalary_GetAll...");
            using (var dropCmd = new MySqlCommand("DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_GetAll`;", conn))
            {
                await dropCmd.ExecuteNonQueryAsync();
            }

            string createGetAllSql = @"
CREATE PROCEDURE `sp_PayrollStaffSalary_GetAll`
(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50)
)
BEGIN
    SELECT 
        psa.`Id`,
        psa.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        s.`StaffType`,
        s.`DepartmentId`,
        d.`DepartmentName`,
        s.`DesignationId`,
        s.`Designation`,
        psa.`SalaryStructureId`,
        pss.`StructureName`,
        pss.`BasicPay`,
        (pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) AS `GrossSalary`,
        (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`) AS `TotalDeductions`,
        ((pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) - (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`)) AS `NetSalary`,
        psa.`EffectiveFrom`,
        psa.`EffectiveTo`,
        psa.`Status`,
        psa.`CreatedAt`,
        psa.`UpdatedAt`
    FROM `payroll_staff_salaries` psa
    INNER JOIN `Staffs` s ON s.`Id` = psa.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = psa.`SalaryStructureId`
    WHERE (s.`IsDeleted` = 0 OR s.`IsDeleted` IS NULL)
      AND (p_StaffId IS NULL OR p_StaffId = 0 OR psa.`StaffId` = p_StaffId)
      AND (p_Status IS NULL OR p_Status = '' OR psa.`Status` = p_Status)
    ORDER BY psa.`Id` DESC;
END;";
            using (var createCmd = new MySqlCommand(createGetAllSql, conn))
            {
                await createCmd.ExecuteNonQueryAsync();
                Console.WriteLine("[OK] Deployed sp_PayrollStaffSalary_GetAll");
            }

            // 2. sp_PayrollStaffSalary_GetById
            Console.WriteLine("Deploying sp_PayrollStaffSalary_GetById...");
            using (var dropCmd = new MySqlCommand("DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_GetById`;", conn))
            {
                await dropCmd.ExecuteNonQueryAsync();
            }

            string createGetByIdSql = @"
CREATE PROCEDURE `sp_PayrollStaffSalary_GetById`
(
    IN p_Id INT
)
BEGIN
    SELECT 
        psa.`Id`,
        psa.`StaffId`,
        s.`EmployeeId`,
        CONCAT(s.`FirstName`, ' ', s.`LastName`) AS `StaffName`,
        s.`StaffType`,
        s.`DepartmentId`,
        d.`DepartmentName`,
        s.`DesignationId`,
        s.`Designation`,
        psa.`SalaryStructureId`,
        pss.`StructureName`,
        pss.`BasicPay`,
        (pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) AS `GrossSalary`,
        (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`) AS `TotalDeductions`,
        ((pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) - (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`)) AS `NetSalary`,
        psa.`EffectiveFrom`,
        psa.`EffectiveTo`,
        psa.`Status`,
        psa.`CreatedAt`,
        psa.`UpdatedAt`
    FROM `payroll_staff_salaries` psa
    INNER JOIN `Staffs` s ON s.`Id` = psa.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = psa.`SalaryStructureId`
    WHERE psa.`Id` = p_Id;
END;";
            using (var createCmd = new MySqlCommand(createGetByIdSql, conn))
            {
                await createCmd.ExecuteNonQueryAsync();
                Console.WriteLine("[OK] Deployed sp_PayrollStaffSalary_GetById");
            }

            // Test execution of sp_PayrollStaffSalary_GetAll
            Console.WriteLine("\nTesting sp_PayrollStaffSalary_GetAll execution...");
            using (var testCmd = new MySqlCommand("sp_PayrollStaffSalary_GetAll", conn) { CommandType = CommandType.StoredProcedure })
            {
                testCmd.Parameters.AddWithValue("p_StaffId", DBNull.Value);
                testCmd.Parameters.AddWithValue("p_Status", DBNull.Value);

                using var reader = await testCmd.ExecuteReaderAsync();
                int count = 0;
                while (await reader.ReadAsync())
                {
                    count++;
                    Console.WriteLine($"Row {count}: Id={reader["Id"]}, StaffId={reader["StaffId"]}, EmployeeId={reader["EmployeeId"]}, StaffName={reader["StaffName"]}, Dept={reader["DepartmentName"]}, Desig={reader["Designation"]}, Structure={reader["StructureName"]}, Gross={reader["GrossSalary"]}, Net={reader["NetSalary"]}");
                }
                Console.WriteLine($"\nSuccessfully fetched {count} records with full employee and structure details!");
            }
        }
    }
}
