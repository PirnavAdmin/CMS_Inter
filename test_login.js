async function tryLogin() {
  const attempts = [
    { email: "admin@college.com", password: "Admin@12345" },
    { email: "admin@college.com", password: "Admin@123" },
    { email: "admin@cms.com", password: "Admin@123" },
    { email: "admin@college.com", password: "Password@123" },
    { email: "admin@college.com", password: "admin" }
  ];

  for (const a of attempts) {
    try {
      const res = await fetch("http://localhost:5167/api/Admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a)
      });
      console.log(`Email: ${a.email} | Password: ${a.password} | Status: ${res.status}`);
      const data = await res.json();
      console.log("Response:", JSON.stringify(data).slice(0, 250));
      if (res.ok) {
        return data.token || data.data?.token || data.Data?.Token || data.data?.Token;
      }
    } catch (e) {
      console.log("Error:", e.message);
    }
  }
}

tryLogin().then(token => console.log("Extracted Token:", token ? token.slice(0, 30) + "..." : "none"));
