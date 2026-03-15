import React, { useState } from "react";
import "../global.css";

const sections = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "timetable", label: "Timetable", icon: "calendar" },
  { key: "attendance", label: "Attendance", icon: "checkCircle" },
  { key: "assignments", label: "Assignments", icon: "document" },
  { key: "marks", label: "Marks", icon: "chart" },
  { key: "resources", label: "Resources", icon: "folder" },
  { key: "messages", label: "Messages", icon: "mail" }
];

const flowSections = [
  { key: "todayFlow", label: "Today Flow", target: "todayFlow", icon: "flowToday" },
  { key: "taskFlow", label: "Task Flow", target: "taskFlow", icon: "flowTask" },
  { key: "courseJourney", label: "Course Journey", target: "courseJourney", icon: "flowCourse" }
];

const iconPaths = {
  dashboard: (
    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 12.5l2.2 2.2L15.5 10" />
    </>
  ),
  document: (
    <>
      <path d="M8 3h7l4 4v14H8z" />
      <path d="M15 3v4h4M10.5 12h6M10.5 16h6" />
    </>
  ),
  chart: (
    <>
      <path d="M4 19h16" />
      <path d="M7 16v-4M12 16V8M17 16v-6" />
    </>
  ),
  folder: (
    <path d="M3 8h6l2 2h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
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
  ),
  chatbot: (
    <>
      <path d="M4 6h16v10H9l-5 5z" />
      <path d="M9 10h.01M12 10h.01M15 10h.01" />
    </>
  )
};

function MenuIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" className="menu-icon-svg" aria-hidden="true" focusable="false">
      {iconPaths[name]}
    </svg>
  );
}

export default function Sidebar({ active, onSelect, onOpenChatbot, student, loadingStudent }) {
  const [flowOpen, setFlowOpen] = useState(true);
  const fullName = student?.fullName || [student?.firstName, student?.lastName].filter(Boolean).join(" ") || "Student";
  const email = student?.email || "";
  const initials = [student?.firstName?.[0], student?.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "ST";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo-wrap">
          <img src="/Adobe%20Express%20-%20file.png" alt="Fluid Logo" className="brand-logo" />
        </div>
        <div className="brand-text">
          <h4>Fluid</h4>
          <p>Student Management</p>
        </div>
      </div>

      <ul className="sidebar-menu">
        {sections.map((s) => (
          <li key={s.key} className={active === s.key ? "active" : ""}>
            <button onClick={() => onSelect?.(s.key)}>
              <span className="menu-icon"><MenuIcon name={s.icon} /></span>
              <span>{s.label}</span>
            </button>
          </li>
        ))}

        <li className={`sidebar-dropdown ${flowOpen ? "open" : ""}`}>
          <button
            type="button"
            className="sidebar-dropdown-trigger"
            onClick={() => setFlowOpen((state) => !state)}
          >
            <span className="menu-icon"><MenuIcon name="flowCentric" /></span>
            <span>Flow Centric</span>
            <span className={`dropdown-caret ${flowOpen ? "open" : ""}`}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>

          {flowOpen && (
            <div className="sidebar-submenu">
              {flowSections.map((flowItem) => (
                <button
                  key={flowItem.key}
                  type="button"
                  className={`submenu-item ${active === flowItem.target ? "active" : ""}`}
                  onClick={() => onSelect?.(flowItem.target)}
                >
                  <span className="submenu-icon"><MenuIcon name={flowItem.icon} /></span>
                  {flowItem.label}
                </button>
              ))}
            </div>
          )}
        </li>

        <li>
          <button type="button" onClick={() => onOpenChatbot?.()}>
            <span className="menu-icon"><MenuIcon name="chatbot" /></span>
            <span>Help Bot</span>
          </button>
        </li>
      </ul>

      <button
        className={`sidebar-user ${active === "profile" ? "active-profile" : ""}`}
        onClick={() => onSelect?.("profile")}
        type="button"
      >
        <div className="user-avatar">{initials}</div>
        <div>
          <h5>{loadingStudent ? "Loading..." : fullName}</h5>
          <p>{loadingStudent ? "" : email}</p>
        </div>
      </button>
    </aside>
  );
}