import React from 'react';

export default function Navbar({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'home', label: 'Home' },
    { id: 'resume', label: 'Resume Generator' },
    { id: 'interview', label: 'Interview Coach' },
    { id: 'jobs', label: 'Job Matches' },
  ];

  return (
    <nav className="top-navbar">
      <div className="top-navbar-logo" onClick={() => onTabChange('home')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <img src="/ai_coach_logo.png" alt="Intelligent Interview Pro Icon" className="top-navbar-icon" />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span className="logo-text" style={{ fontSize: '2.4rem', fontWeight: '900', lineHeight: '1.1' }}>INTELLIGENT INTERVIEW PRO</span>
          <span style={{ fontSize: '1.3rem', fontWeight: '600', color: 'rgba(255, 255, 255, 0.8)', letterSpacing: '0.5px', marginTop: '2px', textTransform: 'none' }}>
            Real-Time AI Coaching. Real-World Confidence.
          </span>
        </div>
      </div>
      <div className="top-navbar-links">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`top-nav-link ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
