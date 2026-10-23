const BASE_URL = 'http://localhost:5167';

async function testAdmin() {
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrMobile: 'Admin@CMS.com', password: 'Admin@1234' })
  });
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  const headers = { Authorization: `Bearer ${token}` };

  const endpoints = [
    ['1. Staff Management List', '/api/v1/staff?pageSize=5'],
    ['1b. Staff Member Detail (Suresh Varma)', '/api/v1/staff/1118'],
    ['2a. Department Management', '/api/v1/departments'],
    ['2b. Designation Management', '/api/v1/designations'],
    ['3a. Certificates Workflow Stats', '/api/v1/certificates/workflow-stats'],
    ['3b. Certificates List', '/api/v1/certificates?pageSize=5'],
    ['4a. Reports Dashboard Overview', '/api/v1/reports/dashboard'],
    ['4b. Reports Filter Boards', '/api/v1/reports/filters/boards'],
    ['5a. Settings Number Series', '/api/v1/settings/number-series'],
    ['5b. Settings Templates', '/api/v1/settings/templates']
  ];

  for (const [name, ep] of endpoints) {
    const res = await fetch(`${BASE_URL}${ep}`, { headers });
    let count = '';
    try {
      const d = await res.json();
      const list = d.data || d;
      if (Array.isArray(list)) count = ` (Items: ${list.length})`;
      else if (list && typeof list === 'object') count = ' (Object OK)';
    } catch(e) {}
    console.log(`${name}: HTTP ${res.status}${count}`);
  }
}

testAdmin();
