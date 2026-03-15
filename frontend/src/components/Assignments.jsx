import React, { useEffect, useState } from "react";

export default function Assignments({ studentId, token }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`http://localhost:5000/student/${studentId}/assignments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        setItems(json.assignments || []);
      } catch (err) {
        setError("Unable to load assignments");
      } finally {
        setLoading(false);
      }
    }
    if (studentId && token) fetchData();
  }, [studentId, token]);

  if (loading) return <div className="muted">Loading…</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <section className="section">
      {items.length === 0 && <div className="muted">No assignments.</div>}
      {items.length > 0 && (
        <ul className="list">
          {items.map((a, i) => (
            <li className="card" key={i}>
              <div>
                <strong>{a.title}</strong> ({a.status})
              </div>
              <div>Due: {new Date(a.dueDate).toLocaleDateString()}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
