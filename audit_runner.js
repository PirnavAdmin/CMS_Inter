const BASE_URL = 'http://localhost:5167';

async function req(url, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${url}`, options);
    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

async function runAudit() {
  const results = { passed: [], failed: [], warnings: [] };

  console.log('=== STARTING END-TO-END AUDIT ===\n');

  // 1. LOGIN ADMIN
  let adminToken = '';
  const adminLogin = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrMobile: 'Admin@CMS.com', password: 'Admin@1234' })
  });

  const aToken = adminLogin.data?.accessToken || adminLogin.data?.token;
  if (adminLogin.ok && adminLogin.data?.status && aToken) {
    adminToken = aToken;
    results.passed.push('1. Admin Login (Admin@CMS.com)');
  } else {
    results.failed.push('1. Admin Login failed: ' + JSON.stringify(adminLogin.data || adminLogin.error));
  }

  // 2. LOGIN STAFF
  let staffToken = '';
  let staffUser = null;
  const staffLogin = await req('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrMobile: 'suresh.faculty@college.edu', password: 'Password@123' })
  });

  const sToken = staffLogin.data?.accessToken || staffLogin.data?.token;
  if (staffLogin.ok && staffLogin.data?.status && sToken) {
    staffToken = sToken;
    staffUser = staffLogin.data.user || staffLogin.data;
    results.passed.push(`2. Staff Login (${staffUser?.name || staffUser?.fullName}, StaffId: ${staffUser?.staffId})`);
  } else {
    results.failed.push('2. Staff Login failed: ' + JSON.stringify(staffLogin.data || staffLogin.error));
  }

  const adminHeaders = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };
  const staffHeaders = { Authorization: `Bearer ${staffToken}`, 'Content-Type': 'application/json' };
  const staffId = staffUser?.staffId || 1118;

  // 3. STAFF PROFILE
  const staffProfile = await req(`/api/v1/staff/${staffId}`, { headers: staffHeaders });
  if (staffProfile.ok && (staffProfile.data?.id === staffId || staffProfile.data?.data?.id === staffId)) {
    results.passed.push(`3. Staff My Profile (StaffId: ${staffId}, Dept: ${staffProfile.data.department || staffProfile.data?.data?.department})`);
  } else {
    results.failed.push('3. Staff My Profile failed: ' + staffProfile.status + ' ' + JSON.stringify(staffProfile.data));
  }

  const adminStaffProfile = await req(`/api/v1/staff/${staffId}`, { headers: adminHeaders });
  if (adminStaffProfile.ok) {
    results.passed.push('3b. Admin side fetch of Staff Profile (Review mode)');
  } else {
    results.failed.push('3b. Admin fetch staff profile failed: ' + adminStaffProfile.status);
  }

  // 4. MY TIMETABLE & MY CLASSES (Subject Allocations)
  const allocations = await req(`/api/v1/staff/${staffId}/subject-allocations`, { headers: staffHeaders });
  if (allocations.ok) {
    const list = allocations.data?.data || allocations.data || [];
    results.passed.push(`4. Staff Subject Allocations / Classes count: ${list.length}`);
  } else {
    results.failed.push('4. Subject Allocations failed: ' + allocations.status);
  }

  const timetable = await req(`/api/v1/timetable/faculty/${staffId}`, { headers: staffHeaders });
  if (timetable.ok) {
    const ttList = Array.isArray(timetable.data) ? timetable.data : (timetable.data?.data || []);
    results.passed.push(`4b. Faculty Timetable (Slots count: ${ttList.length})`);
  } else {
    results.warnings.push('4b. Faculty Timetable: ' + timetable.status);
  }

  // 5. STUDENT ATTENDANCE (Sections & Reflection)
  const attSections = await req(`/api/v1/sections`, { headers: staffHeaders });
  if (attSections.ok) {
    const secList = attSections.data?.data || attSections.data || [];
    results.passed.push(`5a. Student Attendance - Sections list accessible (Count: ${secList.length})`);
  } else {
    results.warnings.push('5a. Student Attendance - Sections: ' + attSections.status);
  }

  const studentAtt = await req(`/api/v1/attendance/admin/students?academicYearId=1&boardId=1&sectionId=1&attendanceDate=2026-10-21`, { headers: staffHeaders });
  if (studentAtt.ok) {
    results.passed.push(`5b. Student Attendance - Attendance records queryable by faculty`);
  } else {
    results.warnings.push('5b. Student Attendance query: ' + studentAtt.status);
  }

  // 6. MARKS ENTRY
  const exams = await req(`/api/v1/examinations`, { headers: staffHeaders });
  if (exams.ok) {
    const exList = exams.data?.data || exams.data || [];
    results.passed.push(`6. Marks Entry examinations list accessible (Count: ${exList.length})`);
  } else {
    results.warnings.push('6. Marks Entry endpoint: ' + exams.status);
  }

  // 7. EXAM DUTIES
  const duties = await req(`/api/v1/examinations/duties?staffId=${staffId}`, { headers: staffHeaders });
  if (duties.ok) {
    const dList = duties.data?.data || duties.data || [];
    results.passed.push(`7. Exam Duties endpoint accessible (Count: ${dList.length})`);
  } else {
    results.warnings.push('7. Exam Duties route: ' + duties.status);
  }

  // 8. MY ATTENDANCE
  const myToday = await req(`/api/v1/staff-attendance/my-today`, { headers: staffHeaders });
  if (myToday.ok) {
    results.passed.push(`8a. My Attendance Today status accessible (Status: ${myToday.data?.data?.todayStatus || myToday.data?.data?.status || 'Active'})`);
  } else {
    results.warnings.push('8a. My Attendance Today: ' + myToday.status);
  }

  const myHistory = await req(`/api/v1/staff-attendance/my-history?period=week`, { headers: staffHeaders });
  if (myHistory.ok) {
    results.passed.push(`8b. My Attendance History accessible`);
  } else {
    results.warnings.push('8b. My Attendance History: ' + myHistory.status);
  }

  // 9. STAFF LEAVE (Apply & Admin view)
  const staffLeaveHistory = await req(`/api/v1/staff-attendance/leave/history/staff/${staffId}`, { headers: staffHeaders });
  if (staffLeaveHistory.ok) {
    results.passed.push('9a. Staff Leave History for staffId accessible');
  } else {
    results.warnings.push('9a. Staff Leave History: ' + staffLeaveHistory.status + ' (' + (staffLeaveHistory.data?.message || '') + ')');
  }

  const adminLeaves = await req(`/api/v1/staff-attendance/leave`, { headers: adminHeaders });
  if (adminLeaves.ok) {
    const lList = adminLeaves.data?.data || adminLeaves.data || [];
    results.passed.push(`9b. Admin Staff Leave Requests list accessible (Count: ${lList.length})`);
  } else {
    results.warnings.push('9b. Admin Staff Leave list: ' + adminLeaves.status);
  }

  // 10. SALARY PAY SLIPS
  const slips = await req(`/api/v1/Payroll/payslips?staffId=${staffId}`, { headers: staffHeaders });
  if (slips.ok) {
    const sList = slips.data?.data || slips.data || [];
    results.passed.push(`10. Payroll Staff Payslips accessible (Count: ${sList.length})`);
  } else {
    results.warnings.push('10. Payroll Payslips: ' + slips.status);
  }

  // 11. REIMBURSEMENTS & HOLIDAYS
  const reimb = await req(`/api/v1/reimbursements?staffId=${staffId}`, { headers: staffHeaders });
  if (reimb.ok) {
    const rList = reimb.data?.data || reimb.data || [];
    results.passed.push(`11a. Reimbursements accessible (Count: ${rList.length})`);
  } else {
    results.warnings.push('11a. Reimbursements: ' + reimb.status);
  }

  const holidays = await req(`/api/v1/holidays`, { headers: staffHeaders });
  if (holidays.ok) {
    const hList = holidays.data?.data || holidays.data || [];
    results.passed.push(`11b. Holidays accessible (Count: ${hList.length})`);
  } else {
    results.warnings.push('11b. Holidays: ' + holidays.status);
  }

  // 12. ADMIN MODULES
  // a) Dashboard
  const adminDash = await req(`/api/v1/dashboard`, { headers: adminHeaders });
  if (adminDash.ok) {
    results.passed.push('12a. Admin Dashboard summary accessible');
  } else {
    const adminDash2 = await req(`/api/v1/dashboard/summary`, { headers: adminHeaders });
    if (adminDash2.ok) results.passed.push('12a. Admin Dashboard summary accessible');
    else results.warnings.push('12a. Admin Dashboard: ' + adminDash.status);
  }

  // b) Staff Management
  const adminStaff = await req(`/api/v1/staff?pageSize=5`, { headers: adminHeaders });
  if (adminStaff.ok) {
    const staffList = adminStaff.data?.data || adminStaff.data || [];
    results.passed.push(`12b. Admin Staff Management List (Count: ${staffList.length})`);
  } else {
    results.failed.push('12b. Admin Staff Management List: ' + adminStaff.status);
  }

  // c) Department & Designations
  const depts = await req(`/api/v1/departments`, { headers: adminHeaders });
  const desigs = await req(`/api/v1/designations`, { headers: adminHeaders });
  if (depts.ok && desigs.ok) {
    results.passed.push(`12c. Admin Departments (${(depts.data?.data || depts.data || []).length}) & Designations (${(desigs.data?.data || desigs.data || []).length}) accessible`);
  } else {
    results.warnings.push(`12c. Depts: ${depts.status}, Desigs: ${desigs.status}`);
  }

  // d) Certificates
  const certs = await req(`/api/v1/certificates/workflow-stats`, { headers: adminHeaders });
  if (certs.ok) {
    results.passed.push('12d. Certificates workflow stats accessible');
  } else {
    results.warnings.push('12d. Certificates workflow stats: ' + certs.status);
  }

  // e) Reports & Analytics
  const reports = await req(`/api/v1/reports`, { headers: adminHeaders });
  if (reports.ok) {
    results.passed.push('12e. Reports & Analytics summary accessible');
  } else {
    results.warnings.push('12e. Reports & Analytics: ' + reports.status);
  }

  // f) Settings (Number Series & Templates)
  const numSeries = await req(`/api/v1/settings/number-series`, { headers: adminHeaders });
  const templates = await req(`/api/v1/settings/templates`, { headers: adminHeaders });
  if (numSeries.ok && templates.ok) {
    results.passed.push(`12f. Settings: Number Series & Templates accessible`);
  } else {
    results.warnings.push(`12f. Number Series: ${numSeries.status}, Templates: ${templates.status}`);
  }

  console.log('\n=== AUDIT RESULTS SUMMARY ===');
  console.log(`PASSED (${results.passed.length}):`);
  results.passed.forEach(p => console.log('  [PASS]', p));
  console.log(`\nFAILED (${results.failed.length}):`);
  results.failed.forEach(f => console.log('  [FAIL]', f));
  console.log(`\nWARNINGS / ROUTE ALIGNMENT (${results.warnings.length}):`);
  results.warnings.forEach(w => console.log('  [WARN]', w));
}

runAudit();
