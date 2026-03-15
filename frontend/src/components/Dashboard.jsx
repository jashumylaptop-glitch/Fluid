import React, { useEffect, useState } from "react";
import StatsChart from "./StatsChart";

export default function Dashboard({ studentId, token }) {
  const [stats, setStats] = useState({});
  const [student, setStudent] = useState({ firstName: "Student" });
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [sres, dres, ares, mres] = await Promise.all([
          fetch(`http://localhost:5000/student/${studentId}/profile`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`http://localhost:5000/student/${studentId}/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`http://localhost:5000/student/${studentId}/attendance`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`http://localhost:5000/student/${studentId}/marks`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const sjson = await sres.json();
        const djson = await dres.json();
        const ajson = await ares.json();
        const mjson = await mres.json();
        setStudent(sjson.profile || {});
        setStats(djson);
        setAttendanceRecords(ajson.records || []);
        setMarks(mjson.marks || []);
      } catch (err) {
        setError("Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    if (studentId && token) fetchData();
  }, [studentId, token]);

  if (loading) return <div className="muted">Loading dashboard…</div>;
  if (error) return <div className="error">{error}</div>;

  // Prepare simple chart data
  const attendanceByDay = (() => {
    const map = {};
    attendanceRecords.forEach(r => {
      const d = new Date(r.date).toISOString().split('T')[0];
      map[d] = (map[d] || 0) + (r.present ? 1 : 0);
    });
    const labels = Object.keys(map).sort();
    const data = labels.map(l => map[l]);
    return { labels, data };
  })();

  const marksTrend = (() => {
    const labels = marks.map(m => new Date(m.date).toISOString().split('T')[0]);
    const data = marks.map(m => Math.round((m.score / (m.total || 1)) * 100));
    return { labels, data };
  })();

  return (
    <section className="section dashboard-section">
      <h2>Hi {student.firstName}, welcome back!</h2>

      <div className="stats-cards grid">
        <div className="card">Classes today: {stats.totalClasses || 0}</div>
        <div className="card">Pending assignments: {stats.pendingAssignments || 0}</div>
        <div className="card">Attendance: {stats.attendancePercent ? stats.attendancePercent.toFixed(1) : 0}%</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div className="card">
          <h4 style={{ marginTop: 0 }}>Attendance (recent days)</h4>
          <StatsChart type="bar" data={attendanceByDay} label="Days present" />
        </div>

        <div className="card">
          <h4 style={{ marginTop: 0 }}>Performance trend</h4>
          <StatsChart type="line" data={marksTrend} label="Score %" />
        </div>
      </div>
    </section>
  );
}
