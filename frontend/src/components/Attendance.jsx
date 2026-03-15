import React, { useEffect, useState } from "react";

export default function Attendance({ studentId, token }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`http://localhost:5000/student/${studentId}/attendance`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        setRecords(json.records || []);
      } catch (err) {
        setError("Unable to load attendance");
      } finally {
        setLoading(false);
      }
    }
    if (studentId && token) fetchData();
  }, [studentId, token]);

  // compute percent and month breakdown
  const presentCount = records.filter((r) => r.present).length;
  const percent = records.length ? ((presentCount / records.length) * 100).toFixed(1) : 0;

  const monthMap = {};
  records.forEach((r) => {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    monthMap[key] = (monthMap[key] || 0) + (r.present ? 1 : 0);
  });

  return (
    <section className="section">
      {loading && <div className="muted">Loading…</div>}
      {error && <div className="error">{error}</div>}
      {!loading && !error && (
        <>
          <div className="card">
            <strong>Overall:</strong> {percent}% ({presentCount}/{records.length})
          </div>
          <div className="card" style={{ marginTop: "12px" }}>
            <h4>By month</h4>
            <ul>
              {Object.entries(monthMap).map(([k, v]) => (
                <li key={k}>
                  {k}: {v} days present
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
