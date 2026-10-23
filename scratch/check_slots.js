const BASE_URL = 'http://localhost:5167';

async function listSlots() {
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrMobile: 'Admin@CMS.com', password: 'Admin@1234' })
  });
  const data = await loginRes.json();
  const token = data.accessToken;

  const res = await fetch(`${BASE_URL}/api/v1/timetable/faculty/1108`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const slots = await res.json();
  console.log('Total slots for 1108:', slots.length);
  slots.forEach(s => {
    console.log(`Slot ID: ${s.id}, Day: ${s.dayName} (${s.dayOfWeek}), PeriodName: ${s.periodName}, PeriodNum: ${s.periodNumber}, Start: ${s.startTime}, End: ${s.endTime}, Subject: ${s.subjectName}, Section: ${s.sectionName}`);
  });
}

listSlots();
