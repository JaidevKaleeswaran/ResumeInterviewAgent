import React, { useState } from 'react';
import Navbar from './components/Navbar';
import ResumeGenerator from './components/ResumeGenerator';
import LinkedInProfile from './components/LinkedInProfile';
import JobMatches from './components/JobMatches';
import InterviewCoach from './components/InterviewCoach';
import LandingPage from './components/LandingPage';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  // Shared state across tabs with localStorage persistence
  const [resumeData, setResumeDataState] = useState(() => {
    try {
      const saved = localStorage.getItem('ai_career_agent_resume');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [linkedInInput, setLinkedInInputState] = useState(() => {
    return localStorage.getItem('ai_career_agent_linkedin') || '';
  });

  const setResumeData = (data) => {
    setResumeDataState(data);
    if (data) {
      localStorage.setItem('ai_career_agent_resume', JSON.stringify(data));
    } else {
      localStorage.removeItem('ai_career_agent_resume');
    }
  };

  const setLinkedInInput = (input) => {
    setLinkedInInputState(input);
    if (input) {
      localStorage.setItem('ai_career_agent_linkedin', input);
    } else {
      localStorage.removeItem('ai_career_agent_linkedin');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <LandingPage onSelectTab={setActiveTab} />;
      case 'resume':
        return (
          <ResumeGenerator
            resumeData={resumeData}
            setResumeData={setResumeData}
            setLinkedInInput={setLinkedInInput}
          />
        );
      case 'linkedin':
        return <LinkedInProfile linkedInInput={linkedInInput} />;
      case 'jobs':
        return <JobMatches resumeData={resumeData} />;
      case 'interview':
        return <InterviewCoach resumeData={resumeData} setResumeData={setResumeData} setActiveTab={setActiveTab} />;
      default:
        return null;
    }
  };

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="main-content">
        <div className="content-wrapper">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
