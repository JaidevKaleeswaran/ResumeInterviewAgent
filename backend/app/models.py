"""Pydantic models for all API request/response types."""

from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Optional


# ─── Resume ───────────────────────────────────────────────────────────────────

class ResumeRequest(BaseModel):
    raw_text: str = Field(..., description="Unstructured text input (achievements, experiences, etc.)")
    answers: Optional[dict] = Field(default=None, description="Optional map of question -> answer from clarifying Q&A")

class AnalyzeResumeRequest(BaseModel):
    raw_text: str = Field(..., description="Unstructured text input to inspect for missing information")

class AnalyzeResumeResponse(BaseModel):
    has_missing_info: bool = False
    questions: list[str] = []

class ResumeData(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    summary: str = ""
    skills: list[str] = []
    projects: list[dict] = []
    experience: list[dict] = []
    education: list[dict] = []
    achievements: list[str] = []
    certifications: list[str] = []

class ResumeResponse(BaseModel):
    resume: ResumeData
    formatted_text: str = ""


# ─── LinkedIn ─────────────────────────────────────────────────────────────────

class LinkedInRequest(BaseModel):
    raw_text: str = Field(..., description="Unstructured text or structured profile JSON")

class LinkedInData(BaseModel):
    headline: str = ""
    about: str = ""
    experience: list[dict] = []
    skills: list[str] = []
    recommendations: list[str] = []

class LinkedInResponse(BaseModel):
    linkedin: LinkedInData


# ─── Job Matching ─────────────────────────────────────────────────────────────

class JobMatchRequest(BaseModel):
    skills: list[str] = []
    summary: str = ""
    experience: list[dict] = []
    projects: list[dict] = []

class JobMatch(BaseModel):
    title: str
    company: str
    description: str
    match_percentage: float
    url: str = ""
    matched_skills: list[str] = []
    missing_skills: list[str] = []

class JobMatchResponse(BaseModel):
    matches: list[JobMatch] = []


# ─── Resume Scoring ──────────────────────────────────────────────────────────

class ResumeScoringRequest(BaseModel):
    resume: ResumeData

class ResumeScoringResponse(BaseModel):
    score: int = 0
    strengths: list[str] = []
    weaknesses: list[str] = []
    suggestions: list[str] = []


# ─── Interview ────────────────────────────────────────────────────────────────

class InterviewQuestionRequest(BaseModel):
    role: str = "Software Engineer"
    company: str = ""
    skills: list[str] = []
    question_number: int = 1
    summary: str = ""
    experience: list[dict] | None = None

class InterviewQuestionResponse(BaseModel):
    question: str
    question_number: int
    total_questions: int = 5

class InterviewAnalysisRequest(BaseModel):
    question: str
    transcription: str
    face_detection_ratio: float = 0.0
    head_stability: float = 0.0
    speech_duration_seconds: float = 0.0
    interview_mode: str = "video"

class InterviewFeedbackResponse(BaseModel):
    confidence_score: int = 0
    response_quality_score: int = 0
    answer_grade: str = ""
    summary_of_answer: str = ""
    what_interviewer_was_looking_for: str = ""
    suggested_answer: str = ""
    improvement_areas: str = ""
    face_feedback: str = ""
    speech_feedback: str = ""
    strengths: list[str] = []
    weaknesses: list[str] = []
    communication_tips: list[str] = []
    filler_word_count: int = 0
    filler_words_found: list[str] = []
    interviewer_response: str = ""
    tone_feedback: str = ""
    recruiter_paragraph: str = ""

class InterviewReplyRequest(BaseModel):
    current_question: str
    user_speech: str

class InterviewReplyResponse(BaseModel):
    interviewer_reply: str

class InterviewHistoryItem(BaseModel):
    question: str
    transcription: str
    confidence_score: int

class InterviewSummaryRequest(BaseModel):
    history: list[InterviewHistoryItem]

class InterviewSummaryResponse(BaseModel):
    overall_score: int = 0
    overall_strengths: list[str] = []
    overall_weaknesses: list[str] = []
    key_takeaways: list[str] = []
    summary_message: str = ""


# ─── Coding Challenge ────────────────────────────────────────────────────────

class CodingChallengeRequest(BaseModel):
    role: str = "Software Engineer"
    company: str = ""
    skills: list[str] = []
    summary: str = ""
    experience: list[dict] | None = None

class CodingChallengeResponse(BaseModel):
    problem_title: str = ""
    problem_description: str = ""
    difficulty: str = "Medium"
    examples: list[dict] = []
    constraints: list[str] = []
    hints: list[str] = []

class CodingAnalysisRequest(BaseModel):
    problem_title: str
    problem_description: str
    transcription: str
    speech_duration_seconds: float = 0.0
    code_shared: bool = False
    screenshot: str | None = None # Base64 encoded screenshot of the shared screen

class CodingFeedbackResponse(BaseModel):
    confidence_score: int = 0
    problem_solving_feedback: str = ""
    communication_feedback: str = ""
    code_quality_feedback: str = ""
    strengths: list[str] = []
    weaknesses: list[str] = []
    tips: list[str] = []
    tone_feedback: str = ""


# ─── TTS ──────────────────────────────────────────────────────────────────────

class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None

class TTSResponse(BaseModel):
    audio_base64: Optional[str] = None
    fallback_text: Optional[str] = None
    use_browser_tts: bool = False


# ─── A2A Protocol ────────────────────────────────────────────────────────────

class A2AHandoffRequest(BaseModel):
    raw_text: str = Field(..., description="Raw text to process through the A2A Resume→Interview handoff pipeline")

class A2AHandoffResponse(BaseModel):
    success: bool = False
    resume: dict = {}
    first_question: dict = {}
    a2a_metadata: dict = {}
    error: str = ""
