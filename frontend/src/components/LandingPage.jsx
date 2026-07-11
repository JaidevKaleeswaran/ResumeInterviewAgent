import React from 'react';

export default function LandingPage({ onSelectTab }) {
  return (
    <div className="landing-page" style={{ minHeight: '85vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '1400px', padding: '0 var(--space-xl)', gap: 'var(--space-2xl)' }}>

        {/* Left Images — Stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: '1', maxWidth: '320px' }}>
          <div className="landing-img-card tilt-left">
            <img src="/students.png" alt="High school students" style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '16px', boxShadow: '0 12px 30px rgba(0,0,0,0.25)' }} />
          </div>
          <div className="landing-img-card tilt-left">
            <img src="/interview.png" alt="Interview session" style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '16px', boxShadow: '0 12px 30px rgba(0,0,0,0.25)' }} />
          </div>
        </div>

        {/* Center — Hero Content */}
        <div className="hero-content" style={{ flex: '1.4', maxWidth: '600px', textAlign: 'center', padding: 'var(--space-xl)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src="/ai_coach_logo.png" 
            alt="Interview Coach AI Logo" 
            style={{ 
              width: '270px', 
              height: '270px', 
              borderRadius: '24px', 
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.15)', 
              border: '2px solid rgba(14, 165, 233, 0.15)', 
              objectFit: 'cover',
              marginBottom: '28px'
            }} 
          />
          <h1 className="hero-title" style={{ marginTop: 0 }}>
            Welcome to<br />
            <span className="logo-text" style={{ fontSize: 'inherit', padding: '10px 0' }}>Intelligent Interview Pro</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: '1.7', margin: '20px 0 36px' }}>
            AI-powered coaching to help students and professionals land their dream job — with smart resumes, mock interviews, and real-time feedback.
          </p>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => onSelectTab('resume')}
            style={{ fontSize: '1.1rem', padding: '14px 36px', borderRadius: '12px' }}
          >
            Get Started
          </button>
        </div>

        {/* Right Images — Stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: '1', maxWidth: '320px' }}>
          <div className="landing-img-card tilt-right">
            <img src="/professionals.png" alt="Office professionals" style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '16px', boxShadow: '0 12px 30px rgba(0,0,0,0.25)' }} />
          </div>
          <div className="landing-img-card tilt-right">
            <img src="/handshake.png" alt="Professional handshake" style={{ width: '100%', height: '220px', objectFit: 'cover', borderRadius: '16px', boxShadow: '0 12px 30px rgba(0,0,0,0.25)' }} />
          </div>
        </div>

      </div>
    </div>
  );
}
