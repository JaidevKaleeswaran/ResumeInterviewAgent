import React, { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { useApi } from '../hooks/useApi';
import { useScreenRecorder } from '../hooks/useScreenRecorder';
import { useLiveTranscription } from '../hooks/useLiveTranscription';
import { LoaderDots } from './ui/Loader';
import ScoreRing from './ui/ScoreRing';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const ROLES = [
  'Software Engineer',
  'Data Scientist',
  'Machine Learning Engineer',
  'Product Manager',
  'Frontend Developer',
  'Backend Engineer',
  'Full Stack Developer',
  'UX/UI Designer',
  'DevOps Engineer',
  'Mobile Developer',
  'Construction Foreman',
  'Marketing Manager',
  'Nurse',
  'Teacher',
  'Customer Service Representative',
];

export default function InterviewCoach({ resumeData, setResumeData, setActiveTab }) {
  // Interview state machine: 'setup' | 'active' | 'answering' | 'analyzing' | 'results'
  const [phase, setPhase] = useState('setup');
  const [role, setRole] = useState('');
  const [skills, setSkills] = useState([]);
  const [interviewMode, setInterviewMode] = useState('video'); // 'video' or 'text'
  const [textAnswer, setTextAnswer] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Update from resume only when resumeData changes
  useEffect(() => {
    if (resumeData?.resume) {
      if (resumeData.resume.skills && resumeData.resume.skills.length > 0) {
        setSkills(resumeData.resume.skills);
      }
    }
  }, [resumeData]);

  // Fallback map for skills when role changes manually
  useEffect(() => {
    const skillMap = {
      'Software Engineer': ['React', 'Node.js', 'Python', 'AWS'],
      'Data Scientist': ['Python', 'R', 'SQL', 'Machine Learning'],
      'Product Manager': ['Product Strategy', 'Agile', 'Roadmapping', 'User Research'],
      'UX/UI Designer': ['Figma', 'Prototyping', 'User Testing', 'Visual Design'],
      'Construction Foreman': ['Project Management', 'Safety Compliance', 'Blueprint Reading', 'Scheduling'],
      'Marketing Manager': ['SEO', 'Content Strategy', 'Social Media', 'Analytics'],
      'Nurse': ['Patient Care', 'Emergency Response', 'Clinical Documentation', 'Pharmacology'],
      'Teacher': ['Lesson Planning', 'Classroom Management', 'Curriculum Development', 'Student Assessment'],
      'Customer Service Representative': ['Communication', 'Problem Solving', 'CRM Tools', 'Conflict Resolution'],
    };
    if (skillMap[role]) {
      setSkills(skillMap[role]);
    }
  }, [role]);

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionStates, setQuestionStates] = useState({});
  const [showTips, setShowTips] = useState(false);
  const [showDetailedEval, setShowDetailedEval] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [feedback, setFeedback] = useState(null);
  const [interviewHistory, setInterviewHistory] = useState([]);
  const [finalSummary, setFinalSummary] = useState(null);
  const [timer, setTimer] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);

  // Face detection metrics
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceFrames, setFaceFrames] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [faceBox, setFaceBox] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [showEndPopup, setShowEndPopup] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const faceDetectionRef = useRef(null);
  const canvasRef = useRef(null);

  // Hooks
  const { loading, error, execute } = useApi();
  const {
    transcription, setTranscription,
    status: sttStatus, error: sttError, audioLevel,
    startTranscription, stopTranscription,
  } = useLiveTranscription();
  const {
    isSharing: isScreenSharing,
    isRecording: isScreenRecording,
    recordingBlob: screenRecordingBlob,
    error: screenError,
    startScreenShare,
    startRecording: startScreenRecording,
    stopRecording: stopScreenRecording,
    stopScreenShare,
  } = useScreenRecorder();

  // Coding challenge state
  const [codingChallenge, setCodingChallenge] = useState(null);
  const [codingFeedback, setCodingFeedback] = useState(null);
  const [codingVideoUrl, setCodingVideoUrl] = useState(null);
  const screenPreviewRef = useRef(null);
  const codingUrgeTimerRef = useRef(null);

  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const extracted = await execute(() => api.extractPdf(file));
      const parsed = await execute(() => api.generateResume(extracted.text));
      if (setResumeData) setResumeData(parsed);
    } catch (err) {
      console.error(err);
      alert('Failed to parse resume PDF. Please use the Generate Resume option instead.');
    }
  };

  const renderCircularProgress = (score, color) => {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <svg width="132" height="132" style={{ transform: 'rotate(-90deg)', margin: '0' }}>
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="11"
        />
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth="11"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
        <text
          x="66"
          y="76"
          fill="var(--text-primary)"
          fontSize="30"
          fontWeight="bold"
          textAnchor="middle"
          style={{ transform: 'rotate(90deg)', transformOrigin: '66px 66px' }}
        >
          {score}
        </text>
      </svg>
    );
  };

  const renderCircularProgressWithPercent = (score, color) => {
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <svg width="132" height="132" style={{ transform: 'rotate(-90deg)', margin: '0' }}>
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="transparent"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="11"
        />
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth="11"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
        <text
          x="66"
          y="74"
          fill="var(--text-primary)"
          fontSize="24"
          fontWeight="bold"
          textAnchor="middle"
          style={{ transform: 'rotate(90deg)', transformOrigin: '66px 66px' }}
        >
          {score}%
        </text>
      </svg>
    );
  };



  // ─── Camera ──────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 360 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      startFaceDetection();
    } catch (err) {
      console.error('Camera access denied:', err);
      alert('Camera access is required for the interview coach. Please allow camera access and try again.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    if (faceDetectionRef.current) {
      cancelAnimationFrame(faceDetectionRef.current);
    }
  }, []);

  // ─── High-Fidelity Eye & Face Tracking (YCbCr + Luminance-Minima) ──────
  const startFaceDetection = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext('2d');
    canvasRef.current = canvas;

    let frames = 0;
    let detected = 0;

    const detect = () => {
      if (!videoRef.current || !streamRef.current) return;

      try {
        ctx.drawImage(videoRef.current, 0, 0, 160, 90);
        const imageData = ctx.getImageData(0, 0, 160, 90);
        const data = imageData.data;

        // 1. Locate all skin pixels using robust YCbCr lighting-invariant color space
        let skinPixels = 0;
        let minX = 160, maxX = 0, minY = 90, maxY = 0;

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // Convert RGB to YCbCr
          const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
          const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
          // Skin chroma threshold range (captures all skin tones invariant of ambient light temperature)
          if (cr >= 130 && cr <= 180 && cb >= 75 && cb <= 135) {
            skinPixels++;
            const pIdx = i / 4;
            const px = pIdx % 160;
            const py = Math.floor(pIdx / 160);
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
          }
        }

        const totalSampled = data.length / 16;
        const skinRatio = skinPixels / totalSampled;
        const hasFace = skinRatio > 0.02 && (maxX - minX) > 12 && (maxY - minY) > 12;

        frames++;

        if (hasFace) {
          detected++;
          const w = maxX - minX;
          const h = maxY - minY;

          // 2. Track Eyes inside the upper-half region of the detected face cluster
          // We search the left and right upper quadrants for local luminance minimums (pupils/eye sockets)
          const eyeMinY = Math.floor(minY + h * 0.22);
          const eyeMaxY = Math.floor(minY + h * 0.52);
          const midX = minX + w * 0.5;

          let leftEyeX = minX + w * 0.25;
          let leftEyeY = minY + h * 0.35;
          let leftMinLuma = 255;

          let rightEyeX = minX + w * 0.75;
          let rightEyeY = minY + h * 0.35;
          let rightMinLuma = 255;

          // Safe horizontal scanning boundaries to filter out ears, hair, or ambient background dark spots
          const leftStart = Math.floor(minX + w * 0.12);
          const leftEnd = Math.floor(midX - w * 0.02);
          const rightStart = Math.floor(midX + w * 0.02);
          const rightEnd = Math.floor(maxX - w * 0.12);

          for (let y = eyeMinY; y <= eyeMaxY; y++) {
            if (y < 0 || y >= 90) continue;
            for (let x = minX; x <= maxX; x++) {
              if (x < 0 || x >= 160) continue;

              if (x >= leftStart && x <= leftEnd) {
                const idx = (y * 160 + x) * 4;
                const r = data[idx], g = data[idx + 1], b = data[idx + 2];
                const luma = 0.299 * r + 0.587 * g + 0.114 * b;
                if (luma < leftMinLuma) {
                  leftMinLuma = luma;
                  leftEyeX = x;
                  leftEyeY = y;
                }
              } else if (x >= rightStart && x <= rightEnd) {
                const idx = (y * 160 + x) * 4;
                const r = data[idx], g = data[idx + 1], b = data[idx + 2];
                const luma = 0.299 * r + 0.587 * g + 0.114 * b;
                if (luma < rightMinLuma) {
                  rightMinLuma = luma;
                  rightEyeX = x;
                  rightEyeY = y;
                }
              }
            }
          }

          // Calculate centroid of the eyes to center our face box perfectly
          const centerX = (leftEyeX + rightEyeX) / 2;
          const centerY = (leftEyeY + rightEyeY) / 2;
          const eyeDist = rightEyeX - leftEyeX;

          // 3. Widescreen Face Encapsulation Box
          // Dynamically scale box size based on eye distance so it gets bigger when close, smaller when far,
          // and perfectly encapsulates the entire head!
          let boxWidthPercent = 38; // Larger standard width to fully encapsulate
          let boxHeightPercent = 50; // Larger standard height to fully encapsulate

          if (eyeDist > 8 && eyeDist < 80) {
            boxWidthPercent = Math.max(34, Math.min(68, (eyeDist / 160) * 100 * 3.0));
            boxHeightPercent = boxWidthPercent * 1.3;
          }

          // Invert X coordinate due to browser horizontal mirroring
          const leftPercent = 100 - ((centerX / 160) * 100) - (boxWidthPercent / 2);
          // Shift box vertical offset down slightly (eyes are in upper part, so shift down to center head)
          const topPercent = ((centerY / 90) * 100) - (boxHeightPercent * 0.35);

          setFaceBox({
            left: Math.max(2, Math.min(98 - boxWidthPercent, leftPercent)),
            top: Math.max(2, Math.min(98 - boxHeightPercent, topPercent)),
            width: boxWidthPercent,
            height: boxHeightPercent,
            leftEye: {
              x: 100 - ((leftEyeX / 160) * 100),
              y: (leftEyeY / 90) * 100
            },
            rightEye: {
              x: 100 - ((rightEyeX / 160) * 100),
              y: (rightEyeY / 90) * 100
            }
          });
        } else {
          setFaceBox(null);
        }

        setFaceDetected(hasFace);
        setTotalFrames(frames);
        setFaceFrames(detected);
      } catch (e) {
        // Canvas security error, ignore
      }

      faceDetectionRef.current = requestAnimationFrame(detect);
    };

    // Wait for video to be ready
    if (videoRef.current) {
      videoRef.current.onloadeddata = () => {
        detect();
      };
      // If already loaded
      if (videoRef.current.readyState >= 2) {
        detect();
      }
    }
  }, []);

  // ─── Timer ───────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    setTimer(0);
    timerRef.current = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Audio meter + speech recognition now handled by useLiveTranscription hook

  // ─── Browser/Backend TTS ─────────────────────────────────────────────────────────
  const speakText = useCallback(async (text) => {
    try {
      const response = await api.textToSpeech(text);
      if (response.audio_base64) {
        const audio = new Audio(`data:audio/mp3;base64,${response.audio_base64}`);
        audio.play();
        return;
      }
    } catch (e) {
      console.warn('Backend TTS failed, falling back to browser TTS', e);
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const handleOpenDetailedEval = () => {
    setShowDetailedEval(true);
    const fb = questionStates[questionNumber]?.feedback;
    if (fb) {
      let text = "Here is your detailed recruiter evaluation. ";
      if (fb.summary_of_answer) {
        text += `Answer Summary: ${fb.summary_of_answer}. `;
      }
      if (fb.what_interviewer_was_looking_for) {
        text += `What the interviewer was looking for: ${fb.what_interviewer_was_looking_for}. `;
      }
      if (fb.suggested_answer) {
        text += `Suggested answer strategy: ${fb.suggested_answer}. `;
      }
      if (fb.improvement_areas) {
        text += `Areas of improvement: ${fb.improvement_areas}. `;
      }
      if (fb.speech_feedback) {
        text += `Vocal style insight: ${fb.speech_feedback}. `;
      }
      if (fb.face_feedback) {
        text += `Visual presence insight: ${fb.face_feedback}. `;
      }

      setTimeout(() => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.95;
          window.speechSynthesis.speak(utterance);
        }
      }, 300);
    }
  };

  const handleCloseDetailedEval = () => {
    setShowDetailedEval(false);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // ─── Interview Flow ──────────────────────────────────────────────────────
  // ─── Interview Flow ──────────────────────────────────────────────────────
  const startInterview = async () => {
    setPhase('active');
    setQuestionNumber(1);
    setInterviewHistory([]);
    setQuestionStates({});
    setFinalSummary(null);
    setFaceFrames(0);
    setTotalFrames(0);

    if (interviewMode === 'video') {
      await startCamera();
    }

    // Get first question
    try {
      const q = await execute(() => api.getInterviewQuestion(role, companyName, skills, 1, resumeData?.resume?.summary, resumeData?.resume?.experience));
      setCurrentQuestion(q);
      setQuestionStates({
        1: {
          question: q,
          transcription: '',
          feedback: null,
          timer: 0,
        }
      });
      if (interviewMode === 'video') {
        speakText(q.question);
      }
    } catch (err) {
      console.error('Failed to get question:', err);
    }
  };

  const startAnswering = async () => {
    setPhase('answering');
    setFaceFrames(0);
    setTotalFrames(0);
    startTimer();
    setTextAnswer(''); // Reset text answer

    if (interviewMode === 'video') {
      // Start live transcription (records + sends to Whisper every 5s)
      try {
        await startTranscription();
      } catch (e) {
        console.warn('Transcription start failed:', e);
      }
    }
  };

  const buildRecruiterParagraph = (fb) => {
    if (!fb) return "";

    const makeConversationalAndDirect = (text) => {
      if (!text) return "";

      let res = text
        .replace(/\b[T|t]he candidate's\b/g, "your")
        .replace(/\b[C|c]andidate's\b/g, "your")
        .replace(/\b[T|t]he candidate\b/g, "you")
        .replace(/\b[C|c]andidate\b/g, "you")
        .replace(/\b[T|t]he user's\b/g, "your")
        .replace(/\b[T|t]he user\b/g, "you")
        .replace(/\b[H|h]e or [S|s]he\b/g, "you")
        .replace(/\b[H|h]is or [H|h]er\b/g, "your");

      const verbReplacements = [
        [/\b[Y|y]ou maintains\b/g, "you maintain"],
        [/\b[Y|y]ou has\b/g, "you have"],
        [/\b[Y|y]ou is\b/g, "you are"],
        [/\b[Y|y]ou shows\b/g, "you show"],
        [/\b[Y|y]ou demonstrates\b/g, "you demonstrate"],
        [/\b[Y|y]ou struggles\b/g, "you struggle"],
        [/\b[Y|y]ou needs\b/g, "you need"],
        [/\b[Y|y]ou uses\b/g, "you use"],
        [/\b[Y|y]ou speaks\b/g, "you speak"],
        [/\b[Y|y]ou delivers\b/g, "you deliver"],
        [/\b[Y|y]ou provides\b/g, "you provide"],
        [/\b[Y|y]ou seems\b/g, "you seem"],
        [/\b[Y|y]ou avoids\b/g, "you avoid"]
      ];

      verbReplacements.forEach(([pattern, repl]) => {
        res = res.replace(pattern, repl);
      });

      return res;
    };

    if (fb.recruiter_paragraph) return makeConversationalAndDirect(fb.recruiter_paragraph);

    const extractSentences = (text) => {
      if (!text) return [];
      return text.trim()
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    };

    const faceSents = extractSentences(fb.face_feedback);
    const speechSents = extractSentences(fb.speech_feedback);
    const improvementSents = extractSentences(fb.improvement_areas);
    const toneSents = extractSentences(fb.tone_feedback);

    const sentences = [];

    // Presence / Eye Contact
    if (faceSents.length > 0) {
      sentences.push(faceSents[0]);
    } else {
      sentences.push("You maintained a professional and steady visual presence during the response.");
    }

    // Communication / Speech
    if (speechSents.length > 0) {
      sentences.push(speechSents[0]);
    } else {
      sentences.push("Your speech patterns were coherent and easy to follow.");
    }

    // Quality / Structure
    if (improvementSents.length >= 2) {
      sentences.push(improvementSents[0]);
      sentences.push(improvementSents[1]);
    } else if (improvementSents.length > 0) {
      sentences.push(improvementSents[0]);
    } else {
      sentences.push("The structure of your response was logical but could benefit from more specific metrics.");
    }

    // Tone / Alignment
    if (toneSents.length > 0) {
      sentences.push(toneSents[0]);
    } else {
      sentences.push("Overall, your vocabulary and tone successfully aligned with the professional expectations of the role.");
    }

    let finalSents = sentences.slice(0, 5);
    while (finalSents.length < 4) {
      finalSents.push("This combination of visual presence and structured explanation shows your strong foundational interview capabilities.");
    }

    const fullParagraph = finalSents.map(s => {
      let cleaned = s;
      if (!/[.!?]$/.test(cleaned)) {
        cleaned += ".";
      }
      return cleaned;
    }).join(" ");

    return makeConversationalAndDirect(fullParagraph);
  };

  const speakFeedbackSequentially = (fb) => {
    if (!fb) return;
    if (!('speechSynthesis' in window)) return;

    // Stop any active speaking
    window.speechSynthesis.cancel();

    const paragraph = fb.recruiter_paragraph || buildRecruiterParagraph(fb);

    const utterance = new SpeechSynthesisUtterance(paragraph);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    window.speechSynthesis.speak(utterance);
  };

  const submitAnswer = async () => {
    setPhase('analyzing');
    stopTimer();

    let finalTranscription = textAnswer;
    let faceRatio = 1; // Default to 1 for text mode so it doesn't complain about eye contact

    if (interviewMode === 'video') {
      // Stop transcription — this flushes remaining audio to Whisper
      const { text: sttResult } = await stopTranscription();
      finalTranscription = sttResult;
      faceRatio = totalFrames > 0 ? faceFrames / totalFrames : 0;
    }

    try {
      const result = await execute(() =>
        api.analyzeInterview({
          question: currentQuestion?.question || '',
          transcription: finalTranscription || 'No answer provided',
          faceDetectionRatio: faceRatio,
          headStability: interviewMode === 'video' ? Math.min(faceRatio * 1.1, 1) : 1,
          speechDuration: timer,
          interviewMode: interviewMode,
        })
      );

      const presScore = interviewMode === 'video' ? Math.round(faceRatio * 100) : 100;
      const commScore = Math.max(45, 100 - (result.filler_word_count * 5));
      const qualScore = result.response_quality_score || 70;
      const alignScore = result.confidence_score || result.response_quality_score || 75;
      const paragraph = result.recruiter_paragraph || buildRecruiterParagraph(result);

      setFeedback(result);

      // Save state per question
      setQuestionStates(prev => ({
        ...prev,
        [questionNumber]: {
          question: currentQuestion,
          transcription: finalTranscription || 'No answer provided',
          feedback: result,
          timer: timer,
          presenceScore: presScore,
          commsScore: commScore,
          qualityScore: qualScore,
          alignmentScore: alignScore,
          recruiterParagraph: paragraph,
        }
      }));

      // Append to simple history
      setInterviewHistory((prev) => [...prev, {
        question: currentQuestion?.question || '',
        transcription: finalTranscription || 'No answer provided',
        confidence_score: result.confidence_score
      }]);

      setPhase('active');
      speakFeedbackSequentially({
        ...result,
        presenceScore: presScore,
        commsScore: commScore,
        qualityScore: qualScore,
        alignmentScore: alignScore,
        recruiter_paragraph: paragraph,
      });

    } catch (err) {
      console.error('Analysis failed:', err);
      setPhase('active');
    }
  };

  const replyToInterviewer = async () => {
    setPhase('replying');
    stopTimer();
    const { text: partialTranscription } = await stopTranscription();

    try {
      const result = await execute(() =>
        api.replyToInterviewer(currentQuestion?.question || '', partialTranscription || 'I have a question.')
      );

      if (result.interviewer_reply) {
        speakText(result.interviewer_reply);
      }

      // Go back to active phase to allow starting the real answer again
      setPhase('active');
    } catch (err) {
      console.error('Reply failed:', err);
      setPhase('active');
    }
  };

  const handleNavigateQuestion = async (targetNumber) => {
    if (targetNumber < 1 || targetNumber > 5) return;

    // Stop text-to-speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Save current active transcription & state
    if (phase === 'answering') {
      stopTimer();
      if (interviewMode === 'video') {
        const { text: sttResult } = await stopTranscription();
        setQuestionStates(prev => ({
          ...prev,
          [questionNumber]: {
            ...prev[questionNumber],
            transcription: sttResult,
            timer: timer,
          }
        }));
        setTranscription(sttResult);
        setTextAnswer(sttResult);
      } else {
        setQuestionStates(prev => ({
          ...prev,
          [questionNumber]: {
            ...prev[questionNumber],
            transcription: textAnswer,
            timer: timer,
          }
        }));
      }
      setPhase('active');
    } else {
      setQuestionStates(prev => ({
        ...prev,
        [questionNumber]: {
          ...prev[questionNumber],
          transcription: interviewMode === 'video' ? transcription : textAnswer,
          timer: timer,
        }
      }));
    }

    setQuestionNumber(targetNumber);

    const targetState = questionStates[targetNumber];
    if (targetState) {
      setCurrentQuestion(targetState.question);
      setTranscription(targetState.transcription || '');
      setTextAnswer(targetState.transcription || '');
      setTimer(targetState.timer || 0);
      setFeedback(targetState.feedback || null);
      setPhase('active');
    } else {
      setPhase('active');
      setFeedback(null);
      setTranscription('');
      setTextAnswer('');
      setTimer(0);

      try {
        const q = await execute(() => api.getInterviewQuestion(role, companyName, skills, targetNumber, resumeData?.resume?.summary, resumeData?.resume?.experience));
        setCurrentQuestion(q);
        setQuestionStates(prev => ({
          ...prev,
          [targetNumber]: {
            question: q,
            transcription: '',
            feedback: null,
            timer: 0,
          }
        }));
        speakText(q.question);
      } catch (err) {
        console.error('Failed to get question:', err);
      }
    }
  };

  const nextQuestion = async () => {
    handleNavigateQuestion(questionNumber + 1);
  };

  const endInterview = () => {
    stopCamera();
    stopTimer();
    stopTranscription();
    stopScreenShare();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (codingUrgeTimerRef.current) clearTimeout(codingUrgeTimerRef.current);
    if (codingVideoUrl) URL.revokeObjectURL(codingVideoUrl);
    setCodingVideoUrl(null);
    setCodingChallenge(null);
    setCodingFeedback(null);
    setPhase('setup');
    setCurrentQuestion(null);
    setFeedback(null);
    setTranscription('');
    setQuestionNumber(1);
    setInterviewHistory([]);
    setQuestionStates({});
    setFinalSummary(null);
    setShowTips(false);
  };

  const handleEndInterviewClick = () => {
    setShowEndPopup(true);
  };

  const handleCloseEndPopup = () => {
    setShowEndPopup(false);
    endInterview();
    if (setActiveTab) {
      setActiveTab('home');
    }
  };

  const getEndPopupScores = () => {
    const answeredQuestionKeys = Object.keys(questionStates).filter(key => {
      const state = questionStates[key];
      return state && state.feedback;
    });

    if (answeredQuestionKeys.length === 0) {
      return {
        hasAnswers: false,
        presence: 0,
        communication: 0,
        quality: 0,
        alignment: 0,
        overallScore: 0
      };
    }

    let sumPresence = 0;
    let sumComms = 0;
    let sumQuality = 0;
    let sumAlignment = 0;

    answeredQuestionKeys.forEach(key => {
      const state = questionStates[key];
      sumPresence += state.presenceScore ?? 0;
      sumComms += state.commsScore ?? 0;
      sumQuality += state.qualityScore ?? 0;
      sumAlignment += state.alignmentScore ?? 0;
    });

    const presence = Math.round(sumPresence / answeredQuestionKeys.length);
    const communication = Math.round(sumComms / answeredQuestionKeys.length);
    const quality = Math.round(sumQuality / answeredQuestionKeys.length);
    const alignment = Math.round(sumAlignment / answeredQuestionKeys.length);
    const overallScore = Math.round((presence + communication + quality + alignment) / 4);

    return {
      hasAnswers: true,
      presence,
      communication,
      quality,
      alignment,
      overallScore
    };
  };

  const retryQuestion = async () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setFeedback(null);
    setTranscription('');
    setPhase('active');
    setShowTips(false);

    // Clear feedback for current question
    setQuestionStates(prev => ({
      ...prev,
      [questionNumber]: {
        ...prev[questionNumber],
        transcription: '',
        feedback: null,
        timer: 0,
      }
    }));

    try {
      const q = await execute(() => api.getInterviewQuestion(role, companyName, skills, questionNumber, resumeData?.resume?.summary, resumeData?.resume?.experience));
      setCurrentQuestion(q);
      speakText(q.question);
      if (interviewMode === 'video') {
        await startTranscription();
      }
      startTimer();
    } catch (err) {
      console.error('Failed to retry question:', err);
    }
  };

  // ─── Coding Challenge Flow ──────────────────────────────────────────────
  const handleShareScreen = async () => {
    try {
      const stream = await startScreenShare();
      if (screenPreviewRef.current) {
        screenPreviewRef.current.srcObject = stream;
      }
      setPhase('coding_share');
      await startScreenRecording();
      await startTranscription();
      startTimer();
      setPhase('coding_active');
    } catch (err) {
      console.warn('Screen share cancelled or failed:', err);
      speakText('I noticed you haven\'t shared your screen yet. Please share your screen so I can see you work through the problem.');
    }
  };

  const submitCodingSolution = async () => {
    setPhase('coding_analyzing');
    stopTimer();

    // Capture a frame from the screen share for analysis
    let screenshot = null;
    if (screenPreviewRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = screenPreviewRef.current.videoWidth;
      canvas.height = screenPreviewRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(screenPreviewRef.current, 0, 0, canvas.width, canvas.height);
      screenshot = canvas.toDataURL('image/png');
    }

    await stopScreenRecording();
    const { text: finalTranscription } = await stopTranscription();

    try {
      const result = await execute(() =>
        api.analyzeCoding({
          problemTitle: codingChallenge?.problem_title || '',
          problemDescription: codingChallenge?.problem_description || '',
          transcription: finalTranscription || 'No speech detected',
          speechDuration: timer,
          codeShared: isScreenSharing,
          screenshot: screenshot,
        })
      );
      setCodingFeedback(result);
      setInterviewHistory((prev) => [...prev, {
        question: `[Coding] ${codingChallenge?.problem_title || 'Coding Challenge'}`,
        transcription: finalTranscription || 'No speech detected',
        confidence_score: result.confidence_score,
      }]);
      setPhase('coding_results');
    } catch (err) {
      console.error('Coding analysis failed:', err);
      setPhase('coding_results');
    }
  };

  // Urge screen sharing after a delay
  useEffect(() => {
    if (phase === 'coding_prompt' && codingChallenge && !isScreenSharing) {
      codingUrgeTimerRef.current = setTimeout(() => {
        speakText('Please share your screen when you are ready. I need to see your coding environment to evaluate your work.');
      }, 12000);
      return () => {
        if (codingUrgeTimerRef.current) clearTimeout(codingUrgeTimerRef.current);
      };
    }
  }, [phase, codingChallenge, isScreenSharing]);

  // Build video URL when recording blob is ready
  useEffect(() => {
    if (screenRecordingBlob && phase === 'coding_results') {
      const url = URL.createObjectURL(screenRecordingBlob);
      setCodingVideoUrl(url);
    }
  }, [screenRecordingBlob, phase]);

  const finishInterview = async () => {
    stopCamera();
    stopTimer();
    stopTranscription();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    // Compile history from completed questions
    const history = Object.keys(questionStates)
      .map(num => {
        const state = questionStates[num];
        if (state && state.feedback) {
          return {
            question: state.question?.question || '',
            transcription: state.transcription || 'No answer provided',
            confidence_score: state.feedback.response_quality_score || 50
          };
        }
        return null;
      })
      .filter(Boolean);

    setPhase('summarizing');
    try {
      const summary = await execute(() => api.summarizeInterview(history));
      setFinalSummary(summary);
      setPhase('final_results');
    } catch (err) {
      console.error('Failed to get summary:', err);
      setPhase('final_results');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      stopTimer();
      stopTranscription();
      stopScreenShare();
      if (codingVideoUrl) URL.revokeObjectURL(codingVideoUrl);
    };
  }, []);

  // ─── Voice Commands (Transcription-based) ───────────────────────────────
  useEffect(() => {
    const transcriptLower = transcription.toLowerCase().trim();
    const isSkipCommand = /\bskip\b|\bnext question\b/.test(transcriptLower);

    if (isSkipCommand && (phase === 'answering' || phase === 'coding_active')) {
      console.log('Voice Command Triggered: SKIP (from active transcription)');
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      stopTranscription();
      stopTimer();
      setTranscription('');

      if (currentQuestion) {
        setInterviewHistory(prev => [...prev, {
          question: currentQuestion.question || '',
          transcription: 'Skipped by user',
          confidence_score: 50
        }]);
      }

      if (questionNumber >= 5) {
        finishInterview();
      } else {
        nextQuestion();
      }
    }
  }, [transcription, phase]);

  // ─── Passive Voice Commands (Active Phase) ──────────────────────────────
  useEffect(() => {
    if (phase !== 'active' && phase !== 'coding_prompt') return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        interimTranscript += event.results[i][0].transcript;
      }

      const transcriptLower = interimTranscript.toLowerCase().trim();
      if (/\bskip\b|\bnext question\b/.test(transcriptLower)) {
        console.log('Passive Voice Command Triggered: SKIP');
        recognition.stop();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();

        if (currentQuestion) {
          setInterviewHistory(prev => [...prev, {
            question: currentQuestion.question || '',
            transcription: 'Skipped by user',
            confidence_score: 50
          }]);
        }

        if (questionNumber >= 5) {
          finishInterview();
        } else {
          nextQuestion();
        }
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.warn('Passive speech recognition start error:', e);
    }

    return () => {
      try {
        recognition.stop();
      } catch (e) { }
    };
  }, [phase, currentQuestion, questionNumber]);

  return (
    <div className="tab-content" style={{ marginTop: '-32px' }}>
      {/* ─── Setup Phase ──────────────────────────────────────────────── */}
      {phase === 'setup' && (
        <div className="card">
          <div className="interview-setup">
            <div className="interview-setup-icon"></div>
            <p style={{ fontWeight: 'bold', color: '#581c87', marginBottom: '20px', lineHeight: '1.6' }}>
              Practice interviews with real-time video analysis, speech recognition, and AI-powered feedback. Your camera feed is analyzed locally.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', marginRight: '16px' }}>
                Resume <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-start', width: '70%', alignItems: 'center' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  {loading ? 'Processing...' : 'Upload'}
                </button>
                <span style={{ color: 'var(--text-secondary)', fontWeight: '600', fontSize: '1rem' }}>or</span>
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveTab?.('resume')}
                  style={{ flex: 1 }}
                >
                  Generate
                </button>
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="application/pdf,.pdf"
              onChange={handleFileUpload}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', marginRight: '16px' }}>
                  Role Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Software Engineer"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{ width: '70%' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', marginRight: '16px' }}>
                  Company Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Google"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  style={{ width: '70%' }}
                />
              </div>
            </div>

            {resumeData?.resume && (
              <>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap', marginRight: '16px' }}>Interview Mode</label>
                  <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', width: '70%' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="radio"
                        name="interviewMode"
                        value="video"
                        checked={interviewMode === 'video'}
                        onChange={(e) => setInterviewMode(e.target.value)}
                      />
                      <span>Video & Audio (Real-time Analysis)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="radio"
                        name="interviewMode"
                        value="text"
                        checked={interviewMode === 'text'}
                        onChange={(e) => setInterviewMode(e.target.value)}
                      />
                      <span>Text Only (Type your answers)</span>
                    </label>
                  </div>
                </div>





                <button
                  className="btn btn-primary btn-lg"
                  onClick={startInterview}
                  disabled={loading || !role.trim() || !companyName.trim() || !resumeData?.resume}
                  style={{ marginTop: '16px', width: '100%' }}
                  id="start-interview-btn"
                >
                  {loading ? (
                    <>
                      <div className="btn-spinner" />
                      Starting...
                    </>
                  ) : (
                    'Start Mock Interview'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Active / Answering / Analyzing / Replying Phases ────────────────────── */}
      {(phase === 'active' || phase === 'answering' || phase === 'analyzing' || phase === 'replying') && (
        <div onClick={() => setActiveTooltip(null)}>
          {/* Top Section: Split Two-Column Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '24px',
            marginBottom: '24px'
          }} className="interview-top-grid">

            {/* Left Column (60%): Question display + controls */}
            {currentQuestion && (
              <div className="card" style={{ padding: '24px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '320px', margin: 0, overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px', paddingRight: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="question-number" style={{ margin: 0, fontWeight: '700', color: 'var(--color-primary-light)' }}>
                        Question {currentQuestion.question_number} of {currentQuestion.total_questions}
                      </div>

                      {/* Prev Button */}
                      <button
                        onClick={() => handleNavigateQuestion(questionNumber - 1)}
                        disabled={questionNumber <= 1 || loading}
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}
                      >
                        ← Prev
                      </button>

                      {/* Next Button */}
                      <button
                        onClick={() => handleNavigateQuestion(questionNumber + 1)}
                        disabled={questionNumber >= 5 || loading}
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}
                      >
                        Next →
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', position: 'relative' }}>
                      {/* Exclamation info button */}
                        <span 
                          style={{ cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '600', color: '#047857' }}
                          onClick={(e) => { e.stopPropagation(); setShowTips(!showTips); }}
                        >
                          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}>
                            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1.3.5 2.6 1.5 3.5.7.8 1.3 1.5 1.5 2.5" />
                            <line x1="9" y1="18" x2="15" y2="18" />
                            <line x1="10" y1="22" x2="14" y2="22" />
                          </svg>
                          Tips to Answer
                        </span>
                      {/* Tooltip rendered with absolute position right below the button */}
                      {showTips && (
                        <div style={{ position: 'absolute', top: '100%', right: '0', marginTop: '8px', background: '#e0f2fe', border: '1px solid rgba(0,0,0,0.1)', padding: '12px', borderRadius: '8px', boxShadow: '0 10px 15px rgba(0,0,0,0.15)', zIndex: 9999, width: '340px' }}>
                          <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: '#4b5563', listStyleType: 'disc', textAlign: 'left', lineHeight: '1.5', fontWeight: 'bold' }}>
                            <li style={{ marginBottom: '4px' }}>Use the <strong>STAR</strong> method: Situation, Task, Action, Result</li>
                            <li style={{ marginBottom: '4px' }}>Maintain eye contact with the camera</li>
                            <li style={{ marginBottom: '4px' }}>Avoid filler words like "um", "ah", or "like"</li>
                            <li style={{ marginBottom: '4px' }}>Keep answers concise and measurable</li>
                            <li>Aim for 1–2 minute responses</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="question-text" style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '20px', lineHeight: '1.5' }}>
                    {currentQuestion.question}
                  </div>
                </div>

                {/* Actions row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: 'auto', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {phase === 'active' && (
                      <button
                        className="btn btn-primary"
                        onClick={startAnswering}
                        disabled={loading}
                        id="start-answering-btn"
                      >
                        {questionStates[questionNumber]?.feedback ? 'Re-answer Question' : 'Start Answering'}
                      </button>
                    )}
                    {phase === 'answering' && (
                      <>
                        <button
                          className="btn btn-secondary"
                          onClick={replyToInterviewer}
                          id="reply-interviewer-btn"
                        >
                          Ask Clarification
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={submitAnswer}
                          id="submit-answer-btn"
                        >
                          Submit Answer
                        </button>
                      </>
                    )}
                    {(phase === 'analyzing' || phase === 'replying') && (
                      <button className="btn btn-secondary" disabled>
                        <div className="btn-spinner" />
                        {phase === 'analyzing' ? 'Analyzing...' : 'Waiting for reply...'}
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {phase === 'active' && questionNumber === 5 && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-primary-light)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="currentColor" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary-light)' }}>
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        Technical Coding Challenge
                      </span>
                    )}
                    {phase === 'active' && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="status-dot active" style={{ width: '8px', height: '8px' }} />
                        Listening for "Skip" command...
                      </div>
                    )}
                    <button
                      className="btn btn-ghost"
                      onClick={handleEndInterviewClick}
                      style={{ color: 'var(--color-danger)', fontWeight: 'bold' }}
                    >
                      End Interview
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Right Column (40%): Real-Time Recruiter Evaluation or Recording/Awaiting Status */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '320px', margin: 0, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-primary-light)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-primary-light)' }}>
                    {phase === 'answering' ? (interviewMode === 'video' ? 'Live Transcription' : 'Your Answer') : 'Real-Time Recruiter Evaluation'}
                  </span>
                </div>
                {phase === 'answering' && interviewMode === 'video' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '12px' }}>
                    {[...Array(5)].map((_, i) => (
                      <div key={i} style={{
                        width: '3px',
                        height: `${Math.max(20, Math.min(100, (audioLevel / 50) * 100 * (0.4 + Math.random() * 0.6)))}%`,
                        background: audioLevel > 10 ? 'var(--color-primary-light)' : 'var(--text-muted)',
                        borderRadius: '1px',
                        transition: 'height 0.1s ease'
                      }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Body Content */}
              {phase === 'analyzing' ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <LoaderDots />
                  <p className="text-muted text-sm" style={{ marginTop: '16px' }}>AI is analyzing your response...</p>
                </div>
              ) : phase === 'replying' ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <LoaderDots />
                  <p className="text-muted text-sm" style={{ marginTop: '16px' }}>Interviewer is formulating a response...</p>
                </div>
              ) : phase === 'answering' ? (
                interviewMode === 'video' ? (
                  <div style={{
                    flex: 1,
                    color: transcription ? 'var(--text-secondary)' : 'var(--text-muted)',
                    fontSize: '0.95rem',
                    lineHeight: 1.7,
                    overflowY: 'auto',
                    fontStyle: transcription ? 'normal' : 'italic',
                    paddingRight: '4px',
                  }}>
                    {transcription || 'Awaiting speech... Speak clearly into your microphone.'}
                  </div>
                ) : (
                  <textarea
                    className="input"
                    style={{
                      flex: 1,
                      resize: 'none',
                      width: '100%',
                      fontFamily: 'inherit',
                      height: '100%',
                      overflowY: 'auto',
                    }}
                    placeholder="Type your answer here..."
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                  />
                )
              ) : questionStates[questionNumber]?.feedback ? (
                <div className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden' }}>
                  <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-primary)', lineHeight: '1.8', fontWeight: 'bold' }}>
                      {questionStates[questionNumber].recruiterParagraph || buildRecruiterParagraph(questionStates[questionNumber].feedback)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0, paddingBottom: '4px' }}>
                    <button
                      className="btn btn-ghost"
                      onClick={(e) => { e.stopPropagation(); handleOpenDetailedEval(); }}
                      style={{
                        color: '#047857',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        padding: '12px 24px',
                        cursor: 'pointer'
                      }}
                    >
                      Want a detailed evaluation?
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px', opacity: 0.5 }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic' }}>
                    Evaluation will appear here after you submit your answer.
                  </p>
                </div>
              )}
            </div>
          </div>


          {/* Floating overlay Detailed Evaluation modal */}
          {showDetailedEval && (
            <div className="modal-overlay" onClick={handleCloseDetailedEval}>
              <div className="modal-content modal-content-white" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px', width: '90%', maxHeight: '80vh', overflowY: 'auto', borderRadius: '20px', padding: '28px', position: 'relative' }}>
                {/* Close Icon in the TOP LEFT corner */}
                <button
                  onClick={handleCloseDetailedEval}
                  className="modal-close-btn"
                  aria-label="Close"
                >
                  ✕
                </button>

                <div style={{ textAlign: 'center', marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-skill" style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.7rem' }}>
                    Coach Analysis
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Detailed Coach Evaluation
                  </h3>

                  {/* TTS Voice Control Bar */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', background: 'rgba(0,0,0,0.04)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(0,0,0,0.06)' }}>
                    <button
                      onClick={() => {
                        if ('speechSynthesis' in window) {
                          if (window.speechSynthesis.paused) {
                            window.speechSynthesis.resume();
                          } else {
                            handleOpenDetailedEval();
                          }
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      ▶ Play
                    </button>
                    <button
                      onClick={() => {
                        if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
                          window.speechSynthesis.pause();
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#d97706', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      ⏸ Pause
                    </button>
                    <button
                      onClick={() => {
                        if ('speechSynthesis' in window) {
                          window.speechSynthesis.cancel();
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      ⏹ Stop
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.6', textAlign: 'left' }}>
                  {(() => {
                    const formatFeedbackText = (text) => {
                      if (!text) return text;
                      return text
                        .replace(/\b[T|t]he candidate's\b/g, 'your')
                        .replace(/\b[C|c]andidate's\b/g, 'your')
                        .replace(/\b[T|t]he candidate\b/g, 'you')
                        .replace(/\b[C|c]andidate\b/g, 'you')
                        .replace(/\b[H|h]e or she\b/g, 'you')
                        .replace(/\b[H|h]is or her\b/g, 'your');
                    };
                    return (
                      <>                  {questionStates[questionNumber]?.feedback?.summary_of_answer && (
                        <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                          <strong style={{ color: 'var(--color-primary)', display: 'block', marginBottom: '4px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Answer Summary
                          </strong>
                          <div>{formatFeedbackText(questionStates[questionNumber].feedback.summary_of_answer)}</div>
                        </div>
                      )}

                        {questionStates[questionNumber]?.feedback?.improvement_areas && (
                          <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <strong style={{ color: 'var(--color-danger)', display: 'block', marginBottom: '4px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Areas of Improvement
                            </strong>
                            <div>{formatFeedbackText(questionStates[questionNumber].feedback.improvement_areas)}</div>
                          </div>
                        )}

                        {questionStates[questionNumber]?.feedback?.face_feedback && (
                          <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <strong style={{ color: 'var(--color-info)', display: 'block', marginBottom: '4px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Visual & Face Tracking Insight
                            </strong>
                            <div>{formatFeedbackText(questionStates[questionNumber].feedback.face_feedback)}</div>
                          </div>
                        )}

                        {questionStates[questionNumber]?.feedback?.speech_feedback && (
                          <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <strong style={{ color: '#d97706', display: 'block', marginBottom: '4px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Speech & Vocal Style Insight
                            </strong>
                            <div>{formatFeedbackText(questionStates[questionNumber].feedback.speech_feedback)}</div>
                          </div>
                        )}

                        {questionStates[questionNumber]?.feedback?.suggested_answer && (
                          <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <strong style={{ color: 'var(--color-success)', display: 'block', marginBottom: '4px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Suggested Answer Strategy
                            </strong>
                            <div>{formatFeedbackText(questionStates[questionNumber].feedback.suggested_answer)}</div>
                          </div>
                        )}

                        {questionStates[questionNumber]?.feedback?.what_interviewer_was_looking_for && (
                          <div style={{ background: 'rgba(0,0,0,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <strong style={{ color: 'var(--color-primary)', display: 'block', marginBottom: '4px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              What Interviewer Was Looking For
                            </strong>
                            <div>{formatFeedbackText(questionStates[questionNumber].feedback.what_interviewer_was_looking_for)}</div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Section: Split Two-Column Grid */}
          <div className="interview-layout">

            {/* Left Column (50%): Webcam / Video Capture Screen viewport */}
            <div>
              <div className="video-container">
                {interviewMode === 'video' ? (
                  <>
                    <video
                      ref={(el) => {
                        videoRef.current = el;
                        if (el && streamRef.current && el.srcObject !== streamRef.current) {
                          el.srcObject = streamRef.current;
                        }
                      }}
                      autoPlay
                      playsInline
                      muted
                    />
                    {faceDetected && (
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        border: '3.5px solid #22c55e',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'inset 0 0 24px rgba(34, 197, 94, 0.25), 0 0 16px rgba(34, 197, 94, 0.4)',
                        pointerEvents: 'none',
                        transition: 'all 0.15s ease-out',
                        zIndex: 10
                      }} />
                    )}
                    <div className="video-overlay">
                      <div className="video-status">
                        <div className={`status-dot ${faceDetected ? 'active' : 'inactive'}`} />
                        {faceDetected ? 'Face Detected' : 'No Face'}
                      </div>
                      {phase === 'answering' && (
                        <div className="recording-indicator">
                          <div className="recording-dot" />
                          REC
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                    <h3>Text Mode Active</h3>
                    <p>No camera or microphone required.</p>
                  </div>
                )}
              </div>

              {/* Video stats/timers */}
              {(phase === 'answering' || (questionStates[questionNumber]?.timer > 0)) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
                  <div className="interview-timer" style={{ margin: 0 }}>
                    Duration: {formatTime(phase === 'answering' ? timer : (questionStates[questionNumber]?.timer || 0))}
                  </div>
                  {interviewMode === 'video' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      <span>Eye Contact:</span>
                      <strong style={{ color: 'var(--color-primary-light)' }}>
                        {phase === 'answering'
                          ? (totalFrames > 0 ? Math.round((faceFrames / totalFrames) * 100) : 0)
                          : (questionStates[questionNumber]?.presenceScore || 0)}%
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column (50%): Performance Dashboard */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', width: '100%' }}>

              {/* Performance Dashboard Title Panel */}
              <div style={{
                marginBottom: '12px',
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                backdropFilter: 'blur(8px)',
                width: '100%'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.7rem',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  background: 'var(--gradient-primary)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  Performance Dashboard
                </h3>
              </div>

              {/* The 4 Performance Percentage Metrics Cards in a 2x2 Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto', rowGap: '8px', columnGap: '16px', alignContent: 'center' }}>

                {/* Card 1: Face tracking */}
                <div className="metric-card" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '4px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'center', position: 'relative' }}>
                  <div className="metric-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', marginBottom: '2px' }}>
                    <span className="metric-title" style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-secondary)' }}>Face Tracking</span>
                    <div className="info-tooltip-container" onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === 'presence' ? null : 'presence'); }}>
                      <span className="info-icon" style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>i</span>
                      <div className={`info-tooltip-content ${activeTooltip === 'presence' ? 'visible' : ''}`} style={activeTooltip === 'presence' ? { visibility: 'visible', opacity: 1, position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', padding: '12px', borderRadius: '8px', boxShadow: '0 10px 15px rgba(0,0,0,0.15)', zIndex: 100, width: '220px' } : { display: 'none' }}>
                        <strong style={{ display: 'block', marginBottom: '6px', color: '#3b82f6' }}>Measured by</strong>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', listStyleType: 'disc', textAlign: 'left' }}>
                          <li style={{ marginBottom: '4px' }}>Eye contact consistency</li>
                          <li style={{ marginBottom: '4px' }}>Head stability</li>
                          <li style={{ marginBottom: '4px' }}>Facial engagement</li>
                          <li>Posture</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  {renderCircularProgress(questionStates[questionNumber]?.presenceScore || 0, '#3b82f6')}
                </div>

                {/* Card 2: Communication */}
                <div className="metric-card" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '4px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'center', position: 'relative' }}>
                  <div className="metric-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', marginBottom: '2px' }}>
                    <span className="metric-title" style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-secondary)' }}>Communication</span>
                    <div className="info-tooltip-container" onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === 'communication' ? null : 'communication'); }}>
                      <span className="info-icon" style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>i</span>
                      <div className={`info-tooltip-content ${activeTooltip === 'communication' ? 'visible' : ''}`} style={activeTooltip === 'communication' ? { visibility: 'visible', opacity: 1, position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', padding: '12px', borderRadius: '8px', boxShadow: '0 10px 15px rgba(0,0,0,0.15)', zIndex: 100, width: '220px' } : { display: 'none' }}>
                        <strong style={{ display: 'block', marginBottom: '6px', color: '#10b981' }}>Communication Insight</strong>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', listStyleType: 'disc', textAlign: 'left' }}>
                          <li style={{ marginBottom: '4px' }}>Fillers detected: {questionStates[questionNumber]?.feedback?.filler_word_count || 0}.</li>
                          <li style={{ marginBottom: '4px' }}>Maintain a steady vocal pace.</li>
                          <li>Pause cleanly rather than using fillers.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  {renderCircularProgress(questionStates[questionNumber]?.commsScore || 0, '#10b981')}
                </div>

                {/* Card 3: Response Quality */}
                <div className="metric-card" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '4px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'center', position: 'relative' }}>
                  <div className="metric-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', marginBottom: '2px' }}>
                    <span className="metric-title" style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-secondary)' }}>Response Quality</span>
                    <div className="info-tooltip-container" onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === 'quality' ? null : 'quality'); }}>
                      <span className="info-icon" style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>i</span>
                      <div className={`info-tooltip-content ${activeTooltip === 'quality' ? 'visible' : ''}`} style={activeTooltip === 'quality' ? { visibility: 'visible', opacity: 1, position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', padding: '12px', borderRadius: '8px', boxShadow: '0 10px 15px rgba(0,0,0,0.15)', zIndex: 100, width: '220px' } : { display: 'none' }}>
                        <strong style={{ display: 'block', marginBottom: '6px', color: '#f59e0b' }}>Response Quality Insight</strong>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', listStyleType: 'disc', textAlign: 'left' }}>
                          <li style={{ marginBottom: '4px' }}>STAR method alignment.</li>
                          <li style={{ marginBottom: '4px' }}>Completeness of response.</li>
                          <li>Include metric-driven outcomes.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  {renderCircularProgress(questionStates[questionNumber]?.qualityScore || 0, '#f59e0b')}
                </div>

                {/* Card 4: Role Alignment */}
                <div className="metric-card" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '4px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'center', position: 'relative' }}>
                  <div className="metric-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%', marginBottom: '2px' }}>
                    <span className="metric-title" style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-secondary)' }}>Role Alignment</span>
                    <div className="info-tooltip-container" onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === 'alignment' ? null : 'alignment'); }}>
                      <span className="info-icon" style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.08)', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>i</span>
                      <div className={`info-tooltip-content ${activeTooltip === 'alignment' ? 'visible' : ''}`} style={activeTooltip === 'alignment' ? { visibility: 'visible', opacity: 1, position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#ffffff', border: '1px solid rgba(0,0,0,0.1)', padding: '12px', borderRadius: '8px', boxShadow: '0 10px 15px rgba(0,0,0,0.15)', zIndex: 100, width: '220px' } : { display: 'none' }}>
                        <strong style={{ display: 'block', marginBottom: '6px', color: '#a855f7' }}>Role Alignment Insight</strong>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', listStyleType: 'disc', textAlign: 'left' }}>
                          <li style={{ marginBottom: '4px' }}>Vocabulary & terminology fit.</li>
                          <li style={{ marginBottom: '4px' }}>Relevance to {role || 'target role'}.</li>
                          <li>Address specific job requirements.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  {renderCircularProgress(questionStates[questionNumber]?.alignmentScore || 0, '#a855f7')}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── Coding Challenge: Problem Prompt ─────────────────────────── */}
      {phase === 'coding_prompt' && codingChallenge && (
        <div className="fade-in">
          <div className="coding-problem-card">
            <div className="coding-problem-header">
              <span className="badge badge-info">{codingChallenge.difficulty}</span>
              <span className="question-number">Question 5 of 5 — Coding Challenge</span>
            </div>
            <h3 className="coding-problem-title">{codingChallenge.problem_title}</h3>
            <p className="coding-problem-desc">{codingChallenge.problem_description}</p>

            {codingChallenge.examples?.length > 0 && (
              <div className="coding-examples">
                <div className="coding-section-label">Examples</div>
                {codingChallenge.examples.map((ex, i) => (
                  <div key={i} className="coding-example">
                    <div><strong>Input:</strong> <code>{ex.input}</code></div>
                    <div><strong>Output:</strong> <code>{ex.output}</code></div>
                    {ex.explanation && <div className="coding-explanation"><strong>Explanation:</strong> {ex.explanation}</div>}
                  </div>
                ))}
              </div>
            )}

            {codingChallenge.constraints?.length > 0 && (
              <div className="coding-constraints">
                <div className="coding-section-label">Constraints</div>
                <ul>
                  {codingChallenge.constraints.map((c, i) => (
                    <li key={i}><code>{c}</code></li>
                  ))}
                </ul>
              </div>
            )}

            {codingChallenge.hints?.length > 0 && (
              <details className="coding-hints">
                <summary className="coding-section-label" style={{ cursor: 'pointer' }}>Hints (click to reveal)</summary>
                <ul>
                  {codingChallenge.hints.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          <div className="screen-share-prompt">
            <div className="share-urge-banner">
              <div>
                <h4>Share Your Screen</h4>
                <p>The interviewer needs to see your coding environment. Please open the problem and share your screen to begin solving it.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => window.open('https://leetcode.com/problems/median-of-two-sorted-arrays/description/', '_blank')}
                style={{ flex: 1 }}
              >
                1. Open LeetCode Problem
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleShareScreen}
                disabled={loading}
                style={{ flex: 1 }}
                id="share-screen-btn"
              >
                2. Share Screen & Start Coding
              </button>
            </div>
            {screenError && (
              <p style={{ color: 'var(--color-danger)', marginTop: '12px', fontSize: '0.9rem' }}>{screenError}</p>
            )}
            <button
              className="btn btn-ghost"
              onClick={handleEndInterviewClick}
              style={{ marginTop: '12px', color: 'var(--color-danger)' }}
            >
              End Interview
            </button>
          </div>
        </div>
      )}

      {/* ─── Coding Challenge: Active Coding ──────────────────────────── */}
      {(phase === 'coding_active' || phase === 'coding_analyzing') && codingChallenge && (
        <div className="fade-in">
          <div className="interview-layout">
            {/* Left: Screen Preview + Controls */}
            <div>
              <div className="video-container screen-preview">
                <video
                  ref={screenPreviewRef}
                  autoPlay
                  playsInline
                  muted
                />
                <div className="video-overlay">
                  <div className="video-status">
                    <div className="status-dot active" />
                    Screen Sharing
                  </div>
                  {phase === 'coding_active' && (
                    <div className="recording-indicator">
                      <div className="recording-dot" />
                      REC
                    </div>
                  )}
                </div>
              </div>

              {/* Timer */}
              {phase === 'coding_active' && (
                <div className="interview-timer">{formatTime(timer)}</div>
              )}

              {/* Controls */}
              <div className="interview-controls">
                {phase === 'coding_active' && (
                  <button
                    className="btn btn-primary"
                    onClick={submitCodingSolution}
                    id="submit-coding-btn"
                  >
                    Submit Solution
                  </button>
                )}
                {phase === 'coding_analyzing' && (
                  <button className="btn btn-secondary" disabled>
                    <div className="btn-spinner" />
                    Analyzing...
                  </button>
                )}
                <button
                  className="btn btn-ghost"
                  onClick={handleEndInterviewClick}
                  style={{ color: 'var(--color-danger)' }}
                >
                  End Interview
                </button>
              </div>

              {/* Live Metrics */}
              {phase === 'coding_active' && (
                <div className="interview-metrics">
                  <div className="metric-card">
                    <div className="metric-value">{transcription.split(' ').filter(Boolean).length}</div>
                    <div className="metric-label">Words</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{formatTime(timer)}</div>
                    <div className="metric-label">Duration</div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Problem + Transcription */}
            <div>
              <div className="coding-problem-card" style={{ padding: '16px' }}>
                <h4 className="coding-problem-title" style={{ fontSize: '1rem' }}>{codingChallenge.problem_title}</h4>
                <p className="coding-problem-desc" style={{ fontSize: '0.85rem' }}>{codingChallenge.problem_description}</p>
              </div>

              {/* Live Transcription */}
              <div className="card" style={{ marginTop: '16px' }}>
                <div className="card-title" style={{ marginBottom: '12px', fontSize: '0.85rem' }}>
                  Live Explanation
                </div>
                <div style={{
                  minHeight: '120px',
                  color: transcription ? 'var(--text-secondary)' : 'var(--text-muted)',
                  fontSize: '0.95rem',
                  lineHeight: 1.7,
                  fontStyle: transcription ? 'normal' : 'italic',
                }}>
                  {transcription || 'Explain your approach out loud as you code... your explanation will appear here.'}
                </div>
              </div>

              {loading && phase === 'coding_analyzing' && (
                <div className="card" style={{ marginTop: '16px', textAlign: 'center' }}>
                  <LoaderDots />
                  <p className="text-muted text-sm">AI is analyzing your coding performance...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Coding Challenge: Results ────────────────────────────────── */}
      {phase === 'coding_results' && (
        <div className="fade-in">
          {/* Confidence Score */}
          <div className="card card-highlight" style={{ textAlign: 'center', marginBottom: '24px' }}>
            <ScoreRing score={codingFeedback?.confidence_score || 0} size={160} strokeWidth={10} label="Coding Score" />
            <div style={{ marginTop: '16px' }}>
              <span className="badge badge-info">Coding Challenge</span>
            </div>
          </div>

          {/* Video Playback */}
          {codingVideoUrl && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <div className="card-title" style={{ marginBottom: '12px' }}>Your Coding Session Recording</div>
              <div className="coding-playback">
                <video
                  src={codingVideoUrl}
                  controls
                  style={{ width: '100%', borderRadius: 'var(--radius-md)', background: '#000' }}
                />
              </div>
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <a
                  href={codingVideoUrl}
                  download={`coding-interview-${new Date().toISOString().slice(0, 10)}.webm`}
                  className="btn btn-secondary btn-sm"
                >
                  Download Recording
                </a>
              </div>
            </div>
          )}

          {/* Feedback Grid */}
          <div className="results-grid">
            {codingFeedback?.problem_solving_feedback && (
              <div className="result-card">
                <div className="result-card-title">Problem Solving</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {codingFeedback.problem_solving_feedback}
                </p>
              </div>
            )}
            {codingFeedback?.communication_feedback && (
              <div className="result-card">
                <div className="result-card-title">Communication</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {codingFeedback.communication_feedback}
                </p>
              </div>
            )}
            {codingFeedback?.tone_feedback && (
              <div className="result-card" style={{ gridColumn: '1 / -1', borderLeft: '4px solid var(--color-accent)' }}>
                <div className="result-card-title">Tone & Formality</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {codingFeedback.tone_feedback}
                </p>
              </div>
            )}
            {codingFeedback?.code_quality_feedback && (
              <div className="result-card" style={{ gridColumn: '1 / -1' }}>
                <div className="result-card-title">Code Quality & Approach</div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {codingFeedback.code_quality_feedback}
                </p>
              </div>
            )}
            {codingFeedback?.strengths?.length > 0 && (
              <div className="result-card">
                <div className="result-card-title">Strengths</div>
                <ul className="feedback-list">
                  {codingFeedback.strengths.map((s, i) => (
                    <li key={i} className="feedback-item">
                      <span className="feedback-icon" style={{ color: 'var(--color-success)' }}>•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {codingFeedback?.tips?.length > 0 && (
              <div className="result-card">
                <div className="result-card-title">Tips for Next Time</div>
                <ul className="feedback-list">
                  {codingFeedback.tips.map((t, i) => (
                    <li key={i} className="feedback-item">
                      <span className="feedback-icon" style={{ color: 'var(--color-warning)' }}>•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Weaknesses */}
          {codingFeedback?.weaknesses?.length > 0 && (
            <div className="card" style={{ marginTop: '16px' }}>
              <div className="feedback-section-title weaknesses" style={{ marginBottom: '12px' }}>
                Areas for Improvement
              </div>
              <ul className="feedback-list">
                {codingFeedback.weaknesses.map((w, i) => (
                  <li key={i} className="feedback-item">
                    <span className="feedback-icon" style={{ color: 'var(--color-danger)' }}>•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Navigation */}
          <div className="interview-controls" style={{ marginTop: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {questionNumber < 5 ? (
              <button
                className="btn btn-primary btn-lg"
                onClick={nextQuestion}
                disabled={loading}
                id="next-question-btn"
              >
                {loading ? (
                  <>
                    <div className="btn-spinner" />
                    Loading...
                  </>
                ) : (
                  `Next Question (${questionNumber + 1}/5)`
                )}
              </button>
            ) : (
              <button
                className="btn btn-primary btn-lg"
                onClick={finishInterview}
                disabled={loading}
              >
                Finish Interview and Get Summary
              </button>
            )}
            <button className="btn btn-secondary" onClick={retryQuestion} disabled={loading}>
              Redo Question
            </button>
            <button className="btn btn-ghost" onClick={endInterview} style={{ color: 'var(--color-danger)' }}>
              Redo Interview
            </button>
          </div>
        </div>
      )}

      {/* ─── Results Phase ────────────────────────────────────────────── */}
      {phase === 'results' && feedback && (() => {
        // Derive scores
        const presence = interviewMode === 'video'
          ? (totalFrames > 0 ? Math.round((faceFrames / totalFrames) * 100) : Math.max(65, feedback.confidence_score - 10))
          : 100;

        const communication = Math.max(45, 100 - (feedback.filler_word_count * 5));

        const gradeMap = { 'A': 100, 'B': 85, 'C': 70, 'D': 50, 'F': 0 };
        const quality = feedback.response_quality_score ?? (gradeMap[feedback.answer_grade ? feedback.answer_grade[0] : 'C'] ?? 70);

        const alignment = feedback.confidence_score || 75;

        const overallScore = Math.round((presence + communication + quality + alignment) / 4);

        let hiringBadge = { label: 'Strong Candidate', class: 'strong', dot: '' };
        if (overallScore < 60) {
          hiringBadge = { label: 'Practice More', class: 'practice-more', dot: '' };
        } else if (overallScore < 80) {
          hiringBadge = { label: 'Needs Improvement', class: 'needs-improvement', dot: '' };
        }

        const radarData = [
          { subject: 'Face Tracking', A: presence, fullMark: 100 },
          { subject: 'Communication', A: communication, fullMark: 100 },
          { subject: 'Response Quality', A: quality, fullMark: 100 },
          { subject: 'Role Alignment', A: alignment, fullMark: 100 }
        ];

        const insights = [
          presence >= 80 ? "Excellent eye engagement and posture" : "Focus more direct contact on the camera",
          feedback.filler_word_count <= 2 ? "Extremely clear vocal articulation with low fillers" : `Reduce conversational filler words (${feedback.filler_word_count} detected)`,
          quality >= 80 ? "Strong structural alignment with STAR method" : "Add measurable metrics & outcomes to your examples"
        ];

        return (
          <div className="fade-in" onClick={() => setActiveTooltip(null)}>
            {/* Header Dashboard section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>Performance Dashboard</h2>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)' }}>Question {questionNumber} of 5 Analysis</p>
              </div>
            </div>

            {/* Main Dashboard Panel */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>

              {/* Left Column: 4 Metric Cards in a 2x2 Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'auto auto', rowGap: '8px', columnGap: '16px', alignContent: 'center' }}>

                {/* Card 1: Face tracking */}
                <div className="metric-card">
                  <div className="metric-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}>
                    <span className="metric-title">Face Tracking</span>
                    <div className="info-tooltip-container" onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === 'presence' ? null : 'presence'); }}>
                      <span className="info-icon">i</span>
                      <div className={`info-tooltip-content ${activeTooltip === 'presence' ? 'visible' : ''}`} style={activeTooltip === 'presence' ? { visibility: 'visible', opacity: 1 } : {}}>
                        <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--color-primary-light)' }}>Measured by</strong>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <li style={{ marginBottom: '4px' }}>Eye contact consistency</li>
                          <li style={{ marginBottom: '4px' }}>Head stability</li>
                          <li style={{ marginBottom: '4px' }}>Facial engagement</li>
                          <li>Posture</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  {renderCircularProgress(presence, '#3b82f6')}
                </div>

                {/* Card 2: Communication */}
                <div className="metric-card">
                  <div className="metric-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}>
                    <span className="metric-title">Communication</span>
                    <div className="info-tooltip-container" onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === 'communication' ? null : 'communication'); }}>
                      <span className="info-icon">i</span>
                      <div className={`info-tooltip-content ${activeTooltip === 'communication' ? 'visible' : ''}`} style={activeTooltip === 'communication' ? { visibility: 'visible', opacity: 1 } : {}}>
                        <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--color-primary-light)' }}>Communication Insight</strong>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <li style={{ marginBottom: '4px' }}>Used {feedback.filler_word_count} fillers: "{feedback.filler_words_found?.slice(0, 2).join(', ') || 'none'}".</li>
                          <li style={{ marginBottom: '4px' }}>Maintain a steady vocal pace.</li>
                          <li>Pause cleanly rather than filler words.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  {renderCircularProgress(communication, '#10b981')}
                </div>

                {/* Card 3: Response Quality */}
                <div className="metric-card">
                  <div className="metric-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}>
                    <span className="metric-title">Response Quality</span>
                    <div className="info-tooltip-container" onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === 'quality' ? null : 'quality'); }}>
                      <span className="info-icon">i</span>
                      <div className={`info-tooltip-content ${activeTooltip === 'quality' ? 'visible' : ''}`} style={activeTooltip === 'quality' ? { visibility: 'visible', opacity: 1 } : {}}>
                        <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--color-primary-light)' }}>Response Quality Insight</strong>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <li style={{ marginBottom: '4px' }}>Grade: "{feedback.answer_grade}".</li>
                          <li style={{ marginBottom: '4px' }}>Follow STAR methodology closely.</li>
                          <li>Add specific, quantifiable outcomes.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  {renderCircularProgress(quality, '#f59e0b')}
                </div>

                {/* Card 4: Role Alignment */}
                <div className="metric-card">
                  <div className="metric-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: '100%' }}>
                    <span className="metric-title">Role Alignment</span>
                    <div className="info-tooltip-container" onClick={(e) => { e.stopPropagation(); setActiveTooltip(activeTooltip === 'alignment' ? null : 'alignment'); }}>
                      <span className="info-icon">i</span>
                      <div className={`info-tooltip-content ${activeTooltip === 'alignment' ? 'visible' : ''}`} style={activeTooltip === 'alignment' ? { visibility: 'visible', opacity: 1 } : {}}>
                        <strong style={{ display: 'block', marginBottom: '6px', color: 'var(--color-primary-light)' }}>Role Alignment Insight</strong>
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <li style={{ marginBottom: '4px' }}>Target: {role}.</li>
                          <li style={{ marginBottom: '4px' }}>Addresses critical requirements.</li>
                          <li>Directly maps to your skills & summary.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  {renderCircularProgress(alignment, '#a855f7')}
                </div>

              </div>

              {/* Right Column: Overall Score Section */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute',
                  top: '-50%',
                  left: '-50%',
                  width: '200%',
                  height: '200%',
                  background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 60%)',
                  pointerEvents: 'none',
                  zIndex: 0
                }} />

                <div style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '16px', fontWeight: 'bold' }}>
                    Overall Confidence Score
                  </div>
                  <ScoreRing score={overallScore} size={130} strokeWidth={9} label="Overall" />
                  <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', maxWidth: '240px', margin: '16px 0 0 0', lineHeight: 1.4 }}>
                    {feedback.interviewer_response ? `"${feedback.interviewer_response.slice(0, 80)}..."` : 'Great job! Keep polishing your structure.'}
                  </p>
                </div>
              </div>

            </div>

            {/* Quick Insights Section */}
            <div className="card" style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Quick Insights</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {insights.map((insight, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.95rem'
                  }}>
                    {insight}
                  </div>
                ))}
              </div>
            </div>

            {/* Accordion for View Detailed Coaching */}
            <div className="accordion">
              <div
                className="accordion-header"
                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              >
                <span>View Detailed Coaching</span>
                <span>{isDetailsOpen ? '▲' : '▼'}</span>
              </div>
              <div className={`accordion-content ${isDetailsOpen ? 'open' : ''}`}>
                <div className="results-grid">
                  {/* Detailed Analysis Content */}
                  {feedback.summary_of_answer && (
                    <div className="result-card" style={{ gridColumn: '1 / -1', borderLeft: '4px solid var(--color-success)' }}>
                      <div className="result-card-title">Summary of Your Answer</div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        {feedback.summary_of_answer}
                      </p>
                    </div>
                  )}

                  {feedback.what_interviewer_was_looking_for && (
                    <div className="result-card" style={{ gridColumn: '1 / -1', borderLeft: '4px solid var(--color-info)' }}>
                      <div className="result-card-title">What the Interviewer was Looking For</div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        {feedback.what_interviewer_was_looking_for}
                      </p>
                    </div>
                  )}

                  {feedback.suggested_answer && (
                    <div className="result-card" style={{ gridColumn: '1 / -1', borderLeft: '4px solid var(--color-primary)' }}>
                      <div className="result-card-title">Ideal Suggested Answer (STAR Method)</div>
                      <div style={{
                        color: 'var(--text-secondary)',
                        fontSize: '0.95rem',
                        lineHeight: 1.7,
                        background: 'rgba(255, 255, 255, 0.02)',
                        padding: '16px',
                        borderRadius: '8px',
                        whiteSpace: 'pre-wrap',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }}>
                        {feedback.suggested_answer}
                      </div>
                    </div>
                  )}

                  {feedback.improvement_areas && (
                    <div className="result-card" style={{ gridColumn: '1 / -1', borderLeft: '4px solid var(--color-warning)' }}>
                      <div className="result-card-title">Detailed Coaching Notes</div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        {feedback.improvement_areas}
                      </p>
                    </div>
                  )}

                  {feedback.face_feedback && (
                    <div className="result-card">
                      <div className="result-card-title">Expanded Face Tracking & Eye Contact Analysis</div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        {feedback.face_feedback}
                      </p>
                    </div>
                  )}

                  {feedback.speech_feedback && (
                    <div className="result-card">
                      <div className="result-card-title">Expanded Speech & Body Posture Analysis</div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                        {feedback.speech_feedback}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="interview-controls" style={{ marginTop: '32px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {questionNumber < 5 ? (
                <button
                  className="btn btn-primary btn-lg"
                  onClick={nextQuestion}
                  disabled={loading}
                  id="next-question-btn"
                >
                  {loading ? (
                    <>
                      <div className="btn-spinner" />
                      Loading...
                    </>
                  ) : (
                    `Next Question (${questionNumber + 1}/5)`
                  )}
                </button>
              ) : (
                <button
                  className="btn btn-primary btn-lg"
                  onClick={finishInterview}
                  disabled={loading}
                >
                  {loading && phase === 'summarizing' ? (
                    <>
                      <div className="btn-spinner" />
                      Generating...
                    </>
                  ) : (
                    'Finish Interview and Get Summary'
                  )}
                </button>
              )}
              <button className="btn btn-secondary" onClick={retryQuestion} disabled={loading}>
                Redo Question
              </button>
              <button className="btn btn-ghost" onClick={endInterview} disabled={loading && phase === 'summarizing'} style={{ color: 'var(--color-danger)' }}>
                Redo Interview
              </button>
            </div>

          </div>
        );
      })()}

      {/* ─── Final Summary Phase ──────────────────────────────────────── */}
      {phase === 'summarizing' && (
        <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
          <LoaderDots />
          <h3 style={{ marginTop: '24px' }}>Generating Final Summary</h3>
          <p className="text-muted">Analyzing your overall performance across all questions...</p>
        </div>
      )}

      {phase === 'final_results' && (
        <div className="fade-in">
          <div className="card card-highlight" style={{ textAlign: 'center', marginBottom: '24px' }}>
            <ScoreRing score={finalSummary?.overall_score || 0} size={180} strokeWidth={12} label="Overall Score" />
            <p style={{ marginTop: '24px', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              {finalSummary?.summary_message || 'Interview Complete!'}
            </p>
          </div>

          <div className="results-grid">
            <div className="result-card">
              <div className="result-card-title">Key Strengths</div>
              <ul className="feedback-list">
                {finalSummary?.overall_strengths?.map((s, i) => (
                  <li key={i} className="feedback-item">
                    <span className="feedback-icon" style={{ color: 'var(--color-success)' }}>•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="result-card">
              <div className="result-card-title">Areas for Improvement</div>
              <ul className="feedback-list">
                {finalSummary?.overall_weaknesses?.map((w, i) => (
                  <li key={i} className="feedback-item">
                    <span className="feedback-icon" style={{ color: 'var(--color-danger)' }}>•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="result-card" style={{ gridColumn: '1 / -1' }}>
              <div className="result-card-title">Key Takeaways & Next Steps</div>
              <ul className="feedback-list">
                {finalSummary?.key_takeaways?.map((t, i) => (
                  <li key={i} className="feedback-item">
                    <span className="feedback-icon" style={{ color: 'var(--color-primary)' }}>•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <button className="btn btn-primary btn-lg" onClick={endInterview}>
              Redo Interview
            </button>
          </div>
        </div>
      )}

      {showEndPopup && (() => {
        const { hasAnswers, presence, communication, quality, alignment, overallScore } = getEndPopupScores();

        return (
          <div className="modal-overlay" onClick={handleCloseEndPopup} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div 
              className="modal-content modal-content-white" 
              onClick={(e) => e.stopPropagation()} 
              style={{ 
                maxWidth: '580px', 
                width: '90%', 
                maxHeight: '90vh', 
                overflowY: 'auto', 
                borderRadius: '24px', 
                padding: '32px', 
                position: 'relative',
                background: 'linear-gradient(to bottom, #ffffff, #fdfaff)',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
              }}
            >
              {/* Close button */}
              <button
                onClick={handleCloseEndPopup}
                className="modal-close-btn"
                aria-label="Close"
                style={{ fontSize: '1.2rem', top: '20px', right: '20px' }}
              >
                ✕
              </button>

              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <span className="badge badge-skill" style={{ textTransform: 'uppercase', letterSpacing: '1.5px', fontSize: '0.75rem', padding: '6px 16px', background: '#f3e8ff', color: '#6b21a8', borderRadius: '20px', fontWeight: 'bold' }}>
                  Interview Ended
                </span>
                <h3 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '800', color: '#1e1b4b' }}>
                  Overall Performance Summary
                </h3>

                {!hasAnswers ? (
                  <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <svg viewBox="0 0 24 24" width="48" height="48" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#6b21a8' }}>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, maxWidth: '400px' }}>
                      You ended the interview before answering any questions. No performance scores are available for this session.
                    </p>
                    <button 
                      className="btn btn-primary" 
                      onClick={handleCloseEndPopup}
                      style={{ minWidth: '160px', marginTop: '12px' }}
                    >
                      Go to Home
                    </button>
                  </div>
                ) : (
                  <>
                    <p style={{ color: '#4b5563', fontSize: '0.95rem', maxWidth: '420px', margin: '0 auto', lineHeight: '1.5' }}>
                      Great job completing your practice session! Here is your overall performance calculated across all answered questions.
                    </p>

                    {/* Big overall confidence score circle */}
                    <div style={{ 
                      margin: '24px 0', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: 'rgba(59, 130, 246, 0.04)',
                      padding: '24px',
                      borderRadius: '24px',
                      border: '1px solid rgba(59, 130, 246, 0.08)',
                      width: '100%',
                      maxWidth: '280px'
                    }}>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.2px', color: '#4b5563', marginBottom: '12px', fontWeight: '700' }}>
                        Overall Confidence
                      </div>
                      {renderCircularProgressWithPercent(overallScore, '#3b82f6')}
                    </div>

                    {/* The 4 average scores */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '16px', 
                      width: '100%',
                      marginTop: '8px'
                    }}>
                      {/* Face Tracking */}
                      <div style={{ 
                        background: '#f8fafc', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '16px', 
                        padding: '16px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Face Tracking</span>
                        {renderCircularProgressWithPercent(presence, '#3b82f6')}
                      </div>

                      {/* Communication */}
                      <div style={{ 
                        background: '#f8fafc', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '16px', 
                        padding: '16px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Communication</span>
                        {renderCircularProgressWithPercent(communication, '#10b981')}
                      </div>

                      {/* Response Quality */}
                      <div style={{ 
                        background: '#f8fafc', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '16px', 
                        padding: '16px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Response Quality</span>
                        {renderCircularProgressWithPercent(quality, '#f59e0b')}
                      </div>

                      {/* Role Alignment */}
                      <div style={{ 
                        background: '#f8fafc', 
                        border: '1px solid #e2e8f0', 
                        borderRadius: '16px', 
                        padding: '16px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569' }}>Role Alignment</span>
                        {renderCircularProgressWithPercent(alignment, '#a855f7')}
                      </div>
                    </div>

                    <div style={{ marginTop: '28px', width: '100%' }}>
                      <button 
                        className="btn btn-primary btn-lg" 
                        onClick={handleCloseEndPopup}
                        style={{ width: '100%', borderRadius: '12px' }}
                      >
                        Close & Go to Home
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
