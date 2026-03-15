import React, { useEffect, useMemo, useState } from "react";
import fallbackJourney from "../data/courseJourney.sample.json";

function getGradeBadge(percentage) {
  if (percentage >= 85) return "A";
  if (percentage >= 75) return "A-";
  if (percentage >= 65) return "B+";
  if (percentage >= 55) return "B";
  if (percentage >= 45) return "C+";
  return "C";
}

const nextMilestoneBySubject = {
  "Data Structures": "Midterm Exam",
  Algorithms: "Project Submission",
  "Linear Algebra": "Quiz 4",
  "AI Fundamentals": "Paper Review",
  "Software Engineering": "Sprint Demo"
};

export default function CourseJourney({ studentId, token }) {
  const [marks, setMarks] = useState([]);
  const [useFallback, setUseFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function fetchMarks() {
      if (!studentId || !token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`http://localhost:5000/student/${encodeURIComponent(studentId)}/marks`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        if (!mounted) return;
        setUseFallback(false);
        setMarks(json.marks || []);
      } catch (requestError) {
        if (!mounted) return;
        setError("Unable to load course journey");
        setUseFallback(true);
        setMarks([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchMarks();
    return () => {
      mounted = false;
    };
  }, [studentId, token]);

  const journeyItems = useMemo(() => {
    if (useFallback) {
      return fallbackJourney.items || [];
    }

    if (!marks.length) {
      return [];
    }

    const grouped = marks.reduce((acc, item) => {
      const key = item.subject || "Course";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([subject, entries]) => {
        const percentage = Math.round(
          entries.reduce((sum, mark) => sum + ((mark.total ? (mark.score / mark.total) * 100 : 0)), 0) / entries.length
        );
        return {
          subject,
          grade: getGradeBadge(percentage),
          progress: Math.max(0, Math.min(100, percentage)),
          next: nextMilestoneBySubject[subject] || "Assessment"
        };
      })
      .sort((a, b) => b.progress - a.progress);
  }, [marks, useFallback]);

  if (loading) return <div className="muted">Loading course journey…</div>;
  if (error && journeyItems.length === 0) return <div className="error">{error}</div>;

  return (
    <section className="section course-journey-section">
      <article className="card journey-card">
        <div className="journey-list">
          {journeyItems.length === 0 && <div className="muted">No course progress available.</div>}

          {journeyItems.map((item, index) => (
            <article key={`${item.subject}-${index}`} className="journey-item">
              <div className="journey-item-top">
                <div className="journey-subject-wrap">
                  <h4>{item.subject}</h4>
                  <span className="journey-grade-chip">{item.grade}</span>
                </div>
                <span className="journey-percent">{item.progress}%</span>
              </div>

              <div className="journey-track">
                <div className="journey-fill" style={{ width: `${item.progress}%` }} />
              </div>

              <p className="journey-next">→ Next: {item.next}</p>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}
