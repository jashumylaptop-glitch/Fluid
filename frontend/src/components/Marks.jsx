import React, { useEffect, useState } from "react";

export default function Marks({ studentId, token }) {
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`http://localhost:5000/student/${studentId}/marks`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        setMarks(json.marks || []);
      } catch (err) {
        setError("Unable to load marks");
      } finally {
        setLoading(false);
      }
    }
    if (studentId && token) fetchData();
  }, [studentId, token]);

  if (loading) return <div className="muted">Loading marks…</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <section className="section">
      {marks.length === 0 && <div className="muted">No records.</div>}
      {marks.length > 0 && (
        <ul className="list">
          {marks.map((m, i) => {
            const pct = m.total ? (m.score / m.total) * 100 : 0;
            return (
              <li className="card" key={i}>
                <div>
                  <strong>{m.subject}</strong> ({m.examName})
                </div>
                <div>
                  {m.score}/{m.total} on {new Date(m.date).toLocaleDateString()}
                </div>
                <div className="radial" style={{ marginTop: "6px" }}>
                  <div
                    className="radial-fill"
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
