import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import { LoaderDots } from './ui/Loader';
import ScoreRing from './ui/ScoreRing';

export default function ResumeScore({ resumeData }) {
  const [scoreData, setScoreData] = useState(null);
  
  const hasGeneratedResume = !!resumeData?.resume;
  const [inputType, setInputType] = useState(hasGeneratedResume ? 'generated' : 'paste');
  const [pastedText, setPastedText] = useState('');
  const [uploadFile, setUploadFile] = useState(null);

  const { loading, error, execute } = useApi();

  const handleScore = async () => {
    try {
      const result = await execute(async () => {
        let finalResumeData = null;
        if (inputType === 'generated') {
          if (!resumeData?.resume) throw new Error("No generated resume found.");
          finalResumeData = resumeData.resume;
        } else if (inputType === 'paste') {
          if (!pastedText.trim()) throw new Error("Please paste your resume text.");
          const genResult = await api.generateResume(pastedText);
          finalResumeData = genResult.resume;
        } else if (inputType === 'upload') {
          if (!uploadFile) throw new Error("Please upload a PDF file.");
          const extResult = await api.extractPdf(uploadFile);
          if (!extResult.text) throw new Error("Could not extract text from the PDF.");
          const genResult = await api.generateResume(extResult.text);
          finalResumeData = genResult.resume;
        }

        if (!finalResumeData) throw new Error("Could not process resume data.");
        return await api.scoreResume(finalResumeData);
      });
      
      setScoreData(result);
    } catch (err) {
      console.error('Resume scoring failed:', err);
    }
  };

  // Update inputType when resumeData becomes available
  useEffect(() => {
    if (resumeData?.resume && inputType !== 'generated' && !scoreData) {
      setInputType('generated');
    }
  }, [resumeData]);

  // Auto-score when switching to 'generated' if it wasn't scored yet
  useEffect(() => {
    if (inputType === 'generated' && resumeData?.resume && !scoreData && !loading) {
      handleScore();
    }
  }, [resumeData, inputType]);

  return (
    <div className="tab-content">
      <div className="section-header">
        <h1 className="section-title">Resume Score and Feedback</h1>
        <p className="section-description">
          AI-powered resume evaluation against ATS standards, content quality, completeness, and professional presentation.
        </p>
      </div>

      <div className="card">
        <div className="form-group">
          <label className="form-label">Input Method</label>
          <select 
            className="select" 
            value={inputType} 
            onChange={(e) => {
              setInputType(e.target.value);
              setScoreData(null); // Clear previous score on input change
            }}
          >
            {hasGeneratedResume && <option value="generated">Use Generated Resume</option>}
            <option value="paste">Paste Text</option>
            <option value="upload">Upload PDF</option>
          </select>
        </div>

        {inputType === 'paste' && (
          <div className="form-group">
            <textarea 
              className="textarea" 
              rows="6" 
              placeholder="Paste your resume text here..." 
              value={pastedText} 
              onChange={(e) => setPastedText(e.target.value)} 
            />
          </div>
        )}

        {inputType === 'upload' && (
          <div className="form-group">
            <div 
              className="file-drop-area" 
              style={{ border: '2px dashed var(--border-color)', padding: '2rem', textAlign: 'center', borderRadius: '8px', cursor: 'pointer' }}
              onClick={() => document.getElementById('pdf-upload').click()}
            >
              <input 
                id="pdf-upload"
                type="file" 
                accept="application/pdf" 
                onChange={(e) => setUploadFile(e.target.files[0])} 
                style={{ display: 'none' }} 
              />
              {uploadFile ? (
                <p style={{ margin: 0, fontWeight: 'bold' }}>Selected: {uploadFile.name}</p>
              ) : (
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Click to upload or drag and drop a PDF file here</p>
              )}
            </div>
          </div>
        )}

        <button 
          className="btn btn-primary" 
          onClick={handleScore} 
          disabled={loading || (inputType === 'paste' && !pastedText) || (inputType === 'upload' && !uploadFile)}
          style={{ width: '100%', marginTop: '16px' }}
        >
          {loading ? (
            <>
              <div className="btn-spinner" style={{ marginRight: '8px' }} />
              Evaluating...
            </>
          ) : 'Score My Resume'}
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--color-danger)', marginTop: '16px' }}>
          <p style={{ color: 'var(--color-danger)', margin: 0 }}>{error}</p>
        </div>
      )}

      {scoreData && !loading && (
        <div className="fade-in" style={{ marginTop: '24px' }}>
          <div className="card">
            <div className="score-container">
              {/* Score Ring */}
              <div style={{ textAlign: 'center' }}>
                <ScoreRing score={scoreData.score} size={180} strokeWidth={10} label="Overall" />
              </div>

              {/* Feedback Details */}
              <div className="score-details">
                {/* Strengths */}
                {scoreData.strengths?.length > 0 && (
                  <div className="feedback-section">
                    <div className="feedback-section-title strengths">
                      Strengths
                    </div>
                    <ul className="feedback-list">
                      {scoreData.strengths.map((s, i) => (
                        <li key={i} className="feedback-item">
                          <span className="feedback-icon" style={{ color: 'var(--color-success)' }}>•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Weaknesses */}
                {scoreData.weaknesses?.length > 0 && (
                  <div className="feedback-section">
                    <div className="feedback-section-title weaknesses">
                      Areas for Improvement
                    </div>
                    <ul className="feedback-list">
                      {scoreData.weaknesses.map((w, i) => (
                        <li key={i} className="feedback-item">
                          <span className="feedback-icon" style={{ color: 'var(--color-danger)' }}>•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                {scoreData.suggestions?.length > 0 && (
                  <div className="feedback-section">
                    <div className="feedback-section-title suggestions">
                      Suggestions
                    </div>
                    <ul className="feedback-list">
                      {scoreData.suggestions.map((s, i) => (
                        <li key={i} className="feedback-item">
                          <span className="feedback-icon" style={{ color: 'var(--color-warning)' }}>•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
