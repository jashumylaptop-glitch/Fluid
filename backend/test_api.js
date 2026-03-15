(async () => {
  try {
    const loginRes = await fetch('http://localhost:5000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test.student@example.com', password: 'pass123', role: 'student' })
    });
    const loginJson = await loginRes.json();
    console.log('LOGIN', loginRes.status, loginJson);
    if (!loginRes.ok) return;
    const token = loginJson.token;
    const studentId = loginJson.studentId || loginJson.userId || loginJson.user?.id;
    const dashRes = await fetch(`http://localhost:5000/student/${encodeURIComponent(studentId)}/dashboard`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('DASH', dashRes.status, await dashRes.json());
    const ttRes = await fetch(`http://localhost:5000/student/${encodeURIComponent(studentId)}/timetable`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('TIMETABLE', ttRes.status, await ttRes.json());
  } catch (err) {
    console.error('API test failed', err);
  }
})();
