const BASE_URL = 'http://localhost:5167';

async function checkAllSlots() {
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrMobile: 'Admin@CMS.com', password: 'Admin@1234' })
  });
  const data = await loginRes.json();
  const token = data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };

  // Check section 30 (REG-1)
  const res30 = await fetch(`${BASE_URL}/api/v1/timetable/section/30`, { headers });
  if (res30.ok) {
    const d30 = await res30.json();
    const slots30 = d30.data || d30;
    console.log('Section 30 (REG-1) total slots:', slots30.length);
    slots30.filter(s => s.staffId === 1108 || s.facultyId === 1108).forEach(s => {
      console.log('Section 30 staff 1108 slot:', s.id, s.dayName, s.periodName, s.startTime, s.endTime, s.subjectName);
    });
  }

  // Check section 31 (MPC-2A)
  const res31 = await fetch(`${BASE_URL}/api/v1/timetable/section/31`, { headers });
  if (res31.ok) {
    const d31 = await res31.json();
    const slots31 = d31.data || d31;
    console.log('Section 31 (MPC-2A) total slots:', slots31.length);
    slots31.filter(s => s.staffId === 1108 || s.facultyId === 1108).forEach(s => {
      console.log('Section 31 staff 1108 slot:', s.id, s.dayName, s.periodName, s.startTime, s.endTime, s.subjectName);
    });
  }

  // Check section 42 (Reg-1A)
  const res42 = await fetch(`${BASE_URL}/api/v1/timetable/section/42`, { headers });
  if (res42.ok) {
    const d42 = await res42.json();
    const slots42 = d42.data || d42;
    console.log('Section 42 (Reg-1A) total slots:', slots42.length);
    slots42.filter(s => s.staffId === 1108 || s.facultyId === 1108).forEach(s => {
      console.log('Section 42 staff 1108 slot:', s.id, s.dayName, s.periodName, s.startTime, s.endTime, s.subjectName);
    });
  }
}

checkAllSlots();
