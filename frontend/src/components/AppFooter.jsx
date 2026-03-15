import React from "react";

export default function AppFooter({ className = "", footerId, showContactPanel = false }) {
  return (
    <footer id={footerId} className={`app-footer ${className}`.trim()}>
      {showContactPanel && (
        <div className="app-footer-contact">
          <div className="app-footer-top">
            <div className="app-footer-brand-block">
              <div className="app-footer-brand-row">
                <span className="app-footer-brand-mark" aria-hidden="true">
                  <img src="/Adobe%20Express%20-%20file.png" alt="" />
                </span>
                <h4>Fluid</h4>
              </div>
              <p className="app-footer-brand-copy">
                Fluid helps students and teachers turn daily school operations into clear,
                trackable, and actionable outcomes.
              </p>
              <div className="app-footer-social" aria-label="Social links">
                <a href="#" aria-label="X">
                  <svg viewBox="0 0 24 24" width="17" height="17" focusable="false"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </a>
                <a href="#" aria-label="Instagram">
                  <svg viewBox="0 0 24 24" width="17" height="17" focusable="false"><rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="2" fill="none" /><circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" fill="none" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" /></svg>
                </a>
                <a href="#" aria-label="LinkedIn">
                  <svg viewBox="0 0 24 24" width="17" height="17" focusable="false"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none" /><path d="M8 10v6M8 8h.01M12 16v-3.1c0-1.1.7-1.9 1.8-1.9 1 0 1.7.7 1.7 1.9V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </a>
                <a href="#" aria-label="GitHub">
                  <svg viewBox="0 0 24 24" width="17" height="17" focusable="false"><path d="M12 3.5a8.5 8.5 0 0 0-2.7 16.6c.4.1.6-.2.6-.5v-1.8c-2.5.5-3-1-3-1-.4-1-1-1.3-1-1.3-.8-.5.1-.5.1-.5.9.1 1.4.9 1.4.9.8 1.4 2.1 1 2.6.8.1-.6.3-1 .6-1.3-2-.2-4.2-1-4.2-4.5 0-1 .3-1.8.9-2.5-.1-.2-.4-1.1.1-2.2 0 0 .7-.2 2.5.9a8.3 8.3 0 0 1 4.6 0c1.8-1.1 2.5-.9 2.5-.9.5 1.1.2 2 .1 2.2.6.7.9 1.5.9 2.5 0 3.5-2.1 4.3-4.2 4.5.4.3.7.9.7 1.8v2.7c0 .3.2.6.6.5A8.5 8.5 0 0 0 12 3.5z" fill="currentColor" /></svg>
                </a>
              </div>
            </div>

            <div className="app-footer-nav-grid">
              <div>
                <h5>Product</h5>
                <a href="#">Features</a>
                <a href="#">Pricing</a>
                <a href="#">Integrations</a>
                <a href="#">Changelog</a>
              </div>
              <div>
                <h5>Resources</h5>
                <a href="#">Documentation</a>
                <a href="#">Tutorials</a>
                <a href="#">Blog</a>
                <a href="#">Support</a>
              </div>
              <div>
                <h5>Company</h5>
                <a href="/#about">About</a>
                <a href="#">Careers</a>
                <a href="/#contact">Contact</a>
                <a href="#">Partners</a>
              </div>
            </div>
          </div>

          <div className="app-footer-contact-meta">
            <div className="app-footer-copy">© {new Date().getFullYear()} Fluid. All rights reserved.</div>
            <div className="app-footer-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookies Settings</a>
            </div>
          </div>
        </div>
      )}

      {!showContactPanel && (
        <>
          <div className="app-footer-links">
            <a href="/#about">About</a>
            <span aria-hidden="true">•</span>
            <a href="/#contact">Contact</a>
            <span aria-hidden="true">•</span>
            <a href="#">Privacy</a>
          </div>
          <div className="app-footer-copy">© {new Date().getFullYear()} Fluid</div>
        </>
      )}
    </footer>
  );
}