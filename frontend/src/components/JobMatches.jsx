import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import { LoaderDots } from './ui/Loader';
import ScoreRing from './ui/ScoreRing';

export default function JobMatches({ resumeData }) {
  const [matches, setMatches] = useState([]);
  const { loading, error, execute } = useApi();

  const handleMatch = async () => {
    console.log('Triggering job match for resume:', resumeData?.resume);
    if (!resumeData?.resume) {
      console.warn('No resume data available for matching.');
      return;
    }
    const { resume } = resumeData;
    try {
      const result = await execute(() =>
        api.matchJobs({
          skills: resume.skills || [],
          summary: resume.summary || '',
          experience: resume.experience || [],
          projects: resume.projects || [],
        })
      );
      console.log('Job matching result:', result);
      setMatches(result.matches);
    } catch (err) {
      console.error('Job matching failed:', err);
    }
  };

  // Auto-match when resume data is available
  useEffect(() => {
    if (resumeData?.resume && matches.length === 0 && !loading) {
      handleMatch();
    }
  }, [resumeData]);

  return (
    <div className="tab-content">
      <div className="section-header">
        <h1 className="section-title">Job Matches</h1>
        <p className="section-description">
          Find internships, research roles, and volunteering opportunities curated from <strong>StandOut</strong> and other reputable databases specifically for high schoolers.
        </p>
      </div>

      {!resumeData?.resume && (
        <div className="empty-state">
          <div className="empty-state-icon"></div>
          <div className="empty-state-title">Generate a resume first</div>
          <div className="empty-state-text">
            Go to the Resume Generator tab to create your resume. Job matches will be automatically calculated from your profile.
          </div>
        </div>
      )}

      {resumeData?.resume && matches.length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center' }}>
          <button className="btn btn-primary btn-lg" onClick={handleMatch} id="match-jobs-btn">
            Find Job Matches
          </button>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center' }}>
          <LoaderDots />
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
            Computing semantic similarity with current high school opportunities...
          </p>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'var(--color-danger)' }}>
          <p style={{ color: 'var(--color-danger)' }}>{error}</p>
          <button className="btn btn-secondary btn-sm mt-md" onClick={handleMatch}>
            Retry
          </button>
        </div>
      )}

      {matches.length > 0 && !loading && (
        <div className="flex flex-col gap-lg">
          {matches.map((job, i) => (
            <div key={i} className="job-card">
              <div className="job-card-header">
                <div>
                  <div className="job-card-title">{job.title}</div>
                  <div className="job-card-company">{job.company}</div>
                </div>
                <ScoreRing
                  score={Math.round(job.match_percentage)}
                  size={80}
                  strokeWidth={6}
                  label="Match"
                />
              </div>
              <div className="job-card-description">{job.description}</div>

              {job.url && (
                <div style={{ marginBottom: '20px' }}>
                  <a 
                    href={job.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ textDecoration: 'none', display: 'inline-block' }}
                  >
                    Apply on Official Website ↗
                  </a>
                </div>
              )}

              {/* Matched Skills */}
              {job.matched_skills?.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                    Skills You Have
                  </div>
                  <div className="job-card-skills">
                    {job.matched_skills.map((skill, j) => (
                      <span key={j} className="badge badge-match">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Skills */}
              {job.missing_skills?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-danger)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                    Recommended Skills to Gain
                  </div>
                  <div className="job-card-skills">
                    {job.missing_skills.map((skill, j) => (
                      <span key={j} className="badge badge-missing">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button className="btn btn-secondary" onClick={handleMatch}>
              Re-Match Jobs
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
