import React, { useEffect, useState } from "react";

function formatDateLabel(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export default function Timetable({ studentId, token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [week, setWeek] = useState([]);

  useEffect(() => {
    if (!studentId) return;

    let mounted = true;

    async function fetchWeek() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `http://localhost:5000/student/${encodeURIComponent(studentId)}/timetable`,
          {
            headers: { Authorization: token ? `Bearer ${token}` : undefined }
          }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!mounted) return;
        setWeek(json.week || []);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Failed to fetch timetable");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchWeek();
    return () => {
      mounted = false;
    };
  }, [studentId, token]);

  return (
    <section className="section timetable-section">
      <div className="card timetable-card">
        {loading && <div className="muted">Loading timetable…</div>}
        {error && <div className="error">{error}</div>}
        {!loading && !error && week.length === 0 && (
          <div className="muted">No timetable available.</div>
        )}
        {!loading && !error && week.length > 0 && (
          <div className="timetable-vertical">
            {[...week]
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((dayItem, dayIndex) => (
                <article className="timetable-day" key={`${dayItem.date}-${dayIndex}`}>
                  <div className="tt-day-head">
                    <span className="tt-date-pill">{formatDateLabel(dayItem.date)}</span>
                    <span className="tt-count">
                      {(dayItem.classes || []).length} class{(dayItem.classes || []).length === 1 ? "" : "es"}
                    </span>
                  </div>

                  <div className="tt-day-classes">
                    {(dayItem.classes || []).map((classItem, classIndex) => (
                      <div className="tt-class-row" key={`${dayItem.date}-${classIndex}`}>
                        <p className="tt-time">{classItem.time || "Time TBD"}</p>
                        <div className="tt-details">
                          <p className="tt-subject">{classItem.subject || "Subject"}</p>
                          <p className="tt-meta">{classItem.teacher || "Teacher TBD"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
