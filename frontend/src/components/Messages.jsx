import React, { useEffect, useState } from "react";

export default function Messages({ studentId, token }) {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`http://localhost:5000/student/${studentId}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        setMsgs(json.messages || []);
      } catch (err) {
        setError("Unable to load messages");
      } finally {
        setLoading(false);
      }
    }
    if (studentId && token) fetchData();
  }, [studentId, token]);

  if (loading) return <div className="muted">Loading messages…</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <section className="section">
      {msgs.length === 0 && <div className="muted">No messages.</div>}
      {msgs.length > 0 && (
        <ul className="list">
          {msgs.map((m, i) => (
            <li className="card" key={i}>
              <div>{m.content}</div>
              <div className="muted" style={{ fontSize: "12px" }}>
                From: {m.from} – {new Date(m.date).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
