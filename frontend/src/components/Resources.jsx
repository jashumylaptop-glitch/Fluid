import React, { useEffect, useState } from "react";

export default function Resources({ studentId, token }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`http://localhost:5000/student/${studentId}/resources`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        setResources(json.resources || []);
      } catch (err) {
        setError("Unable to load resources");
      } finally {
        setLoading(false);
      }
    }
    if (studentId && token) fetchData();
  }, [studentId, token]);

  if (loading) return <div className="muted">Loading resources…</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <section className="section">
      {resources.length === 0 && <div className="muted">No resources.</div>}
      {resources.length > 0 && (
        <ul className="list">
          {resources.map((r, i) => (
            <li className="card" key={i}>
              <a href={r.url} target="_blank" rel="noopener noreferrer">
                {r.title} ({r.type})
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
