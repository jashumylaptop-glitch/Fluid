import React, { useState, useEffect } from "react";
import "../global.css";
import Sidebar from "../components/Sidebar";
import Dashboard from "../components/Dashboard";
import Timetable from "./Timetable"; // weekly timetable component
import Attendance from "../components/Attendance";
import Assignments from "../components/Assignments";
import Marks from "../components/Marks";
import Resources from "../components/Resources";
import Messages from "../components/Messages";
import Profile from "../components/Profile";
import TodayFlow from "../components/TodayFlow";
import TaskFlow from "../components/TaskFlow";
import CourseJourney from "../components/CourseJourney";
import StudentChatbot from "../components/StudentChatbot";
import AppFooter from "../components/AppFooter";

export default function StudentPage() {
  const [active, setActive] = useState("dashboard");
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState("general");
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackCourse, setFeedbackCourse] = useState("");
  const [feedbackCourses, setFeedbackCourses] = useState([]);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState({ type: "", text: "" });
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  const studentId = localStorage.getItem("userId") || sessionStorage.getItem("userId");

  useEffect(() => {
    console.log('DEBUG StudentPage - token present?', !!token, 'studentId:', studentId);
  }, [token, studentId]);

  useEffect(() => {
    async function fetchProfile() {
      if (!token || !studentId) {
        setProfileLoading(false);
        return;
      }
      setProfileLoading(true);
      try {
        const res = await fetch(`http://localhost:5000/student/${studentId}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok) setProfileData(json.profile || null);
      } catch (error) {
        setProfileData(null);
      } finally {
        setProfileLoading(false);
      }
    }
    fetchProfile();
  }, [studentId, token]);

  useEffect(() => {
    async function fetchNotifications() {
      if (!token || !studentId) {
        setNotificationsLoading(false);
        return;
      }
      try {
        setNotificationsLoading(true);
        const res = await fetch(`http://localhost:5000/student/${studentId}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok) setNotifications(json.messages || []);
      } catch (error) {
        setNotifications([]);
      } finally {
        setNotificationsLoading(false);
      }
    }

    fetchNotifications();
  }, [studentId, token]);

  useEffect(() => {
    async function fetchFeedbackCourses() {
      if (!token || !studentId) {
        setFeedbackCourses([]);
        return;
      }

      try {
        const [ttRes, marksRes] = await Promise.all([
          fetch(`http://localhost:5000/student/${studentId}/timetable`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`http://localhost:5000/student/${studentId}/marks`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const [ttJson, marksJson] = await Promise.all([
          ttRes.ok ? ttRes.json() : Promise.resolve({ week: [] }),
          marksRes.ok ? marksRes.json() : Promise.resolve({ marks: [] })
        ]);

        const courseSet = new Set();

        (ttJson?.week || []).forEach((day) => {
          (day?.classes || []).forEach((item) => {
            if (item?.subject && String(item.subject).trim()) {
              courseSet.add(String(item.subject).trim());
            }
          });
        });

        (marksJson?.marks || []).forEach((entry) => {
          if (entry?.subject && String(entry.subject).trim()) {
            courseSet.add(String(entry.subject).trim());
          }
        });

        const nextCourses = Array.from(courseSet).sort((a, b) => a.localeCompare(b));
        setFeedbackCourses(nextCourses);

        if (nextCourses.length === 0) {
          setFeedbackCourse("");
        } else if (!nextCourses.includes(feedbackCourse)) {
          setFeedbackCourse(nextCourses[0]);
        }
      } catch (error) {
        setFeedbackCourses([]);
        setFeedbackCourse("");
      }
    }

    fetchFeedbackCourses();
  }, [studentId, token]);

  const unreadCount = notifications.filter((item) => !item.read).length;
  const displayNotifications = notifications.slice(0, 6);

  const feedbackTabs = [
    { key: "general", label: "General" },
    { key: "course", label: "Course" },
    { key: "suggestion", label: "Suggestion" }
  ];

  async function handleFeedbackSubmit(event) {
    event.preventDefault();
    setFeedbackStatus({ type: "", text: "" });

    if (!feedbackRating) {
      setFeedbackStatus({ type: "error", text: "Please choose a rating." });
      return;
    }

    if (!feedbackMessage.trim()) {
      setFeedbackStatus({ type: "error", text: "Please enter your feedback." });
      return;
    }

    if (feedbackCategory === "course" && !feedbackCourse) {
      setFeedbackStatus({ type: "error", text: "Please select a course." });
      return;
    }

    try {
      setFeedbackSubmitting(true);
      const res = await fetch(`http://localhost:5000/student/${studentId}/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category: feedbackCategory,
          rating: feedbackRating,
          message: feedbackMessage.trim(),
          course: feedbackCategory === "course" ? feedbackCourse : ""
        })
      });

      const json = await res.json();

      if (!res.ok) {
        setFeedbackStatus({
          type: "error",
          text: json?.message || "Unable to save feedback right now."
        });
        return;
      }

      setFeedbackStatus({ type: "success", text: "Thank you! Your feedback is saved." });
      setFeedbackRating(0);
      setFeedbackMessage("");
      setFeedbackCategory("general");
      setFeedbackCourse(feedbackCourses[0] || "");
    } catch (error) {
      setFeedbackStatus({ type: "error", text: "Network error. Please try again." });
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  const activeLabelMap = {
    dashboard: "Dashboard",
    todayFlow: "Today Flow",
    taskFlow: "Task Flow",
    courseJourney: "Course Journey",
    timetable: "Timetable",
    attendance: "Attendance",
    assignments: "Assignments",
    marks: "Marks",
    resources: "Resources",
    messages: "Messages",
    profile: "Profile"
  };

  if (!token || !studentId) {
    return (
      <div className="dashboard-container">
        <div style={{ width: 240, padding: 24 }} />
        <main className="main-content student-main-content">
          <div className="card error">
            <h3 style={{ marginTop: 0 }}>No login data found</h3>
            <p>Please login first. Stored token: {token ? 'yes' : 'no'}. studentId: {studentId || 'none'}.</p>
            <p>Open the login page and sign in with your seeded credentials (test.student@example.com / pass123), or run <code>node seed.js</code> in <strong>backend/</strong>.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar
        active={active}
        onSelect={setActive}
        onOpenChatbot={() => setChatbotOpen(true)}
        student={profileData}
        loadingStudent={profileLoading}
      />
      <main className="main-content student-main-content">
        <div className="top-nav student-top-nav">
          <div className="student-top-title">{activeLabelMap[active] || "Dashboard"}</div>
          <div className="student-top-actions">
            <button
              type="button"
              className="student-feedback-trigger"
              onClick={() => {
                setFeedbackStatus({ type: "", text: "" });
                setFeedbackOpen(true);
              }}
              aria-label="Open feedback"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                <path d="M5 6.5h14v8H9l-4 4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Feedback</span>
            </button>

            <div className="bell-wrap">
            <button
              className="bell-button"
              onClick={() => setNotificationsOpen((state) => !state)}
              type="button"
              aria-label="Open notifications"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
                <path d="M6 9a6 6 0 0 1 12 0v5l2 2H4l2-2z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 19a2 2 0 0 0 4 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {unreadCount > 0 && (
                <span className="notif-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </button>

            {notificationsOpen && (
              <div className="notices-dropdown">
                <h4>Notifications</h4>
                {notificationsLoading ? (
                  <div className="loading-card">
                    <div className="loading-line loading-line-80" />
                    <div className="loading-line loading-line-65" />
                    <div className="loading-line loading-line-50" />
                  </div>
                ) : displayNotifications.length === 0 ? (
                  <div className="muted notice-empty">No notifications</div>
                ) : (
                  <ul>
                    {displayNotifications.map((item) => (
                      <li key={item._id || `${item.date}-${item.content}`}>
                        <div className="notice-content">{item.content}</div>
                        <div className="notice-meta">
                          {item.from ? `From: ${item.from}` : "School update"} · {new Date(item.date).toLocaleDateString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  className="notice-view-all"
                  onClick={() => {
                    setActive("messages");
                    setNotificationsOpen(false);
                  }}
                >
                  View all
                </button>
              </div>
            )}
            </div>
          </div>
        </div>

        {profileLoading && (
          <div className="card muted loading-card" aria-live="polite">
            <div className="loading-line loading-line-50" />
            <div className="loading-line loading-line-80" />
          </div>
        )}

        <button
          type="button"
          className="student-chatbot-fab"
          onClick={() => setChatbotOpen(true)}
          aria-label="Open help bot"
          title="Help Bot"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path d="M4 6h16v10H9l-5 5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 10h.01M12 10h.01M15 10h.01" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>

        <div key={active} className="view-switch">
          {active === "dashboard" && (
            <Dashboard studentId={studentId} token={token} />
          )}
          {active === "todayFlow" && (
            <TodayFlow studentId={studentId} token={token} />
          )}
          {active === "taskFlow" && (
            <TaskFlow studentId={studentId} token={token} />
          )}
          {active === "courseJourney" && (
            <CourseJourney studentId={studentId} token={token} />
          )}
          {active === "timetable" && (
            <Timetable studentId={studentId} token={token} />
          )}
          {active === "attendance" && (
            <Attendance studentId={studentId} token={token} />
          )}
          {active === "assignments" && (
            <Assignments studentId={studentId} token={token} />
          )}
          {active === "marks" && (
            <Marks studentId={studentId} token={token} />
          )}
          {active === "resources" && (
            <Resources studentId={studentId} token={token} />
          )}
          {active === "messages" && (
            <Messages studentId={studentId} token={token} />
          )}
          {active === "profile" && (
            <Profile
              studentId={studentId}
              token={token}
              initialProfile={profileData}
              onProfileLoaded={setProfileData}
            />
          )}
        </div>

        <AppFooter className="dashboard-footer" />

        <StudentChatbot
          open={chatbotOpen}
          onClose={() => setChatbotOpen(false)}
          studentName={profileData?.firstName || profileData?.fullName || ""}
          activeSection={active}
        />

        {feedbackOpen && (
          <div
            className="student-feedback-overlay"
            onClick={() => {
              if (!feedbackSubmitting) setFeedbackOpen(false);
            }}
          >
            <section
              className="student-feedback-modal"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Share feedback"
            >
              <div className="student-feedback-head">
                <div className="student-feedback-title-wrap">
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                    <path d="M5 6.5h14v8H9l-4 4z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h3>Share Feedback</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(false)}
                  aria-label="Close feedback"
                  disabled={feedbackSubmitting}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false">
                    <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="student-feedback-tabs" role="tablist" aria-label="Feedback category">
                {feedbackTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={feedbackCategory === tab.key ? "active" : ""}
                    onClick={() => {
                      setFeedbackCategory(tab.key);
                      setFeedbackStatus({ type: "", text: "" });
                      if (tab.key !== "course") setFeedbackCourse("");
                      if (tab.key === "course" && feedbackCourses.length && !feedbackCourse) {
                        setFeedbackCourse(feedbackCourses[0]);
                      }
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <form className="student-feedback-form" onSubmit={handleFeedbackSubmit}>
                {feedbackCategory === "course" && (
                  <div>
                    <label htmlFor="student-feedback-course" className="student-feedback-label">Select course</label>
                    <select
                      id="student-feedback-course"
                      className="student-feedback-select"
                      value={feedbackCourse}
                      onChange={(event) => setFeedbackCourse(event.target.value)}
                      disabled={feedbackSubmitting || feedbackCourses.length === 0}
                    >
                      {feedbackCourses.length === 0 ? (
                        <option value="">No courses found</option>
                      ) : (
                        feedbackCourses.map((course) => (
                          <option key={course} value={course}>
                            {course}
                          </option>
                        ))
                      )}
                    </select>
                    {feedbackCourses.length === 0 && (
                      <p className="student-feedback-hint">No course data found yet. Add timetable/marks data to choose a course.</p>
                    )}
                  </div>
                )}

                <div>
                  <p className="student-feedback-label">How's your experience?</p>
                  <div className="student-feedback-stars" aria-label="Choose star rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={feedbackRating >= star ? "active" : ""}
                        onClick={() => setFeedbackRating(star)}
                        aria-label={`${star} star`}
                      >
                        <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
                          <path d="M12 3.8l2.6 5.4 6 .9-4.3 4.2 1 5.9-5.3-2.8-5.3 2.8 1-5.9-4.3-4.2 6-.9z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="student-feedback-message" className="student-feedback-label">Tell us more...</label>
                  <textarea
                    id="student-feedback-message"
                    rows={5}
                    placeholder="What's on your mind?"
                    value={feedbackMessage}
                    onChange={(event) => setFeedbackMessage(event.target.value)}
                    maxLength={2000}
                  />
                </div>

                {feedbackStatus.text && (
                  <p className={feedbackStatus.type === "error" ? "student-feedback-status error" : "student-feedback-status success"}>
                    {feedbackStatus.text}
                  </p>
                )}

                <div className="student-feedback-actions">
                  <button type="submit" disabled={feedbackSubmitting}>
                    {feedbackSubmitting ? "Saving..." : "Submit"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}