import React, { useState } from "react";
import "./LoginPage.css";
import AppFooter from "../components/AppFooter";

const landingIconPaths = {
  attendance: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8.5 12.5l2.2 2.2L15.5 10" />
    </>
  ),
  timetable: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </>
  ),
  dashboard: (
    <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
  ),
  performance: (
    <>
      <path d="M4 19h16" />
      <path d="M7 16v-4M12 16V8M17 16v-6" />
    </>
  ),
  teacherTools: (
    <>
      <path d="M4 14l8-8 4 4-8 8H4z" />
      <path d="M14 6l2-2 4 4-2 2" />
    </>
  ),
  admin: (
    <>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V8a4 4 0 0 1 8 0v2" />
    </>
  ),
  bolt: (
    <path d="M13 2L5 13h6l-1 9 8-11h-6z" />
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5" />
      <path d="M4 17v-5h5" />
      <path d="M6.8 9A7 7 0 0 1 18 7" />
      <path d="M17.2 15A7 7 0 0 1 6 17" />
    </>
  ),
  users: (
    <>
      <path d="M8 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM16 13a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
      <path d="M3 19a5 5 0 0 1 10 0M11 19a5 5 0 0 1 10 0" />
    </>
  )
};

function LandingIcon({ name }) {
  return (
    <svg viewBox="0 0 24 24" className="lp-icon" aria-hidden="true" focusable="false">
      {landingIconPaths[name]}
    </svg>
  );
}

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [isSignup, setIsSignup] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState("");
  const [activeNav, setActiveNav] = useState("features");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404 && data.message === "User not found") {
          setError(`No ${role} account found with this email. Check selected role or sign up first.`);
        } else {
          setError(data.message || "Invalid credentials");
        }
        return;
      }

      const token = data.token;
      const id = data.studentId || data.userId || data.id || null;

      if (remember) {
        localStorage.setItem("token", token);
        if (id) localStorage.setItem("userId", id);
        localStorage.setItem("role", role);
      } else {
        sessionStorage.setItem("token", token);
        if (id) sessionStorage.setItem("userId", id);
        sessionStorage.setItem("role", role);
      }

      // Redirect by role
      if (role === "student") window.location.href = "/student";
      else if (role === "teacher") window.location.href = "/teacher";
      else if (role === "admin") window.location.href = "/admin";
      else window.location.href = "/";
    } catch (err) {
      setError("Server error. Please try again later.");
    }
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) {
      setNavOpen(false);
      return;
    }

    const block = id === "contact" ? "end" : "start";
    el.scrollIntoView({ behavior: "smooth", block });

    setNavOpen(false);
  };

  const toggleExpand = (key) => {
    setExpanded((s) => (s === key ? null : key));
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setSignupError("");
    setSignupSuccess("");

    if (!email || !password || !firstName || !lastName || !role) {
      setSignupError("All fields are required");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role, firstName, lastName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSignupError(data.message || "Signup failed");
        return;
      }

      setSignupSuccess("Account created! Switching to login...");
      setTimeout(() => {
        setIsSignup(false);
        setEmail("");
        setPassword("");
        setFirstName("");
        setLastName("");
        setSignupSuccess("");
      }, 1500);
    } catch (err) {
      setSignupError("Server error. Please try again later.");
    }
  };

  return (
    <div className="fluid-app">
      <header className="nav">
        <div className="nav-left">
          <img src="/Adobe%20Express%20-%20file.png" alt="Fluid Logo" className="logo" />
          <div className="tag">Fluid</div>
        </div>
        <button
          className="nav-toggle"
          onClick={() => setNavOpen((s) => !s)}
          aria-label="Toggle navigation"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <nav
          className={`nav-links ${navOpen ? "open" : ""}`}
          data-active-nav={activeNav}
        >
          <a
            href="#features"
            className={`nav-pill-link ${activeNav === "features" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveNav("features");
              scrollTo("features");
            }}
          >
            Features
          </a>
          <a
            href="#about"
            className={`nav-pill-link ${activeNav === "about" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveNav("about");
              scrollTo("about");
            }}
          >
            About
          </a>
          <a
            href="#marketing"
            className={`nav-pill-link ${activeNav === "marketing" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveNav("marketing");
              scrollTo("marketing");
            }}
          >
            Marketing
          </a>
          <a
            href="#contact"
            className={`nav-pill-link ${activeNav === "contact" ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveNav("contact");
              scrollTo("contact");
            }}
          >
            Contact
          </a>
        </nav>

        <div className="nav-right">
          <button className="btn nav-login" onClick={() => scrollTo('login')}>Login</button>
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-inner">
            <h1 className="hero-title">Flow with your learning, track with clarity.</h1>
            <p className="hero-sub">Fluid is a flow-centric student management system bringing real-time insights, simple timetables, and role-based workflows for schools and educators.</p>
            <div className="hero-cta">
              <button className="btn primary" onClick={() => scrollTo('features')}>Explore Features</button>
              <button className="btn secondary" onClick={() => scrollTo('marketing')}>Why Fluid</button>
            </div>
          </div>
        </section>

        <section className="features" id="features">
          <h2 className="section-title">Features</h2>
          <div className="features-grid">
            {[
              { key: 'attendance', icon: 'attendance', title: 'Attendance Tracking', text: 'Quickly mark and review attendance in classes.' },
              { key: 'timetable', icon: 'timetable', title: 'Timetable Management', text: 'Flexible timetable creation and sharing.' },
              { key: 'dashboard', icon: 'dashboard', title: 'Dashboard', text: 'Role-based dashboards with live stats.' },
              { key: 'performance', icon: 'performance', title: 'Performance Stats', text: 'Track progress and trends over time.' },
              { key: 'teacher-tools', icon: 'teacherTools', title: 'Teacher Tools', text: 'Lesson plans, resources, grading made easy.' },
              { key: 'admin', icon: 'admin', title: 'Admin Control', text: 'Manage users, roles, and permissions.' },
            ].map((f) => (
              <article key={f.key} className={`feature-card ${expanded === f.key ? 'expanded' : ''}`} onClick={() => toggleExpand(f.key)}>
                <div className="f-top">
                  <div className="f-icon"><LandingIcon name={f.icon} /></div>
                  <h3 className="f-title">{f.title}</h3>
                </div>
                <p className="f-desc">{f.text}</p>
                {expanded === f.key && <div className="f-more">More details about {f.title} — supports notifications, exports, and role filters.</div>}
              </article>
            ))}
          </div>
        </section>

        <section className="marketing" id="marketing">
          <h2 className="section-title">Why <span className="fluid-word">Fluid</span></h2>
          <div className="marketing-grid">
            <div className="m-card">
              <div className="m-icon"><LandingIcon name="bolt" /></div>
              <h4>Real-time stats</h4>
              <p>Live insights to act faster and improve outcomes.</p>
            </div>
            <div className="m-card">
              <div className="m-icon"><LandingIcon name="refresh" /></div>
              <h4>Digital workflow</h4>
              <p>Streamlined processes for teachers and admins.</p>
            </div>
            <div className="m-card">
              <div className="m-icon"><LandingIcon name="users" /></div>
              <h4>Multi-role access</h4>
              <p>Separate, focused experiences for each role.</p>
            </div>
          </div>
        </section>

        <section className="about" id="about">
          <div className="about-inner">
            <h2 className="section-title">About <span className="fluid-word">Fluid</span></h2>
            <p>Fluid combines modern UX with powerful education tools to help institutions manage schedules, attendance, and performance with clarity and minimal friction.</p>
          </div>
        </section>

        <section className="login-section" id="login">
          <div className="login-card">
          <div className="illustration" aria-hidden="true"></div>
          <div className="auth-tabs" data-auth-mode={isSignup ? "signup" : "login"}>
            <button 
              className={`tab ${!isSignup ? 'active' : ''}`}
              onClick={() => { setIsSignup(false); setError(""); setSignupError(""); setSignupSuccess(""); }}
            >
              Login
            </button>
            <button 
              className={`tab ${isSignup ? 'active' : ''}`}
              onClick={() => { setIsSignup(true); setError(""); setSignupError(""); setSignupSuccess(""); }}
            >
              Sign Up
            </button>
          </div>
          <h2 className="title">{isSignup ? "Create Account" : "Access Your Workspace"}</h2>

          {isSignup ? (
            <form className="login-form" onSubmit={handleSignup}>
              <label className="field">
                <span className="label">Role</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="select"
                  aria-label="Select role"
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <label className="field">
                <span className="label">First Name</span>
                <input
                  type="text"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input"
                />
              </label>

              <label className="field">
                <span className="label">Last Name</span>
                <input
                  type="text"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input"
                />
              </label>

              <label className="field">
                <span className="label">Email</span>
                <input
                  type="email"
                  placeholder="you@school.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  required
                />
              </label>

              <label className="field">
                <span className="label">Password</span>
                <input
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  required
                />
              </label>

              {signupSuccess && <div className="success">{signupSuccess}</div>}
              {signupError && <div className="error">{signupError}</div>}

              <button className="btn primary" type="submit">Sign Up</button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleLogin}>
            <label className="field">
              <span className="label">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="select"
                aria-label="Select role"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <label className="field">
              <span className="label">Email</span>
              <input
                type="email"
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                required
              />
            </label>

            <label className="field">
              <span className="label">Password</span>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                required
              />
            </label>

            <div className="row between">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember((s) => !s)}
                />
                <span>Remember me</span>
              </label>
              <a className="muted" href="#">
                Forgot?
              </a>
            </div>

            {error && <div className="error">{error}</div>}

            <button className="btn primary" type="submit">
              Login
            </button>

            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setEmail("");
                setPassword("");
                setError("");
              }}
            >
              Clear
            </button>
          </form>
          )}

          <footer className="card-foot">
            <small>© {new Date().getFullYear()} Fluid — All rights reserved</small>
          </footer>
        </div>
        </section>
      </main>

      <AppFooter className="landing-footer" footerId="contact" showContactPanel />
    </div>
  );
}

export default LoginPage;