import React from 'react';

export default function SDGAlignment() {
  return (
    <div className="tab-content fade-in" style={{ marginTop: '-32px' }}>
      <div className="section-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div className="section-title-icon" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#fff' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
        </div>
        <h2 className="section-title" style={{ fontSize: '1.8rem', color: '#1e3a8a' }}>
          Sustainable Development Goals (SDGs) Alignment
        </h2>
        <p className="section-description" style={{ fontSize: '1rem', maxWidth: '640px', color: 'var(--text-secondary)' }}>
          How Intelligent Interview Pro aligns with the United Nations Sustainable Development Goals to democratize professional advancement.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>

        {/* SDG 4 */}
        <div className="card" style={{
          borderLeft: '6px solid #c41e3a',
          background: 'rgba(255, 255, 255, 0.85)',
          padding: '28px',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              background: 'rgba(196, 30, 58, 0.1)',
              color: '#c41e3a',
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '1.25rem',
              fontWeight: '800',
              border: '1px solid rgba(196, 30, 58, 0.2)'
            }}>
              SDG 4
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#c41e3a', fontWeight: '800' }}>
                Quality Education
              </h3>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '1px' }}>
                Democratizing Interview Training
              </span>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
            Provides high-quality, real-time interactive training, automated speech coaching, and granular feedback. This bridges the educational gap by giving users accessible, self-paced, and state-of-the-art interview training that is traditionally only available through expensive career counseling.
          </p>
        </div>

        {/* SDG 8 */}
        <div className="card" style={{
          borderLeft: '6px solid #a21942',
          background: 'rgba(255, 255, 255, 0.85)',
          padding: '28px',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              background: 'rgba(162, 25, 66, 0.1)',
              color: '#a21942',
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '1.25rem',
              fontWeight: '800',
              border: '1px solid rgba(162, 25, 66, 0.2)'
            }}>
              SDG 8
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#a21942', fontWeight: '800' }}>
                Decent Work &amp; Economic Growth
              </h3>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '1px' }}>
                Enhancing Employability &amp; Readiness
              </span>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
            Empowers job seekers to optimize their resumes for ATS compatibility, generate standard LinkedIn profiles, and evaluate role matches. By building confidence and mock interview readiness, it helps candidates secure decent work and contribute positively to overall economic productivity.
          </p>
        </div>

        {/* SDG 10 */}
        <div className="card" style={{
          borderLeft: '6px solid #dd1367',
          background: 'rgba(255, 255, 255, 0.85)',
          padding: '28px',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              background: 'rgba(221, 19, 103, 0.1)',
              color: '#dd1367',
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '1.25rem',
              fontWeight: '800',
              border: '1px solid rgba(221, 19, 103, 0.2)'
            }}>
              SDG 10
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#dd1367', fontWeight: '800' }}>
                Reduced Inequalities
              </h3>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '1px' }}>
                Levelling the Playing Field
              </span>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', margin: 0 }}>
            Removes high socio-economic barriers to advanced career tools. By keeping high-end multimodal analysis (video engagement, speech pacers, STAR structure feedback) entirely free and locally processable, the platform levels the playing field for underrepresented and lower-income candidates.
          </p>
        </div>

      </div>
    </div>
  );
}
