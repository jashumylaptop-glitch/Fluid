import React, { useEffect, useMemo, useState } from "react";
import fallbackTasks from "../data/taskFlow.sample.json";

function dueLabelFromDate(value) {
  if (!value) return "No due date";
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return "No due date";

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.round((startDue - startToday) / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";

  return due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function dotClassFromDueLabel(label) {
  if (label === "Today") return "urgent";
  if (label === "Tomorrow") return "soon";
  return "normal";
}

export default function TaskFlow({ studentId, token }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingTaskIds, setSavingTaskIds] = useState([]);
  const [syncWarning, setSyncWarning] = useState("");

  useEffect(() => {
    let mounted = true;

    async function fetchTasks() {
      if (!studentId || !token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`http://localhost:5000/student/${encodeURIComponent(studentId)}/assignments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const backendTasks = (json.assignments || []).map((item) => {
          const dueLabel = dueLabelFromDate(item.dueDate);
          return {
            id: item._id || `${item.title}-${item.dueDate || "none"}`,
            title: item.title || "Task",
            subject: item.subject || item.description || "Course",
            dueLabel,
            status: item.status === "completed" ? "completed" : "pending",
            dotTone: dotClassFromDueLabel(dueLabel)
          };
        });

        if (!mounted) return;
        setTasks(backendTasks);
      } catch (requestError) {
        if (!mounted) return;
        setError("Unable to load task flow");
        setTasks((fallbackTasks.items || []).map((item, index) => ({
          id: `fallback-${index}`,
          title: item.title,
          subject: item.subject,
          dueLabel: item.dueLabel,
          status: item.status,
          dotTone: item.dotTone || "normal"
        })));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchTasks();
    return () => {
      mounted = false;
    };
  }, [studentId, token]);

  const { pendingTasks, completedTasks } = useMemo(() => {
    const pending = tasks.filter((item) => item.status !== "completed");
    const completed = tasks.filter((item) => item.status === "completed");
    return { pendingTasks: pending, completedTasks: completed };
  }, [tasks]);

  if (loading) return <div className="muted">Loading task flow…</div>;
  if (error && tasks.length === 0) return <div className="error">{error}</div>;

  async function handleToggleTask(task) {
    if (!task) return;
    if (savingTaskIds.includes(task.id)) return;

    const nextStatus = task.status === "completed" ? "pending" : "completed";
    setSyncWarning("");

    setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, status: nextStatus } : item)));

    if (String(task.id).startsWith("fallback-")) return;

    setSavingTaskIds((prev) => [...prev, task.id]);
    try {
      const res = await fetch(
        `http://localhost:5000/student/${encodeURIComponent(studentId)}/assignments/${encodeURIComponent(task.id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: nextStatus })
        }
      );

      if (!res.ok) {
        setSyncWarning("Task updated locally. Server sync pending.");
      }
    } catch (requestError) {
      setSyncWarning("Task updated locally. Server sync pending.");
    } finally {
      setSavingTaskIds((prev) => prev.filter((id) => id !== task.id));
    }
  }

  return (
    <section className="section task-flow-section">
      <article className="card task-flow-card">
        <div className="task-flow-list">
          {syncWarning && <div className="muted">{syncWarning}</div>}
          {pendingTasks.length === 0 && <div className="muted">No active tasks.</div>}

          {pendingTasks.map((task) => (
            <article className="task-row" key={task.id}>
              <button
                type="button"
                className={`task-check interactive ${savingTaskIds.includes(task.id) ? "is-active" : ""}`}
                onClick={() => handleToggleTask(task)}
                aria-label={`Mark ${task.title} as completed`}
                disabled={savingTaskIds.includes(task.id)}
              />
              <div className="task-main">
                <h4>{task.title}</h4>
                <p>
                  {task.subject} <span className="task-sep">·</span> <span className={`due-tag ${task.dotTone}`}>{task.dueLabel}</span>
                </p>
              </div>
              <span className={`task-dot ${task.dotTone}`} />
            </article>
          ))}
        </div>

        <div className="task-divider" />

        <div className="task-completed-block">
          <p className="task-completed-title">Completed</p>

          {completedTasks.length === 0 && <div className="muted">No completed tasks yet.</div>}

          {completedTasks.map((task) => (
            <article className="task-row completed" key={task.id}>
              <button
                type="button"
                className={`task-check done is-active interactive`}
                onClick={() => handleToggleTask(task)}
                aria-label={`Undo completed task ${task.title}`}
                disabled={savingTaskIds.includes(task.id)}
              >
                <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false">
                  <path d="M5 12.5l4.2 4.2L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div className="task-main">
                <h4>{task.title}</h4>
              </div>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}
