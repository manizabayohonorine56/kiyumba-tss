(async () => {
  try {
    const loginRes = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@kiyumbaschool.edu', password: 'admin123' })
    });
    const loginJson = await loginRes.json();
    console.log('LOGIN:', loginRes.status, loginJson);
    if (!loginRes.ok) return;
    const token = loginJson.token;

    const regsRes = await fetch('http://localhost:3000/api/admin/registrations?limit=5', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const regsJson = await regsRes.json();
    console.log('REGISTRATIONS:', regsRes.status, regsJson);
  } catch (err) {
    console.error('TEST ERROR:', err);
  }
})();
