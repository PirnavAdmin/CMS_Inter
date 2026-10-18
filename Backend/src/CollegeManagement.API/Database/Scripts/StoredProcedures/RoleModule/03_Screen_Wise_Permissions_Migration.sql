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

('Finance', 'Fee Management', 'Fee Collection & Receipts', 'fee-collection', 'View', 'finance.fees.collection.view', 'View Fee Collection Desk', 'Finance', 192),
('Finance', 'Fee Management', 'Fee Collection & Receipts', 'fee-collection', 'Add', 'finance.fees.collection.add', 'Collect Payment & Issue Receipt', 'Finance', 193),
('Finance', 'Fee Management', 'Fee Collection & Receipts', 'fee-collection', 'Edit', 'finance.fees.collection.edit', 'Reprint / Regenerate Receipt', 'Finance', 194),
('Finance', 'Fee Management', 'Fee Collection & Receipts', 'fee-collection', 'Delete', 'finance.fees.collection.delete', 'Void / Cancel Fee Receipt', 'Finance', 195),

('Finance', 'Fee Management', 'Fee Defaulters & Reports', 'fee-reports', 'View', 'finance.fees.reports.view', 'View Defaulters & Collection Logs', 'Finance', 196),
('Finance', 'Fee Management', 'Fee Defaulters & Reports', 'fee-reports', 'Add', 'finance.fees.reports.add', 'Export Collection Spreadsheet', 'Finance', 197),
('Finance', 'Fee Management', 'Fee Defaulters & Reports', 'fee-reports', 'Edit', 'finance.fees.reports.edit', 'Send Fee Reminder SMS/Email', 'Finance', 198),
('Finance', 'Fee Management', 'Fee Defaulters & Reports', 'fee-reports', 'Delete', 'finance.fees.reports.delete', 'Clear Filter Previews', 'Finance', 199),

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
('Administration', 'Settings', 'Audit & Security Logs', 'audit-logs', 'Delete', 'administration.settings.audit.delete', 'Archive Audit Logs', 'Administration', 345);

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
