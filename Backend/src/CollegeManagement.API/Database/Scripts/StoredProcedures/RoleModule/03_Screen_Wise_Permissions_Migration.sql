-- ====================================================================================
-- 03_Screen_Wise_Permissions_Migration.sql
-- Module and Screen-Wise Permissions Schema, Canonical Seeds, and Stored Procedures
-- ====================================================================================

-- 1. Ensure Columns 'Screen' and 'ScreenCode' in Permissions Table
SET @dbname = DATABASE();
SET @tablename = 'Permissions';

SET @precheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'Screen');
SET @sql = IF(@precheck = 0, 'ALTER TABLE `Permissions` ADD COLUMN `Screen` VARCHAR(100) NOT NULL DEFAULT "" AFTER `SubModule`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @precheck = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'ScreenCode');
SET @sql = IF(@precheck = 0, 'ALTER TABLE `Permissions` ADD COLUMN `ScreenCode` VARCHAR(100) NOT NULL DEFAULT "" AFTER `Screen`;', 'SELECT 1;');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Populate Screen-Wise Permissions (View, Add, Edit, Delete for each sub-screen)
INSERT IGNORE INTO `Permissions` (`Module`, `SubModule`, `Screen`, `ScreenCode`, `Action`, `PermissionCode`, `DisplayName`, `CategoryLabel`, `DisplayOrder`) VALUES
-- Overview -> Dashboard Screens
('Overview', 'Dashboard', 'Overview & Metrics', 'overview', 'View', 'overview.dashboard.overview.view', 'View Dashboard Overview', 'Overview', 1),
('Overview', 'Dashboard', 'Overview & Metrics', 'overview', 'Add', 'overview.dashboard.overview.add', 'Add Overview Widgets', 'Overview', 2),
('Overview', 'Dashboard', 'Overview & Metrics', 'overview', 'Edit', 'overview.dashboard.overview.edit', 'Customize Overview Layout', 'Overview', 3),
('Overview', 'Dashboard', 'Overview & Metrics', 'overview', 'Delete', 'overview.dashboard.overview.delete', 'Remove Overview Widgets', 'Overview', 4),

('Overview', 'Dashboard', 'Analytics & BI', 'analytics', 'View', 'overview.dashboard.analytics.view', 'View Analytics & BI', 'Overview', 5),
('Overview', 'Dashboard', 'Analytics & BI', 'analytics', 'Add', 'overview.dashboard.analytics.add', 'Export Analytics Data', 'Overview', 6),
('Overview', 'Dashboard', 'Analytics & BI', 'analytics', 'Edit', 'overview.dashboard.analytics.edit', 'Configure Analytics Filters', 'Overview', 7),
('Overview', 'Dashboard', 'Analytics & BI', 'analytics', 'Delete', 'overview.dashboard.analytics.delete', 'Reset Analytics Views', 'Overview', 8),

-- Academic -> Group Management
('Academic', 'Group Management', 'Courses & Groups', 'courses', 'View', 'academic.groups.courses.view', 'View Courses & Groups', 'Academic', 10),
('Academic', 'Group Management', 'Courses & Groups', 'courses', 'Add', 'academic.groups.courses.add', 'Create Courses & Groups', 'Academic', 11),
('Academic', 'Group Management', 'Courses & Groups', 'courses', 'Edit', 'academic.groups.courses.edit', 'Edit Courses & Groups', 'Academic', 12),
('Academic', 'Group Management', 'Courses & Groups', 'courses', 'Delete', 'academic.groups.courses.delete', 'Delete Courses & Groups', 'Academic', 13),

('Academic', 'Group Management', 'Batches & Streams', 'batches', 'View', 'academic.groups.batches.view', 'View Batches & Streams', 'Academic', 14),
('Academic', 'Group Management', 'Batches & Streams', 'batches', 'Add', 'academic.groups.batches.add', 'Create Batches & Streams', 'Academic', 15),
('Academic', 'Group Management', 'Batches & Streams', 'batches', 'Edit', 'academic.groups.batches.edit', 'Edit Batches & Streams', 'Academic', 16),
('Academic', 'Group Management', 'Batches & Streams', 'batches', 'Delete', 'academic.groups.batches.delete', 'Delete Batches & Streams', 'Academic', 17),

-- Academic -> Subject Management
('Academic', 'Subject Management', 'Subjects Directory', 'subjects', 'View', 'academic.subjects.list.view', 'View Subjects Directory', 'Academic', 20),
('Academic', 'Subject Management', 'Subjects Directory', 'subjects', 'Add', 'academic.subjects.list.add', 'Create Subject', 'Academic', 21),
('Academic', 'Subject Management', 'Subjects Directory', 'subjects', 'Edit', 'academic.subjects.list.edit', 'Edit Subject', 'Academic', 22),
('Academic', 'Subject Management', 'Subjects Directory', 'subjects', 'Delete', 'academic.subjects.list.delete', 'Delete Subject', 'Academic', 23),

('Academic', 'Subject Management', 'Faculty Subject Allocation', 'subject-assignment', 'View', 'academic.subjects.assign.view', 'View Faculty Subject Allocation', 'Academic', 24),
('Academic', 'Subject Management', 'Faculty Subject Allocation', 'subject-assignment', 'Add', 'academic.subjects.assign.add', 'Assign Subject to Faculty', 'Academic', 25),
('Academic', 'Subject Management', 'Faculty Subject Allocation', 'subject-assignment', 'Edit', 'academic.subjects.assign.edit', 'Modify Subject Assignment', 'Academic', 26),
('Academic', 'Subject Management', 'Faculty Subject Allocation', 'subject-assignment', 'Delete', 'academic.subjects.assign.delete', 'Remove Subject Assignment', 'Academic', 27),

-- Academic -> Section & Room
('Academic', 'Section & Room', 'Sections Directory', 'sections', 'View', 'academic.sections.list.view', 'View Sections Directory', 'Academic', 30),
('Academic', 'Section & Room', 'Sections Directory', 'sections', 'Add', 'academic.sections.list.add', 'Add Class Section', 'Academic', 31),
('Academic', 'Section & Room', 'Sections Directory', 'sections', 'Edit', 'academic.sections.list.edit', 'Edit Class Section', 'Academic', 32),
('Academic', 'Section & Room', 'Sections Directory', 'sections', 'Delete', 'academic.sections.list.delete', 'Delete Class Section', 'Academic', 33),

('Academic', 'Section & Room', 'Classrooms & Labs', 'rooms', 'View', 'academic.sections.rooms.view', 'View Classrooms & Labs', 'Academic', 34),
('Academic', 'Section & Room', 'Classrooms & Labs', 'rooms', 'Add', 'academic.sections.rooms.add', 'Add Classroom or Lab', 'Academic', 35),
('Academic', 'Section & Room', 'Classrooms & Labs', 'rooms', 'Edit', 'academic.sections.rooms.edit', 'Edit Room Details', 'Academic', 36),
('Academic', 'Section & Room', 'Classrooms & Labs', 'rooms', 'Delete', 'academic.sections.rooms.delete', 'Delete Room', 'Academic', 37),

-- Academic -> Timetable
('Academic', 'Timetable', 'View Timetable', 'view-timetable', 'View', 'academic.timetable.view.view', 'View Class Timetable', 'Academic', 40),
('Academic', 'Timetable', 'View Timetable', 'view-timetable', 'Add', 'academic.timetable.view.add', 'Export Timetable', 'Academic', 41),
('Academic', 'Timetable', 'View Timetable', 'view-timetable', 'Edit', 'academic.timetable.view.edit', 'Print Timetable', 'Academic', 42),
('Academic', 'Timetable', 'View Timetable', 'view-timetable', 'Delete', 'academic.timetable.view.delete', 'Clear View Filter', 'Academic', 43),

('Academic', 'Timetable', 'Timetable Setup', 'setup-timetable', 'View', 'academic.timetable.setup.view', 'View Timetable Configurations', 'Academic', 44),
('Academic', 'Timetable', 'Timetable Setup', 'setup-timetable', 'Add', 'academic.timetable.setup.add', 'Generate New Schedule', 'Academic', 45),
('Academic', 'Timetable', 'Timetable Setup', 'setup-timetable', 'Edit', 'academic.timetable.setup.edit', 'Modify Periods & Grid', 'Academic', 46),
('Academic', 'Timetable', 'Timetable Setup', 'setup-timetable', 'Delete', 'academic.timetable.setup.delete', 'Discard Timetable Draft', 'Academic', 47),

('Academic', 'Timetable', 'Faculty Substitutions', 'faculty-timetable', 'View', 'academic.timetable.faculty.view', 'View Faculty Timetables', 'Academic', 48),
('Academic', 'Timetable', 'Faculty Substitutions', 'faculty-timetable', 'Add', 'academic.timetable.faculty.add', 'Assign Substitute Faculty', 'Academic', 49),
('Academic', 'Timetable', 'Faculty Substitutions', 'faculty-timetable', 'Edit', 'academic.timetable.faculty.edit', 'Modify Substitutions', 'Academic', 50),
('Academic', 'Timetable', 'Faculty Substitutions', 'faculty-timetable', 'Delete', 'academic.timetable.faculty.delete', 'Cancel Substitute Assignment', 'Academic', 51),

-- Student -> Student Admission
('Student', 'Student Admission', 'Admission Inquiries & Forms', 'admission-pipeline', 'View', 'student.admission.pipeline.view', 'View Admission Pipeline', 'Student', 60),
('Student', 'Student Admission', 'Admission Inquiries & Forms', 'admission-pipeline', 'Add', 'student.admission.pipeline.add', 'Create Admission Application', 'Student', 61),
('Student', 'Student Admission', 'Admission Inquiries & Forms', 'admission-pipeline', 'Edit', 'student.admission.pipeline.edit', 'Edit Inquiries & Forms', 'Student', 62),
('Student', 'Student Admission', 'Admission Inquiries & Forms', 'admission-pipeline', 'Delete', 'student.admission.pipeline.delete', 'Cancel / Reject Inquiry', 'Student', 63),

('Student', 'Student Admission', 'Verification & Approval', 'admission-approval', 'View', 'student.admission.approval.view', 'View Pending Admission Approvals', 'Student', 64),
('Student', 'Student Admission', 'Verification & Approval', 'admission-approval', 'Add', 'student.admission.approval.add', 'Verify KYC Documents', 'Student', 65),
('Student', 'Student Admission', 'Verification & Approval', 'admission-approval', 'Edit', 'student.admission.approval.edit', 'Approve / Enroll Student', 'Student', 66),
('Student', 'Student Admission', 'Verification & Approval', 'admission-approval', 'Delete', 'student.admission.approval.delete', 'Revoke Admission Approval', 'Student', 67),

-- Student -> Student Management
('Student', 'Student Management', 'Student Directory', 'student-directory', 'View', 'student.records.directory.view', 'View Student Directory', 'Student', 70),
('Student', 'Student Management', 'Student Directory', 'student-directory', 'Add', 'student.records.directory.add', 'Add Student Record', 'Student', 71),
('Student', 'Student Management', 'Student Directory', 'student-directory', 'Edit', 'student.records.directory.edit', 'Edit Student Bio & Contact', 'Student', 72),
('Student', 'Student Management', 'Student Directory', 'student-directory', 'Delete', 'student.records.directory.delete', 'Deactivate Student Record', 'Student', 73),

('Student', 'Student Management', 'Student Profile', 'student-profile', 'View', 'student.records.profile.view', 'View Comprehensive Student Profile', 'Student', 74),
('Student', 'Student Management', 'Student Profile', 'student-profile', 'Add', 'student.records.profile.add', 'Add Student Remarks', 'Student', 75),
('Student', 'Student Management', 'Student Profile', 'student-profile', 'Edit', 'student.records.profile.edit', 'Update Profile Details', 'Student', 76),
('Student', 'Student Management', 'Student Profile', 'student-profile', 'Delete', 'student.records.profile.delete', 'Archive Profile', 'Student', 77),

-- Student -> Attendance
('Student', 'Attendance', 'Daily Attendance Entry', 'student-attendance', 'View', 'student.attendance.entry.view', 'View Daily Class Attendance', 'Student', 90),
('Student', 'Attendance', 'Daily Attendance Entry', 'student-attendance', 'Add', 'student.attendance.entry.add', 'Mark Class Attendance', 'Student', 91),
('Student', 'Attendance', 'Daily Attendance Entry', 'student-attendance', 'Edit', 'student.attendance.entry.edit', 'Modify Attendance Entries', 'Student', 92),
('Student', 'Attendance', 'Daily Attendance Entry', 'student-attendance', 'Delete', 'student.attendance.entry.delete', 'Reset Attendance Entries', 'Student', 93),

('Student', 'Attendance', 'Attendance Reports & Defaulters', 'attendance-reports', 'View', 'student.attendance.reports.view', 'View Attendance Reports', 'Student', 94),
('Student', 'Attendance', 'Attendance Reports & Defaulters', 'attendance-reports', 'Add', 'student.attendance.reports.add', 'Generate Defaulters Notice', 'Student', 95),
('Student', 'Attendance', 'Attendance Reports & Defaulters', 'attendance-reports', 'Edit', 'student.attendance.reports.edit', 'Export Attendance Register', 'Student', 96),
('Student', 'Attendance', 'Attendance Reports & Defaulters', 'attendance-reports', 'Delete', 'student.attendance.reports.delete', 'Clear Report Caches', 'Student', 97),

-- Finance -> Fee Management
('Finance', 'Fee Management', 'Fee Structure', 'fee-structure', 'View', 'finance.fees.structure.view', 'View Fee Structures & Templates', 'Finance', 180),
('Finance', 'Fee Management', 'Fee Structure', 'fee-structure', 'Add', 'finance.fees.structure.add', 'Create Fee Structure', 'Finance', 181),
('Finance', 'Fee Management', 'Fee Structure', 'fee-structure', 'Edit', 'finance.fees.structure.edit', 'Edit Fee Heads & Amounts', 'Finance', 182),
('Finance', 'Fee Management', 'Fee Structure', 'fee-structure', 'Delete', 'finance.fees.structure.delete', 'Delete Fee Structure', 'Finance', 183),

('Finance', 'Fee Management', 'Student Fee Ledger', 'student-fees', 'View', 'finance.fees.student.view', 'View Student Fee Ledger & Dues', 'Finance', 184),
('Finance', 'Fee Management', 'Student Fee Ledger', 'student-fees', 'Add', 'finance.fees.student.add', 'Assign Fee to Student', 'Finance', 185),
('Finance', 'Fee Management', 'Student Fee Ledger', 'student-fees', 'Edit', 'finance.fees.student.edit', 'Grant Concession / Discount', 'Finance', 186),
('Finance', 'Fee Management', 'Student Fee Ledger', 'student-fees', 'Delete', 'finance.fees.student.delete', 'Waive / Cancel Fee Dues', 'Finance', 187),

('Finance', 'Fee Management', 'Hostel Fees', 'hostel-fees', 'View', 'finance.fees.hostel.view', 'View Hostel Fee Configurations', 'Finance', 188),
('Finance', 'Fee Management', 'Hostel Fees', 'hostel-fees', 'Add', 'finance.fees.hostel.add', 'Configure Room Rent & Mess Dues', 'Finance', 189),
('Finance', 'Fee Management', 'Hostel Fees', 'hostel-fees', 'Edit', 'finance.fees.hostel.edit', 'Modify Hostel Fee Rules', 'Finance', 190),
('Finance', 'Fee Management', 'Hostel Fees', 'hostel-fees', 'Delete', 'finance.fees.hostel.delete', 'Remove Hostel Fee Rule', 'Finance', 191),

('Finance', 'Fee Management', 'Transport Fees', 'transport-fees', 'View', 'finance.fees.transport.view', 'View Transport Fees & Slabs', 'Finance', 192),
('Finance', 'Fee Management', 'Transport Fees', 'transport-fees', 'Add', 'finance.fees.transport.add', 'Configure Route & Stop Fares', 'Finance', 193),
('Finance', 'Fee Management', 'Transport Fees', 'transport-fees', 'Edit', 'finance.fees.transport.edit', 'Modify Bus Fee Amounts', 'Finance', 194),
('Finance', 'Fee Management', 'Transport Fees', 'transport-fees', 'Delete', 'finance.fees.transport.delete', 'Remove Transport Fee Rule', 'Finance', 195),

('Finance', 'Fee Management', 'Fee Types & Categories', 'fee-types', 'View', 'finance.fees.types.view', 'View Fee Heads & Types', 'Finance', 196),
('Finance', 'Fee Management', 'Fee Types & Categories', 'fee-types', 'Add', 'finance.fees.types.add', 'Create Fee Head / Category', 'Finance', 197),
('Finance', 'Fee Management', 'Fee Types & Categories', 'fee-types', 'Edit', 'finance.fees.types.edit', 'Modify Fee Type Rules', 'Finance', 198),
('Finance', 'Fee Management', 'Fee Types & Categories', 'fee-types', 'Delete', 'finance.fees.types.delete', 'Deactivate Fee Head', 'Finance', 199),

('Finance', 'Fee Management', 'Scholarships & Concessions', 'scholarships', 'View', 'finance.fees.scholarships.view', 'View Scholarship Rules', 'Finance', 200),
('Finance', 'Fee Management', 'Scholarships & Concessions', 'scholarships', 'Add', 'finance.fees.scholarships.add', 'Create Scholarship Scheme', 'Finance', 201),
('Finance', 'Fee Management', 'Scholarships & Concessions', 'scholarships', 'Edit', 'finance.fees.scholarships.edit', 'Modify Concession Waivers', 'Finance', 202),
('Finance', 'Fee Management', 'Scholarships & Concessions', 'scholarships', 'Delete', 'finance.fees.scholarships.delete', 'Delete Scholarship Scheme', 'Finance', 203),

('Finance', 'Fee Management', 'Fine & Late Fee Rules', 'fine-rules', 'View', 'finance.fees.fine.view', 'View Fine & Penalty Rules', 'Finance', 204),
('Finance', 'Fee Management', 'Fine & Late Fee Rules', 'fine-rules', 'Add', 'finance.fees.fine.add', 'Configure Overdue Penalty', 'Finance', 205),
('Finance', 'Fee Management', 'Fine & Late Fee Rules', 'fine-rules', 'Edit', 'finance.fees.fine.edit', 'Adjust Grace Days & Amounts', 'Finance', 206),
('Finance', 'Fee Management', 'Fine & Late Fee Rules', 'fine-rules', 'Delete', 'finance.fees.fine.delete', 'Remove Penalty Rule', 'Finance', 207),

('Finance', 'Fee Management', 'Payment History & Receipts', 'payment-history', 'View', 'finance.fees.history.view', 'View Payment Transaction History', 'Finance', 208),
('Finance', 'Fee Management', 'Payment History & Receipts', 'payment-history', 'Add', 'finance.fees.history.add', 'Export Payment Register', 'Finance', 209),
('Finance', 'Fee Management', 'Payment History & Receipts', 'payment-history', 'Edit', 'finance.fees.history.edit', 'Reprint / Regenerate Receipt', 'Finance', 210),
('Finance', 'Fee Management', 'Payment History & Receipts', 'payment-history', 'Delete', 'finance.fees.history.delete', 'Void Payment Record', 'Finance', 211),

('Finance', 'Fee Management', 'Fee Collection & Receipts', 'fee-collection', 'View', 'finance.fees.collection.view', 'View Fee Collection Desk', 'Finance', 212),
('Finance', 'Fee Management', 'Fee Collection & Receipts', 'fee-collection', 'Add', 'finance.fees.collection.add', 'Collect Payment & Issue Receipt', 'Finance', 213),
('Finance', 'Fee Management', 'Fee Collection & Receipts', 'fee-collection', 'Edit', 'finance.fees.collection.edit', 'Reprint / Regenerate Receipt', 'Finance', 214),
('Finance', 'Fee Management', 'Fee Collection & Receipts', 'fee-collection', 'Delete', 'finance.fees.collection.delete', 'Void / Cancel Fee Receipt', 'Finance', 215),

('Finance', 'Fee Management', 'Fee Defaulters & Reports', 'fee-reports', 'View', 'finance.fees.reports.view', 'View Defaulters & Collection Logs', 'Finance', 216),
('Finance', 'Fee Management', 'Fee Defaulters & Reports', 'fee-reports', 'Add', 'finance.fees.reports.add', 'Export Collection Spreadsheet', 'Finance', 217),
('Finance', 'Fee Management', 'Fee Defaulters & Reports', 'fee-reports', 'Edit', 'finance.fees.reports.edit', 'Send Fee Reminder SMS/Email', 'Finance', 218),
('Finance', 'Fee Management', 'Fee Defaulters & Reports', 'fee-reports', 'Delete', 'finance.fees.reports.delete', 'Clear Filter Previews', 'Finance', 219),

-- Finance -> Payroll
('Finance', 'Payroll', 'Salary Structures', 'salary-structures', 'View', 'finance.payroll.structures.view', 'View Salary Structures', 'Finance', 200),
('Finance', 'Payroll', 'Salary Structures', 'salary-structures', 'Add', 'finance.payroll.structures.add', 'Create Salary Components', 'Finance', 201),
('Finance', 'Payroll', 'Salary Structures', 'salary-structures', 'Edit', 'finance.payroll.structures.edit', 'Edit Pay Scales & Allowances', 'Finance', 202),
('Finance', 'Payroll', 'Salary Structures', 'salary-structures', 'Delete', 'finance.payroll.structures.delete', 'Delete Salary Structure', 'Finance', 203),

('Finance', 'Payroll', 'Monthly Payroll Processing', 'payroll-generation', 'View', 'finance.payroll.generation.view', 'View Monthly Payroll Drafts', 'Finance', 204),
('Finance', 'Payroll', 'Monthly Payroll Processing', 'payroll-generation', 'Add', 'finance.payroll.generation.add', 'Generate Monthly Salary Batch', 'Finance', 205),
('Finance', 'Payroll', 'Monthly Payroll Processing', 'payroll-generation', 'Edit', 'finance.payroll.generation.edit', 'Adjust Biometric / Leave Cuts', 'Finance', 206),
('Finance', 'Payroll', 'Monthly Payroll Processing', 'payroll-generation', 'Delete', 'finance.payroll.generation.delete', 'Discard Payroll Run', 'Finance', 207),

('Finance', 'Payroll', 'Staff Payslips', 'payslips', 'View', 'finance.payroll.payslips.view', 'View & Search Staff Payslips', 'Finance', 208),
('Finance', 'Payroll', 'Staff Payslips', 'payslips', 'Add', 'finance.payroll.payslips.add', 'Publish Payslips to Portal', 'Finance', 209),
('Finance', 'Payroll', 'Staff Payslips', 'payslips', 'Edit', 'finance.payroll.payslips.edit', 'Download PDF Payslips', 'Finance', 210),
('Finance', 'Payroll', 'Staff Payslips', 'payslips', 'Delete', 'finance.payroll.payslips.delete', 'Unpublish Payslips', 'Finance', 211),

-- Administration -> Roles & Permissions
('Administration', 'Roles & Permissions', 'Role & Permission Matrix', 'role-management', 'View', 'administration.roles.matrix.view', 'View Role & Permission Matrix', 'Administration', 270),
('Administration', 'Roles & Permissions', 'Role & Permission Matrix', 'role-management', 'Add', 'administration.roles.matrix.add', 'Create New System Role', 'Administration', 271),
('Administration', 'Roles & Permissions', 'Role & Permission Matrix', 'role-management', 'Edit', 'administration.roles.matrix.edit', 'Configure Module & Screen Access', 'Administration', 272),
('Administration', 'Roles & Permissions', 'Role & Permission Matrix', 'role-management', 'Delete', 'administration.roles.matrix.delete', 'Delete System Role', 'Administration', 273),

('Administration', 'Roles & Permissions', 'User Role Assignment', 'user-role-assignment', 'View', 'administration.roles.assignment.view', 'View User Role Assignments', 'Administration', 274),
('Administration', 'Roles & Permissions', 'User Role Assignment', 'user-role-assignment', 'Add', 'administration.roles.assignment.add', 'Assign Role to User', 'Administration', 275),
('Administration', 'Roles & Permissions', 'User Role Assignment', 'user-role-assignment', 'Edit', 'administration.roles.assignment.edit', 'Configure User Permission Overrides', 'Administration', 276),
('Administration', 'Roles & Permissions', 'User Role Assignment', 'user-role-assignment', 'Delete', 'administration.roles.assignment.delete', 'Remove Role from User', 'Administration', 277),

-- Academic -> Board & Academic Year Management
('Academic', 'Board & Academic Year', 'Boards & Universities', 'boards-master', 'View', 'academic.boards.master.view', 'View Boards & Universities', 'Academic', 280),
('Academic', 'Board & Academic Year', 'Boards & Universities', 'boards-master', 'Add', 'academic.boards.master.add', 'Add Board Affiliation', 'Academic', 281),
('Academic', 'Board & Academic Year', 'Boards & Universities', 'boards-master', 'Edit', 'academic.boards.master.edit', 'Edit Board Details', 'Academic', 282),
('Academic', 'Board & Academic Year', 'Boards & Universities', 'boards-master', 'Delete', 'academic.boards.master.delete', 'Delete Board Affiliation', 'Academic', 283),

('Academic', 'Board & Academic Year', 'Academic Years & Sessions', 'academic-years', 'View', 'academic.boards.years.view', 'View Academic Years & Sessions', 'Academic', 284),
('Academic', 'Board & Academic Year', 'Academic Years & Sessions', 'academic-years', 'Add', 'academic.boards.years.add', 'Create Academic Year', 'Academic', 285),
('Academic', 'Board & Academic Year', 'Academic Years & Sessions', 'academic-years', 'Edit', 'academic.boards.years.edit', 'Edit Academic Year / Active Status', 'Academic', 286),
('Academic', 'Board & Academic Year', 'Academic Years & Sessions', 'academic-years', 'Delete', 'academic.boards.years.delete', 'Delete Academic Year', 'Academic', 287),

-- Staff -> Staff Reimbursements
('Staff', 'Staff Reimbursements', 'Submit Reimbursement Claim', 'submit-claim', 'View', 'staff.reimbursement.submit.view', 'View Reimbursement Claims', 'Staff', 290),
('Staff', 'Staff Reimbursements', 'Submit Reimbursement Claim', 'submit-claim', 'Add', 'staff.reimbursement.submit.add', 'Submit Reimbursement Claim', 'Staff', 291),
('Staff', 'Staff Reimbursements', 'Submit Reimbursement Claim', 'submit-claim', 'Edit', 'staff.reimbursement.submit.edit', 'Edit Reimbursement Claim', 'Staff', 292),
('Staff', 'Staff Reimbursements', 'Submit Reimbursement Claim', 'submit-claim', 'Delete', 'staff.reimbursement.submit.delete', 'Cancel Reimbursement Claim', 'Staff', 293),

('Staff', 'Staff Reimbursements', 'Claim Approvals Desk', 'claim-approvals', 'View', 'staff.reimbursement.approvals.view', 'View Pending Claims to Approve', 'Staff', 294),
('Staff', 'Staff Reimbursements', 'Claim Approvals Desk', 'claim-approvals', 'Add', 'staff.reimbursement.approvals.add', 'Approve / Reject Claim', 'Staff', 295),
('Staff', 'Staff Reimbursements', 'Claim Approvals Desk', 'claim-approvals', 'Edit', 'staff.reimbursement.approvals.edit', 'Adjust Approved Claim Amount', 'Staff', 296),
('Staff', 'Staff Reimbursements', 'Claim Approvals Desk', 'claim-approvals', 'Delete', 'staff.reimbursement.approvals.delete', 'Reject / Void Claim', 'Staff', 297),

('Staff', 'Staff Reimbursements', 'Disbursement History', 'disbursement-history', 'View', 'staff.reimbursement.history.view', 'View Disbursement History', 'Staff', 298),
('Staff', 'Staff Reimbursements', 'Disbursement History', 'disbursement-history', 'Add', 'staff.reimbursement.history.add', 'Export Disbursement Register', 'Staff', 299),
('Staff', 'Staff Reimbursements', 'Disbursement History', 'disbursement-history', 'Edit', 'staff.reimbursement.history.edit', 'Update Settlement Ref', 'Staff', 300),
('Staff', 'Staff Reimbursements', 'Disbursement History', 'disbursement-history', 'Delete', 'staff.reimbursement.history.delete', 'Void Settlement', 'Staff', 301),

-- Administration -> Settings (All 9 Concrete Screens)
('Administration', 'Settings', 'Landing Page Configuration', 'landing-configuration', 'View', 'administration.settings.landing.view', 'View Landing Page Settings', 'Administration', 310),
('Administration', 'Settings', 'Landing Page Configuration', 'landing-configuration', 'Add', 'administration.settings.landing.add', 'Upload Landing Images', 'Administration', 311),
('Administration', 'Settings', 'Landing Page Configuration', 'landing-configuration', 'Edit', 'administration.settings.landing.edit', 'Update Landing Content & Branding', 'Administration', 312),
('Administration', 'Settings', 'Landing Page Configuration', 'landing-configuration', 'Delete', 'administration.settings.landing.delete', 'Remove Landing Image', 'Administration', 313),

('Administration', 'Settings', 'Login Page Configuration', 'login-configuration', 'View', 'administration.settings.login.view', 'View Login Page Settings', 'Administration', 314),
('Administration', 'Settings', 'Login Page Configuration', 'login-configuration', 'Add', 'administration.settings.login.add', 'Upload Login Image', 'Administration', 315),
('Administration', 'Settings', 'Login Page Configuration', 'login-configuration', 'Edit', 'administration.settings.login.edit', 'Update Login Branding & Form Text', 'Administration', 316),
('Administration', 'Settings', 'Login Page Configuration', 'login-configuration', 'Delete', 'administration.settings.login.delete', 'Reset Login Background', 'Administration', 317),

('Administration', 'Settings', 'Campus Configuration & Branches', 'campus-configuration', 'View', 'administration.settings.campus.view', 'View Campus Branches', 'Administration', 318),
('Administration', 'Settings', 'Campus Configuration & Branches', 'campus-configuration', 'Add', 'administration.settings.campus.add', 'Create Campus Branch', 'Administration', 319),
('Administration', 'Settings', 'Campus Configuration & Branches', 'campus-configuration', 'Edit', 'administration.settings.campus.edit', 'Edit Campus Details & Address', 'Administration', 320),
('Administration', 'Settings', 'Campus Configuration & Branches', 'campus-configuration', 'Delete', 'administration.settings.campus.delete', 'Deactivate Campus Branch', 'Administration', 321),

('Administration', 'Settings', 'Auto Number Series', 'number-series', 'View', 'administration.settings.numberseries.view', 'View Auto Number Series', 'Administration', 322),
('Administration', 'Settings', 'Auto Number Series', 'number-series', 'Add', 'administration.settings.numberseries.add', 'Create Number Series Format', 'Administration', 323),
('Administration', 'Settings', 'Auto Number Series', 'number-series', 'Edit', 'administration.settings.numberseries.edit', 'Modify Number Prefix & Sequence', 'Administration', 324),
('Administration', 'Settings', 'Auto Number Series', 'number-series', 'Delete', 'administration.settings.numberseries.delete', 'Reset Number Counter', 'Administration', 325),

('Administration', 'Settings', 'Templates & Bulk Uploaders', 'templates', 'View', 'administration.settings.templates.view', 'View Document Templates', 'Administration', 326),
('Administration', 'Settings', 'Templates & Bulk Uploaders', 'templates', 'Add', 'administration.settings.templates.add', 'Upload Document / Certificate Template', 'Administration', 327),
('Administration', 'Settings', 'Templates & Bulk Uploaders', 'templates', 'Edit', 'administration.settings.templates.edit', 'Modify Template Configuration', 'Administration', 328),
('Administration', 'Settings', 'Templates & Bulk Uploaders', 'templates', 'Delete', 'administration.settings.templates.delete', 'Delete Document Template', 'Administration', 329),

('Administration', 'Settings', 'Leave Types & Quotas', 'leave-types', 'View', 'administration.settings.leavetypes.view', 'View Leave Types Setup', 'Administration', 330),
('Administration', 'Settings', 'Leave Types & Quotas', 'leave-types', 'Add', 'administration.settings.leavetypes.add', 'Add Leave Type Category', 'Administration', 331),
('Administration', 'Settings', 'Leave Types & Quotas', 'leave-types', 'Edit', 'administration.settings.leavetypes.edit', 'Update Quota & Carry-Forward Rules', 'Administration', 332),
('Administration', 'Settings', 'Leave Types & Quotas', 'leave-types', 'Delete', 'administration.settings.leavetypes.delete', 'Deactivate Leave Category', 'Administration', 333),

('Administration', 'Settings', 'Attendance Timings & Shifts', 'attendance-timing', 'View', 'administration.settings.timings.view', 'View Shift Timings', 'Administration', 334),
('Administration', 'Settings', 'Attendance Timings & Shifts', 'attendance-timing', 'Add', 'administration.settings.timings.add', 'Add Campus Shift Time', 'Administration', 335),
('Administration', 'Settings', 'Attendance Timings & Shifts', 'attendance-timing', 'Edit', 'administration.settings.timings.edit', 'Modify Grace Periods & Late Rules', 'Administration', 336),
('Administration', 'Settings', 'Attendance Timings & Shifts', 'attendance-timing', 'Delete', 'administration.settings.timings.delete', 'Remove Shift Timing', 'Administration', 337),

('Administration', 'Settings', 'Credentials Generator', 'credentials', 'View', 'administration.settings.credentials.view', 'View Credentials Generator Desk', 'Administration', 338),
('Administration', 'Settings', 'Credentials Generator', 'credentials', 'Add', 'administration.settings.credentials.add', 'Generate Batch Credentials', 'Administration', 339),
('Administration', 'Settings', 'Credentials Generator', 'credentials', 'Edit', 'administration.settings.credentials.edit', 'Reset / Regenerate Password', 'Administration', 340),
('Administration', 'Settings', 'Credentials Generator', 'credentials', 'Delete', 'administration.settings.credentials.delete', 'Revoke Access Credentials', 'Administration', 341),

('Administration', 'Settings', 'Audit & Security Logs', 'audit-logs', 'View', 'administration.settings.audit.view', 'View Audit & Security Logs', 'Administration', 342),
('Administration', 'Settings', 'Audit & Security Logs', 'audit-logs', 'Add', 'administration.settings.audit.add', 'Export Audit Trail to CSV', 'Administration', 343),
('Administration', 'Settings', 'Audit & Security Logs', 'audit-logs', 'Edit', 'administration.settings.audit.edit', 'Filter Audit Event Types', 'Administration', 344),
('Administration', 'Settings', 'Audit & Security Logs', 'audit-logs', 'Delete', 'administration.settings.audit.delete', 'Archive Audit Logs', 'Administration', 345),

-- Operations -> Transport
('Operations', 'Transport', 'Bus Routes & Stops', 'routes', 'View', 'operations.transport.routes.view', 'View Bus Routes & Stops', 'Operations', 350),
('Operations', 'Transport', 'Bus Routes & Stops', 'routes', 'Add', 'operations.transport.routes.add', 'Create Bus Route', 'Operations', 351),
('Operations', 'Transport', 'Bus Routes & Stops', 'routes', 'Edit', 'operations.transport.routes.edit', 'Edit Route Stops & Distance', 'Operations', 352),
('Operations', 'Transport', 'Bus Routes & Stops', 'routes', 'Delete', 'operations.transport.routes.delete', 'Delete Bus Route', 'Operations', 353),

('Operations', 'Transport', 'Pickup Points Master', 'pickup-points', 'View', 'operations.transport.pickuppoints.view', 'View Pickup Points Master', 'Operations', 354),
('Operations', 'Transport', 'Pickup Points Master', 'pickup-points', 'Add', 'operations.transport.pickuppoints.add', 'Add Bus Pickup Point', 'Operations', 355),
('Operations', 'Transport', 'Pickup Points Master', 'pickup-points', 'Edit', 'operations.transport.pickuppoints.edit', 'Edit Pickup Timing & Sequence', 'Operations', 356),
('Operations', 'Transport', 'Pickup Points Master', 'pickup-points', 'Delete', 'operations.transport.pickuppoints.delete', 'Remove Pickup Point', 'Operations', 357),

('Operations', 'Transport', 'Fleet & Vehicles', 'vehicles', 'View', 'operations.transport.vehicles.view', 'View Fleet & Vehicles', 'Operations', 358),
('Operations', 'Transport', 'Fleet & Vehicles', 'vehicles', 'Add', 'operations.transport.vehicles.add', 'Add Vehicle to Fleet', 'Operations', 359),
('Operations', 'Transport', 'Fleet & Vehicles', 'vehicles', 'Edit', 'operations.transport.vehicles.edit', 'Update Registration & Insurance', 'Operations', 360),
('Operations', 'Transport', 'Fleet & Vehicles', 'vehicles', 'Delete', 'operations.transport.vehicles.delete', 'Decommission Vehicle', 'Operations', 361),

('Operations', 'Transport', 'Driver & Bus Allocations', 'driver-assignment', 'View', 'operations.transport.drivers.view', 'View Driver & Bus Allocations', 'Operations', 362),
('Operations', 'Transport', 'Driver & Bus Allocations', 'driver-assignment', 'Add', 'operations.transport.drivers.add', 'Assign Driver to Bus Route', 'Operations', 363),
('Operations', 'Transport', 'Driver & Bus Allocations', 'driver-assignment', 'Edit', 'operations.transport.drivers.edit', 'Modify Driver Assignment', 'Operations', 364),
('Operations', 'Transport', 'Driver & Bus Allocations', 'driver-assignment', 'Delete', 'operations.transport.drivers.delete', 'Remove Driver Assignment', 'Operations', 365),

('Operations', 'Transport', 'Student Transport Passes', 'student-transport', 'View', 'operations.transport.passes.view', 'View Student Transport Passes', 'Operations', 366),
('Operations', 'Transport', 'Student Transport Passes', 'student-transport', 'Add', 'operations.transport.passes.add', 'Issue Student Bus Pass', 'Operations', 367),
('Operations', 'Transport', 'Student Transport Passes', 'student-transport', 'Edit', 'operations.transport.passes.edit', 'Modify Student Bus Stage', 'Operations', 368),
('Operations', 'Transport', 'Student Transport Passes', 'student-transport', 'Delete', 'operations.transport.passes.delete', 'Cancel Bus Pass', 'Operations', 369),

('Operations', 'Transport', 'Live GPS Tracking', 'live-tracking', 'View', 'operations.transport.gps.view', 'View Real-Time Bus GPS', 'Operations', 370),
('Operations', 'Transport', 'Live GPS Tracking', 'live-tracking', 'Add', 'operations.transport.gps.add', 'Broadcast Trip Delay Alert', 'Operations', 371),
('Operations', 'Transport', 'Live GPS Tracking', 'live-tracking', 'Edit', 'operations.transport.gps.edit', 'Configure Geofence / Checkpoint', 'Operations', 372),
('Operations', 'Transport', 'Live GPS Tracking', 'live-tracking', 'Delete', 'operations.transport.gps.delete', 'Reset GPS Cache', 'Operations', 373),

('Operations', 'Transport', 'Fleet Maintenance & Service', 'maintenance', 'View', 'operations.transport.maintenance.view', 'View Fleet Maintenance Logs', 'Operations', 374),
('Operations', 'Transport', 'Fleet Maintenance & Service', 'maintenance', 'Add', 'operations.transport.maintenance.add', 'Create Service Work Order', 'Operations', 375),
('Operations', 'Transport', 'Fleet Maintenance & Service', 'maintenance', 'Edit', 'operations.transport.maintenance.edit', 'Update Maintenance / Fuel Log', 'Operations', 376),
('Operations', 'Transport', 'Fleet Maintenance & Service', 'maintenance', 'Delete', 'operations.transport.maintenance.delete', 'Void Maintenance Record', 'Operations', 377),

-- Hostel Management -> Hostel Management
('Hostel Management', 'Hostel Management', 'Hostel Blocks, Rooms & Beds', 'hostel-rooms', 'View', 'hostel.management.rooms.view', 'View Hostel Rooms & Beds', 'Hostel Management', 380),
('Hostel Management', 'Hostel Management', 'Hostel Blocks, Rooms & Beds', 'hostel-rooms', 'Add', 'hostel.management.rooms.add', 'Add Room / Bed Inventory', 'Hostel Management', 381),
('Hostel Management', 'Hostel Management', 'Hostel Blocks, Rooms & Beds', 'hostel-rooms', 'Edit', 'hostel.management.rooms.edit', 'Edit Room Details & Rent', 'Hostel Management', 382),
('Hostel Management', 'Hostel Management', 'Hostel Blocks, Rooms & Beds', 'hostel-rooms', 'Delete', 'hostel.management.rooms.delete', 'Decommission Room / Bed', 'Hostel Management', 383),

('Hostel Management', 'Hostel Management', 'Resident Student Allocation', 'bed-allocation', 'View', 'hostel.management.allocation.view', 'View Resident Student Allocations', 'Hostel Management', 384),
('Hostel Management', 'Hostel Management', 'Resident Student Allocation', 'bed-allocation', 'Add', 'hostel.management.allocation.add', 'Allocate Student to Bed', 'Hostel Management', 385),
('Hostel Management', 'Hostel Management', 'Resident Student Allocation', 'bed-allocation', 'Edit', 'hostel.management.allocation.edit', 'Change Student Room / Bed', 'Hostel Management', 386),
('Hostel Management', 'Hostel Management', 'Resident Student Allocation', 'bed-allocation', 'Delete', 'hostel.management.allocation.delete', 'Vacate / Check-out Student', 'Hostel Management', 387),

('Hostel Management', 'Hostel Management', 'Hostel Night Attendance', 'hostel-attendance', 'View', 'hostel.management.attendance.view', 'View Hostel Night Attendance', 'Hostel Management', 388),
('Hostel Management', 'Hostel Management', 'Hostel Night Attendance', 'hostel-attendance', 'Add', 'hostel.management.attendance.add', 'Mark Night Roll Call', 'Hostel Management', 389),
('Hostel Management', 'Hostel Management', 'Hostel Night Attendance', 'hostel-attendance', 'Edit', 'hostel.management.attendance.edit', 'Modify Night Attendance', 'Hostel Management', 390),
('Hostel Management', 'Hostel Management', 'Hostel Night Attendance', 'hostel-attendance', 'Delete', 'hostel.management.attendance.delete', 'Reset Night Roll Call', 'Hostel Management', 391),

('Hostel Management', 'Hostel Management', 'Outpass, Leaves & Complaints', 'hostel-complaints', 'View', 'hostel.management.complaints.view', 'View Outpasses & Complaints', 'Hostel Management', 392),
('Hostel Management', 'Hostel Management', 'Outpass, Leaves & Complaints', 'hostel-complaints', 'Add', 'hostel.management.complaints.add', 'Create Maintenance Ticket', 'Hostel Management', 393),
('Hostel Management', 'Hostel Management', 'Outpass, Leaves & Complaints', 'hostel-complaints', 'Edit', 'hostel.management.complaints.edit', 'Approve Outpass / Resolve Ticket', 'Hostel Management', 394),
('Hostel Management', 'Hostel Management', 'Outpass, Leaves & Complaints', 'hostel-complaints', 'Delete', 'hostel.management.complaints.delete', 'Reject / Void Request', 'Hostel Management', 395),

('Hostel Management', 'Hostel Management', 'Hostel Occupancy & Mess Dues', 'hostel-reports', 'View', 'hostel.management.reports.view', 'View Occupancy & Mess Reports', 'Hostel Management', 396),
('Hostel Management', 'Hostel Management', 'Hostel Occupancy & Mess Dues', 'hostel-reports', 'Add', 'hostel.management.reports.add', 'Export Occupancy Roster', 'Hostel Management', 397),
('Hostel Management', 'Hostel Management', 'Hostel Occupancy & Mess Dues', 'hostel-reports', 'Edit', 'hostel.management.reports.edit', 'Send Mess Due Reminders', 'Hostel Management', 398),
('Hostel Management', 'Hostel Management', 'Hostel Occupancy & Mess Dues', 'hostel-reports', 'Delete', 'hostel.management.reports.delete', 'Clear Report Caches', 'Hostel Management', 399),

-- Staff -> Staff Management
('Staff', 'Staff Management', 'Teaching Faculty Directory', 'teaching-staff', 'View', 'staff.records.teaching.view', 'View Teaching Faculty Directory', 'Staff', 410),
('Staff', 'Staff Management', 'Teaching Faculty Directory', 'teaching-staff', 'Add', 'staff.records.teaching.add', 'Add Teaching Faculty', 'Staff', 411),
('Staff', 'Staff Management', 'Teaching Faculty Directory', 'teaching-staff', 'Edit', 'staff.records.teaching.edit', 'Edit Teaching Faculty Info', 'Staff', 412),
('Staff', 'Staff Management', 'Teaching Faculty Directory', 'teaching-staff', 'Delete', 'staff.records.teaching.delete', 'Deactivate Faculty Record', 'Staff', 413),

('Staff', 'Staff Management', 'Non-Teaching Staff Directory', 'non-teaching-staff', 'View', 'staff.records.nonteaching.view', 'View Non-Teaching Staff', 'Staff', 414),
('Staff', 'Staff Management', 'Non-Teaching Staff Directory', 'non-teaching-staff', 'Add', 'staff.records.nonteaching.add', 'Add Non-Teaching Staff', 'Staff', 415),
('Staff', 'Staff Management', 'Non-Teaching Staff Directory', 'non-teaching-staff', 'Edit', 'staff.records.nonteaching.edit', 'Edit Non-Teaching Staff Info', 'Staff', 416),
('Staff', 'Staff Management', 'Non-Teaching Staff Directory', 'non-teaching-staff', 'Delete', 'staff.records.nonteaching.delete', 'Deactivate Staff Record', 'Staff', 417),

('Staff', 'Staff Management', 'Staff Onboarding & Review', 'staff-onboarding', 'View', 'staff.records.onboarding.view', 'View Staff Onboarding List', 'Staff', 418),
('Staff', 'Staff Management', 'Staff Onboarding & Review', 'staff-onboarding', 'Add', 'staff.records.onboarding.add', 'Generate Onboarding Link', 'Staff', 419),
('Staff', 'Staff Management', 'Staff Onboarding & Review', 'staff-onboarding', 'Edit', 'staff.records.onboarding.edit', 'Verify KYC Documents', 'Staff', 420),
('Staff', 'Staff Management', 'Staff Onboarding & Review', 'staff-onboarding', 'Delete', 'staff.records.onboarding.delete', 'Reject / Revoke Onboarding', 'Staff', 421),

('Staff', 'Staff Management', 'Staff Profile & KYC Details', 'staff-profile', 'View', 'staff.records.profile.view', 'View Comprehensive Staff Profile', 'Staff', 422),
('Staff', 'Staff Management', 'Staff Profile & KYC Details', 'staff-profile', 'Add', 'staff.records.profile.add', 'Add Staff Qualification / Cert', 'Staff', 423),
('Staff', 'Staff Management', 'Staff Profile & KYC Details', 'staff-profile', 'Edit', 'staff.records.profile.edit', 'Update Staff Profile Bio', 'Staff', 424),
('Staff', 'Staff Management', 'Staff Profile & KYC Details', 'staff-profile', 'Delete', 'staff.records.profile.delete', 'Archive Profile Documents', 'Staff', 425),

-- Staff -> Department & Designation
('Staff', 'Department & Designation', 'Departments Directory', 'departments', 'View', 'staff.dept.list.view', 'View Departments Directory', 'Staff', 430),
('Staff', 'Department & Designation', 'Departments Directory', 'departments', 'Add', 'staff.dept.list.add', 'Create Department', 'Staff', 431),
('Staff', 'Department & Designation', 'Departments Directory', 'departments', 'Edit', 'staff.dept.list.edit', 'Edit Department Info', 'Staff', 432),
('Staff', 'Department & Designation', 'Departments Directory', 'departments', 'Delete', 'staff.dept.list.delete', 'Delete Department', 'Staff', 433),

('Staff', 'Department & Designation', 'Designations Directory', 'designations', 'View', 'staff.designation.list.view', 'View Designations Directory', 'Staff', 434),
('Staff', 'Department & Designation', 'Designations Directory', 'designations', 'Add', 'staff.designation.list.add', 'Create Designation', 'Staff', 435),
('Staff', 'Department & Designation', 'Designations Directory', 'designations', 'Edit', 'staff.designation.list.edit', 'Edit Designation Info', 'Staff', 436),
('Staff', 'Department & Designation', 'Designations Directory', 'designations', 'Delete', 'staff.designation.list.delete', 'Delete Designation', 'Staff', 437),

-- Staff -> Staff Attendance
('Staff', 'Staff Attendance', 'Mark Staff Attendance', 'mark-staff-attendance', 'View', 'staff.attendance.mark.view', 'View Staff Attendance Entry', 'Staff', 440),
('Staff', 'Staff Attendance', 'Mark Staff Attendance', 'mark-staff-attendance', 'Add', 'staff.attendance.mark.add', 'Mark Daily Staff Attendance', 'Staff', 441),
('Staff', 'Staff Attendance', 'Mark Staff Attendance', 'mark-staff-attendance', 'Edit', 'staff.attendance.mark.edit', 'Modify Staff Attendance Records', 'Staff', 442),
('Staff', 'Staff Attendance', 'Mark Staff Attendance', 'mark-staff-attendance', 'Delete', 'staff.attendance.mark.delete', 'Reset Staff Attendance', 'Staff', 443),

('Staff', 'Staff Attendance', 'Staff Attendance Overview', 'staff-attendance-overview', 'View', 'staff.attendance.overview.view', 'View Monthly Attendance Overview', 'Staff', 444),
('Staff', 'Staff Attendance', 'Staff Attendance Overview', 'staff-attendance-overview', 'Add', 'staff.attendance.overview.add', 'Export Monthly Summary', 'Staff', 445),
('Staff', 'Staff Attendance', 'Staff Attendance Overview', 'staff-attendance-overview', 'Edit', 'staff.attendance.overview.edit', 'Adjust Duty Offs', 'Staff', 446),
('Staff', 'Staff Attendance', 'Staff Attendance Overview', 'staff-attendance-overview', 'Delete', 'staff.attendance.overview.delete', 'Clear View Cache', 'Staff', 447),

('Staff', 'Staff Attendance', 'Biometric Logs & Reports', 'staff-attendance-logs', 'View', 'staff.attendance.biometric.view', 'View Biometric In/Out Logs', 'Staff', 448),
('Staff', 'Staff Attendance', 'Biometric Logs & Reports', 'staff-attendance-logs', 'Add', 'staff.attendance.biometric.add', 'Sync Biometric Terminal Logs', 'Staff', 449),
('Staff', 'Staff Attendance', 'Biometric Logs & Reports', 'staff-attendance-logs', 'Edit', 'staff.attendance.biometric.edit', 'Manual Punch Regularization', 'Staff', 450),
('Staff', 'Staff Attendance', 'Biometric Logs & Reports', 'staff-attendance-logs', 'Delete', 'staff.attendance.biometric.delete', 'Discard Raw Terminal Logs', 'Staff', 451),

-- Staff -> Staff Leave Management
('Staff', 'Staff Leave Management', 'Leave Applications', 'leave-applications', 'View', 'staff.leave.apply.view', 'View Staff Leave Applications', 'Staff', 460),
('Staff', 'Staff Leave Management', 'Leave Applications', 'leave-applications', 'Add', 'staff.leave.apply.add', 'Submit Leave Application', 'Staff', 461),
('Staff', 'Staff Leave Management', 'Leave Applications', 'leave-applications', 'Edit', 'staff.leave.apply.edit', 'Modify Leave Application', 'Staff', 462),
('Staff', 'Staff Leave Management', 'Leave Applications', 'leave-applications', 'Delete', 'staff.leave.apply.delete', 'Withdraw / Cancel Leave', 'Staff', 463),

('Staff', 'Staff Leave Management', 'Leave Approvals', 'leave-approvals', 'View', 'staff.leave.approve.view', 'View Pending Leave Approvals', 'Staff', 464),
('Staff', 'Staff Leave Management', 'Leave Approvals', 'leave-approvals', 'Add', 'staff.leave.approve.add', 'Approve / Reject Leave', 'Staff', 465),
('Staff', 'Staff Leave Management', 'Leave Approvals', 'leave-approvals', 'Edit', 'staff.leave.approve.edit', 'Adjust Leave Days / Type', 'Staff', 466),
('Staff', 'Staff Leave Management', 'Leave Approvals', 'leave-approvals', 'Delete', 'staff.leave.approve.delete', 'Revoke Approved Leave', 'Staff', 467),

('Staff', 'Staff Leave Management', 'Leave Balance & History', 'leave-balances', 'View', 'staff.leave.balance.view', 'View Staff Leave Ledgers', 'Staff', 468),
('Staff', 'Staff Leave Management', 'Leave Balance & History', 'leave-balances', 'Add', 'staff.leave.balance.add', 'Credit Annual Leave Quota', 'Staff', 469),
('Staff', 'Staff Leave Management', 'Leave Balance & History', 'leave-balances', 'Edit', 'staff.leave.balance.edit', 'Manual Quota Adjustment', 'Staff', 470),
('Staff', 'Staff Leave Management', 'Leave Balance & History', 'leave-balances', 'Delete', 'staff.leave.balance.delete', 'Lapse Expired Quota', 'Staff', 471),

-- Examinations -> Examination
('Examinations', 'Examination', 'Exam Schedules & Datesheets', 'exam-schedules', 'View', 'exam.schedule.view', 'View Exam Datesheets', 'Examinations', 480),
('Examinations', 'Examination', 'Exam Schedules & Datesheets', 'exam-schedules', 'Add', 'exam.schedule.add', 'Create Examination Schedule', 'Examinations', 481),
('Examinations', 'Examination', 'Exam Schedules & Datesheets', 'exam-schedules', 'Edit', 'exam.schedule.edit', 'Reschedule Exam Timings', 'Examinations', 482),
('Examinations', 'Examination', 'Exam Schedules & Datesheets', 'exam-schedules', 'Delete', 'exam.schedule.delete', 'Cancel Exam Session', 'Examinations', 483),

('Examinations', 'Examination', 'Exam Hall Allocation', 'hall-allocation', 'View', 'exam.hall.view', 'View Exam Hall Allocations', 'Examinations', 484),
('Examinations', 'Examination', 'Exam Hall Allocation', 'hall-allocation', 'Add', 'exam.hall.add', 'Generate Seating Plan', 'Examinations', 485),
('Examinations', 'Examination', 'Exam Hall Allocation', 'hall-allocation', 'Edit', 'exam.hall.edit', 'Modify Seating Arrangements', 'Examinations', 486),
('Examinations', 'Examination', 'Exam Hall Allocation', 'hall-allocation', 'Delete', 'exam.hall.delete', 'Reset Hall Allocation', 'Examinations', 487),

('Examinations', 'Examination', 'Hall Tickets', 'hall-tickets', 'View', 'exam.tickets.view', 'View Student Hall Tickets', 'Examinations', 488),
('Examinations', 'Examination', 'Hall Tickets', 'hall-tickets', 'Add', 'exam.tickets.add', 'Generate Hall Tickets Batch', 'Examinations', 489),
('Examinations', 'Examination', 'Hall Tickets', 'hall-tickets', 'Edit', 'exam.tickets.edit', 'Print / Download Admit Cards', 'Examinations', 490),
('Examinations', 'Examination', 'Hall Tickets', 'hall-tickets', 'Delete', 'exam.tickets.delete', 'Withhold Hall Ticket', 'Examinations', 491),

('Examinations', 'Examination', 'Exam Cell Reports', 'exam-reports', 'View', 'exam.reports.view', 'View Exam Attendance & Rosters', 'Examinations', 492),
('Examinations', 'Examination', 'Exam Cell Reports', 'exam-reports', 'Add', 'exam.reports.add', 'Export Exam Attendance Sheets', 'Examinations', 493),
('Examinations', 'Examination', 'Exam Cell Reports', 'exam-reports', 'Edit', 'exam.reports.edit', 'Log Room Invigilator Duty', 'Examinations', 494),
('Examinations', 'Examination', 'Exam Cell Reports', 'exam-reports', 'Delete', 'exam.reports.delete', 'Clear Report Caches', 'Examinations', 495),

-- Examinations -> Marks Evaluation
('Examinations', 'Marks Evaluation', 'Enter Subject Marks', 'marks-entry', 'View', 'exam.marks.entry.view', 'View Subject Marks Register', 'Examinations', 500),
('Examinations', 'Marks Evaluation', 'Enter Subject Marks', 'marks-entry', 'Add', 'exam.marks.entry.add', 'Enter Student Marks', 'Examinations', 501),
('Examinations', 'Marks Evaluation', 'Enter Subject Marks', 'marks-entry', 'Edit', 'exam.marks.entry.edit', 'Update Internal / External Marks', 'Examinations', 502),
('Examinations', 'Marks Evaluation', 'Enter Subject Marks', 'marks-entry', 'Delete', 'exam.marks.entry.delete', 'Clear Marks Draft', 'Examinations', 503),

('Examinations', 'Marks Evaluation', 'Marks Verification & Lock', 'marks-verification', 'View', 'exam.marks.verify.view', 'View Marks Moderation Desk', 'Examinations', 504),
('Examinations', 'Marks Evaluation', 'Marks Verification & Lock', 'marks-verification', 'Add', 'exam.marks.verify.add', 'Freeze & Lock Subject Marks', 'Examinations', 505),
('Examinations', 'Marks Evaluation', 'Marks Verification & Lock', 'marks-verification', 'Edit', 'exam.marks.verify.edit', 'Moderation Mark Adjustments', 'Examinations', 506),
('Examinations', 'Marks Evaluation', 'Marks Verification & Lock', 'marks-verification', 'Delete', 'exam.marks.verify.delete', 'Unlock Marks for Re-evaluation', 'Examinations', 507),

-- Examinations -> Results
('Examinations', 'Results', 'Process & Calculate GPA', 'process-results', 'View', 'exam.results.calc.view', 'View GPA / Rank Processing', 'Examinations', 510),
('Examinations', 'Results', 'Process & Calculate GPA', 'process-results', 'Add', 'exam.results.calc.add', 'Execute GPA / CGPA Batch Run', 'Examinations', 511),
('Examinations', 'Results', 'Process & Calculate GPA', 'process-results', 'Edit', 'exam.results.calc.edit', 'Apply Grace Marks Rule', 'Examinations', 512),
('Examinations', 'Results', 'Process & Calculate GPA', 'process-results', 'Delete', 'exam.results.calc.delete', 'Discard Result Calculations', 'Examinations', 513),

('Examinations', 'Results', 'Publish Results & Memos', 'publish-results', 'View', 'exam.results.publish.view', 'View Result Publication Desk', 'Examinations', 514),
('Examinations', 'Results', 'Publish Results & Memos', 'publish-results', 'Add', 'exam.results.publish.add', 'Publish Results to Student Portal', 'Examinations', 515),
('Examinations', 'Results', 'Publish Results & Memos', 'publish-results', 'Edit', 'exam.results.publish.edit', 'Generate Marks Memos PDF', 'Examinations', 516),
('Examinations', 'Results', 'Publish Results & Memos', 'publish-results', 'Delete', 'exam.results.publish.delete', 'Unpublish / Recall Results', 'Examinations', 517),

-- Student -> Promotion
('Student', 'Promotion', 'Promotion Eligibility', 'eligible', 'View', 'student.promotion.eligible.view', 'View Promotion Eligibility', 'Student', 520),
('Student', 'Promotion', 'Promotion Eligibility', 'eligible', 'Add', 'student.promotion.eligible.add', 'Evaluate Batch Eligibility', 'Student', 521),
('Student', 'Promotion', 'Promotion Eligibility', 'eligible', 'Edit', 'student.promotion.eligible.edit', 'Adjust Attendance/Marks Waiver', 'Student', 522),
('Student', 'Promotion', 'Promotion Eligibility', 'eligible', 'Delete', 'student.promotion.eligible.delete', 'Reset Eligibility Calculations', 'Student', 523),

('Student', 'Promotion', 'Single Student Promotion', 'single', 'View', 'student.promotion.single.view', 'View Single Student Status', 'Student', 524),
('Student', 'Promotion', 'Single Student Promotion', 'single', 'Add', 'student.promotion.single.add', 'Promote / Detain Student', 'Student', 525),
('Student', 'Promotion', 'Single Student Promotion', 'single', 'Edit', 'student.promotion.single.edit', 'Update Promotion Override Reason', 'Student', 526),
('Student', 'Promotion', 'Single Student Promotion', 'single', 'Delete', 'student.promotion.single.delete', 'Revert Student Status', 'Student', 527),

('Student', 'Promotion', 'Section Allocation on Promotion', 'allocation', 'View', 'student.promotion.alloc.view', 'View Promoted Section Intake', 'Student', 528),
('Student', 'Promotion', 'Section Allocation on Promotion', 'allocation', 'Add', 'student.promotion.alloc.add', 'Assign Promoted Students to Section', 'Student', 529),
('Student', 'Promotion', 'Section Allocation on Promotion', 'allocation', 'Edit', 'student.promotion.alloc.edit', 'Modify Section Split', 'Student', 530),
('Student', 'Promotion', 'Section Allocation on Promotion', 'allocation', 'Delete', 'student.promotion.alloc.delete', 'Unassign Promoted Section', 'Student', 531),

('Student', 'Promotion', 'Promotion History & Audits', 'history', 'View', 'student.promotion.history.view', 'View Promotion Audit Logs', 'Student', 532),
('Student', 'Promotion', 'Promotion History & Audits', 'history', 'Add', 'student.promotion.history.add', 'Export Promotion Register', 'Student', 533),
('Student', 'Promotion', 'Promotion History & Audits', 'history', 'Edit', 'student.promotion.history.edit', 'Add Audit Note', 'Student', 534),
('Student', 'Promotion', 'Promotion History & Audits', 'history', 'Delete', 'student.promotion.history.delete', 'Archive Old History', 'Student', 535),

('Student', 'Promotion', 'Promotion Analytics Report', 'report', 'View', 'student.promotion.report.view', 'View Promotion Analytics', 'Student', 536),
('Student', 'Promotion', 'Promotion Analytics Report', 'report', 'Add', 'student.promotion.report.add', 'Export Promotion PDF Report', 'Student', 537),
('Student', 'Promotion', 'Promotion Analytics Report', 'report', 'Edit', 'student.promotion.report.edit', 'Customize Retention Charts', 'Student', 538),
('Student', 'Promotion', 'Promotion Analytics Report', 'report', 'Delete', 'student.promotion.report.delete', 'Clear Report Caches', 'Student', 539),

-- Student -> Section Allocation
('Student', 'Section Allocation', 'Allocate Sections', 'student-allocation', 'View', 'student.section.alloc.view', 'View Section Allocation Desk', 'Student', 540),
('Student', 'Section Allocation', 'Allocate Sections', 'student-allocation', 'Add', 'student.section.alloc.add', 'Allocate Students to Section', 'Student', 541),
('Student', 'Section Allocation', 'Allocate Sections', 'student-allocation', 'Edit', 'student.section.alloc.edit', 'Modify Student Section Assignment', 'Student', 542),
('Student', 'Section Allocation', 'Allocate Sections', 'student-allocation', 'Delete', 'student.section.alloc.delete', 'Deallocate Student from Section', 'Student', 543),

('Student', 'Section Allocation', 'Allocated Students Register', 'allocated-list', 'View', 'student.section.list.view', 'View Allocated Students Register', 'Student', 544),
('Student', 'Section Allocation', 'Allocated Students Register', 'allocated-list', 'Add', 'student.section.list.add', 'Export Section Roster', 'Student', 545),
('Student', 'Section Allocation', 'Allocated Students Register', 'allocated-list', 'Edit', 'student.section.list.edit', 'Transfer Student to Parallel Division', 'Student', 546),
('Student', 'Section Allocation', 'Allocated Students Register', 'allocated-list', 'Delete', 'student.section.list.delete', 'Remove Student from Division', 'Student', 547),

('Student', 'Section Allocation', 'Roll Numbers', 'roll-numbers', 'View', 'student.section.rollno.view', 'View Roll Numbers Directory', 'Student', 548),
('Student', 'Section Allocation', 'Roll Numbers', 'roll-numbers', 'Add', 'student.section.rollno.add', 'Generate Sequential Roll Numbers', 'Student', 549),
('Student', 'Section Allocation', 'Roll Numbers', 'roll-numbers', 'Edit', 'student.section.rollno.edit', 'Modify Individual Roll Number', 'Student', 550),
('Student', 'Section Allocation', 'Roll Numbers', 'roll-numbers', 'Delete', 'student.section.rollno.delete', 'Reset Section Roll Numbers', 'Student', 551),

-- Documents & Reports -> Certificates
('Documents & Reports', 'Certificates', 'Generate & Issue Certificates', 'issue-certificates', 'View', 'docs.certificates.issue.view', 'View Issue Certificates Desk', 'Documents & Reports', 560),
('Documents & Reports', 'Certificates', 'Generate & Issue Certificates', 'issue-certificates', 'Add', 'docs.certificates.issue.add', 'Issue Bonafide / Study Certificate', 'Documents & Reports', 561),
('Documents & Reports', 'Certificates', 'Generate & Issue Certificates', 'issue-certificates', 'Edit', 'docs.certificates.issue.edit', 'Print / Download Certificate', 'Documents & Reports', 562),
('Documents & Reports', 'Certificates', 'Generate & Issue Certificates', 'issue-certificates', 'Delete', 'docs.certificates.issue.delete', 'Revoke Issued Certificate', 'Documents & Reports', 563),

('Documents & Reports', 'Certificates', 'Issued Certificates Register', 'certificate-history', 'View', 'docs.certificates.history.view', 'View Issued Certificates Register', 'Documents & Reports', 564),
('Documents & Reports', 'Certificates', 'Issued Certificates Register', 'certificate-history', 'Add', 'docs.certificates.history.add', 'Export Certificates Log', 'Documents & Reports', 565),
('Documents & Reports', 'Certificates', 'Issued Certificates Register', 'certificate-history', 'Edit', 'docs.certificates.history.edit', 'Verify QR Authenticity', 'Documents & Reports', 566),
('Documents & Reports', 'Certificates', 'Issued Certificates Register', 'certificate-history', 'Delete', 'docs.certificates.history.delete', 'Archive Certificate Records', 'Documents & Reports', 567),

-- Documents & Reports -> Reports & Analytics
('Documents & Reports', 'Reports & Analytics', 'Academic & Performance Reports', 'academic-reports', 'View', 'docs.reports.academic.view', 'View Academic Performance Reports', 'Documents & Reports', 570),
('Documents & Reports', 'Reports & Analytics', 'Academic & Performance Reports', 'academic-reports', 'Add', 'docs.reports.academic.add', 'Export Semester Performance CSV', 'Documents & Reports', 571),
('Documents & Reports', 'Reports & Analytics', 'Academic & Performance Reports', 'academic-reports', 'Edit', 'docs.reports.academic.edit', 'Configure Academic Report Filters', 'Documents & Reports', 572),
('Documents & Reports', 'Reports & Analytics', 'Academic & Performance Reports', 'academic-reports', 'Delete', 'docs.reports.academic.delete', 'Clear Report History', 'Documents & Reports', 573),

('Documents & Reports', 'Reports & Analytics', 'Enrollment & Administrative', 'administrative-reports', 'View', 'docs.reports.admin.view', 'View Administrative Census Reports', 'Documents & Reports', 574),
('Documents & Reports', 'Reports & Analytics', 'Enrollment & Administrative', 'administrative-reports', 'Add', 'docs.reports.admin.add', 'Export Gender/Caste Census', 'Documents & Reports', 575),
('Documents & Reports', 'Reports & Analytics', 'Enrollment & Administrative', 'administrative-reports', 'Edit', 'docs.reports.admin.edit', 'Filter Admission Trends', 'Documents & Reports', 576),
('Documents & Reports', 'Reports & Analytics', 'Enrollment & Administrative', 'administrative-reports', 'Delete', 'docs.reports.admin.delete', 'Reset Report Parameters', 'Documents & Reports', 577),

('Documents & Reports', 'Reports & Analytics', 'Custom Exports & Data Dumps', 'custom-reports', 'View', 'docs.reports.custom.view', 'View Custom Reports Desk', 'Documents & Reports', 578),
('Documents & Reports', 'Reports & Analytics', 'Custom Exports & Data Dumps', 'custom-reports', 'Add', 'docs.reports.custom.add', 'Generate Custom Database Dump', 'Documents & Reports', 579),
('Documents & Reports', 'Reports & Analytics', 'Custom Exports & Data Dumps', 'custom-reports', 'Edit', 'docs.reports.custom.edit', 'Modify Query / Column Fields', 'Documents & Reports', 580),
('Documents & Reports', 'Reports & Analytics', 'Custom Exports & Data Dumps', 'custom-reports', 'Delete', 'docs.reports.custom.delete', 'Delete Custom Query Template', 'Documents & Reports', 581),

-- Academic -> Holiday Management
('Academic', 'Holiday Management', 'Holidays Calendar', 'academic-holidays', 'View', 'academic.holidays.calendar.view', 'View Institutional Holidays', 'Academic', 590),
('Academic', 'Holiday Management', 'Holidays Calendar', 'academic-holidays', 'Add', 'academic.holidays.calendar.add', 'Declare Campus Holiday', 'Academic', 591),
('Academic', 'Holiday Management', 'Holidays Calendar', 'academic-holidays', 'Edit', 'academic.holidays.calendar.edit', 'Edit Holiday Date / Occasion', 'Academic', 592),
('Academic', 'Holiday Management', 'Holidays Calendar', 'academic-holidays', 'Delete', 'academic.holidays.calendar.delete', 'Remove Declared Holiday', 'Academic', 593),

-- Operations -> Library
('Operations', 'Library', 'Book Catalog & Search', 'book-catalog', 'View', 'operations.library.catalog.view', 'View Library Book Catalog', 'Operations', 600),
('Operations', 'Library', 'Book Catalog & Search', 'book-catalog', 'Add', 'operations.library.catalog.add', 'Add Books / ISBN to Catalog', 'Operations', 601),
('Operations', 'Library', 'Book Catalog & Search', 'book-catalog', 'Edit', 'operations.library.catalog.edit', 'Edit Book Details & Shelf No', 'Operations', 602),
('Operations', 'Library', 'Book Catalog & Search', 'book-catalog', 'Delete', 'operations.library.catalog.delete', 'Remove Book from Catalog', 'Operations', 603),

('Operations', 'Library', 'Issue & Return Desk', 'circulation', 'View', 'operations.library.circulation.view', 'View Issue & Return Desk', 'Operations', 604),
('Operations', 'Library', 'Issue & Return Desk', 'circulation', 'Add', 'operations.library.circulation.add', 'Issue Book to Student / Faculty', 'Operations', 605),
('Operations', 'Library', 'Issue & Return Desk', 'circulation', 'Edit', 'operations.library.circulation.edit', 'Process Book Return & Late Fine', 'Operations', 606),
('Operations', 'Library', 'Issue & Return Desk', 'circulation', 'Delete', 'operations.library.circulation.delete', 'Waive Book Fine', 'Operations', 607),

('Operations', 'Library', 'Student & Staff Cards', 'library-members', 'View', 'operations.library.members.view', 'View Library Members', 'Operations', 608),
('Operations', 'Library', 'Student & Staff Cards', 'library-members', 'Add', 'operations.library.members.add', 'Issue Library Membership Card', 'Operations', 609),
('Operations', 'Library', 'Student & Staff Cards', 'library-members', 'Edit', 'operations.library.members.edit', 'Update Borrowing Quota', 'Operations', 610),
('Operations', 'Library', 'Student & Staff Cards', 'library-members', 'Delete', 'operations.library.members.delete', 'Deactivate Library Card', 'Operations', 611),

-- Operations -> Placement
('Operations', 'Placement', 'Recruitment Drives', 'placement-drives', 'View', 'operations.placement.drives.view', 'View Placement Recruitment Drives', 'Operations', 620),
('Operations', 'Placement', 'Recruitment Drives', 'placement-drives', 'Add', 'operations.placement.drives.add', 'Create Campus Drive', 'Operations', 621),
('Operations', 'Placement', 'Recruitment Drives', 'placement-drives', 'Edit', 'operations.placement.drives.edit', 'Update Drive Dates & Package', 'Operations', 622),
('Operations', 'Placement', 'Recruitment Drives', 'placement-drives', 'Delete', 'operations.placement.drives.delete', 'Cancel Recruitment Drive', 'Operations', 623),

('Operations', 'Placement', 'Applications & Offers', 'student-applications', 'View', 'operations.placement.offers.view', 'View Student Applications & Offers', 'Operations', 624),
('Operations', 'Placement', 'Applications & Offers', 'student-applications', 'Add', 'operations.placement.offers.add', 'Shortlist Candidate for Interview', 'Operations', 625),
('Operations', 'Placement', 'Applications & Offers', 'student-applications', 'Edit', 'operations.placement.offers.edit', 'Log Offer Letter & CTC', 'Operations', 626),
('Operations', 'Placement', 'Applications & Offers', 'student-applications', 'Delete', 'operations.placement.offers.delete', 'Reject Candidate Application', 'Operations', 627);

-- 3. Automatically Grant Super Admin (Role 1) and Admin (Role 2) All Screen Permissions
INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
SELECT 1, `PermissionId`, UTC_TIMESTAMP() FROM `Permissions`;

INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
SELECT 2, `PermissionId`, UTC_TIMESTAMP() FROM `Permissions`
WHERE `PermissionCode` NOT IN ('administration.roles.matrix.delete', 'administration.roles.delete');

-- 4. Stored Procedure: sp_GetRolePermissionMatrix (Hierarchical Module & Screen Output)
DROP PROCEDURE IF EXISTS `sp_GetRolePermissionMatrix`;
DELIMITER //
CREATE PROCEDURE `sp_GetRolePermissionMatrix`(
    IN p_RoleId INT,
    IN p_UserId INT
)
BEGIN
    DECLARE v_RoleId INT DEFAULT p_RoleId;
    IF (v_RoleId IS NULL OR v_RoleId = 0) AND p_UserId IS NOT NULL THEN
        SELECT RoleId INTO v_RoleId FROM `Users` WHERE UserId = p_UserId LIMIT 1;
    END IF;

    -- Return permission matrix grouped by (Module, SubModule, ScreenCode)
    SELECT 
        COALESCE(p.Module, 'General') AS Module,
        p.SubModule,
        COALESCE(p.Screen, '') AS ScreenName,
        COALESCE(p.ScreenCode, '') AS ScreenId,
        COALESCE(p.CategoryLabel, p.Module, 'General') AS CategoryLabel,
        MIN(COALESCE(p.DisplayOrder, 999)) AS DisplayOrder,
        -- View Action
        MAX(CASE WHEN p.Action = 'View' THEN 
            CASE 
                WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                WHEN rp.PermissionId IS NOT NULL THEN 1
                ELSE 0
            END
        ELSE 0 END) AS CanView,
        -- Add Action
        MAX(CASE WHEN p.Action = 'Add' THEN 
            CASE 
                WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                WHEN rp.PermissionId IS NOT NULL THEN 1
                ELSE 0
            END
        ELSE 0 END) AS CanAdd,
        -- Edit Action
        MAX(CASE WHEN p.Action = 'Edit' THEN 
            CASE 
                WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                WHEN rp.PermissionId IS NOT NULL THEN 1
                ELSE 0
            END
        ELSE 0 END) AS CanEdit,
        -- Delete Action
        MAX(CASE WHEN p.Action = 'Delete' THEN 
            CASE 
                WHEN p_UserId IS NOT NULL AND up.IsGranted IS NOT NULL THEN up.IsGranted
                WHEN rp.PermissionId IS NOT NULL THEN 1
                ELSE 0
            END
        ELSE 0 END) AS CanDelete,
        -- Member Override Indicator
        MAX(CASE WHEN p_UserId IS NOT NULL AND up.UserPermissionId IS NOT NULL THEN 1 ELSE 0 END) AS HasMemberOverride
    FROM `Permissions` p
    LEFT JOIN `RoleModules` rm ON rm.RoleId = v_RoleId AND LOWER(rm.SubModule) = LOWER(p.SubModule)
    LEFT JOIN `RolePermissions` rp ON rp.PermissionId = p.PermissionId AND rp.RoleId = v_RoleId
    LEFT JOIN `UserPermissions` up ON up.PermissionId = p.PermissionId AND up.UserId = p_UserId
    WHERE (
        NOT EXISTS (SELECT 1 FROM `RoleModules` WHERE RoleId = v_RoleId)
        OR rm.RoleModuleId IS NOT NULL
        OR p_UserId IS NOT NULL
    )
    GROUP BY p.Module, p.SubModule, p.ScreenCode, p.Screen, p.CategoryLabel
    ORDER BY MIN(p.DisplayOrder) ASC, p.SubModule ASC, p.ScreenCode ASC;
END //
DELIMITER ;

-- 5. Stored Procedure: sp_UpdateRolePermissions (Granular Screen-Level Support)
DROP PROCEDURE IF EXISTS `sp_UpdateRolePermissions`;
DELIMITER //
CREATE PROCEDURE `sp_UpdateRolePermissions`(
    IN p_RoleId INT,
    IN p_PermissionsJson LONGTEXT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    CREATE TEMPORARY TABLE IF NOT EXISTS tmp_module_updates (
        SubModule VARCHAR(100),
        ScreenId VARCHAR(100),
        CanView TINYINT(1),
        CanAdd TINYINT(1),
        CanEdit TINYINT(1),
        CanDelete TINYINT(1)
    );
    TRUNCATE TABLE tmp_module_updates;

    -- Parse JSON input
    INSERT INTO tmp_module_updates (SubModule, ScreenId, CanView, CanAdd, CanEdit, CanDelete)
    SELECT 
        jt.SubModule,
        COALESCE(jt.ScreenId, ''),
        IF(jt.CanAdd = 1 OR jt.CanEdit = 1 OR jt.CanDelete = 1, 1, IF(jt.CanView = 1, 1, 0)) AS CanView,
        IF(IF(jt.CanAdd = 1 OR jt.CanEdit = 1 OR jt.CanDelete = 1, 1, IF(jt.CanView = 1, 1, 0)) = 1 AND jt.CanAdd = 1, 1, 0) AS CanAdd,
        IF(IF(jt.CanAdd = 1 OR jt.CanEdit = 1 OR jt.CanDelete = 1, 1, IF(jt.CanView = 1, 1, 0)) = 1 AND jt.CanEdit = 1, 1, 0) AS CanEdit,
        IF(IF(jt.CanAdd = 1 OR jt.CanEdit = 1 OR jt.CanDelete = 1, 1, IF(jt.CanView = 1, 1, 0)) = 1 AND jt.CanDelete = 1, 1, 0) AS CanDelete
    FROM JSON_TABLE(
        p_PermissionsJson,
        '$[*]' COLUMNS(
            SubModule VARCHAR(100) PATH '$.SubModule',
            ScreenId VARCHAR(100) PATH '$.ScreenId',
            CanView INT PATH '$.CanView',
            CanAdd INT PATH '$.CanAdd',
            CanEdit INT PATH '$.CanEdit',
            CanDelete INT PATH '$.CanDelete'
        )
    ) jt;

    -- Delete existing RolePermissions for the specific submodules & screens being updated
    DELETE rp FROM `RolePermissions` rp
    INNER JOIN `Permissions` p ON p.PermissionId = rp.PermissionId
    INNER JOIN tmp_module_updates t ON LOWER(t.SubModule) = LOWER(p.SubModule) 
        AND (t.ScreenId = '' OR LOWER(t.ScreenId) = LOWER(COALESCE(p.ScreenCode, '')))
    WHERE rp.RoleId = p_RoleId;

    -- Insert enabled permissions for this role
    INSERT IGNORE INTO `RolePermissions` (`RoleId`, `PermissionId`, `AssignedAt`)
    SELECT p_RoleId, p.PermissionId, UTC_TIMESTAMP()
    FROM `Permissions` p
    INNER JOIN tmp_module_updates t ON LOWER(t.SubModule) = LOWER(p.SubModule)
        AND (t.ScreenId = '' OR LOWER(t.ScreenId) = LOWER(COALESCE(p.ScreenCode, '')))
    WHERE (
            NOT EXISTS (SELECT 1 FROM `RoleModules` rm WHERE rm.RoleId = p_RoleId)
            OR EXISTS (SELECT 1 FROM `RoleModules` rm WHERE rm.RoleId = p_RoleId AND LOWER(rm.SubModule) = LOWER(p.SubModule))
          )
      AND (
          (p.Action = 'View' AND t.CanView = 1)
       OR (p.Action = 'Add' AND t.CanAdd = 1)
       OR (p.Action = 'Edit' AND t.CanEdit = 1)
       OR (p.Action = 'Delete' AND t.CanDelete = 1)
      );

    -- Update Role timestamp
    UPDATE `Roles` SET `UpdatedAt` = UTC_TIMESTAMP() WHERE `RoleId` = p_RoleId;

    DROP TEMPORARY TABLE IF EXISTS tmp_module_updates;

    COMMIT;
END //
DELIMITER ;
