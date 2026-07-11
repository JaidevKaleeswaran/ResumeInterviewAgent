import React from 'react';

const NAV_ITEMS = [
  { id: 'home', icon: 'H', label: 'Home' },
  { id: 'resume', icon: 'R', label: 'Resume Generator' },
  { id: 'interview', icon: 'I', label: 'Interview Coach' },
  { id: 'jobs', icon: 'J', label: 'Job Matches' },
];

export default function Sidebar({ activeTab, onTabChange, isOpen, onToggle }) {
  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={onToggle}
        aria-label="Toggle sidebar"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">AI</div>
            <div>
              <div className="sidebar-logo-text">Intelligent Interview Pro</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                Multimodal Coaching
              </div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                onTabChange(item.id);
                onToggle();
              }}
              role="button"
              tabIndex={0}
              id={`nav-${item.id}`}
            >
              <span className="sidebar-item-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
            SDG Alignment
          </div>
          <div className="sidebar-sdg">
            <span className="sidebar-sdg-badge sdg-4">SDG 4</span>
            <span className="sidebar-sdg-badge sdg-8">SDG 8</span>
            <span className="sidebar-sdg-badge sdg-10">SDG 10</span>
          </div>
        </div>
      </aside>
    </>
  );
}
