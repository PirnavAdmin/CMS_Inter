-- =====================================================================================
-- SCRIPT: 04_Settings_Templates_Migration_And_Seeds.sql
-- DESCRIPTION: Creates the `templates` table and seeds default templates
--              (Certificate Templates, Document Templates, Bulk Upload Templates).
-- =====================================================================================

CREATE TABLE IF NOT EXISTS `templates` (
    `Id` INT NOT NULL AUTO_INCREMENT,
    `TemplateCode` VARCHAR(100) NOT NULL,
    `Title` VARCHAR(200) NOT NULL,
    `Category` VARCHAR(50) NOT NULL,
    `ContentBody` LONGTEXT NOT NULL,
    `PlaceholdersJson` LONGTEXT NOT NULL,
    `IsActive` TINYINT(1) NOT NULL DEFAULT 1,
    `Version` INT NOT NULL DEFAULT 1,
    `CreatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `UpdatedAt` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (`Id`),
    UNIQUE KEY `UX_templates_TemplateCode` (`TemplateCode`),
    KEY `IX_templates_Category` (`Category`),
    KEY `IX_templates_IsActive` (`IsActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================================
-- SEED DATA: Default Certificate, Document, and Bulk-Upload Templates
-- =====================================================================================

-- 1. BONAFIDE CERTIFICATE TEMPLATE
INSERT INTO `templates` (`TemplateCode`, `Title`, `Category`, `ContentBody`, `PlaceholdersJson`, `IsActive`, `Version`, `CreatedAt`, `UpdatedAt`)
VALUES (
    'BONAFIDE_CERT',
    'Bonafide Certificate',
    'Certificate',
    '<div class="cert-container" style="max-width: 800px; margin: 20px auto; padding: 40px; border: 4px double #1b5e20; background: #ffffff; font-family: ''Segoe UI'', Arial, sans-serif; color: #1a1a1a; position: relative;">
      <div style="text-align: center; border-bottom: 2px solid #2e7d32; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 26px; color: #1b5e20; text-transform: uppercase; letter-spacing: 1px;">{{college_name}}</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #555555;">{{college_address}}</p>
        <p style="margin: 2px 0 0; font-size: 12px; color: #777777; font-weight: 600;">(Recognized by {{board_name}})</p>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 13px; color: #333333; margin-bottom: 20px;">
        <div><strong>Certificate No:</strong> <span style="color: #1b5e20; font-weight: bold;">{{certificate_no}}</span></div>
        <div><strong>Date:</strong> {{issue_date}}</div>
      </div>

      <div style="text-align: center; margin: 28px 0 24px;">
        <h2 style="display: inline-block; margin: 0; font-size: 20px; text-transform: uppercase; color: #1b5e20; border-bottom: 2px solid #1b5e20; padding-bottom: 4px; letter-spacing: 2px;">
          BONAFIDE CERTIFICATE
        </h2>
      </div>

      <div style="font-size: 15px; line-height: 2; text-align: justify; margin-bottom: 40px;">
        This is to certify that <strong>{{student_name}}</strong>, Son/Daughter of <strong>{{father_name}}</strong>, bearing Admission Number <strong>{{admission_no}}</strong> and Roll Number <strong>{{roll_no}}</strong>, is/was a bonafide student of this institution studying in <strong>{{academic_level}}</strong> (Group: <strong>{{group_name}}</strong>, Section: <strong>{{section_name}}</strong>) during the Academic Year <strong>{{academic_year}}</strong>.
        <br/><br/>
        This certificate is issued on request for the purpose of: <strong>{{purpose}}</strong>.
      </div>

      <div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="text-align: center;">
          <div style="width: 100px; height: 100px; border: 1px dashed #999999; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #777777; margin: 0 auto 8px;">
            OFFICE SEAL
          </div>
          <p style="margin: 0; font-size: 12px; font-weight: bold; color: #555555;">College Seal</p>
        </div>
        <div style="text-align: center;">
          <div style="min-height: 50px;"></div>
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: #1b5e20; border-top: 1px solid #333333; padding-top: 6px;">
            {{issued_by}}
          </p>
          <p style="margin: 2px 0 0; font-size: 12px; color: #666666;">Principal / Head of Institution</p>
        </div>
      </div>
    </div>',
    '["{{college_name}}", "{{college_address}}", "{{board_name}}", "{{certificate_no}}", "{{issue_date}}", "{{student_name}}", "{{father_name}}", "{{admission_no}}", "{{roll_no}}", "{{academic_level}}", "{{group_name}}", "{{section_name}}", "{{academic_year}}", "{{purpose}}", "{{issued_by}}"]',
    1,
    1,
    NOW(6),
    NOW(6)
)
ON DUPLICATE KEY UPDATE 
    `Title` = VALUES(`Title`),
    `Category` = VALUES(`Category`),
    `ContentBody` = VALUES(`ContentBody`),
    `PlaceholdersJson` = VALUES(`PlaceholdersJson`),
    `UpdatedAt` = NOW(6);

-- 2. TRANSFER CERTIFICATE (TC) TEMPLATE
INSERT INTO `templates` (`TemplateCode`, `Title`, `Category`, `ContentBody`, `PlaceholdersJson`, `IsActive`, `Version`, `CreatedAt`, `UpdatedAt`)
VALUES (
    'TRANSFER_CERT',
    'Transfer Certificate (TC)',
    'Certificate',
    '<div class="cert-container" style="max-width: 800px; margin: 20px auto; padding: 40px; border: 4px solid #0d47a1; background: #ffffff; font-family: ''Segoe UI'', Arial, sans-serif; color: #1a1a1a;">
      <div style="text-align: center; border-bottom: 2px solid #1565c0; padding-bottom: 16px; margin-bottom: 20px;">
        <h1 style="margin: 0; font-size: 26px; color: #0d47a1; text-transform: uppercase;">{{college_name}}</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #555555;">{{college_address}}</p>
        <p style="margin: 2px 0 0; font-size: 12px; color: #777777; font-weight: 600;">Affiliated to {{board_name}}</p>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 16px;">
        <div><strong>T.C. No:</strong> <span style="color: #0d47a1; font-weight: bold;">{{certificate_no}}</span></div>
        <div><strong>Admission No:</strong> <strong>{{admission_no}}</strong></div>
        <div><strong>Date of Issue:</strong> {{issue_date}}</div>
      </div>

      <div style="text-align: center; margin: 20px 0;">
        <h2 style="display: inline-block; margin: 0; font-size: 20px; text-transform: uppercase; color: #0d47a1; border-bottom: 2px solid #0d47a1; padding-bottom: 4px; letter-spacing: 2px;">
          TRANSFER CERTIFICATE
        </h2>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 30px;">
        <tbody>
          <tr style="border-bottom: 1px solid #e0e0e0;"><td style="padding: 8px 0; width: 45%;"><strong>1. Name of the Student:</strong></td><td style="padding: 8px 0; color: #0d47a1; font-weight: bold;">{{student_name}}</td></tr>
          <tr style="border-bottom: 1px solid #e0e0e0;"><td style="padding: 8px 0;"><strong>2. Father''s / Guardian''s Name:</strong></td><td style="padding: 8px 0;">{{father_name}}</td></tr>
          <tr style="border-bottom: 1px solid #e0e0e0;"><td style="padding: 8px 0;"><strong>3. Mother''s Name:</strong></td><td style="padding: 8px 0;">{{mother_name}}</td></tr>
          <tr style="border-bottom: 1px solid #e0e0e0;"><td style="padding: 8px 0;"><strong>4. Date of Birth (as per records):</strong></td><td style="padding: 8px 0;">{{dob}}</td></tr>
          <tr style="border-bottom: 1px solid #e0e0e0;"><td style="padding: 8px 0;"><strong>5. Course & Group Studied:</strong></td><td style="padding: 8px 0;">{{academic_level}} - {{group_name}}</td></tr>
          <tr style="border-bottom: 1px solid #e0e0e0;"><td style="padding: 8px 0;"><strong>6. Medium of Instruction:</strong></td><td style="padding: 8px 0;">English</td></tr>
          <tr style="border-bottom: 1px solid #e0e0e0;"><td style="padding: 8px 0;"><strong>7. Academic Year:</strong></td><td style="padding: 8px 0;">{{academic_year}}</td></tr>
          <tr style="border-bottom: 1px solid #e0e0e0;"><td style="padding: 8px 0;"><strong>8. Whether College Dues Paid:</strong></td><td style="padding: 8px 0;">Yes, Cleared</td></tr>
          <tr style="border-bottom: 1px solid #e0e0e0;"><td style="padding: 8px 0;"><strong>9. General Conduct & Character:</strong></td><td style="padding: 8px 0; font-weight: bold; color: #2e7d32;">{{conduct}}</td></tr>
          <tr style="border-bottom: 1px solid #e0e0e0;"><td style="padding: 8px 0;"><strong>10. Reason for Leaving:</strong></td><td style="padding: 8px 0;">{{purpose}}</td></tr>
        </tbody>
      </table>

      <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="text-align: center;">
          <p style="margin: 0; font-size: 13px; font-weight: bold; color: #555555;">Prepared by</p>
        </div>
        <div style="text-align: center;">
          <p style="margin: 0; font-size: 13px; font-weight: bold; color: #555555;">Verified by</p>
        </div>
        <div style="text-align: center;">
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0d47a1; border-top: 1px solid #333333; padding-top: 6px;">{{issued_by}}</p>
          <p style="margin: 2px 0 0; font-size: 12px; color: #666666;">Principal</p>
        </div>
      </div>
    </div>',
    '["{{college_name}}", "{{college_address}}", "{{board_name}}", "{{certificate_no}}", "{{admission_no}}", "{{issue_date}}", "{{student_name}}", "{{father_name}}", "{{mother_name}}", "{{dob}}", "{{academic_level}}", "{{group_name}}", "{{academic_year}}", "{{conduct}}", "{{purpose}}", "{{issued_by}}"]',
    1,
    1,
    NOW(6),
    NOW(6)
)
ON DUPLICATE KEY UPDATE 
    `Title` = VALUES(`Title`),
    `Category` = VALUES(`Category`),
    `ContentBody` = VALUES(`ContentBody`),
    `PlaceholdersJson` = VALUES(`PlaceholdersJson`),
    `UpdatedAt` = NOW(6);

-- 3. STUDY AND CONDUCT CERTIFICATE
INSERT INTO `templates` (`TemplateCode`, `Title`, `Category`, `ContentBody`, `PlaceholdersJson`, `IsActive`, `Version`, `CreatedAt`, `UpdatedAt`)
VALUES (
    'STUDY_CONDUCT_CERT',
    'Study and Conduct Certificate',
    'Certificate',
    '<div class="cert-container" style="max-width: 800px; margin: 20px auto; padding: 40px; border: 4px double #4a148c; background: #ffffff; font-family: ''Segoe UI'', Arial, sans-serif; color: #1a1a1a;">
      <div style="text-align: center; border-bottom: 2px solid #7b1fa2; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="margin: 0; font-size: 26px; color: #4a148c; text-transform: uppercase;">{{college_name}}</h1>
        <p style="margin: 4px 0 0; font-size: 13px; color: #555555;">{{college_address}}</p>
        <p style="margin: 2px 0 0; font-size: 12px; color: #777777;">(Affiliated to {{board_name}})</p>
      </div>

      <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 20px;">
        <div><strong>Ref No:</strong> <span style="color: #4a148c; font-weight: bold;">{{certificate_no}}</span></div>
        <div><strong>Date:</strong> {{issue_date}}</div>
      </div>

      <div style="text-align: center; margin: 28px 0 24px;">
        <h2 style="display: inline-block; margin: 0; font-size: 20px; text-transform: uppercase; color: #4a148c; border-bottom: 2px solid #4a148c; padding-bottom: 4px; letter-spacing: 2px;">
          STUDY &amp; CONDUCT CERTIFICATE
        </h2>
      </div>

      <div style="font-size: 15px; line-height: 2.2; text-align: justify; margin-bottom: 40px;">
        This is to certify that <strong>{{student_name}}</strong>, Son/Daughter of <strong>{{father_name}}</strong>, Admission Number <strong>{{admission_no}}</strong>, was a regular student of this college studying in <strong>{{academic_level}}</strong>, Group <strong>{{group_name}}</strong>, Section <strong>{{section_name}}</strong> during the academic period <strong>{{academic_year}}</strong>.
        <br/><br/>
        During his/her period of study in this institution, his/her conduct and character were found to be <strong>{{conduct}}</strong>.
      </div>

      <div style="margin-top: 60px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="text-align: center;">
          <div style="width: 90px; height: 90px; border: 1px dashed #999999; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #777777; margin: 0 auto 8px;">
            SEAL
          </div>
        </div>
        <div style="text-align: center;">
          <p style="margin: 0; font-size: 14px; font-weight: bold; color: #4a148c; border-top: 1px solid #333333; padding-top: 6px;">{{issued_by}}</p>
          <p style="margin: 2px 0 0; font-size: 12px; color: #666666;">Principal</p>
        </div>
      </div>
    </div>',
    '["{{college_name}}", "{{college_address}}", "{{board_name}}", "{{certificate_no}}", "{{issue_date}}", "{{student_name}}", "{{father_name}}", "{{admission_no}}", "{{academic_level}}", "{{group_name}}", "{{section_name}}", "{{academic_year}}", "{{conduct}}", "{{issued_by}}"]',
    1,
    1,
    NOW(6),
    NOW(6)
)
ON DUPLICATE KEY UPDATE 
    `Title` = VALUES(`Title`),
    `Category` = VALUES(`Category`),
    `ContentBody` = VALUES(`ContentBody`),
    `PlaceholdersJson` = VALUES(`PlaceholdersJson`),
    `UpdatedAt` = NOW(6);

-- 4. STUDENT ID CARD TEMPLATE
INSERT INTO `templates` (`TemplateCode`, `Title`, `Category`, `ContentBody`, `PlaceholdersJson`, `IsActive`, `Version`, `CreatedAt`, `UpdatedAt`)
VALUES (
    'ID_CARD_TEMPLATE',
    'Student ID Card Template',
    'Document',
    '<div class="id-card" style="width: 320px; height: 480px; margin: 20px auto; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); overflow: hidden; background: #ffffff; font-family: ''Segoe UI'', Arial, sans-serif; border: 1px solid #e0e0e0; display: flex; flex-direction: column;">
      <div style="background: linear-gradient(135deg, #1b5e20, #2e7d32); color: #ffffff; padding: 16px; text-align: center;">
        <h3 style="margin: 0; font-size: 15px; font-weight: bold; letter-spacing: 0.5px;">{{college_name}}</h3>
        <p style="margin: 2px 0 0; font-size: 10px; opacity: 0.9;">STUDENT IDENTITY CARD</p>
      </div>
      <div style="padding: 16px; text-align: center; flex: 1;">
        <div style="width: 90px; height: 105px; border-radius: 8px; border: 2px solid #2e7d32; margin: 0 auto 12px; background: #f0f4f0; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #777777;">
          PHOTO
        </div>
        <h4 style="margin: 0; font-size: 16px; color: #1b5e20;">{{student_name}}</h4>
        <p style="margin: 2px 0 10px; font-size: 12px; color: #666666; font-weight: bold;">Adm: {{admission_no}} | Roll: {{roll_no}}</p>
        
        <table style="width: 100%; font-size: 11px; text-align: left; margin: 10px 0; border-collapse: collapse;">
          <tr><td style="padding: 3px 0; color: #666666;">Course:</td><td style="padding: 3px 0; font-weight: bold;">{{group_name}} ({{academic_level}})</td></tr>
          <tr><td style="padding: 3px 0; color: #666666;">Blood Group:</td><td style="padding: 3px 0; font-weight: bold; color: #d32f2f;">{{blood_group}}</td></tr>
          <tr><td style="padding: 3px 0; color: #666666;">Mobile:</td><td style="padding: 3px 0;">{{mobile}}</td></tr>
          <tr><td style="padding: 3px 0; color: #666666;">Valid Upto:</td><td style="padding: 3px 0; font-weight: bold;">{{valid_upto}}</td></tr>
        </table>
      </div>
      <div style="background: #f5f5f5; border-top: 1px solid #e0e0e0; padding: 8px; text-align: center; font-size: 10px; color: #777777;">
        Principal Signature: <strong>{{issued_by}}</strong>
      </div>
    </div>',
    '["{{college_name}}", "{{student_name}}", "{{admission_no}}", "{{roll_no}}", "{{group_name}}", "{{academic_level}}", "{{blood_group}}", "{{mobile}}", "{{valid_upto}}", "{{issued_by}}"]',
    1,
    1,
    NOW(6),
    NOW(6)
)
ON DUPLICATE KEY UPDATE 
    `Title` = VALUES(`Title`),
    `Category` = VALUES(`Category`),
    `ContentBody` = VALUES(`ContentBody`),
    `PlaceholdersJson` = VALUES(`PlaceholdersJson`),
    `UpdatedAt` = NOW(6);

-- 5. BULK STUDENT ADMISSION IMPORT TEMPLATE
INSERT INTO `templates` (`TemplateCode`, `Title`, `Category`, `ContentBody`, `PlaceholdersJson`, `IsActive`, `Version`, `CreatedAt`, `UpdatedAt`)
VALUES (
    'BULK_STUDENT_UPLOAD_TEMPLATE',
    'Student Admissions Bulk Upload Template',
    'BulkUpload',
    '{"format": "Excel/CSV", "columns": ["AdmissionNo", "FirstName", "LastName", "DateOfBirth", "Gender", "FatherName", "MotherName", "Mobile", "Email", "BoardCode", "GroupName", "AcademicLevel", "SectionName", "Address", "BloodGroup"], "sampleRows": [["ADM2026001", "Rahul", "Kumar", "2009-05-14", "Male", "Suresh Kumar", "Lakshmi Kumari", "9876543210", "rahul@example.com", "BIEAP", "MPC", "1st Year", "A", "Hyderabad", "O+"]]}',
    '["AdmissionNo", "FirstName", "LastName", "DateOfBirth", "Gender", "FatherName", "MotherName", "Mobile", "Email", "BoardCode", "GroupName", "AcademicLevel", "SectionName", "Address", "BloodGroup"]',
    1,
    1,
    NOW(6),
    NOW(6)
)
ON DUPLICATE KEY UPDATE 
    `Title` = VALUES(`Title`),
    `Category` = VALUES(`Category`),
    `ContentBody` = VALUES(`ContentBody`),
    `PlaceholdersJson` = VALUES(`PlaceholdersJson`),
    `UpdatedAt` = NOW(6);

-- 6. BULK STAFF ONBOARDING IMPORT TEMPLATE
INSERT INTO `templates` (`TemplateCode`, `Title`, `Category`, `ContentBody`, `PlaceholdersJson`, `IsActive`, `Version`, `CreatedAt`, `UpdatedAt`)
VALUES (
    'BULK_STAFF_UPLOAD_TEMPLATE',
    'Staff Management Bulk Upload Template',
    'BulkUpload',
    '{"format": "Excel/CSV", "columns": ["EmployeeId", "FirstName", "LastName", "Email", "Mobile", "StaffType", "Department", "Designation", "EmploymentType", "DateOfJoining", "Gender", "BloodGroup"], "sampleRows": [["EMP2026001", "Dr. Rajesh", "Sharma", "rajesh.sharma@college.edu", "9876500001", "Teaching", "Physics", "Senior Lecturer", "Full Time", "2026-06-01", "Male", "A+"]]}',
    '["EmployeeId", "FirstName", "LastName", "Email", "Mobile", "StaffType", "Department", "Designation", "EmploymentType", "DateOfJoining", "Gender", "BloodGroup"]',
    1,
    1,
    NOW(6),
    NOW(6)
)
ON DUPLICATE KEY UPDATE 
    `Title` = VALUES(`Title`),
    `Category` = VALUES(`Category`),
    `ContentBody` = VALUES(`ContentBody`),
    `PlaceholdersJson` = VALUES(`PlaceholdersJson`),
    `UpdatedAt` = NOW(6);
