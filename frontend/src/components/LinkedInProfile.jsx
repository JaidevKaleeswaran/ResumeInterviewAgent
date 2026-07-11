import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import { LoaderDots } from './ui/Loader';

export default function LinkedInProfile({ linkedInInput }) {
  const [data, setData] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const [automationStatus, setAutomationStatus] = useState(null);
  const { loading, error, execute } = useApi();

  const handleGenerate = async () => {
    if (!linkedInInput?.trim()) return;
    try {
      const result = await execute(() => api.generateLinkedIn(linkedInInput));
      setData(result.linkedin);
      setAutomationStatus(null);
    } catch (err) {
      console.error('LinkedIn generation failed:', err);
    }
  };

  const handleAutomate = async () => {
    if (!linkedInInput?.trim()) return;
    try {
      setAutomationStatus('Automating LinkedIn via MCP...');
      const result = await execute(() => api.automateLinkedIn(linkedInInput));
      setAutomationStatus(result.message);
    } catch (err) {
      setAutomationStatus('Automation failed: ' + err.message);
      console.error('Automation failed:', err);
    }
  };

  // Auto-generate when input is available
  useEffect(() => {
    if (linkedInInput && !data && !loading) {
      handleGenerate();
    }
  }, [linkedInInput]);

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="tab-content">
      <div className="section-header">
        <h1 className="section-title">LinkedIn Profile</h1>
        <p className="section-description">
          AI-optimized LinkedIn profile content ready to copy and paste. Generate a resume first to auto-populate.
        </p>
      </div>

      {!linkedInInput && (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <div className="empty-state-title">Generate a resume first</div>
          <div className="empty-state-text">
            Go to the Resume Generator tab, enter your experiences, and generate a resume. Your LinkedIn profile will be auto-generated from the same input.
          </div>
        </div>
      )}

      {linkedInInput && !data && !loading && (
        <div className="card" style={{ textAlign: 'center' }}>
          <button className="btn btn-primary btn-lg" onClick={handleGenerate} id="generate-linkedin-btn">
            Generate LinkedIn Profile
          </button>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center' }}>
          <LoaderDots />
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
            Crafting your LinkedIn profile...
          </p>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'var(--color-danger)' }}>
          <p style={{ color: 'var(--color-danger)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm mt-md" onClick={handleGenerate}>
            Retry
          </button>
        </div>
      )}

      {data && !loading && (
        <div className="fade-in">
          {/* MCP Automation Panel */}
          <div className="card" style={{ marginBottom: '24px', background: 'var(--bg-card)', border: '2px solid var(--color-primary)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, padding: '8px 12px', background: 'var(--color-primary)', color: 'white', fontSize: '0.7rem', fontWeight: 900, borderBottomLeftRadius: '8px' }}>
              POWERED BY MCP
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '24px', padding: '12px 8px' }}>
              <div style={{ flex: 1, minWidth: '300px' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.4rem' }}>One-Click LinkedIn Sync</h3>
                <p style={{ margin: '8px 0 0', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Our AI will now use <strong>Model Context Protocol (MCP)</strong> to automatically log into your LinkedIn, update your headline, about section, and all {data.experience?.length || 0} experiences for you.
                </p>
                {automationStatus && (
                  <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="btn-spinner" style={{ width: '16px', height: '16px', borderTopColor: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                      {automationStatus}
                    </span>
                  </div>
                )}
              </div>
              <button 
                className="btn btn-primary btn-lg" 
                onClick={handleAutomate} 
                disabled={!!automationStatus && !automationStatus.includes('failed')}
                style={{ height: 'fit-content', padding: '16px 32px', fontSize: '1rem' }}
              >
                {automationStatus && !automationStatus.includes('failed') ? 'Syncing Profile...' : 'Start Auto-Update'}
              </button>
            </div>
          </div>

          {/* Headline */}
          <div className="linkedin-section">
            <div className="linkedin-section-header">
              <div className="linkedin-section-title">Headline</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="linkedin-char-count">
                  {data.headline?.length || 0}/120
                </span>
                <button
                  className={`copy-btn ${copiedField === 'headline' ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(data.headline, 'headline')}
                >
                  {copiedField === 'headline' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {data.headline}
            </div>
          </div>

          {/* About */}
          <div className="linkedin-section">
            <div className="linkedin-section-header">
              <div className="linkedin-section-title">About</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="linkedin-char-count">
                  {data.about?.length || 0}/2000
                </span>
                <button
                  className={`copy-btn ${copiedField === 'about' ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(data.about, 'about')}
                >
                  {copiedField === 'about' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="linkedin-content">{data.about}</div>
          </div>

          {/* Experience */}
          {data.experience?.length > 0 && (
            <div className="linkedin-section">
              <div className="linkedin-section-header">
                <div className="linkedin-section-title">Experience</div>
              </div>
              {data.experience.map((exp, i) => (
                <div key={i} style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: i < data.experience.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                  <div style={{ fontWeight: 600 }}>{exp.title}</div>
                  <div style={{ color: 'var(--color-primary-light)', fontSize: '0.9rem' }}>{exp.company}</div>
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginBottom: '8px' }}>{exp.duration}</div>
                  <div className="linkedin-content" style={{ fontSize: '0.9rem' }}>{exp.description}</div>
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {data.skills?.length > 0 && (
            <div className="linkedin-section">
              <div className="linkedin-section-header">
                <div className="linkedin-section-title">Skills</div>
                <button
                  className={`copy-btn ${copiedField === 'skills' ? 'copied' : ''}`}
                  onClick={() => copyToClipboard(data.skills.join(', '), 'skills')}
                >
                  {copiedField === 'skills' ? 'Copied' : 'Copy All'}
                </button>
              </div>
              <div className="skills-grid">
                {data.skills.map((skill, i) => (
                  <span key={i} className="badge badge-skill">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {data.recommendations?.length > 0 && (
            <div className="linkedin-section">
              <div className="linkedin-section-header">
                <div className="linkedin-section-title">Recommendation Tips</div>
              </div>
              {data.recommendations.map((rec, i) => (
                <div key={i} className="feedback-item" style={{ marginBottom: '8px' }}>
                  <span className="feedback-icon">•</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{rec}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
