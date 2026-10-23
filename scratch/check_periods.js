const BASE_URL = 'http://localhost:5167';

async function checkAdminTimetable() {
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrMobile: 'Admin@CMS.com', password: 'Admin@1234' })
  });
  const data = await loginRes.json();
  const token = data.accessToken;
  const headers = { Authorization: `Bearer ${token}` };

  // Check section 42 timetable (Reg-1A) and section 31 timetable (MPC-2A)
  const res31 = await fetch(`${BASE_URL}/api/v1/timetable/section/31`, { headers });
  console.log('Section 31 timetable status:', res31.status);
  if (res31.ok) {
    const d31 = await res31.json();
    console.log('Section 31 slots count:', (d31.data || d31).length);
  }

  const res42 = await fetch(`${BASE_URL}/api/v1/timetable/section/42`, { headers });
  console.log('Section 42 timetable status:', res42.status);
  if (res42.ok) {
    const d42 = await res42.json();
    const slots42 = d42.data || d42;
    console.log('Section 42 slots count:', slots42.length);
    slots42.filter(s => s.dayOfWeek === 4 || s.dayName === 'Thursday').forEach(s => {
      console.log('Section 42 Thursday slot:', s.id, s.periodName, s.periodNumber, s.startTime, s.endTime, s.facultyName, s.subjectName);
    });
  }

  // Check periods
  const pRes = await fetch(`${BASE_URL}/api/v1/periods`, { headers });
  console.log('Periods status:', pRes.status);
  if (pRes.ok) {
    const pData = await pRes.json();
    const plist = pData.data || pData;
    console.log('Periods in DB:');
    plist.forEach(p => console.log(p.periodId || p.id, p.periodName || p.name, p.periodNumber, p.startTime, p.endTime));
  }
}

checkAdminTimetable();
