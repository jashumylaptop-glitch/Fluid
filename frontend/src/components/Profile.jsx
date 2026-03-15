import React, { useEffect, useState } from "react";

function ProfileUiIcon({ name }) {
  const iconMap = {
    performance: (
      <>
        <path d="M4 19h16" />
        <path d="M7 16v-4M12 16V8M17 16v-6" />
      </>
    ),
    details: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 9h8M8 13h8" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M4 8l8 6 8-6" />
      </>
    ),
    phone: (
      <path d="M7 3h3l2 4-2 1.5a13 13 0 0 0 5.5 5.5L17 12l4 2v3a2 2 0 0 1-2 2A16 16 0 0 1 5 5a2 2 0 0 1 2-2z" />
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    courses: (
      <>
        <path d="M4 7h8v12H4zM12 7h8v12h-8z" />
        <path d="M12 9.5a6 6 0 0 1 8 0" />
      </>
    ),
    id: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="8" cy="12" r="2" />
        <path d="M12 10h6M12 14h6" />
      </>
    )
  };

  return (
    <svg viewBox="0 0 24 24" className="profile-ui-icon" aria-hidden="true" focusable="false">
      {iconMap[name]}
    </svg>
  );
}

export default function Profile({ studentId, token, initialProfile, onProfileLoaded }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`http://localhost:5000/student/${studentId}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        const loadedProfile = json.profile || {};
        setProfile(loadedProfile);
        if (onProfileLoaded) onProfileLoaded(loadedProfile);
      } catch (err) {
        setError("Unable to load profile");
      } finally {
        setLoading(false);
      }
    }
    if (initialProfile) {
      setProfile(initialProfile);
      setLoading(false);
      return;
    }
    if (studentId && token) fetchData();
  }, [initialProfile, studentId, token, onProfileLoaded]);

  if (loading) return <div className="muted">Loading profile…</div>;
  if (error) return <div className="error">{error}</div>;

  const fullName = profile?.fullName || [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Student";
  const initials = [profile?.firstName?.[0], profile?.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "ST";
  const status = profile?.status || "active";
  const program = profile?.program || "General";
  const grade = profile?.grade || "N/A";
  const gpaValue = profile?.gpa ?? "N/A";
  const attendancePercent = Number.isFinite(profile?.attendancePercent)
    ? profile.attendancePercent
    : parseInt(profile?.attendancePercent || 0, 10) || 0;
  const enrolledText = profile?.enrolledAt
    ? new Date(profile.enrolledAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    : "N/A";

  return (
    <section className="section profile-view-section">
      <div className="card profile-header-card">
        <div className="profile-header-avatar">{initials}</div>
        <div className="profile-header-content">
          <div className="profile-header-top">
            <h2>{fullName}</h2>
            <span className="profile-status">{status}</span>
          </div>
          <p>{program} · Grade {grade}</p>
        </div>
      </div>

      <div className="profile-two-col">
        <div className="card profile-performance-card">
          <h3 className="profile-card-title">
            <span className="profile-title-icon"><ProfileUiIcon name="performance" /></span>
            <span>Performance</span>
          </h3>

          <div className="metric-row">
            <div className="metric-header">
              <span>GPA</span>
              <strong>{gpaValue}</strong>
            </div>
            <div className="metric-track">
              <div
                className="metric-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, (Number(profile?.gpa || 0) / 4) * 100))}%`
                }}
              />
            </div>
          </div>

          <div className="metric-row">
            <div className="metric-header">
              <span>Attendance</span>
              <strong>{attendancePercent}%</strong>
            </div>
            <div className="metric-track">
              <div
                className="metric-fill"
                style={{ width: `${Math.max(0, Math.min(100, attendancePercent))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="card profile-details-card">
          <h3 className="profile-card-title">
            <span className="profile-title-icon"><ProfileUiIcon name="details" /></span>
            <span>Details</span>
          </h3>

          <div className="detail-item">
            <span className="detail-icon"><ProfileUiIcon name="mail" /></span>
            <div>
              <p className="detail-label">Email</p>
              <h4>{profile?.email || "N/A"}</h4>
            </div>
          </div>

          <div className="detail-item">
            <span className="detail-icon"><ProfileUiIcon name="phone" /></span>
            <div>
              <p className="detail-label">Phone</p>
              <h4>{profile?.phone || "N/A"}</h4>
            </div>
          </div>

          <div className="detail-item">
            <span className="detail-icon"><ProfileUiIcon name="calendar" /></span>
            <div>
              <p className="detail-label">Enrolled</p>
              <h4>{enrolledText}</h4>
            </div>
          </div>

          <div className="detail-item">
            <span className="detail-icon"><ProfileUiIcon name="courses" /></span>
            <div>
              <p className="detail-label">Active Courses</p>
              <h4>{profile?.activeCourses ?? 0}</h4>
            </div>
          </div>

          <div className="detail-item">
            <span className="detail-icon"><ProfileUiIcon name="id" /></span>
            <div>
              <p className="detail-label">Student ID</p>
              <h4>{profile?.studentId || studentId}</h4>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
