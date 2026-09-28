-- =============================================================================
-- MODULE: PAYROLL & SALARY MANAGEMENT
-- SCRIPT: 18_Fix_Payroll_Employee_Field_Mappings.sql
-- PURPOSE: Update sp_PayrollStaffSalary_GetAll and sp_PayrollStaffSalary_GetById
--          to return EmployeeId, StaffName, DepartmentName, StaffType,
--          Designation, StructureName, GrossSalary, and NetSalary.
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_GetAll`;
DELIMITER //
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
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_GetById`;
DELIMITER //
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
END //
DELIMITER ;
