import React, { useState } from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import { LoaderDots } from './ui/Loader';
import html2pdf from 'html2pdf.js';

// ─── Shared resume renderer (used for both preview and PDF) ──────────────────
// Matches the attached reference format:
//   Name (large, bold, left) → contact bullets → HR → SECTION HEADERS (bold caps + hr)
//   Education: School Bold + location | date right-aligned, degree italic below, GPA right
//   Experience: Company + location | date right, title italic, bullet list
//   Skills: Category label + colon, value text (table rows)

const RESUME_STYLES = {
  wrap: {
    fontFamily: '"Calibri", "Arial", sans-serif',
    fontSize: '10pt',
    color: '#1a1a1a',
    lineHeight: '1.45',
    background: '#fff',
  },
  name: {
    fontSize: '22pt',
    fontWeight: '700',
    letterSpacing: '0.5px',
    marginBottom: '3px',
    color: '#111',
    textAlign: 'center',
  },
  contactLine: {
    fontSize: '9pt',
    color: '#333',
    marginBottom: '6px',
    textAlign: 'center',
  },
  hr: {
    border: 'none',
    borderTop: '1.2px solid #444',
    margin: '6px 0 10px 0',
  },
  sectionWrap: { marginBottom: '14px' },
  sectionTitle: {
    fontSize: '10pt',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    marginBottom: '4px',
    paddingBottom: '2px',
    borderBottom: '1px solid #888',
    color: '#111',
  },
  // Education
  eduRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  eduSchool: { fontWeight: '700', fontSize: '10pt' },
  eduDate: { fontSize: '9.5pt', fontWeight: '400', color: '#333' },
  eduDegree: { fontStyle: 'italic', fontSize: '9.5pt', marginTop: '1px' },
  eduGpa: { fontSize: '9pt', color: '#444', marginTop: '1px' },
  // Experience
  expRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  expCompany: { fontWeight: '700', fontSize: '10pt' },
  expDate: { fontSize: '9.5pt', color: '#333' },
  expTitle: { fontStyle: 'italic', fontSize: '9.5pt', marginTop: '1px', marginBottom: '3px' },
  expBullets: { margin: '3px 0 0 16px', padding: 0, listStyleType: 'disc', fontSize: '9.5pt', color: '#222' },
  expBullet: { marginBottom: '2px', lineHeight: '1.45' },
  // Skills table
  skillRow: { display: 'flex', fontSize: '9.5pt', marginBottom: '3px', lineHeight: '1.4' },
  skillLabel: { fontWeight: '700', minWidth: '140px', flexShrink: 0 },
  skillValue: { color: '#222' },
};

function ResumeDocument({ resume, forPdf = false }) {
  // Parse bullet points from a description string
  const parseBullets = (desc) => {
    if (!desc) return [];
    return desc
      .split(/\n/)
      .map(l => l.replace(/^[•\-*]\s*/, '').trim())
      .filter(Boolean);
  };

  // Parse skills into { label, value } rows if they look like "Label: value"
  // Otherwise treat each skill as a plain bullet
  const parseSkillRows = (skills) => {
    if (!skills || skills.length === 0) return { rows: [], plain: [] };
    const rows = [];
    const plain = [];
    skills.forEach(s => {
      const colonIdx = s.indexOf(':');
      if (colonIdx > 0 && colonIdx < 35) {
        rows.push({ label: s.slice(0, colonIdx).trim(), value: s.slice(colonIdx + 1).trim() });
      } else {
        plain.push(s);
      }
    });
    return { rows, plain };
  };

  const contactParts = [
    resume.location,
    resume.phone,
    resume.email,
    resume.linkedin,
    resume.github,
  ].filter(Boolean);

  const { rows: skillRows, plain: plainSkills } = parseSkillRows(resume.skills);
  const allSkillsPlain = skillRows.length === 0;

  return (
    <div style={RESUME_STYLES.wrap}>
      {/* ── Header ── */}
      <div style={RESUME_STYLES.name}>{resume.name || 'Your Name'}</div>
      {contactParts.length > 0 && (
        <div style={RESUME_STYLES.contactLine}>
          {contactParts.join(' • ')}
        </div>
      )}
      <hr style={RESUME_STYLES.hr} />

      {/* ── Professional Summary ── */}
      {resume.summary && (
        <div style={RESUME_STYLES.sectionWrap}>
          <div style={RESUME_STYLES.sectionTitle}>PROFESSIONAL SUMMARY</div>
          <div style={{ fontSize: '9.5pt', lineHeight: '1.45', color: '#222' }}>{resume.summary}</div>
        </div>
      )}

      {/* ── Work Experience ── */}
      {resume.experience?.length > 0 && (
        <div style={RESUME_STYLES.sectionWrap}>
          <div style={RESUME_STYLES.sectionTitle}>Work Experience</div>
          {resume.experience.map((exp, i) => {
            const bullets = parseBullets(exp.description);
            return (
              <div key={i} style={{ marginBottom: i < resume.experience.length - 1 ? '12px' : 0 }}>
                <div style={RESUME_STYLES.expRow}>
                  <span style={RESUME_STYLES.expCompany}>
                    {exp.company}{exp.location ? `, ${exp.location}` : ''}
                  </span>
                  <span style={RESUME_STYLES.expDate}>{exp.duration}</span>
                </div>
                <div style={RESUME_STYLES.expTitle}>{exp.title}</div>
                {bullets.length > 0 && (
                  <ul style={RESUME_STYLES.expBullets}>
                    {bullets.map((b, j) => (
                      <li key={j} style={RESUME_STYLES.expBullet}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Education ── */}
      {resume.education?.length > 0 && resume.education[0]?.school && (
        <div style={RESUME_STYLES.sectionWrap}>
          <div style={{ ...RESUME_STYLES.sectionTitle, textTransform: 'none' }}>education</div>
          {resume.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: i < resume.education.length - 1 ? '10px' : 0 }}>
              <div style={RESUME_STYLES.eduRow}>
                <span style={RESUME_STYLES.eduSchool}>
                  {edu.school}{edu.location ? `, ${edu.location}` : ''}
                </span>
                <span style={RESUME_STYLES.eduDate}>{edu.year}</span>
              </div>
              <div style={RESUME_STYLES.eduRow}>
                <span style={RESUME_STYLES.eduDegree}>{edu.degree}</span>
                {edu.gpa && <span style={RESUME_STYLES.eduDate}>GPA: {edu.gpa}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Projects (if any) ── */}
      {resume.projects?.length > 0 && (
        <div style={RESUME_STYLES.sectionWrap}>
          <div style={RESUME_STYLES.sectionTitle}>PROJECT EXPERIENCE</div>
          {resume.projects.map((proj, i) => {
            const bullets = parseBullets(proj.description);
            const techs = Array.isArray(proj.technologies) ? proj.technologies.join(', ') : (proj.technologies || '');
            return (
              <div key={i} style={{ marginBottom: i < resume.projects.length - 1 ? '10px' : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: '700', fontSize: '10pt' }}>{proj.name}</span>
                  {techs && <span style={{ fontSize: '9.5pt', color: '#333' }}>[{techs}]</span>}
                </div>
                {bullets.length > 0 && (
                  <ul style={RESUME_STYLES.expBullets}>
                    {bullets.map((b, j) => <li key={j} style={RESUME_STYLES.expBullet}>{b}</li>)}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Achievements (if any) ── */}
      {resume.achievements?.length > 0 && (
        <div style={RESUME_STYLES.sectionWrap}>
          <div style={RESUME_STYLES.sectionTitle}>ACHIEVEMENTS &amp; AWARDS</div>
          <ul style={{ ...RESUME_STYLES.expBullets, marginLeft: '14px' }}>
            {resume.achievements.map((a, i) => (
              <li key={i} style={RESUME_STYLES.expBullet}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Certifications ── */}
      {resume.certifications?.length > 0 && (
        <div style={RESUME_STYLES.sectionWrap}>
          <div style={RESUME_STYLES.sectionTitle}>CERTIFICATIONS</div>
          <div style={{ fontSize: '9.5pt', color: '#222', lineHeight: '1.4' }}>
            {resume.certifications.join(' • ')}
          </div>
        </div>
      )}

      {/* ── Technical Skills ── */}
      {resume.skills?.length > 0 && (
        <div style={RESUME_STYLES.sectionWrap}>
          <div style={RESUME_STYLES.sectionTitle}>TECHNICAL SKILLS</div>
          {allSkillsPlain ? (
            <div style={{ fontSize: '9.5pt', color: '#222', lineHeight: '1.4' }}>
              {plainSkills.join(', ')}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {skillRows.map((row, i) => (
                <div key={i} style={RESUME_STYLES.skillRow}>
                  <span style={RESUME_STYLES.skillLabel}>{row.label}:</span>
                  <span style={RESUME_STYLES.skillValue}>{row.value}</span>
                </div>
              ))}
              {plainSkills.length > 0 && (
                <div style={RESUME_STYLES.skillRow}>
                  <span style={RESUME_STYLES.skillLabel}>Other:</span>
                  <span style={RESUME_STYLES.skillValue}>{plainSkills.join(', ')}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ResumeGenerator({ resumeData, setResumeData, setLinkedInInput }) {
  const [rawText, setRawText] = useState('');
  const [inputType, setInputType] = useState('paste');
  const [uploadFile, setUploadFile] = useState(null);
  // If we already have a resume from localStorage, start at 'ready'
  const [step, setStep] = useState(resumeData?.resume ? 'ready' : 'input');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [textToProcess, setTextToProcess] = useState('');
  const { loading, error, execute } = useApi();

  const handleGenerate = async () => {
    try {
      let txt = '';
      if (inputType === 'paste') {
        if (!rawText.trim()) throw new Error("Please paste your experiences first.");
        txt = rawText;
      } else {
        if (!uploadFile) throw new Error("Please upload a PDF resume.");
        setStep('analyzing');
        const extResult = await api.extractPdf(uploadFile);
        txt = extResult.text;
        setRawText(txt);
      }

      setTextToProcess(txt);
      setStep('analyzing');

      const analysis = await api.analyzeResume(txt);
      if (analysis.has_missing_info && analysis.questions?.length > 0) {
        setQuestions(analysis.questions);
        const initialAnswers = {};
        analysis.questions.forEach(q => { initialAnswers[q] = ''; });
        setAnswers(initialAnswers);
        setStep('questions');
      } else {
        await handleGenerateResume(txt, {});
      }
    } catch (err) {
      console.error('Resume analysis failed:', err);
      setStep('input');
    }
  };

  const handleGenerateResume = async (txt = textToProcess, qaAnswers = answers) => {
    setStep('generating');
    try {
      const result = await execute(async () => {
        return await api.generateResume(txt, qaAnswers);
      });
      setResumeData(result);
      if (setLinkedInInput) setLinkedInInput(txt || result.resume?.summary);
      setStep('ready');
    } catch (err) {
      console.error('Resume generation failed:', err);
      setStep('input');
    }
  };

  const handleAnswerChange = (question, value) => {
    setAnswers(prev => ({ ...prev, [question]: value }));
  };

  const handleStartNew = () => {
    setStep('input');
    setRawText('');
    setUploadFile(null);
    setQuestions([]);
    setAnswers({});
    setTextToProcess('');
  };

  const handleDownloadPdf = () => {
    const element = document.getElementById('pdf-resume-template');
    element.style.display = 'block';
    const opt = {
      margin: 0.2,
      filename: `${resumeData?.resume?.name || 'Resume'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save().then(() => {
      element.style.display = 'none';
    });
  };

  const resume = resumeData?.resume;

  // Helper to render description as bullet points
  const renderDescription = (desc) => {
    if (!desc) return null;
    const lines = desc.split(/\n/).map(l => l.trim()).filter(Boolean);
    const bullets = [];
    const nonBullets = [];
    lines.forEach(line => {
      const cleaned = line.replace(/^[•\-*]\s*/, '').trim();
      if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || cleaned !== line) {
        bullets.push(cleaned);
      } else if (line.toLowerCase().startsWith('additional details:')) {
        // skip this header
      } else {
        // Split long text into sentences and make them bullets
        const sentences = cleaned.split(/\.\s+/).filter(s => s.trim().length > 5);
        if (sentences.length > 1) {
          sentences.forEach(s => bullets.push(s.replace(/\.$/, '').trim()));
        } else {
          nonBullets.push(cleaned);
        }
      }
    });
    return (
      <div style={{ textAlign: 'left', marginTop: '6px' }}>
        {nonBullets.map((t, i) => (
          <p key={`p-${i}`} style={{ fontSize: '0.88rem', margin: '2px 0', lineHeight: 1.5 }}>{t}</p>
        ))}
        {bullets.length > 0 && (
          <ul style={{ margin: '4px 0 0 20px', padding: 0, listStyleType: 'disc' }}>
            {bullets.map((b, i) => (
              <li key={i} style={{ fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '2px' }}>{b}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="tab-content">
      <div className="section-header">
        <h1 className="section-title">Resume Generator</h1>
        <p className="section-description">
          Upload your current resume or paste your achievements. Our AI will craft a professional resume with all the necessary information.
        </p>
      </div>

      {step === 'input' && (
        <div className="card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="form-group" style={{ marginBottom: 'var(--space-md)' }}>
            <label className="form-label">Input Method</label>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button
                className={`btn ${inputType === 'paste' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setInputType('paste')}
              >
                Paste Text
              </button>
              <button
                className={`btn ${inputType === 'upload' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setInputType('upload')}
              >
                Upload PDF
              </button>
            </div>
          </div>

          {inputType === 'paste' ? (
            <>
              <div className="card-header">
                <div className="card-title">Your Achievements and Experience</div>
                <span className="text-sm text-muted">{rawText.length} chars</span>
              </div>
              <textarea
                className="textarea"
                placeholder={"Paste all your info here. Include:\n- Full name, email, phone, location\n- Work experience with dates\n- Education (school, degree, year)\n- Skills and certifications\n- Achievements and projects"}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                id="resume-input"
                rows="10"
              />
            </>
          ) : (
            <div
              className="file-drop-area"
              style={{
                border: '2px dashed var(--border-color)',
                padding: '3rem',
                textAlign: 'center',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.02)',
                marginBottom: 'var(--space-md)'
              }}
              onClick={() => document.getElementById('pdf-upload-gen').click()}
            >
              <input
                id="pdf-upload-gen"
                type="file"
                accept="application/pdf"
                onChange={(e) => setUploadFile(e.target.files[0])}
                style={{ display: 'none' }}
              />
              {uploadFile ? (
                <div>
                  <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--color-primary)' }}>{uploadFile.name}</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Click to change file</p>
                </div>
              ) : (
                <div>
                  <p style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-secondary)' }}>Click to upload PDF resume</p>
                  <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>We will extract your info automatically</p>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 'var(--space-md)', display: 'flex', gap: 'var(--space-md)', alignItems: 'center' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleGenerate}
              disabled={loading || (inputType === 'paste' ? !rawText.trim() : !uploadFile)}
              id="generate-resume-btn"
              style={{ flex: 1 }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div className="btn-spinner" />
                  Processing...
                </div>
              ) : (
                inputType === 'upload' ? 'Upload and Generate' : 'Generate Resume'
              )}
            </button>
          </div>
          {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '12px', textAlign: 'center' }}>{error}</p>}
        </div>
      )}

      {step === 'analyzing' && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
          <LoaderDots />
          <h3 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>Analyzing your input...</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Checking for any missing details that could strengthen your resume.</p>
        </div>
      )}

      {step === 'questions' && (
        <div className="card fade-in" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: 0 }}>
              A few more details needed
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '8px 0 0', lineHeight: 1.4 }}>
              Based on what you provided, we need a bit more information to build a complete resume. Please answer the following.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {questions.map((q, idx) => (
              <div key={idx} className="form-group">
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px', display: 'block', fontSize: '0.92rem' }}>
                  {idx + 1}. {q}
                </label>
                <input
                  type="text"
                  placeholder="Type your response here (or leave blank to skip)..."
                  value={answers[q] || ''}
                  onChange={(e) => handleAnswerChange(q, e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => handleGenerateResume(textToProcess, {})}
              style={{ flex: 1 }}
            >
              Skip and Generate
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleGenerateResume(textToProcess, answers)}
              style={{ flex: 1 }}
            >
              Submit and Generate
            </button>
          </div>
        </div>
      )}

      {step === 'generating' && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
          <LoaderDots />
          <h3 style={{ marginTop: 'var(--space-md)', color: 'var(--text-primary)' }}>Building your resume...</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Organizing your experience and formatting the document.</p>
        </div>
      )}

      {step === 'ready' && resume && (
        <div className="card fade-in">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div className="card-title">Your Resume</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary btn-sm" onClick={handleStartNew}>
                Create New Resume
              </button>
              <button className="btn btn-primary btn-sm" onClick={handleDownloadPdf} id="download-resume-pdf-btn">
                Download PDF
              </button>
            </div>
          </div>

          {/* On-screen preview — white paper card */}
          <div style={{
            margin: '0 auto',
            maxWidth: '780px',
            padding: '36px 42px',
            background: '#fff',
            boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
            borderRadius: '6px',
          }}>
            <ResumeDocument resume={resume} />
          </div>

          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={() => document.querySelector('nav button:last-child')?.click()}
            >
              Proceed to Interview Coach
            </button>
          </div>
        </div>
      )}

      {/* Hidden PDF template — exact paper dimensions */}
      {resume && (
        <div
          id="pdf-resume-template"
          style={{
            display: 'none',
            width: '8.5in',
            minHeight: '11in',
            padding: '0.65in 0.75in 0.75in 0.75in',
            background: '#fff',
            boxSizing: 'border-box',
          }}
        >
          <ResumeDocument resume={resume} forPdf={true} />
        </div>
      )}
    </div>
  );
}
