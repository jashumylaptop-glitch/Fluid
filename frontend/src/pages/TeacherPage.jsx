import React, { useEffect, useMemo, useRef, useState } from "react";
import "../global.css";
import AppFooter from "../components/AppFooter";
import teacherSample from "../data/teacherDashboard.sample.json";

function getStatusClass(status) {
  const label = (status || "").toLowerCase();
  if (label.includes("excellent")) return "status excellent";
  if (label.includes("active")) return "status active";
  return "status risk";
}

function getInitials(name) {
  if (!name) return "TC";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function formatMessageTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (diffMs < hour) {
    const mins = Math.max(1, Math.floor(diffMs / (60 * 1000)));
    return `${mins} min ago`;
  }

  if (diffMs < day) {
    const hrs = Math.floor(diffMs / hour);
    return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  }

  if (diffMs < day * 2) return "Yesterday";

  return date.toLocaleDateString();
}

function parseTimeToMinutes(value) {
  const source = String(value || "").trim();
  if (!source) return null;

  const match = source.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridian = match[3]?.toLowerCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes > 59) return null;

  if (meridian) {
    if (hours < 1 || hours > 12) return null;
    if (meridian === "pm" && hours !== 12) hours += 12;
    if (meridian === "am" && hours === 12) hours = 0;
  } else if (hours > 23) {
    return null;
  }

  return hours * 60 + minutes;
}

function parseRangeStart(value) {
  const [start] = String(value || "").split("-");
  return parseTimeToMinutes(start);
}

function parseRangeEnd(value) {
  const parts = String(value || "").split("-");
  return parseTimeToMinutes(parts[1]);
}

function getEvaluationItemKey(item) {
  return `${item.studentId || item.student || "student"}::${item.course || "course"}`;
}

function getClassFlowItemKey(item) {
  return `${item.subject || "class"}::${item.time || "time"}::${item.room || "room"}`;
}

function readStoredMap(key) {
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

function writeStoredMap(key, value) {
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
  if (raw.includes("cannot patch /teacher/") && raw.includes("/risk-stage")) {
    return "Backend is running an older build. Restart backend server and try again.";
  }
  if (raw.includes("cannot patch /teacher/") && raw.includes("/evaluation-stage")) {
    return "Backend is running an older build. Restart backend server and try again.";
  }
  if (raw.startsWith("<!doctype") || raw.startsWith("<html")) {
    return fallback;
  }
  return fallback || `HTTP ${response.status}`;
}

const teacherSections = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "students", label: "Students", icon: "users" },
  { key: "courses", label: "Courses", icon: "book" },
  { key: "attendance", label: "Attendance", icon: "calendar" },
  { key: "grades", label: "Grades", icon: "chart" },
  { key: "messages", label: "Messages", icon: "mail" }
];

const teacherFlowSections = [
  { key: "classFlow", label: "Class Flow", icon: "flowToday" },
  { key: "evaluationFlow", label: "Evaluation Flow", icon: "flowTask" },
  { key: "riskFlow", label: "Student Risk Flow", icon: "flowCourse" }
];

const teacherMvpSections = [
  { key: "mvpAddStudent", label: "Add Student", icon: "users" },
  { key: "mvpTimetable", label: "Assign Subject", icon: "book" },
  { key: "mvpAttendance", label: "Mark Attendance", icon: "calendar" },
  { key: "mvpMarks", label: "Enter Marks", icon: "chart" }
];

const teacherIconPaths = {
  dashboard: <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />,
  users: (
    <>
      <path d="M8 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM16 13a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
      <path d="M3 19a5 5 0 0 1 10 0M11 19a5 5 0 0 1 10 0" />
    </>
  ),
  book: (
    <>
      <path d="M4 7h8v12H4zM12 7h8v12h-8z" />
      <path d="M12 9.5a6 6 0 0 1 8 0" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19h16" />
      <path d="M7 16v-4M12 16V8M17 16v-6" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M4 8l8 6 8-6" />
    </>
  ),
  flowCentric: (
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  flowToday: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </>
  ),
  flowTask: (
    <>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M8 11h8M8 15h5" />
    </>
  ),
  flowCourse: (
    <>
      <path d="M4 7h8v12H4zM12 7h8v12h-8z" />
      <path d="M12 9.5a6 6 0 0 1 8 0" />
    </>
  )
};

function TeacherMenuIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" className="teacher-menu-icon-svg" aria-hidden="true" focusable="false">
      {teacherIconPaths[name]}
    </svg>
  );
}

export default function TeacherPage() {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const teacherId = localStorage.getItem("userId") || sessionStorage.getItem("userId");
  const role = localStorage.getItem("role") || sessionStorage.getItem("role");
  const classFlowStorageKey = `teacher-class-flow-overrides:${teacherId || "unknown"}`;
  const evaluationStorageKey = `teacher-evaluation-stage-overrides:${teacherId || "unknown"}`;
  const riskStorageKey = `teacher-risk-stage-overrides:${teacherId || "unknown"}`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");
  const [flowOpen, setFlowOpen] = useState(true);
  const [mvpOpen, setMvpOpen] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [classFlowOverrides, setClassFlowOverrides] = useState(() => readStoredMap(classFlowStorageKey));
  const [evaluationStageOverrides, setEvaluationStageOverrides] = useState(() => readStoredMap(evaluationStorageKey));
  const [savingEvaluationKey, setSavingEvaluationKey] = useState("");
  const [evaluationError, setEvaluationError] = useState("");
  const [riskStageOverrides, setRiskStageOverrides] = useState(() => readStoredMap(riskStorageKey));
  const [savingRiskKey, setSavingRiskKey] = useState("");
  const [riskError, setRiskError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [mvpSaving, setMvpSaving] = useState(false);
  const [mvpError, setMvpError] = useState("");
  const [mvpStatus, setMvpStatus] = useState("");
  const [noticesOpen, setNoticesOpen] = useState(false);
  const noticesRef = useRef(null);
  const [addStudentForm, setAddStudentForm] = useState({ firstName: "", lastName: "", email: "", password: "pass123", grade: "" });
  const [assignSubjectForm, setAssignSubjectForm] = useState({ studentId: "", date: "", time: "", subject: "", room: "" });
  const [attendanceForm, setAttendanceForm] = useState({ studentId: "", date: "", subject: "", present: "present" });
  const [marksForm, setMarksForm] = useState({ studentId: "", examName: "", subject: "", score: "", total: "" });

  useEffect(() => {
    if (!token || !teacherId || role !== "teacher") {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function fetchTeacherDashboard() {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`http://localhost:5000/teacher/${teacherId}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const json = await readApiJsonSafe(res);
        if (!res.ok) {
          throw new Error(getApiErrorMessage(res, json, "Backend unavailable. Using sample data."));
        }

        if (mounted) {
          setPayload(json);
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError.message || "Backend unavailable. Using sample data.");
          setPayload({
            teacher: {
              fullName: "Teacher",
              teacherId,
              studentIds: []
            },
            stats: teacherSample.stats,
            roster: teacherSample.roster,
            todaySchedule: teacherSample.todaySchedule
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchTeacherDashboard();

    return () => {
      mounted = false;
    };
  }, [token, teacherId, role, refreshTick]);

  useEffect(() => {
    if (!loading && role && role !== "teacher") {
      window.location.href = "/";
    }
  }, [loading, role]);

  const stats = payload?.stats || teacherSample.stats;
  const roster = payload?.roster || teacherSample.roster;
  const todaySchedule = payload?.todaySchedule || teacherSample.todaySchedule;
  const courses = payload?.courses || teacherSample.courses || [];
  const attendanceOverview = payload?.attendanceOverview || teacherSample.attendanceOverview || [];
  const gradesOverview = payload?.gradesOverview || teacherSample.gradesOverview || [];
  const messagesOverview = payload?.messagesOverview || teacherSample.messagesOverview || [];
  const teacherName = payload?.teacher?.fullName || "Teacher";
  const isStudentsView = activeSection === "students";
  const isCoursesView = activeSection === "courses";
  const isAttendanceView = activeSection === "attendance";
  const isGradesView = activeSection === "grades";
  const isMessagesView = activeSection === "messages";
  const isClassFlowView = activeSection === "classFlow";
  const isEvaluationFlowView = activeSection === "evaluationFlow";
  const isRiskFlowView = activeSection === "riskFlow";
  const isMvpAddStudentView = activeSection === "mvpAddStudent";
  const isMvpTimetableView = activeSection === "mvpTimetable";
  const isMvpAttendanceView = activeSection === "mvpAttendance";
  const isMvpMarksView = activeSection === "mvpMarks";
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const hasActiveSearch = normalizedSearch.length > 0;

  const matchesSearch = (...values) => {
    if (!hasActiveSearch) return true;
    return values.some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch));
  };

  const filteredRoster = useMemo(
    () => roster.filter((student) => matchesSearch(student.fullName, student.email, student.studentId, student.course, student.grade, student.status)),
    [roster, normalizedSearch]
  );

  const filteredCourses = useMemo(
    () => courses.filter((course) => matchesSearch(course.name, course.status, course.schedule, course.students)),
    [courses, normalizedSearch]
  );

  const filteredAttendance = useMemo(
    () => attendanceOverview.filter((item) => matchesSearch(item.course, item.percent, item.present, item.total)),
    [attendanceOverview, normalizedSearch]
  );

  const filteredGrades = useMemo(
    () => gradesOverview.filter((item) => matchesSearch(item.student, item.course, item.midterm, item.midtermScore, item.final, item.finalScore, item.overall, item.overallPercent)),
    [gradesOverview, normalizedSearch]
  );

  const filteredMessages = useMemo(
    () => messagesOverview.filter((message) => matchesSearch(message.from, message.subject, message.preview, message.date)),
    [messagesOverview, normalizedSearch]
  );

  const filteredSchedule = useMemo(
    () => todaySchedule.filter((item) => matchesSearch(item.subject, item.time, item.room, item.students)),
    [todaySchedule, normalizedSearch]
  );

  const classFlowItems = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const parsed = filteredSchedule
      .map((item) => ({
        ...item,
        startMinutes: parseRangeStart(item.time),
        endMinutes: parseRangeEnd(item.time)
      }))
      .filter((item) => item.startMinutes !== null)
      .sort((a, b) => a.startMinutes - b.startMinutes);

    let nowIndex = -1;
    for (let index = 0; index < parsed.length; index += 1) {
      const lesson = parsed[index];
      const endMinutes = lesson.endMinutes ?? lesson.startMinutes;
      if (nowMinutes >= lesson.startMinutes && nowMinutes <= endMinutes) {
        nowIndex = index;
        break;
      }
    }

    let nextIndex = -1;
    if (nowIndex >= 0 && nowIndex < parsed.length - 1) {
      nextIndex = nowIndex + 1;
    } else if (nowIndex === -1) {
      nextIndex = parsed.findIndex((lesson) => nowMinutes < lesson.startMinutes);
    }

    return parsed.map((lesson, index) => {
      const flowKey = getClassFlowItemKey(lesson);
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

      const overrideStage = classFlowOverrides[flowKey];
      const stage = ["Now", "Next", "Done", "Upcoming"].includes(overrideStage)
        ? overrideStage
        : autoStage;

      return {
        ...lesson,
        flowKey,
        stage,
        isNow: stage === "Now",
        isNext: stage === "Next",
        isDone: stage === "Done",
        isUpcoming: stage === "Upcoming"
      };
    });
  }, [filteredSchedule, classFlowOverrides]);

  const evaluationFlowItems = useMemo(() => (
    filteredGrades.map((item) => {
      const flowKey = getEvaluationItemKey(item);
      const score = Number(item.overallPercent);
      const overrideStage = evaluationStageOverrides[flowKey];

      if (overrideStage) {
        return {
          ...item,
          flowKey,
          stage: overrideStage
        };
      }

      if (item.evaluationStage && ["Pending", "Reviewing", "Published"].includes(item.evaluationStage)) {
        return {
          ...item,
          flowKey,
          stage: item.evaluationStage
        };
      }

      if (Number.isNaN(score) || score <= 0) {
        return {
          ...item,
          flowKey,
          stage: "Pending"
        };
      }
      if (score < 70) {
        return {
          ...item,
          flowKey,
          stage: "Reviewing"
        };
      }
      return {
        ...item,
        flowKey,
        stage: "Published"
      };
    })
  ), [filteredGrades, evaluationStageOverrides]);

  const evaluationFlowColumns = useMemo(() => ({
    pending: evaluationFlowItems.filter((item) => item.stage === "Pending"),
    reviewing: evaluationFlowItems.filter((item) => item.stage === "Reviewing"),
    published: evaluationFlowItems.filter((item) => item.stage === "Published")
  }), [evaluationFlowItems]);

  const riskFlowItems = useMemo(() => {
    const unreadMap = new Map();
    messagesOverview.forEach((item) => {
      const key = item?.studentId;
      if (!key || !item?.isNew) return;
      unreadMap.set(key, (unreadMap.get(key) || 0) + 1);
    });

    return filteredRoster.map((student) => {
      const attendance = Number(student.attendance ?? 0);
      const gradeLabel = String(student.grade || "").toUpperCase();
      const unreadCount = unreadMap.get(student.studentId) || 0;
      const overrideStage = riskStageOverrides[student.studentId];

      if (overrideStage && ["Normal", "Watch", "Intervention"].includes(overrideStage)) {
        return {
          ...student,
          unreadCount,
          stage: overrideStage
        };
      }

      if (student.riskStage && ["Normal", "Watch", "Intervention"].includes(student.riskStage)) {
        return {
          ...student,
          unreadCount,
          stage: student.riskStage
        };
      }

      let riskScore = 0;
      if (attendance < 75) riskScore += 2;
      else if (attendance < 85) riskScore += 1;

      if (gradeLabel.startsWith("C") || gradeLabel.startsWith("D") || gradeLabel.startsWith("F")) riskScore += 2;
      if (String(student.status || "").toLowerCase().includes("risk")) riskScore += 2;
      if (unreadCount > 0) riskScore += 1;

      let stage = "Normal";
      if (riskScore >= 4) stage = "Intervention";
      else if (riskScore >= 2) stage = "Watch";

      return {
        ...student,
        unreadCount,
        stage
      };
    });
  }, [filteredRoster, messagesOverview, riskStageOverrides]);

  const riskFlowColumns = useMemo(() => ({
    normal: riskFlowItems.filter((item) => item.stage === "Normal"),
    watch: riskFlowItems.filter((item) => item.stage === "Watch"),
    intervention: riskFlowItems.filter((item) => item.stage === "Intervention")
  }), [riskFlowItems]);

  const summaryText = useMemo(() => {
    if (!payload?.teacher?.studentIds?.length) return "No students are assigned yet";
    return `${payload.teacher.studentIds.length} assigned student IDs`;
  }, [payload]);

  const unreadMessagesCount = useMemo(
    () => messagesOverview.filter((item) => item?.isNew).length,
    [messagesOverview]
  );
  const topMessages = useMemo(() => messagesOverview.slice(0, 6), [messagesOverview]);

  useEffect(() => {
    function onDocClick(event) {
      if (noticesRef.current && !noticesRef.current.contains(event.target)) {
        setNoticesOpen(false);
      }
    }

    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const applySearch = () => {
    setSearchTerm(searchInput);
  };

  const moveClassFlowStage = (item, stage) => {
    if (!item?.flowKey) return;
    setClassFlowOverrides((current) => {
      const next = {
        ...current
      };

      if (stage === "Auto") {
        delete next[item.flowKey];
      } else {
        next[item.flowKey] = stage;
      }

      writeStoredMap(classFlowStorageKey, next);
      return next;
    });
  };

  const moveEvaluationStage = async (item, stage) => {
    const flowKey = item.flowKey;
    if (!token || !teacherId || !item?.studentId || !flowKey) return;

    try {
      setSavingEvaluationKey(flowKey);
      setEvaluationError("");

      const response = await fetch(`http://localhost:5000/teacher/${teacherId}/evaluation-stage`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: item.studentId,
          course: item.course,
          stage
        })
      });

      const json = await readApiJsonSafe(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, json, "Unable to save right now. Please make sure backend is running."));
      }

      setEvaluationStageOverrides((current) => {
        const next = {
          ...current,
          [flowKey]: stage
        };
        writeStoredMap(evaluationStorageKey, next);
        return next;
      });
    } catch (saveError) {
      setEvaluationError(saveError.message || "Unable to save right now. Please make sure backend is running.");
    } finally {
      setSavingEvaluationKey("");
    }
  };

  const moveRiskStage = async (item, stage) => {
    if (!token || !teacherId || !item?.studentId) return;

    try {
      setSavingRiskKey(item.studentId);
      setRiskError("");

      const response = await fetch(`http://localhost:5000/teacher/${teacherId}/risk-stage`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          studentId: item.studentId,
          stage
        })
      });

      const json = await readApiJsonSafe(response);
      if (!response.ok) {
        throw new Error(getApiErrorMessage(response, json, "Unable to save risk stage right now. Please make sure backend is running."));
      }

      setRiskStageOverrides((current) => {
        const next = {
          ...current,
          [item.studentId]: stage
        };
        writeStoredMap(riskStorageKey, next);
        return next;
      });
    } catch (saveError) {
      setRiskError(saveError.message || "Unable to save risk stage right now. Please make sure backend is running.");
    } finally {
      setSavingRiskKey("");
    }
  };

  const postMvp = async (path, body) => {
    const response = await fetch(`http://localhost:5000/teacher/${teacherId}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const json = await readApiJsonSafe(response);
    if (!response.ok) {
      throw new Error(getApiErrorMessage(response, json, "Unable to save right now. Please make sure backend is running."));
    }
    return json;
  };

  const handleAddStudent = async (event) => {
    event.preventDefault();
    try {
      setMvpSaving(true);
      setMvpError("");
      const json = await postMvp("/mvp/students", addStudentForm);
      setMvpStatus(`${json.message || "Student added successfully"}${json?.student?.studentId ? ` (${json.student.studentId})` : ""}`);
      setAddStudentForm({ firstName: "", lastName: "", email: "", password: "pass123", grade: "" });
      setRefreshTick((value) => value + 1);
    } catch (saveError) {
      setMvpError(saveError.message || "Unable to add student.");
    } finally {
      setMvpSaving(false);
    }
  };

  const handleAssignSubject = async (event) => {
    event.preventDefault();
    try {
      setMvpSaving(true);
      setMvpError("");
      const studentIdValue = assignSubjectForm.studentId.trim();
      const body = {
        date: assignSubjectForm.date || undefined,
        time: assignSubjectForm.time,
        subject: assignSubjectForm.subject,
        room: assignSubjectForm.room
      };
      const json = await postMvp(`/mvp/students/${encodeURIComponent(studentIdValue)}/timetable`, body);
      setMvpStatus(json.message || "Subject assigned to timetable");
      setAssignSubjectForm((current) => ({ ...current, time: "", subject: "", room: "" }));
      setRefreshTick((value) => value + 1);
    } catch (saveError) {
      setMvpError(saveError.message || "Unable to assign subject.");
    } finally {
      setMvpSaving(false);
    }
  };

  const handleAttendance = async (event) => {
    event.preventDefault();
    try {
      setMvpSaving(true);
      setMvpError("");
      const studentIdValue = attendanceForm.studentId.trim();
      const body = {
        date: attendanceForm.date || undefined,
        subject: attendanceForm.subject,
        present: attendanceForm.present === "present"
      };
      const json = await postMvp(`/mvp/students/${encodeURIComponent(studentIdValue)}/attendance`, body);
      setMvpStatus(json.message || "Attendance saved");
      setRefreshTick((value) => value + 1);
    } catch (saveError) {
      setMvpError(saveError.message || "Unable to save attendance.");
    } finally {
      setMvpSaving(false);
    }
  };

  const handleMarks = async (event) => {
    event.preventDefault();
    try {
      setMvpSaving(true);
      setMvpError("");
      const studentIdValue = marksForm.studentId.trim();
      const body = {
        examName: marksForm.examName,
        subject: marksForm.subject,
        score: Number(marksForm.score),
        total: Number(marksForm.total)
      };
      const json = await postMvp(`/mvp/students/${encodeURIComponent(studentIdValue)}/marks`, body);
      setMvpStatus(json.message || "Mark saved");
      setRefreshTick((value) => value + 1);
    } catch (saveError) {
      setMvpError(saveError.message || "Unable to save marks.");
    } finally {
      setMvpSaving(false);
    }
  };

  if (!token || !teacherId || role !== "teacher") {
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="card error">
            <h3 style={{ marginTop: 0 }}>Teacher access only</h3>
            <p>Please log in using the Teacher role to open this dashboard.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="teacher-page">
      <aside className="teacher-sidebar">
        <div className="teacher-sidebar-brand">
          <div className="teacher-brand-logo-wrap">
            <img src="/Adobe%20Express%20-%20file.png" alt="Fluid Logo" className="teacher-brand-logo" />
          </div>
          <div className="teacher-brand-text">
            <h4>Fluid</h4>
            <p>System Management</p>
          </div>
        </div>
        <div className="teacher-menu-title">Menu</div>
        <nav className="teacher-menu">
          {teacherSections.map((section) => (
            <button
              key={section.key}
              type="button"
              className={activeSection === section.key ? "active" : ""}
              onClick={() => setActiveSection(section.key)}
            >
              <span className="teacher-menu-icon"><TeacherMenuIcon name={section.icon} /></span>
              <span>{section.label}</span>
            </button>
          ))}

          <div className={`teacher-flow-dropdown ${flowOpen ? "open" : ""}`}>
            <button
              type="button"
              className="teacher-flow-trigger"
              onClick={() => setFlowOpen((state) => !state)}
            >
              <span className="teacher-menu-icon"><TeacherMenuIcon name="flowCentric" /></span>
              <span>Flow Centric</span>
              <span className={`teacher-dropdown-caret ${flowOpen ? "open" : ""}`}>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>

            {flowOpen && (
              <div className="teacher-flow-submenu">
                {teacherFlowSections.map((flowItem) => (
                  <button
                    key={flowItem.key}
                    type="button"
                    className={`teacher-submenu-item ${activeSection === flowItem.key ? "active" : ""}`}
                    onClick={() => setActiveSection(flowItem.key)}
                  >
                    <span className="teacher-submenu-icon"><TeacherMenuIcon name={flowItem.icon} /></span>
                    {flowItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className={`teacher-flow-dropdown ${mvpOpen ? "open" : ""}`}>
            <button
              type="button"
              className="teacher-flow-trigger"
              onClick={() => setMvpOpen((state) => !state)}
            >
              <span className="teacher-menu-icon"><TeacherMenuIcon name="dashboard" /></span>
              <span>MVP Actions</span>
              <span className={`teacher-dropdown-caret ${mvpOpen ? "open" : ""}`}>
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>

            {mvpOpen && (
              <div className="teacher-flow-submenu">
                {teacherMvpSections.map((mvpItem) => (
                  <button
                    key={mvpItem.key}
                    type="button"
                    className={`teacher-submenu-item ${activeSection === mvpItem.key ? "active" : ""}`}
                    onClick={() => setActiveSection(mvpItem.key)}
                  >
                    <span className="teacher-submenu-icon"><TeacherMenuIcon name={mvpItem.icon} /></span>
                    {mvpItem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
        <div className="teacher-settings">Settings</div>
      </aside>

      <main className="teacher-main">
        <header className="teacher-topbar">
          <div>
            <h1>{isStudentsView ? "Students" : isCoursesView ? "Courses" : isAttendanceView ? "Attendance" : isGradesView ? "Grades" : isMessagesView ? "Messages" : isClassFlowView ? "Class Flow" : isEvaluationFlowView ? "Evaluation Flow" : isRiskFlowView ? "Student Risk Flow" : isMvpAddStudentView ? "Add Student" : isMvpTimetableView ? "Assign Subject" : isMvpAttendanceView ? "Mark Attendance" : isMvpMarksView ? "Enter Marks" : "Dashboard"}</h1>
            <p>
              {isStudentsView
                ? "Manage your students"
                : isCoursesView
                ? "Manage your courses"
                : isAttendanceView
                ? "Today's attendance overview"
                : isGradesView
                ? "Student performance overview"
                : isMessagesView
                ? "Your inbox"
                : isClassFlowView
                ? "Done → Now → Next timeline for today"
                : isEvaluationFlowView
                ? "Pending → Reviewing → Published"
                : isRiskFlowView
                ? "Normal → Watch → Intervention"
                : isMvpAddStudentView
                ? "Create and assign a student"
                : isMvpTimetableView
                ? "Add subject/time into student timetable"
                : isMvpAttendanceView
                ? "Record attendance by student"
                : isMvpMarksView
                ? "Add exam marks for a student"
                : `Welcome back, ${teacherName}`}
            </p>
          </div>
          <div className="teacher-top-right">
            <input
              type="text"
              className="teacher-search"
              placeholder="Search students, courses..."
              aria-label="Search students and courses"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applySearch();
                }
              }}
            />
            <button
              type="button"
              className="teacher-search-btn"
              aria-label="Run search"
              onClick={applySearch}
            >
              Search
            </button>
            <div className="teacher-notify-wrap" ref={noticesRef}>
              <button
                type="button"
                className={`teacher-notify-btn ${noticesOpen ? "open" : ""}`}
                aria-label="Open messages"
                onClick={() => setNoticesOpen((state) => !state)}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                  <path d="M6 9a6 6 0 0 1 12 0v5l2 2H4l2-2z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {unreadMessagesCount > 0 && (
                  <span className="teacher-notify-badge">{unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}</span>
                )}
              </button>

              {noticesOpen && (
                <div className="teacher-notices-dropdown">
                  <h4>Notifications</h4>
                  {topMessages.length === 0 ? (
                    <div className="muted notice-empty">No notifications</div>
                  ) : (
                    <ul>
                      {topMessages.map((item, index) => (
                        <li key={`${item.studentId || "msg"}-${item.date || index}`}>
                          <div className="notice-content">{item.subject || item.preview || "School update"}</div>
                          <div className="notice-meta">
                            {(item.from ? `From: ${item.from}` : "School update") + " · " + formatMessageTime(item.date)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    className="notice-view-all"
                    onClick={() => {
                      setActiveSection("messages");
                      setNoticesOpen(false);
                    }}
                  >
                    View all
                  </button>
                </div>
              )}
            </div>
            <div className="teacher-avatar">{getInitials(teacherName)}</div>
          </div>
        </header>

        {error && <div className="card muted">Using sample data: {error}</div>}
        {loading && (
          <div className="card muted loading-card" aria-live="polite">
            <div className="loading-line loading-line-50" />
            <div className="loading-line loading-line-80" />
            <div className="loading-line loading-line-65" />
          </div>
        )}

        {!loading && (
          <div key={activeSection} className="view-switch">
            {activeSection === "dashboard" && (
              <section className="teacher-stats-grid">
                <article className="teacher-stat-card">
                  <h3>Total Students</h3>
                  <div className="teacher-stat-value">{stats.totalStudents || 0}</div>
                  <p>{summaryText}</p>
                </article>
                <article className="teacher-stat-card">
                  <h3>Active Courses</h3>
                  <div className="teacher-stat-value">{stats.activeCourses || 0}</div>
                  <p>Courses running today</p>
                </article>
                <article className="teacher-stat-card">
                  <h3>Avg. Attendance</h3>
                  <div className="teacher-stat-value">{stats.averageAttendance || 0}%</div>
                  <p>Across assigned students</p>
                </article>
                <article className="teacher-stat-card">
                  <h3>Avg. Grade</h3>
                  <div className="teacher-stat-value">{stats.avgGrade || "N/A"}</div>
                  <p>Based on current marks</p>
                </article>
              </section>
            )}

            {isCoursesView ? (
              <section className="teacher-courses-grid">
                {filteredCourses.length === 0 && (
                  <div className="card muted">
                    {courses.length === 0
                      ? "No courses found for this teacher yet."
                      : "No courses match your search."}
                  </div>
                )}
                {filteredCourses.map((course, index) => (
                  <article className="teacher-course-card" key={`${course.name}-${index}`}>
                    <div className="teacher-course-head">
                      <h3>{course.name}</h3>
                      <span className={`teacher-course-badge ${(course.status || "").toLowerCase() === "upcoming" ? "upcoming" : "active"}`}>
                        {course.status || "Active"}
                      </span>
                    </div>
                    <p className="teacher-course-meta">{course.students ?? 0} students</p>
                    <p className="teacher-course-meta">{course.schedule || "Schedule TBD"}</p>
                  </article>
                ))}
              </section>
            ) : isAttendanceView ? (
              <section className="teacher-attendance-grid">
                {filteredAttendance.length === 0 && (
                  <div className="card muted">
                    {attendanceOverview.length === 0
                      ? "No attendance data found for this teacher yet."
                      : "No attendance records match your search."}
                  </div>
                )}
                {filteredAttendance.map((item, index) => (
                  (() => {
                    const percent = Math.max(0, Math.min(100, item.percent ?? 0));
                    const level = percent < 50 ? "critical" : percent < 75 ? "warning" : "good";

                    return (
                  <article className="teacher-attendance-card" key={`${item.course}-${index}`}>
                    <div
                      className={`teacher-attendance-donut is-${level}`}
                      style={{ "--attendance": `${percent}%` }}
                      aria-label={`Attendance ${percent}%`}
                    >
                      <div className="teacher-attendance-donut-inner">{percent}%</div>
                    </div>
                    <div className="teacher-attendance-info">
                      <h3>{item.course}</h3>
                      <p>{item.present ?? 0}/{item.total ?? 0} present</p>
                    </div>
                  </article>
                    );
                  })()
                ))}
              </section>
            ) : isGradesView ? (
              <section className="teacher-content-grid teacher-content-grid-single">
                <article className="teacher-panel">
                  <div className="teacher-table-wrap">
                    <table className="teacher-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Course</th>
                          <th>Midterm</th>
                          <th>Final</th>
                          <th>Overall</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredGrades.length === 0 && (
                          <tr>
                            <td colSpan="5" className="muted">
                              {gradesOverview.length === 0
                                ? "No grades data found for this teacher yet."
                                : "No grades records match your search."}
                            </td>
                          </tr>
                        )}
                        {filteredGrades.map((item) => (
                          <tr key={item.studentId || `${item.student}-${item.course}`}>
                            <td>{item.student || "Student"}</td>
                            <td>{item.course || "General"}</td>
                            <td>{item.midtermScore && item.midtermScore !== "N/A" ? `${item.midtermScore} (${item.midterm || "N/A"})` : (item.midterm || "N/A")}</td>
                            <td>{item.finalScore && item.finalScore !== "N/A" ? `${item.finalScore} (${item.final || "N/A"})` : (item.final || "N/A")}</td>
                            <td>
                              <span className="teacher-grade-pill">{item.overallPercent > 0 ? `${item.overallPercent}% (${item.overall || "N/A"})` : (item.overall || "N/A")}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>
            ) : isMessagesView ? (
              <section className="teacher-messages-list">
                {filteredMessages.length === 0 && (
                  <div className="card muted">
                    {messagesOverview.length === 0
                      ? "No messages found for this teacher yet."
                      : "No messages match your search."}
                  </div>
                )}
                {filteredMessages.map((message, index) => (
                  <article
                    className={`teacher-message-card ${message.isNew ? "is-new" : ""}`}
                    key={`${message.studentId || "msg"}-${message.date || index}`}
                  >
                    <div className="teacher-message-avatar">{getInitials(message.from || "User")}</div>
                    <div className="teacher-message-body">
                      <div className="teacher-message-top">
                        <h4>{message.from || "School Update"}</h4>
                        <span>{formatMessageTime(message.date)}</span>
                      </div>
                      <div className="teacher-message-subject-row">
                        <p className="teacher-message-subject">{message.subject || "Message"}</p>
                        {message.isNew && <span className="teacher-message-new">New</span>}
                      </div>
                      <p className="teacher-message-preview">{message.preview || ""}</p>
                    </div>
                  </article>
                ))}
              </section>
            ) : isClassFlowView ? (
              <section className="teacher-content-grid teacher-content-grid-single">
                <article className="teacher-panel">
                  <div className="teacher-class-flow-body">
                    <div className="today-flow-timeline">
                      {classFlowItems.length === 0 && <div className="muted">No classes available for today.</div>}

                      {classFlowItems.map((item, index) => (
                        <div className="flow-row flow-class" key={`${item.subject}-${item.time}-${index}`}>
                          <div className="flow-line-col">
                            <span className={`flow-bullet ${item.isNow ? "is-now" : ""}`} />
                            {index !== classFlowItems.length - 1 && <span className="flow-line" />}
                          </div>

                          <div className="flow-content-col">
                            <div className="flow-time">{item.time || "--:--"}</div>
                            <article className={`flow-card ${item.isNow ? "active-now" : ""}`}>
                              <h4>{item.subject || "Class"}</h4>
                              <p>{item.room || "Room TBD"} · {item.students ?? 0} students</p>
                              {item.isNow && (
                                <div className="flow-now-tag">
                                  <span className="flow-now-dot" />
                                  NOW
                                </div>
                              )}
                              {!item.isNow && item.isNext && <div className="teacher-flow-status is-next">NEXT</div>}
                              {!item.isNow && !item.isNext && item.isDone && <div className="teacher-flow-status is-done">DONE</div>}
                              {item.isUpcoming && <div className="teacher-flow-status is-upcoming">UPCOMING</div>}
                              <div className="teacher-class-actions-row">
                                {!item.isNow && (
                                  <button
                                    type="button"
                                    className="teacher-class-action"
                                    onClick={() => moveClassFlowStage(item, "Now")}
                                  >
                                    Mark Now
                                  </button>
                                )}
                                {!item.isDone && (
                                  <button
                                    type="button"
                                    className="teacher-class-action"
                                    onClick={() => moveClassFlowStage(item, "Done")}
                                  >
                                    Mark Done
                                  </button>
                                )}
                                {!item.isNext && !item.isNow && (
                                  <button
                                    type="button"
                                    className="teacher-class-action"
                                    onClick={() => moveClassFlowStage(item, "Next")}
                                  >
                                    Mark Next
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="teacher-class-action"
                                  onClick={() => moveClassFlowStage(item, "Auto")}
                                >
                                  Reset Auto
                                </button>
                              </div>
                            </article>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              </section>
            ) : isEvaluationFlowView ? (
              <section className="teacher-content-grid teacher-content-grid-single">
                <article className="teacher-panel">
                  <div className="teacher-eval-flow-wrap">
                    {evaluationError && <div className="card muted">{evaluationError}</div>}
                    {evaluationFlowItems.length === 0 && (
                      <div className="muted">No evaluation items match your search.</div>
                    )}

                    <div className="teacher-eval-flow-grid">
                      <section className="teacher-eval-lane">
                        <header className="teacher-eval-lane-head">
                          <h3>Pending</h3>
                          <span>{evaluationFlowColumns.pending.length}</span>
                        </header>
                        <div className="teacher-eval-lane-body">
                          {evaluationFlowColumns.pending.length === 0 && <p className="muted">No pending items</p>}
                          {evaluationFlowColumns.pending.map((item) => (
                            <article className="teacher-eval-card" key={`pending-${item.studentId || item.student}-${item.course}`}>
                              <h4>{item.student || "Student"}</h4>
                              <p>{item.course || "General"}</p>
                              <div className="teacher-eval-meta">
                                <span className="teacher-flow-stage stage-pending">Pending</span>
                                <strong>{item.overall || "N/A"}</strong>
                              </div>
                              <button
                                type="button"
                                className="teacher-eval-action"
                                onClick={() => moveEvaluationStage(item, "Reviewing")}
                                disabled={savingEvaluationKey === item.flowKey}
                              >
                                {savingEvaluationKey === item.flowKey ? "Saving..." : "Mark Reviewing"}
                              </button>
                            </article>
                          ))}
                        </div>
                      </section>

                      <section className="teacher-eval-lane">
                        <header className="teacher-eval-lane-head">
                          <h3>Reviewing</h3>
                          <span>{evaluationFlowColumns.reviewing.length}</span>
                        </header>
                        <div className="teacher-eval-lane-body">
                          {evaluationFlowColumns.reviewing.length === 0 && <p className="muted">No reviewing items</p>}
                          {evaluationFlowColumns.reviewing.map((item) => (
                            <article className="teacher-eval-card" key={`reviewing-${item.studentId || item.student}-${item.course}`}>
                              <h4>{item.student || "Student"}</h4>
                              <p>{item.course || "General"}</p>
                              <div className="teacher-eval-meta">
                                <span className="teacher-flow-stage stage-reviewing">Reviewing</span>
                                <strong>{item.overallPercent > 0 ? `${item.overallPercent}%` : (item.overall || "N/A")}</strong>
                              </div>
                              <button
                                type="button"
                                className="teacher-eval-action"
                                onClick={() => moveEvaluationStage(item, "Published")}
                                disabled={savingEvaluationKey === item.flowKey}
                              >
                                {savingEvaluationKey === item.flowKey ? "Saving..." : "Mark Published"}
                              </button>
                            </article>
                          ))}
                        </div>
                      </section>

                      <section className="teacher-eval-lane">
                        <header className="teacher-eval-lane-head">
                          <h3>Published</h3>
                          <span>{evaluationFlowColumns.published.length}</span>
                        </header>
                        <div className="teacher-eval-lane-body">
                          {evaluationFlowColumns.published.length === 0 && <p className="muted">No published items</p>}
                          {evaluationFlowColumns.published.map((item) => (
                            <article className="teacher-eval-card" key={`published-${item.studentId || item.student}-${item.course}`}>
                              <h4>{item.student || "Student"}</h4>
                              <p>{item.course || "General"}</p>
                              <div className="teacher-eval-meta">
                                <span className="teacher-flow-stage stage-published">Published</span>
                                <strong>{item.overallPercent > 0 ? `${item.overallPercent}%` : (item.overall || "N/A")}</strong>
                              </div>
                              <button
                                type="button"
                                className="teacher-eval-action"
                                onClick={() => moveEvaluationStage(item, "Pending")}
                                disabled={savingEvaluationKey === item.flowKey}
                              >
                                {savingEvaluationKey === item.flowKey ? "Saving..." : "Reset Pending"}
                              </button>
                            </article>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>
                </article>
              </section>
            ) : isRiskFlowView ? (
              <section className="teacher-content-grid teacher-content-grid-single">
                <article className="teacher-panel">
                  <div className="teacher-risk-flow-wrap">
                    {riskError && <div className="card muted">{riskError}</div>}
                    {riskFlowItems.length === 0 && (
                      <div className="muted">No risk-flow items match your search.</div>
                    )}

                    <div className="teacher-risk-flow-grid">
                      <section className="teacher-risk-lane">
                        <header className="teacher-risk-lane-head">
                          <h3>Normal</h3>
                          <span>{riskFlowColumns.normal.length}</span>
                        </header>
                        <div className="teacher-risk-lane-body">
                          {riskFlowColumns.normal.length === 0 && <p className="muted">No normal-risk students</p>}
                          {riskFlowColumns.normal.map((item) => (
                            <article className="teacher-risk-card" key={`risk-normal-${item.studentId}`}>
                              <h4>{item.fullName || item.studentId}</h4>
                              <p>{item.course || "General"}</p>
                              <div className="teacher-risk-meta">
                                <span>Attendance: <strong>{item.attendance ?? 0}%</strong></span>
                                <span>Grade: <strong>{item.grade || "N/A"}</strong></span>
                              </div>
                              <div className="teacher-risk-meta">
                                <span>Unread: <strong>{item.unreadCount}</strong></span>
                                <span className="teacher-flow-stage stage-normal">Normal</span>
                              </div>
                              <button
                                type="button"
                                className="teacher-risk-action"
                                onClick={() => moveRiskStage(item, "Watch")}
                                disabled={savingRiskKey === item.studentId}
                              >
                                {savingRiskKey === item.studentId ? "Saving..." : "Move to Watch"}
                              </button>
                            </article>
                          ))}
                        </div>
                      </section>

                      <section className="teacher-risk-lane">
                        <header className="teacher-risk-lane-head">
                          <h3>Watch</h3>
                          <span>{riskFlowColumns.watch.length}</span>
                        </header>
                        <div className="teacher-risk-lane-body">
                          {riskFlowColumns.watch.length === 0 && <p className="muted">No watch-list students</p>}
                          {riskFlowColumns.watch.map((item) => (
                            <article className="teacher-risk-card" key={`risk-watch-${item.studentId}`}>
                              <h4>{item.fullName || item.studentId}</h4>
                              <p>{item.course || "General"}</p>
                              <div className="teacher-risk-meta">
                                <span>Attendance: <strong>{item.attendance ?? 0}%</strong></span>
                                <span>Grade: <strong>{item.grade || "N/A"}</strong></span>
                              </div>
                              <div className="teacher-risk-meta">
                                <span>Unread: <strong>{item.unreadCount}</strong></span>
                                <span className="teacher-flow-stage stage-watch">Watch</span>
                              </div>
                              <div className="teacher-risk-actions-row">
                                <button
                                  type="button"
                                  className="teacher-risk-action"
                                  onClick={() => moveRiskStage(item, "Normal")}
                                  disabled={savingRiskKey === item.studentId}
                                >
                                  {savingRiskKey === item.studentId ? "Saving..." : "Move to Normal"}
                                </button>
                                <button
                                  type="button"
                                  className="teacher-risk-action"
                                  onClick={() => moveRiskStage(item, "Intervention")}
                                  disabled={savingRiskKey === item.studentId}
                                >
                                  {savingRiskKey === item.studentId ? "Saving..." : "Move to Intervention"}
                                </button>
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>

                      <section className="teacher-risk-lane">
                        <header className="teacher-risk-lane-head">
                          <h3>Intervention</h3>
                          <span>{riskFlowColumns.intervention.length}</span>
                        </header>
                        <div className="teacher-risk-lane-body">
                          {riskFlowColumns.intervention.length === 0 && <p className="muted">No intervention-needed students</p>}
                          {riskFlowColumns.intervention.map((item) => (
                            <article className="teacher-risk-card" key={`risk-intervention-${item.studentId}`}>
                              <h4>{item.fullName || item.studentId}</h4>
                              <p>{item.course || "General"}</p>
                              <div className="teacher-risk-meta">
                                <span>Attendance: <strong>{item.attendance ?? 0}%</strong></span>
                                <span>Grade: <strong>{item.grade || "N/A"}</strong></span>
                              </div>
                              <div className="teacher-risk-meta">
                                <span>Unread: <strong>{item.unreadCount}</strong></span>
                                <span className="teacher-flow-stage stage-intervention">Intervention</span>
                              </div>
                              <button
                                type="button"
                                className="teacher-risk-action"
                                onClick={() => moveRiskStage(item, "Watch")}
                                disabled={savingRiskKey === item.studentId}
                              >
                                {savingRiskKey === item.studentId ? "Saving..." : "Move to Watch"}
                              </button>
                            </article>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>
                </article>
              </section>
            ) : isMvpAddStudentView ? (
              <section className="teacher-content-grid teacher-content-grid-single">
                <article className="teacher-panel">
                  <div className="teacher-mvp-wrap">
                    {mvpError && <div className="card muted">{mvpError}</div>}
                    {mvpStatus && <div className="card muted">{mvpStatus}</div>}
                    <form className="teacher-mvp-form" onSubmit={handleAddStudent}>
                      <div className="teacher-mvp-grid">
                        <input className="teacher-mvp-input" placeholder="First name" value={addStudentForm.firstName} onChange={(e) => setAddStudentForm((c) => ({ ...c, firstName: e.target.value }))} />
                        <input className="teacher-mvp-input" placeholder="Last name" value={addStudentForm.lastName} onChange={(e) => setAddStudentForm((c) => ({ ...c, lastName: e.target.value }))} />
                        <input className="teacher-mvp-input" placeholder="Email" type="email" required value={addStudentForm.email} onChange={(e) => setAddStudentForm((c) => ({ ...c, email: e.target.value }))} />
                        <input className="teacher-mvp-input" placeholder="Password" value={addStudentForm.password} onChange={(e) => setAddStudentForm((c) => ({ ...c, password: e.target.value }))} />
                        <input className="teacher-mvp-input" placeholder="Grade (optional)" value={addStudentForm.grade} onChange={(e) => setAddStudentForm((c) => ({ ...c, grade: e.target.value }))} />
                      </div>
                      <button type="submit" className="teacher-mvp-btn" disabled={mvpSaving}>{mvpSaving ? "Saving..." : "Add Student"}</button>
                    </form>
                  </div>
                </article>
              </section>
            ) : isMvpTimetableView ? (
              <section className="teacher-content-grid teacher-content-grid-single">
                <article className="teacher-panel">
                  <div className="teacher-mvp-wrap">
                    {mvpError && <div className="card muted">{mvpError}</div>}
                    {mvpStatus && <div className="card muted">{mvpStatus}</div>}
                    <form className="teacher-mvp-form" onSubmit={handleAssignSubject}>
                      <div className="teacher-mvp-grid">
                        <input className="teacher-mvp-input" placeholder="Student ID (e.g. STU-26-XXXXXX)" required value={assignSubjectForm.studentId} onChange={(e) => setAssignSubjectForm((c) => ({ ...c, studentId: e.target.value }))} />
                        <input className="teacher-mvp-input" type="date" value={assignSubjectForm.date} onChange={(e) => setAssignSubjectForm((c) => ({ ...c, date: e.target.value }))} />
                        <input className="teacher-mvp-input" placeholder="Time (e.g. 09:00 - 10:00)" required value={assignSubjectForm.time} onChange={(e) => setAssignSubjectForm((c) => ({ ...c, time: e.target.value }))} />
                        <input className="teacher-mvp-input" placeholder="Subject" required value={assignSubjectForm.subject} onChange={(e) => setAssignSubjectForm((c) => ({ ...c, subject: e.target.value }))} />
                        <input className="teacher-mvp-input" placeholder="Room (optional)" value={assignSubjectForm.room} onChange={(e) => setAssignSubjectForm((c) => ({ ...c, room: e.target.value }))} />
                      </div>
                      <button type="submit" className="teacher-mvp-btn" disabled={mvpSaving}>{mvpSaving ? "Saving..." : "Assign Subject"}</button>
                    </form>
                  </div>
                </article>
              </section>
            ) : isMvpAttendanceView ? (
              <section className="teacher-content-grid teacher-content-grid-single">
                <article className="teacher-panel">
                  <div className="teacher-mvp-wrap">
                    {mvpError && <div className="card muted">{mvpError}</div>}
                    {mvpStatus && <div className="card muted">{mvpStatus}</div>}
                    <form className="teacher-mvp-form" onSubmit={handleAttendance}>
                      <div className="teacher-mvp-grid">
                        <input className="teacher-mvp-input" placeholder="Student ID" required value={attendanceForm.studentId} onChange={(e) => setAttendanceForm((c) => ({ ...c, studentId: e.target.value }))} />
                        <input className="teacher-mvp-input" type="date" value={attendanceForm.date} onChange={(e) => setAttendanceForm((c) => ({ ...c, date: e.target.value }))} />
                        <input className="teacher-mvp-input" placeholder="Subject" required value={attendanceForm.subject} onChange={(e) => setAttendanceForm((c) => ({ ...c, subject: e.target.value }))} />
                        <select className="teacher-mvp-input" value={attendanceForm.present} onChange={(e) => setAttendanceForm((c) => ({ ...c, present: e.target.value }))}>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                        </select>
                      </div>
                      <button type="submit" className="teacher-mvp-btn" disabled={mvpSaving}>{mvpSaving ? "Saving..." : "Save Attendance"}</button>
                    </form>
                  </div>
                </article>
              </section>
            ) : isMvpMarksView ? (
              <section className="teacher-content-grid teacher-content-grid-single">
                <article className="teacher-panel">
                  <div className="teacher-mvp-wrap">
                    {mvpError && <div className="card muted">{mvpError}</div>}
                    {mvpStatus && <div className="card muted">{mvpStatus}</div>}
                    <form className="teacher-mvp-form" onSubmit={handleMarks}>
                      <div className="teacher-mvp-grid">
                        <input className="teacher-mvp-input" placeholder="Student ID" required value={marksForm.studentId} onChange={(e) => setMarksForm((c) => ({ ...c, studentId: e.target.value }))} />
                        <input className="teacher-mvp-input" placeholder="Exam name (e.g. Midterm)" value={marksForm.examName} onChange={(e) => setMarksForm((c) => ({ ...c, examName: e.target.value }))} />
                        <input className="teacher-mvp-input" placeholder="Subject" required value={marksForm.subject} onChange={(e) => setMarksForm((c) => ({ ...c, subject: e.target.value }))} />
                        <input className="teacher-mvp-input" type="number" min="0" placeholder="Score" required value={marksForm.score} onChange={(e) => setMarksForm((c) => ({ ...c, score: e.target.value }))} />
                        <input className="teacher-mvp-input" type="number" min="1" placeholder="Total" required value={marksForm.total} onChange={(e) => setMarksForm((c) => ({ ...c, total: e.target.value }))} />
                      </div>
                      <button type="submit" className="teacher-mvp-btn" disabled={mvpSaving}>{mvpSaving ? "Saving..." : "Save Marks"}</button>
                    </form>
                  </div>
                </article>
              </section>
            ) : (
            <>
            <section className="teacher-content-grid teacher-content-grid-single">
              <article className="teacher-panel">
                <div className="teacher-panel-head">
                  <h2>Student Overview</h2>
                  <p>Fetched using assigned student IDs</p>
                </div>
                <div className="teacher-table-wrap">
                  <table className="teacher-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Student ID</th>
                        <th>Course</th>
                        <th>Grade</th>
                        <th>Attendance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRoster.length === 0 && (
                        <tr>
                          <td colSpan="6" className="muted">
                            {roster.length === 0
                              ? "No students found for this teacher yet."
                              : "No students match your search."}
                          </td>
                        </tr>
                      )}
                      {filteredRoster.map((student) => (
                        <tr key={student.studentId}>
                          <td>
                            <div className="teacher-student-name">{student.fullName}</div>
                            <div className="teacher-student-email">{student.email}</div>
                          </td>
                          <td>{student.studentId}</td>
                          <td>{student.course || "General"}</td>
                          <td>{student.grade || "N/A"}</td>
                          <td>{student.attendance ?? 0}%</td>
                          <td><span className={getStatusClass(student.status)}>{student.status || "At Risk"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>

              {!isStudentsView && (
                <section className="teacher-content-grid teacher-content-grid-single">
                <article className="teacher-panel teacher-schedule-panel">
                  <div className="teacher-panel-head">
                    <h2>Today's Schedule</h2>
                    <p>Your upcoming classes</p>
                  </div>
                  <div className="teacher-schedule-list">
                    {filteredSchedule.length === 0 && (
                      <div className="muted">
                        {todaySchedule.length === 0
                          ? "No schedule found for today"
                          : "No schedule items match your search."}
                      </div>
                    )}
                    {filteredSchedule.map((item, idx) => (
                      <div className="teacher-schedule-item" key={`${item.subject}-${item.time}-${idx}`}>
                        <h4>{item.subject}</h4>
                        <p>{item.time} · {item.room}</p>
                        <span>{item.students} students</span>
                      </div>
                    ))}
                  </div>
                </article>
                </section>
              )}

            </>
            )}
          </div>
        )}

        <AppFooter className="teacher-footer" />
      </main>
    </div>
  );
}
