-- =============================================================================
-- MODULE: PAYROLL & SALARY MANAGEMENT
-- SCRIPT: 18_Fix_Payroll_Employee_Field_Mappings.sql
-- PURPOSE: Update sp_PayrollStaffSalary_GetAll and sp_PayrollStaffSalary_GetById
--          to return EmployeeId, StaffName, DepartmentName, StaffType,
--          Designation, StructureName, GrossSalary, and NetSalary.
-- DATABASE: u819242402_CLM_System
-- =============================================================================

USE `u819242402_CLM_System`;

-- 1. sp_PayrollStaffSalary_GetAll
DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_GetAll`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollStaffSalary_GetAll`
(
    IN p_StaffId INT,
    IN p_Status VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_uca1400_ai_ci
)
BEGIN
    SELECT 
        psa.`Id`,
        psa.`Id` AS `AssignmentId`,
        psa.`StaffId`,
        COALESCE(s.`EmployeeId`, CONCAT('STF-', psa.`StaffId`)) AS `EmployeeId`,
        COALESCE(NULLIF(TRIM(CONCAT(IFNULL(s.`FirstName`, ''), ' ', IFNULL(s.`LastName`, ''))), ''), CONCAT('Staff #', psa.`StaffId`)) AS `StaffName`,
        COALESCE(s.`StaffType`, 'Teaching') AS `StaffType`,
        COALESCE(s.`DepartmentId`, 0) AS `DepartmentId`,
        COALESCE(d.`DepartmentName`, 'General') AS `DepartmentName`,
        s.`DesignationId`,
        COALESCE(s.`Designation`, '-') AS `Designation`,
        psa.`SalaryStructureId`,
        COALESCE(pss.`StructureName`, 'Standard Grade') AS `StructureName`,
        COALESCE(pss.`BasicPay`, 0.00) AS `BasicPay`,
        COALESCE(pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`, 0.00) AS `GrossSalary`,
        COALESCE(pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`, 0.00) AS `TotalDeductions`,
        COALESCE((pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) - (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`), 0.00) AS `NetSalary`,
        psa.`EffectiveFrom`,
        psa.`EffectiveTo`,
        psa.`Status`,
        psa.`CreatedAt`,
        psa.`UpdatedAt`
    FROM `payroll_staff_salaries` psa
    LEFT JOIN `Staff` s ON s.`Id` = psa.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = psa.`SalaryStructureId`
    WHERE (p_StaffId IS NULL OR p_StaffId = 0 OR psa.`StaffId` = p_StaffId)
      AND (p_Status IS NULL OR p_Status = '' OR psa.`Status` COLLATE utf8mb4_uca1400_ai_ci = p_Status COLLATE utf8mb4_uca1400_ai_ci)
    ORDER BY psa.`Id` DESC;
END //
DELIMITER ;

-- 2. sp_PayrollStaffSalary_GetById
DROP PROCEDURE IF EXISTS `sp_PayrollStaffSalary_GetById`;
DELIMITER //
CREATE PROCEDURE `sp_PayrollStaffSalary_GetById`
(
    IN p_Id INT
)
BEGIN
    SELECT 
        psa.`Id`,
        psa.`Id` AS `AssignmentId`,
        psa.`StaffId`,
        COALESCE(s.`EmployeeId`, CONCAT('STF-', psa.`StaffId`)) AS `EmployeeId`,
        COALESCE(NULLIF(TRIM(CONCAT(IFNULL(s.`FirstName`, ''), ' ', IFNULL(s.`LastName`, ''))), ''), CONCAT('Staff #', psa.`StaffId`)) AS `StaffName`,
        COALESCE(s.`StaffType`, 'Teaching') AS `StaffType`,
        COALESCE(s.`DepartmentId`, 0) AS `DepartmentId`,
        COALESCE(d.`DepartmentName`, 'General') AS `DepartmentName`,
        s.`DesignationId`,
        COALESCE(s.`Designation`, '-') AS `Designation`,
        psa.`SalaryStructureId`,
        COALESCE(pss.`StructureName`, 'Standard Grade') AS `StructureName`,
        COALESCE(pss.`BasicPay`, 0.00) AS `BasicPay`,
        COALESCE(pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`, 0.00) AS `GrossSalary`,
        COALESCE(pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`, 0.00) AS `TotalDeductions`,
        COALESCE((pss.`BasicPay` + pss.`HRA` + pss.`DA` + pss.`ConveyanceAllowance` + pss.`MedicalAllowance` + pss.`OtherAllowance`) - (pss.`PF` + pss.`ProfessionalTax` + pss.`TDS` + pss.`ESI` + pss.`InsuranceOtherDeduction`), 0.00) AS `NetSalary`,
        psa.`EffectiveFrom`,
        psa.`EffectiveTo`,
        psa.`Status`,
        psa.`CreatedAt`,
        psa.`UpdatedAt`
    FROM `payroll_staff_salaries` psa
    LEFT JOIN `Staff` s ON s.`Id` = psa.`StaffId`
    LEFT JOIN `Departments` d ON d.`DepartmentId` = s.`DepartmentId`
    LEFT JOIN `payroll_salary_structures` pss ON pss.`Id` = psa.`SalaryStructureId`
    WHERE psa.`Id` = p_Id;
END //
DELIMITER ;
