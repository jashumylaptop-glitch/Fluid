import React, { useEffect, useMemo, useState } from "react";
import fallbackFlow from "../data/todayFlow.sample.json";

function getTodayFlowKey(item) {
  return `${item.subject || "class"}::${item.time || "time"}::${item.location || item.teacher || "location"}`;
}

function readStoredOverrides(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeStoredOverrides(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value || {}));
  } catch {
    // no-op
  }
}

async function readApiJsonSafe(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

function getApiErrorMessage(response, payload, fallback) {
  if (payload?.message) return payload.message;
  const raw = String(payload?._raw || "").trim().toLowerCase();
  if (raw.includes("cannot patch /student/") && raw.includes("/timetable/flow-stage")) {
    return "Backend is running an older build. Restart backend server and try again.";
  }
  if (raw.startsWith("<!doctype") || raw.startsWith("<html")) {
    return fallback;
  }
  return fallback || `HTTP ${response.status}`;
}

function parseStartMinutes(timeRange = "") {
  const start = String(timeRange).split("-")[0]?.trim();
  const [hourText, minuteText] = (start || "").split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function parseEndMinutes(timeRange = "") {
  const end = String(timeRange).split("-")[1]?.trim();
  const [hourText, minuteText] = (end || "").split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function formatClock(mins) {
  if (mins === null || Number.isNaN(mins)) return "--:--";
  const hour = Math.floor(mins / 60);
  const minute = mins % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export default function TodayFlow({ studentId, token }) {
  const flowStorageKey = `student-today-flow-overrides:${studentId || "unknown"}`;
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState("");
  const [savingFlowKey, setSavingFlowKey] = useState("");
  const [stageOverrides, setStageOverrides] = useState(() => readStoredOverrides(flowStorageKey));

  useEffect(() => {
    setStageOverrides(readStoredOverrides(flowStorageKey));
  }, [flowStorageKey]);

  useEffect(() => {
    let mounted = true;

    async function loadTodayFlow() {
      if (!studentId || !token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`http://localhost:5000/student/${encodeURIComponent(studentId)}/timetable`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const todayKey = new Date().toISOString().split("T")[0];
        const weekItems = json.week || [];
        const todayItem = weekItems.find((item) => item.date === todayKey);

        const fetchedClasses = (todayItem?.classes || [])
          .map((item) => ({
            ...item,
            date: todayKey,
            startMinutes: parseStartMinutes(item.time),
            endMinutes: parseEndMinutes(item.time)
          }))
          .filter((item) => item.startMinutes !== null)
          .sort((a, b) => a.startMinutes - b.startMinutes);

        if (!mounted) return;
        setClasses(fetchedClasses);
      } catch (fetchError) {
        if (!mounted) return;
        setError("Unable to load today's flow");
        setClasses((fallbackFlow.items || []).map((item) => ({
          subject: item.subject,
          teacher: item.teacher,
          location: item.location,
          time: item.time,
          date: new Date().toISOString().split("T")[0],
          flowStage: null,
          startMinutes: parseStartMinutes(item.time),
          endMinutes: parseEndMinutes(item.time)
        })));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadTodayFlow();
    return () => {
      mounted = false;
    };
  }, [studentId, token]);

  const timelineItems = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let nowIndex = -1;
    for (let index = 0; index < classes.length; index += 1) {
      const lesson = classes[index];
      const endMinutes = lesson.endMinutes ?? lesson.startMinutes;
      if (lesson.startMinutes !== null && endMinutes !== null && nowMinutes >= lesson.startMinutes && nowMinutes <= endMinutes) {
        nowIndex = index;
        break;
      }
    }

    let nextIndex = -1;
    if (nowIndex >= 0 && nowIndex < classes.length - 1) {
      nextIndex = nowIndex + 1;
    } else if (nowIndex === -1) {
      nextIndex = classes.findIndex((lesson) => lesson.startMinutes !== null && nowMinutes < lesson.startMinutes);
    }

    const rows = [];

    classes.forEach((lesson, index) => {
      if (index > 0) {
        const prev = classes[index - 1];
        if (prev.endMinutes !== null && lesson.startMinutes !== null && lesson.startMinutes - prev.endMinutes >= 60) {
          const breakLabel = lesson.startMinutes >= 12 * 60 && lesson.startMinutes <= 14 * 60
            ? "Lunch Break"
            : "Break";

          rows.push({
            type: "break",
            timeLabel: formatClock(prev.endMinutes),
            title: breakLabel
          });
        }
      }

      const flowKey = getTodayFlowKey(lesson);
      const autoDone = nowIndex === -1 && nextIndex !== index
        ? nowMinutes >= (lesson.endMinutes ?? lesson.startMinutes)
        : index < nowIndex;
      const autoStage = index === nowIndex
        ? "Now"
        : index === nextIndex
        ? "Next"
        : autoDone
        ? "Done"
        : "Upcoming";
      const overrideStage = stageOverrides[flowKey];
      const persistedStage = ["Now", "Next", "Done", "Upcoming"].includes(lesson.flowStage) ? lesson.flowStage : null;
      const stage = ["Now", "Next", "Done", "Upcoming"].includes(overrideStage)
        ? overrideStage
        : (persistedStage || autoStage);

      rows.push({
        type: "class",
        timeLabel: formatClock(lesson.startMinutes),
        subject: lesson.subject || "Class",
        date: lesson.date,
        rawTime: lesson.time,
        location: lesson.location || lesson.teacher || "Room TBD",
        flowKey,
        stage,
        isNow: stage === "Now",
        isNext: stage === "Next",
        isDone: stage === "Done",
        isUpcoming: stage === "Upcoming"
      });
    });

    return rows;
  }, [classes, stageOverrides]);

  const moveFlowStage = async (item, stage) => {
    if (!item?.flowKey) return;

    try {
      setSavingFlowKey(item.flowKey);
      setSaveError("");

      if (studentId && token && item.subject && item.rawTime) {
        const response = await fetch(`http://localhost:5000/student/${encodeURIComponent(studentId)}/timetable/flow-stage`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            date: item.date,
            subject: item.subject,
            time: item.rawTime,
            stage: stage === "Auto" ? null : stage
          })
        });

        const json = await readApiJsonSafe(response);
        if (!response.ok) {
          throw new Error(getApiErrorMessage(response, json, "Unable to save today flow right now."));
        }
      }

      setStageOverrides((current) => {
        const next = { ...current };
        if (stage === "Auto") {
          delete next[item.flowKey];
        } else {
          next[item.flowKey] = stage;
        }
        writeStoredOverrides(flowStorageKey, next);
        return next;
      });
    } catch (updateError) {
      setSaveError(updateError.message || "Unable to save today flow right now.");
    } finally {
      setSavingFlowKey("");
    }
  };

  if (loading) return <div className="muted">Loading today flow…</div>;
  if (error && timelineItems.length === 0) return <div className="error">{error}</div>;

  return (
    <section className="section today-flow-section">
      <article className="card today-flow-card">
        {saveError && <div className="card muted">{saveError}</div>}
        <div className="today-flow-timeline">
          {timelineItems.length === 0 && <div className="muted">No classes scheduled for today.</div>}

          {timelineItems.map((item, index) => (
            <div className={`flow-row ${item.type === "break" ? "flow-break" : "flow-class"}`} key={`${item.timeLabel}-${index}`}>
              <div className="flow-line-col">
                <span className={`flow-bullet ${item.isNow ? "is-now" : ""}`} />
                {index !== timelineItems.length - 1 && <span className="flow-line" />}
              </div>

              <div className="flow-content-col">
                <div className="flow-time">{item.timeLabel}</div>

                {item.type === "break" ? (
                  <div className="flow-break-text">{item.title}</div>
                ) : (
                  <article className={`flow-card ${item.isNow ? "active-now" : ""}`}>
                    <h4>{item.subject}</h4>
                    <p>{item.location}</p>
                    {item.isNow && (
                      <div className="flow-now-tag">
                        <span className="flow-now-dot" />
                        HAPPENING NOW
                      </div>
                    )}
                    {!item.isNow && item.isNext && <div className="today-flow-status is-next">NEXT</div>}
                    {!item.isNow && !item.isNext && item.isDone && <div className="today-flow-status is-done">DONE</div>}
                    {item.isUpcoming && <div className="today-flow-status is-upcoming">UPCOMING</div>}
                    <div className="today-flow-actions-row">
                      {!item.isNow && (
                        <button type="button" className="today-flow-action" onClick={() => moveFlowStage(item, "Now")} disabled={savingFlowKey === item.flowKey}>{savingFlowKey === item.flowKey ? "Saving..." : "Mark Now"}</button>
                      )}
                      {!item.isDone && (
                        <button type="button" className="today-flow-action" onClick={() => moveFlowStage(item, "Done")} disabled={savingFlowKey === item.flowKey}>{savingFlowKey === item.flowKey ? "Saving..." : "Mark Done"}</button>
                      )}
                      {!item.isNext && !item.isNow && (
                        <button type="button" className="today-flow-action" onClick={() => moveFlowStage(item, "Next")} disabled={savingFlowKey === item.flowKey}>{savingFlowKey === item.flowKey ? "Saving..." : "Mark Next"}</button>
                      )}
                      <button type="button" className="today-flow-action" onClick={() => moveFlowStage(item, "Auto")} disabled={savingFlowKey === item.flowKey}>{savingFlowKey === item.flowKey ? "Saving..." : "Reset Auto"}</button>
                    </div>
                  </article>
                )}
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
