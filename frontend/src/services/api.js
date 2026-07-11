/**
 * API client for the AI Career Agent backend.
 */

const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.warn(`API Error for ${endpoint}: ${err.message}. Falling back to MOCK DATA for demo purposes.`);
    
    // ─── Graceful Degradation / Mock Data Fallbacks ───

    if (endpoint === '/analyze-resume') {
      const body = JSON.parse(options.body || '{}');
      const text = body.raw_text || '';
      const lower = text.toLowerCase();
      const questions = [];

      // Check what's missing and ask SPECIFIC questions based on what's provided
      const hasEmail = /@/.test(text);
      const hasPhone = /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(text);
      const hasName = /^[A-Z][a-z]+\s+[A-Z][a-z]+/m.test(text) || /name[:\s]+\S/i.test(text);

      if (!hasName || !hasEmail || !hasPhone) {
        const missing = [];
        if (!hasName) missing.push('full name');
        if (!hasEmail) missing.push('email address');
        if (!hasPhone) missing.push('phone number');
        questions.push(`Please provide your ${missing.join(', ')}, and your city/state.`);
      }

      const hasEducation = /university|college|degree|diploma|school|gpa|bachelor|master|associate|high school/i.test(text);
      if (!hasEducation) {
        questions.push("What is your highest level of education? Include the school name, degree, and graduation year.");
      }

      // Ask role-specific follow-up questions based on what they mentioned
      if (/chef|cook|culinar|kitchen|restaurant|food/i.test(lower)) {
        if (!/speciali|cuisine|dish|menu/i.test(lower)) {
          questions.push("What types of cuisine or dishes do you specialize in? Do you have any signature dishes or menu development experience?");
        }
        if (!/team|staff|manage|supervis/i.test(lower)) {
          questions.push("How many kitchen staff members have you managed or worked alongside?");
        }
      } else if (/software|developer|engineer|programming|code/i.test(lower)) {
        if (!/project|built|developed|created|deployed/i.test(lower)) {
          questions.push("Can you describe a specific project or application you built? Include the technologies used and the outcome.");
        }
      } else if (/teacher|teaching|education|tutor/i.test(lower)) {
        if (!/grade|subject|student|class size/i.test(lower)) {
          questions.push("What subjects and grade levels do you teach? How many students are in your classes?");
        }
      } else if (/nurse|medical|healthcare|patient/i.test(lower)) {
        if (!/patient|unit|specialt/i.test(lower)) {
          questions.push("What type of unit or specialty do you work in? How many patients do you typically care for per shift?");
        }
      } else if (/driver|uber|lyft|transport|deliver/i.test(lower)) {
        if (!/trip|mile|rating|route/i.test(lower)) {
          questions.push("How many trips have you completed? What is your driver rating? Do you have any notable route optimization or safety achievements?");
        }
      } else {
        // Generic role - ask about specifics of what they mentioned
        const wordCount = text.trim().split(/\s+/).length;
        if (wordCount < 80) {
          questions.push("Can you provide more specific details about your daily responsibilities, key achievements, and any measurable results (e.g., revenue growth, team size, efficiency improvements)?");
        }
      }

      const hasSkills = /skill|proficien|certif|technology|tool|language|framework/i.test(text);
      if (!hasSkills) {
        questions.push("What technical skills, tools, certifications, or software are you proficient in?");
      }

      if (questions.length > 0) {
        return { has_missing_info: true, questions };
      }
      return { has_missing_info: false, questions: [] };
    }

    if (endpoint === '/generate-resume') {
      const body = JSON.parse(options.body || '{}');
      const text = body.raw_text || '';
      const answers = body.answers || {};
      const answerValues = Object.values(answers).filter(Boolean);
      const answerText = answerValues.join('\n');
      const combined = text + '\n' + answerText;
      const combinedLower = combined.toLowerCase();

      // ── Extract name ──
      let name = 'Your Name';
      // Try "Name: John Doe" pattern
      const nameColonMatch = combined.match(/(?:name|full name)[:\s]+([A-Z][a-zA-Z'-]+\s+[A-Z][a-zA-Z'-]+)/i);
      if (nameColonMatch) {
        name = nameColonMatch[1].trim();
      } else {
        // Try first "Firstname Lastname" pattern in answers first, then text
        for (const src of [...answerValues, text]) {
          const m = src.match(/\b([A-Z][a-z]{1,15})\s+([A-Z][a-z]{1,20})\b/);
          if (m && !['The', 'In', 'At', 'My', 'An', 'As', 'To', 'On', 'It', 'We', 'He', 'Of'].includes(m[1])) {
            name = m[0];
            break;
          }
        }
      }

      // ── Extract email ──
      let email = '';
      const emailMatch = combined.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) email = emailMatch[0];

      // ── Extract phone ──
      let phone = '';
      const phoneMatch = combined.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
      if (phoneMatch) phone = phoneMatch[0];

      // ── Extract location ──
      let location = '';
      // Look for explicit "in City, ST" or "City, ST" patterns
      const locMatch = combined.match(/(?:in|from|at|location[:\s]+)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*[A-Z]{2})\b/i);
      if (locMatch) {
        location = locMatch[1].trim();
      } else {
        // Match standalone "City, ST" (with strict 1-2 word city name)
        const stateMatch = combined.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*[A-Z]{2})\b/);
        if (stateMatch) location = stateMatch[1].trim();
      }

      // ── Extract education ──
      const education = [];
      const eduMatch = combined.match(/(?:university|college|school|institute)[:\s]*([^\n.]+)/i);
      const degreeMatch = combined.match(/(?:bachelor|master|associate|diploma|degree|b\.s\.|m\.s\.|b\.a\.|m\.a\.)[:\s]*([^\n.]*)/i);
      const gpaMatch = combined.match(/(?:gpa)[:\s]*(\d+\.?\d*)/i);
      const yearMatch = combined.match(/(?:graduat|class of|20\d{2}|19\d{2})/i);
      education.push({
        school: eduMatch ? eduMatch[1].trim().slice(0, 80) : '',
        degree: degreeMatch ? degreeMatch[0].trim().slice(0, 80) : '',
        year: yearMatch ? yearMatch[0].replace(/.*?((?:19|20)\d{2}).*/, '$1') : '',
        gpa: gpaMatch ? gpaMatch[1] : ''
      });

      // ── Detect role ──
      const rolePatterns = [
        { pattern: /chef|cook|culinar|kitchen|restaurant|food prep|bak/i, role: 'Chef', company: 'Restaurant', defaultSkills: ['Culinary Arts', 'Menu Planning', 'Food Safety', 'Kitchen Management', 'Inventory Control', 'Team Leadership'] },
        { pattern: /driver|uber|lyft|rideshare|transport|deliver/i, role: 'Driver', company: 'Transportation Company', defaultSkills: ['Customer Service', 'Navigation', 'Time Management', 'Safe Driving', 'Route Optimization'] },
        { pattern: /software|developer|engineer|programming|code|web dev/i, role: 'Software Engineer', company: 'Tech Company', defaultSkills: ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Git'] },
        { pattern: /teacher|teaching|education|tutor|instruct|professor/i, role: 'Teacher', company: 'School', defaultSkills: ['Lesson Planning', 'Classroom Management', 'Curriculum Development', 'Student Assessment'] },
        { pattern: /nurse|nurs|medical|healthcare|patient|clinic/i, role: 'Nurse', company: 'Healthcare Facility', defaultSkills: ['Patient Care', 'Clinical Documentation', 'Emergency Response', 'Pharmacology'] },
        { pattern: /market|advertis|social media|seo|brand|content/i, role: 'Marketing Professional', company: 'Marketing Agency', defaultSkills: ['SEO', 'Content Strategy', 'Social Media', 'Analytics', 'Campaign Management'] },
        { pattern: /retail|sales|cashier|store|shop|customer/i, role: 'Sales Associate', company: 'Retail', defaultSkills: ['Customer Service', 'Point of Sale', 'Merchandising', 'Inventory Management'] },
        { pattern: /construct|build|foreman|carpenter|plumb|electri/i, role: 'Construction Professional', company: 'Construction Co.', defaultSkills: ['Blueprint Reading', 'Safety Compliance', 'Power Tools', 'Project Coordination'] },
        { pattern: /design|graphic|ui|ux|figma|photoshop/i, role: 'Designer', company: 'Design Studio', defaultSkills: ['UI/UX Design', 'Figma', 'Adobe Creative Suite', 'Prototyping', 'Visual Design'] },
        { pattern: /account|financ|book ?keep|tax|audit/i, role: 'Accountant', company: 'Accounting Firm', defaultSkills: ['Financial Analysis', 'Bookkeeping', 'Tax Preparation', 'Excel', 'QuickBooks'] },
      ];
      let matched = rolePatterns.find(r => r.pattern.test(combinedLower));
      if (!matched) {
        matched = { role: 'Professional', company: 'Company', defaultSkills: ['Communication', 'Problem Solving', 'Time Management', 'Teamwork', 'Organization'] };
      }

      // ── Extract skills from text ──
      const extractedSkills = [];
      const skillKeywords = combined.match(/(?:skills?|proficient|experienced|knowledge|tools?|technologies|certified)[:\s]+([^\n]+)/gi);
      if (skillKeywords) {
        skillKeywords.forEach(line => {
          const afterColon = line.replace(/^[^:]+:\s*/, '');
          afterColon.split(/[,;|]/).forEach(s => {
            const trimmed = s.trim();
            if (trimmed.length > 1 && trimmed.length < 40) extractedSkills.push(trimmed);
          });
        });
      }
      const allSkills = extractedSkills.length > 0
        ? [...new Set([...extractedSkills, ...matched.defaultSkills])]
        : matched.defaultSkills;

      // ── Extract achievements ──
      const achievements = [];
      const achMatch = combined.match(/(?:achieve|award|recogni|honor|accomplish)[:\s]*([^\n]+)/gi);
      if (achMatch) {
        achMatch.forEach(line => {
          const clean = line.replace(/^[^:]+:\s*/, '').trim();
          if (clean.length > 3) achievements.push(clean);
        });
      }

      // ── Extract certifications ──
      const certifications = [];
      const certMatch = combined.match(/(?:certif|licens|credential)[:\s]*([^\n]+)/gi);
      if (certMatch) {
        certMatch.forEach(line => {
          const clean = line.replace(/^[^:]+:\s*/, '').trim();
          if (clean.length > 3) certifications.push(clean);
        });
      }

      // ── Build multiple experiences & correct grammar ──
      const experience = [];
      let currentExp = null;

      const createNewExp = (title, company, duration) => ({
        title: title || matched.role,
        company: company || matched.company,
        duration: duration || 'Recent',
        descParts: []
      });

      // Split on sentence boundaries, but NOT on periods inside emails, numbers, etc.
      const safeText = text.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (m) => m.replace(/\./g, '\x00'));
      const rawSentences = safeText.split(/\.\s+|\n/).map(s => s.replace(/\x00/g, '.').trim()).filter(s => s.length > 10);

      const skipPatterns = /^(I am|my name|my email|my phone|name:|email:|phone:)/i;

      const processSentence = (s) => {
        let clean = s.replace(/^[•\-*]\s*/, '').trim();
        if (clean.length < 10 || skipPatterns.test(clean)) return;

        // Grammar correction: Remove "I ", "I have ", "I successfully " and capitalize
        clean = clean.replace(/^(I |I have |I had |I successfully |I was responsible for |Responsible for )/i, '');
        clean = clean.charAt(0).toUpperCase() + clean.slice(1);

        let isNewExp = false;
        let pTitle = '', pCompany = '', pDuration = '';

        // Check if it's a header line (e.g., "Software Engineer | Google | 2020-2023")
        const headerMatch = clean.match(/^([A-Za-z\s]+)(?:\||-|—|at)([^|0-9]+)(?:\||-|—)((?:19|20)\d{2}.*)$/);
        
        // Check if conversational transition (e.g., "worked as a Line Cook")
        const convRoleMatch = clean.match(/(?:worked as|promoted to|started as|moved to|position of)(?: a| an)? ([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,3})/);
        const convCompMatch = clean.match(/(?:at|for) ([A-Z][a-z]+(?:\s[A-Z][a-z]+){0,3})/);
        const convYearMatch = clean.match(/\b((?:19|20)\d{2})\b/);

        if (headerMatch) {
          isNewExp = true;
          pTitle = headerMatch[1].trim();
          pCompany = headerMatch[2].replace(/[-|—]/g, '').trim();
          pDuration = headerMatch[3].trim();
        } else if (convRoleMatch && !clean.toLowerCase().includes('degree')) {
          isNewExp = true;
          pTitle = convRoleMatch[1].trim();
          if (convCompMatch) pCompany = convCompMatch[1].trim();
          if (convYearMatch) pDuration = convYearMatch[1] + ' - Present';
        }

        if (isNewExp) {
          if (currentExp && currentExp.descParts.length > 0) {
            experience.push(currentExp);
          }
          currentExp = createNewExp(pTitle, pCompany, pDuration);
          if (!headerMatch) currentExp.descParts.push('• ' + clean);
        } else {
          if (!currentExp) {
            const fallbackDur = combined.match(/((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}\s*[-–to]+\s*(?:present|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}))/i);
            currentExp = createNewExp(matched.role, matched.company, fallbackDur ? fallbackDur[1] : 'Recent');
          }
          // Avoid duplicates
          if (!currentExp.descParts.some(d => d.includes(clean))) {
             currentExp.descParts.push('• ' + clean);
          }
        }
      };

      rawSentences.forEach(processSentence);

      answerValues.forEach(ans => {
        const safeAns = ans.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (m) => m.replace(/\./g, '\x00'));
        safeAns.split(/\.\s+|\n/).map(s => s.replace(/\x00/g, '.').trim()).filter(s => s.length > 10).forEach(processSentence);
      });

      if (currentExp && currentExp.descParts.length > 0) {
        experience.push(currentExp);
      }

      if (experience.length === 0) {
        experience.push(createNewExp(matched.role, matched.company, 'Recent'));
        experience[0].descParts.push(`• Experienced ${matched.role} with a strong professional background`);
      }

      // Final format mapping
      const formattedExperience = experience.map(exp => ({
        title: exp.title,
        company: exp.company,
        duration: exp.duration,
        description: exp.descParts.join('\n')
      }));

      // Build a clean summary from the matched role and key facts
      const summaryParts = [`Experienced ${matched.role}`];
      const yearsMatch = combined.match(/(\d+)\s*years?/i);
      if (yearsMatch) summaryParts[0] += ` with ${yearsMatch[1]}+ years of experience`;
      if (allSkills.length >= 3) summaryParts.push(`Proficient in ${allSkills.slice(0, 4).join(', ')}`);
      if (achievements.length > 0) summaryParts.push(achievements[0]);
      const summary = summaryParts.join('. ') + '.';

      return {
        resume: {
          name,
          email: email || 'not-provided@example.com',
          phone: phone || '',
          location: location || '',
          summary,
          skills: allSkills.slice(0, 10),
          experience: formattedExperience,
          projects: [],
          education,
          achievements,
          certifications
        },
        formatted_text: `${name}\n${email}\n\n${matched.role}\n\n${text}`
      };
    }

    if (endpoint === '/generate-linkedin') {
      const body = JSON.parse(options.body || '{}');
      const text = body.raw_text || '';
      let resumeCache = null;
      try {
        const saved = localStorage.getItem('ai_career_agent_resume');
        if (saved) resumeCache = JSON.parse(saved);
      } catch (e) { /* ignore */ }

      const resume = resumeCache?.resume;
      if (resume) {
        return {
          linkedin: {
            headline: resume.experience?.[0]
              ? `${resume.experience[0].title} | ${resume.skills?.slice(0, 3).join(' | ') || 'Professional'}`
              : `${resume.skills?.[0] || 'Professional'} | Open to Opportunities`,
            about: resume.summary || `Experienced professional seeking new opportunities. ${text.slice(0, 300)}`,
            experience: (resume.experience || []).map(exp => ({
              title: exp.title,
              company: exp.company,
              duration: exp.duration,
              description: exp.description
            })),
            skills: resume.skills || [],
            certifications: resume.certifications || [],
            networking_message: `Hi, I'm ${resume.name || 'a professional'}. I'd love to connect and explore opportunities.`
          }
        };
      }
      return {
        linkedin: {
          headline: 'Professional | Open to Opportunities',
          about: text.slice(0, 500) || 'Experienced professional looking for new opportunities.',
          experience: [],
          skills: ['Communication', 'Problem Solving', 'Teamwork'],
          certifications: [],
          networking_message: "Hi, I'd love to connect and discuss opportunities."
        }
      };
    }

    if (endpoint === '/match-jobs') {
      const body = JSON.parse(options.body || '{}');
      const skills = body.skills || [];
      const summary = body.summary || '';
      const role = body.experience?.[0]?.title || 'Professional';

      return {
        matches: [
          {
            title: `${role} (Entry Level)`,
            company: 'Local Business',
            description: `Entry-level ${role} position. Looking for candidates with relevant experience and a strong work ethic. Responsibilities include daily operations, customer interaction, and quality assurance.`,
            match_percentage: 88,
            url: `https://www.indeed.com/jobs?q=${encodeURIComponent(role)}`,
            matched_skills: skills.slice(0, 3),
            missing_skills: ['Advanced Management', 'Budget Planning']
          },
          {
            title: `Senior ${role}`,
            company: 'Regional Company',
            description: `Senior ${role} role with leadership responsibilities. Must have demonstrated track record of excellence and ability to mentor junior team members. Competitive salary and benefits.`,
            match_percentage: 72,
            url: `https://www.indeed.com/jobs?q=${encodeURIComponent('Senior ' + role)}`,
            matched_skills: skills.slice(0, 4),
            missing_skills: ['5+ years experience', 'Team Leadership']
          },
          {
            title: `${role} - Part Time`,
            company: 'Community Organization',
            description: `Flexible part-time ${role} position. Great opportunity for someone looking to build experience while maintaining work-life balance.`,
            match_percentage: 65,
            url: `https://www.indeed.com/jobs?q=${encodeURIComponent(role + ' part time')}`,
            matched_skills: skills.slice(0, 2),
            missing_skills: ['Flexible Schedule Availability']
          }
        ]
      };
    }

    if (endpoint === '/score-resume') {
      const body = JSON.parse(options.body || '{}');
      const resume = body.resume || {};
      let score = 50;

      // Score based on completeness
      if (resume.name && resume.name !== 'Your Name') score += 5;
      if (resume.email && !resume.email.includes('not-provided')) score += 5;
      if (resume.phone) score += 3;
      if (resume.location) score += 3;
      if (resume.summary && resume.summary.length > 50) score += 5;
      if (resume.experience?.length > 0) score += 8;
      if (resume.experience?.[0]?.description?.length > 100) score += 5;
      if (resume.skills?.length >= 3) score += 5;
      if (resume.skills?.length >= 6) score += 3;
      if (resume.education?.length > 0 && resume.education[0].school) score += 5;
      if (resume.certifications?.length > 0) score += 3;
      score = Math.min(score, 100);

      const strengths = [];
      const weaknesses = [];
      const suggestions = [];

      if (resume.experience?.length > 0) strengths.push('Includes professional experience');
      if (resume.skills?.length >= 5) strengths.push('Good variety of skills listed');
      if (resume.summary?.length > 80) strengths.push('Detailed professional summary');
      if (resume.education?.[0]?.school) strengths.push('Education section is filled in');

      if (!resume.email || resume.email.includes('not-provided')) weaknesses.push('Missing email address');
      if (!resume.phone) weaknesses.push('Missing phone number');
      if (!resume.location) weaknesses.push('Missing location');
      if (resume.skills?.length < 5) weaknesses.push('Could list more skills');
      if (!resume.certifications?.length) weaknesses.push('No certifications listed');

      suggestions.push('Add quantifiable metrics to your experience descriptions (e.g., "increased sales by 20%")');
      suggestions.push('Include action verbs at the start of each bullet point');
      if (!resume.projects?.length) suggestions.push('Consider adding a projects section');

      return { score, strengths, weaknesses, suggestions };
    }

    if (endpoint === '/interview/question') {
      const body = JSON.parse(options.body || '{}');
      const qNum = body.question_number || 1;
      const role = body.role || 'professional';
      const skill = body.skills?.[0] || 'core';
      
      const questions = [
        `Could you walk me through your background and why you feel you're a strong fit for this ${role} position?`,
        `Can you describe a time when you used your ${skill} skills to solve a difficult problem?`,
        `What is the most challenging project you've worked on recently, and how did you overcome the obstacles?`,
        `How do you handle disagreements or conflicting priorities within a team?`,
        `Where do you see your career heading in the next few years, and how does this role align with that vision?`
      ];

      return {
        question: `(Mock Mode) ${questions[(qNum - 1) % questions.length]}`,
        question_number: qNum,
        total_questions: 5
      };
    }
    if (endpoint === '/interview/analyze') {
      const body = JSON.parse(options.body || '{}');
      const ans = (body.transcription || '').toLowerCase();
      
      if (ans.includes('skip') || ans.length < 5) {
        return {
          confidence_score: 0,
          answer_grade: "N/A",
          summary_of_answer: "You skipped this question.",
          what_interviewer_was_looking_for: "The interviewer wanted to hear a specific, structured example.",
          suggested_answer: "Always try to provide at least a brief answer using the STAR method even if you are unsure.",
          improvement_areas: "Do not skip questions in a real interview.",
          interviewer_response: "No problem, let's move on to the next question.",
          tone_feedback: "N/A",
          face_feedback: "N/A",
          speech_feedback: "N/A",
          strengths: [],
          weaknesses: ["Skipped question"],
          communication_tips: ["Attempt every question"],
          filler_word_count: 0,
          filler_words_found: []
        };
      }

      const lengthScore = Math.min(100, Math.max(40, ans.length / 2));
      const hasStar = ans.includes('situation') || ans.includes('task') || ans.includes('result') || ans.length > 100;
      
      return {
        confidence_score: Math.floor(lengthScore),
        answer_grade: lengthScore > 80 ? "A-" : (lengthScore > 60 ? "B" : "C"),
        summary_of_answer: "You provided an overview of your approach to the problem.",
        what_interviewer_was_looking_for: "The interviewer wanted to hear specific metrics and a clear STAR method structure.",
        suggested_answer: "A better answer would be: 'In my previous role, I encountered X. I implemented Y, which resulted in a 20% increase in Z...'",
        improvement_areas: hasStar ? "Your structure is good, but try to add more quantitative metrics." : "Try to use the STAR (Situation, Task, Action, Result) method to structure your response.",
        interviewer_response: "That makes a lot of sense, thanks for sharing. Let's move on to the next question.",
        tone_feedback: "Your tone was professional and confident.",
        face_feedback: "Excellent eye contact.",
        speech_feedback: "Good pacing, but try to reduce the use of filler words.",
        strengths: ["Clear communication", "Professional tone"],
        weaknesses: ["Lacked specific metrics"],
        communication_tips: ["Use the STAR method", "Quantify your achievements"],
        filler_word_count: 2,
        filler_words_found: ["um", "like"]
      };
    }
    if (endpoint === '/interview/coding-challenge') {
      return {
        problem_title: "Median of Two Sorted Arrays (Mock)",
        problem_description: "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.",
        difficulty: "Hard",
        examples: [{ input: "nums1 = [1,3], nums2 = [2]", output: "2.00000", explanation: "merged array = [1,2,3]" }],
        constraints: ["nums1.length == m"],
        hints: ["Think about binary search."]
      };
    }
    if (endpoint === '/interview/analyze-coding') {
      return {
        confidence_score: 90,
        problem_solving_feedback: "You demonstrated a strong understanding of the optimal O(log(m+n)) approach.",
        communication_feedback: "You explained your thought process clearly while coding.",
        code_quality_feedback: "Your code is clean and handles edge cases well.",
        tone_feedback: "Very confident and professional.",
        strengths: ["Optimal algorithmic thinking", "Clear verbalization"],
        weaknesses: ["Could have written test cases faster"],
        tips: ["Practice writing edge-case tests first before implementing the core logic."]
      };
    }
    if (endpoint === '/interview/summary') {
      const body = JSON.parse(options.body || '{}');
      const history = body.interview_history || [];
      const skippedCount = history.filter(h => h.transcription?.toLowerCase().includes('skip') || !h.transcription || h.transcription.length < 5).length;
      
      let overallScore = 88 - (skippedCount * 15);
      if (overallScore < 0) overallScore = 0;

      return {
        overall_score: overallScore,
        overall_strengths: ["Technical knowledge", "Professional demeanor"],
        overall_weaknesses: skippedCount > 0 ? [`You skipped or gave empty answers to ${skippedCount} question(s)`] : ["Needs more quantifiable metrics in behavioral answers"],
        key_takeaways: [
          "Continue practicing the STAR method.", 
          "Integrate concrete business impacts into behavioral examples.",
          skippedCount > 0 ? "Make sure to attempt every question in the future." : "Great job completing all questions!"
        ],
        next_steps: ["Review system design", "Practice mock interviews with peers"],
        summary_message: skippedCount > 0 ? "You skipped some questions. Remember to always provide an answer, even a brief one." : "You performed exceptionally well, demonstrating strong technical and communication skills."
      };
    }
    
    // Re-throw if no mock available
    throw err;
  }
}

export const api = {
  // Health check
  health: () => request('/health'),

  // Resume analysis for missing details
  analyzeResume: (rawText) =>
    request('/analyze-resume', {
      method: 'POST',
      body: JSON.stringify({ raw_text: rawText }),
    }),

  // Resume generation (supporting clarifying answers)
  generateResume: (rawText, answers = null) =>
    request('/generate-resume', {
      method: 'POST',
      body: JSON.stringify({ raw_text: rawText, answers }),
    }),

  // LinkedIn profile generation
  generateLinkedIn: (rawText) =>
    request('/generate-linkedin', {
      method: 'POST',
      body: JSON.stringify({ raw_text: rawText }),
    }),

  // LinkedIn automated profile update (MCP)
  automateLinkedIn: (rawText) =>
    request('/automate-linkedin', {
      method: 'POST',
      body: JSON.stringify({ raw_text: rawText }),
    }),

  // Job matching
  matchJobs: (profile) =>
    request('/match-jobs', {
      method: 'POST',
      body: JSON.stringify(profile),
    }),

  // Resume scoring
  scoreResume: (resume) =>
    request('/score-resume', {
      method: 'POST',
      body: JSON.stringify({ resume }),
    }),

  // Interview question
  getInterviewQuestion: (role, company, skills, questionNumber, summary = "", experience = []) =>
    request('/interview/question', {
      method: 'POST',
      body: JSON.stringify({
        role,
        company,
        skills,
        question_number: questionNumber,
        summary,
        experience,
      }),
    }),

  // Interview analysis
  analyzeInterview: (data) =>
    request('/interview/analyze', {
      method: 'POST',
      body: JSON.stringify({
        question: data.question,
        transcription: data.transcription,
        face_detection_ratio: data.faceDetectionRatio,
        head_stability: data.headStability,
        speech_duration_seconds: data.speechDuration,
        interview_mode: data.interviewMode || 'video',
      }),
    }),

  // Interview conversational reply
  replyToInterviewer: (currentQuestion, userSpeech) =>
    request('/interview/reply', {
      method: 'POST',
      body: JSON.stringify({
        current_question: currentQuestion,
        user_speech: userSpeech,
      }),
    }),

  // Interview summary
  summarizeInterview: (history) =>
    request('/interview/summary', {
      method: 'POST',
      body: JSON.stringify({ history }),
    }),

  // Coding challenge
  getCodingChallenge: (role, company, skills, summary = "", experience = []) =>
    request('/interview/coding-challenge', {
      method: 'POST',
      body: JSON.stringify({ role, company, skills, summary, experience }),
    }),

  // Coding analysis
  analyzeCoding: (data) =>
    request('/interview/analyze-coding', {
      method: 'POST',
      body: JSON.stringify({
        problem_title: data.problemTitle,
        problem_description: data.problemDescription,
        transcription: data.transcription,
        speech_duration_seconds: data.speechDuration,
        code_shared: data.codeShared,
        screenshot: data.screenshot || null,
      }),
    }),

  // Text-to-speech
  textToSpeech: (text) =>
    request('/tts', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  // Speech-to-text
  speechToText: async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    
    const response = await fetch(`${BASE_URL}/stt`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return response.json();
  },

  // PDF Extraction
  extractPdf: async (pdfFile) => {
    const formData = new FormData();
    formData.append('file', pdfFile);

    const response = await fetch(`${BASE_URL}/extract-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
  },

  // ─── A2A Protocol ──────────────────────────────────────────────────────

  // A2A Agent discovery
  getA2AAgents: () => request('/a2a/agents'),

  // A2A Resume → Interview handoff
  a2aHandoff: (rawText) =>
    request('/a2a/handoff', {
      method: 'POST',
      body: JSON.stringify({ raw_text: rawText }),
    }),
};
