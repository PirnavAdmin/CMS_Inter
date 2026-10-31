-- SQL script to remove 'student_id' and update the certificate templates

-- 1. Update Bonafide Certificate
UPDATE `templates`
SET 
    ContentBody = 'This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Admission Number {{admission_no}} is a bonafide student of Pirnav College (Intermediate / Junior College), Vijayawada. He/She is studying in {{group_name}} Group, {{academic_level}}, Section {{section}} during the academic year {{academic_year}}.',
    PlaceholdersJson = '["{{student_name}}", "{{admission_no}}", "{{father_name}}", "{{group_name}}", "{{academic_level}}", "{{academic_year}}", "{{section}}", "{{purpose}}", "{{certificate_number}}", "{{issue_date}}", "{{place}}"]'
WHERE TemplateCode IN ('BC', 'BONAFIDE_CERT', 'BONAFIDE_BIEAP', 'BONAFIDE_TSBIE') OR Title LIKE '%Bonafide%';

-- 2. Update Study Certificate
UPDATE `templates`
SET 
    ContentBody = 'This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Admission Number {{admission_no}} has studied in this college during the period from {{study_from}} to {{study_to}} in {{group_name}} Group (Section {{section}}) and appeared for the Intermediate Public Examination conducted by the {{board_name}}.',
    PlaceholdersJson = '["{{student_name}}", "{{admission_no}}", "{{father_name}}", "{{study_from}}", "{{study_to}}", "{{group_name}}", "{{board_name}}", "{{section}}", "{{certificate_number}}", "{{issue_date}}", "{{place}}"]'
WHERE TemplateCode IN ('SC', 'STUDY_CERT') OR Title LIKE '%Study Certificate%';

-- 3. Update Conduct Certificate
UPDATE `templates`
SET 
    ContentBody = 'This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Admission Number {{admission_no}} has studied in this institution from {{study_from}} to {{study_to}} (Section {{section}}).\nDuring his/her tenure in this college, his/her character and conduct have been {{conduct_rating}}.',
    PlaceholdersJson = '["{{student_name}}", "{{admission_no}}", "{{father_name}}", "{{conduct_rating}}", "{{study_from}}", "{{study_to}}", "{{section}}", "{{certificate_number}}", "{{issue_date}}", "{{place}}"]'
WHERE TemplateCode IN ('CC', 'CONDUCT_CERT') OR Title LIKE '%Conduct Certificate%';

-- 4. Update Transfer Certificate
UPDATE `templates`
SET 
    ContentBody = 'This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Admission Number {{admission_no}} has studied in this college from {{study_from}} to {{study_to}} (Section {{section}}).\nHe/She is hereby relieved from this institution as he/she is seeking admission elsewhere. There are no dues towards the college.\nWe wish him/her all the best for his/her future endeavours.',
    PlaceholdersJson = '["{{student_name}}", "{{admission_no}}", "{{father_name}}", "{{mother_name}}", "{{dob}}", "{{date_of_admission}}", "{{study_from}}", "{{study_to}}", "{{reason_for_leaving}}", "{{dues_cleared}}", "{{section}}", "{{certificate_number}}", "{{issue_date}}", "{{place}}"]'
WHERE TemplateCode IN ('TC', 'TRANSFER_CERT', 'TRANSFER_CERTIFICATE') OR Title LIKE '%Transfer Certificate%';

-- 5. Update Custom Certificate (Others)
UPDATE `templates`
SET 
    ContentBody = 'This is to certify that Mr./Ms. {{student_name}} (S/o / D/o {{father_name}}) bearing Admission Number {{admission_no}}.\nThis is to certify that {{custom_body}}.',
    PlaceholdersJson = '["{{student_name}}", "{{admission_no}}", "{{father_name}}", "{{custom_body}}", "{{purpose}}", "{{certificate_number}}", "{{issue_date}}", "{{place}}", "{{board_name}}", "{{section}}"]'
WHERE TemplateCode IN ('OC', 'CUSTOM_CERT');

-- 6. Clean up any remaining copies that might have student_id in PlaceholdersJson
UPDATE `templates`
SET PlaceholdersJson = REPLACE(PlaceholdersJson, ',"{{student_id}}"', '')
WHERE PlaceholdersJson LIKE '%{{student_id}}%';

UPDATE `templates`
SET PlaceholdersJson = REPLACE(PlaceholdersJson, '"{{student_id}}",', '')
WHERE PlaceholdersJson LIKE '%{{student_id}}%';

UPDATE `templates`
SET ContentBody = REPLACE(ContentBody, 'bearing Student ID {{student_id}} and ', 'bearing ')
WHERE ContentBody LIKE '%bearing Student ID {{student_id}} and %';

UPDATE `templates`
SET ContentBody = REPLACE(ContentBody, 'bearing Student ID {{student_id}}', 'bearing ')
WHERE ContentBody LIKE '%bearing Student ID {{student_id}}%';
