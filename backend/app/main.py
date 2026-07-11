"""AI Career Agent — FastAPI Backend Application."""

import sys
import os
# Allow running this file directly as a script
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import io

from app.config import settings
from app.models import (
    ResumeRequest, ResumeResponse,
    LinkedInRequest, LinkedInResponse,
    JobMatchRequest, JobMatchResponse,
    ResumeScoringRequest, ResumeScoringResponse,
    InterviewQuestionRequest, InterviewQuestionResponse,
    InterviewReplyRequest, InterviewReplyResponse,
    InterviewAnalysisRequest, InterviewFeedbackResponse,
    InterviewSummaryRequest, InterviewSummaryResponse,
    CodingChallengeRequest, CodingChallengeResponse,
    CodingAnalysisRequest, CodingFeedbackResponse,
    TTSRequest, TTSResponse,
    A2AHandoffRequest, A2AHandoffResponse,
    AnalyzeResumeRequest, AnalyzeResumeResponse,
)
from app.services import (
    resume_generator,
    linkedin_generator,
    job_matcher,
    resume_scorer,
    interview_service,
    tts_service,
    stt_service,
    mcp_client,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print("🚀 AI Career Agent backend starting...")
    print(f"   Gemini API: {'✅ configured' if settings.has_gemini else '❌ not set'}")
    print(f"   OpenAI API: {'✅ configured' if settings.has_openai else '⚠️  not set (optional)'}")
    print(f"   ElevenLabs: {'✅ configured' if settings.has_elevenlabs else '⚠️  not set (optional)'}")
    # Start A2A agent servers in background threads
    try:
        from app.agents.orchestrator import start_agent_servers
        start_agent_servers()
    except Exception as e:
        print(f"⚠️  A2A agent servers failed to start: {e}")
    yield
    print("👋 AI Career Agent backend shutting down.")


app = FastAPI(
    title="AI Career Agent",
    description="AI-powered career coaching with resume generation, job matching, and interview practice",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    """Check API health and configured services."""
    return {
        "status": "healthy",
        "services": {
            "llm": "gemini" if settings.has_gemini else ("openai" if settings.has_openai else "none"),
            "tts": "elevenlabs" if settings.has_elevenlabs else "browser",
            "stt": "whisper" if settings.has_openai else "browser",
        },
    }


# ─── Resume Generation & Analysis ─────────────────────────────────────────────

@app.post("/api/analyze-resume", response_model=AnalyzeResumeResponse)
async def analyze_resume(request: AnalyzeResumeRequest):
    """Analyze draft resume text for key missing details and generate clarifying questions."""
    try:
        return resume_generator.analyze_resume_for_gaps(request.raw_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-resume", response_model=ResumeResponse)
async def generate_resume(request: ResumeRequest):
    """Generate a structured resume from unstructured text and optional Q&A answers."""
    try:
        return resume_generator.generate_resume(request.raw_text, request.answers)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── LinkedIn Profile ────────────────────────────────────────────────────────

@app.post("/api/generate-linkedin", response_model=LinkedInResponse)
async def generate_linkedin(request: LinkedInRequest):
    """Generate a LinkedIn profile from text input."""
    try:
        return linkedin_generator.generate_linkedin(request.raw_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/automate-linkedin")
async def automate_linkedin(request: LinkedInRequest):
    """Use MCP to automatically update LinkedIn profile."""
    try:
        data = linkedin_generator.generate_linkedin(request.raw_text)
        # Trigger the MCP browser automation
        result = await mcp_client.update_linkedin_via_mcp(data.linkedin.model_dump())
        return {"status": "success", "message": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Job Matching ─────────────────────────────────────────────────────────────

@app.post("/api/match-jobs", response_model=JobMatchResponse)
async def match_jobs(request: JobMatchRequest):
    """Match user profile with job descriptions."""
    try:
        return job_matcher.match_jobs(
            skills=request.skills,
            summary=request.summary,
            experience=request.experience,
            projects=request.projects,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Resume Scoring ──────────────────────────────────────────────────────────

@app.post("/api/score-resume", response_model=ResumeScoringResponse)
async def score_resume(request: ResumeScoringRequest):
    """Score a resume and provide feedback."""
    try:
        return resume_scorer.score_resume(request.resume)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Interview Questions ─────────────────────────────────────────────────────

@app.post("/api/interview/question", response_model=InterviewQuestionResponse)
async def get_interview_question(request: InterviewQuestionRequest):
    """Generate an interview question."""
    try:
        # Extract skills and summary/experience if available for better tailoring
        return interview_service.generate_question(
            role=request.role,
            company=request.company,
            skills=request.skills,
            question_number=request.question_number,
            summary=getattr(request, 'summary', ""),
            experience=getattr(request, 'experience', None)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Interview Analysis & Conversation ──────────────────────────────────────

@app.post("/api/interview/reply", response_model=InterviewReplyResponse)
async def reply_to_interview_question(request: InterviewReplyRequest):
    """Handle conversational reply from candidate to interviewer mid-interview."""
    try:
        data = interview_service.reply_to_candidate(
            current_question=request.current_question,
            user_speech=request.user_speech
        )
        return InterviewReplyResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/interview/analyze", response_model=InterviewFeedbackResponse)
async def analyze_interview(request: InterviewAnalysisRequest):
    """Analyze an interview response with multimodal feedback."""
    try:
        return interview_service.analyze_response(
            question=request.question,
            transcription=request.transcription,
            face_detection_ratio=request.face_detection_ratio,
            head_stability=request.head_stability,
            speech_duration_seconds=request.speech_duration_seconds,
            interview_mode=request.interview_mode,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/interview/summary", response_model=InterviewSummaryResponse)
async def summarize_interview(request: InterviewSummaryRequest):
    """Generate a final overall summary of the interview."""
    try:
        return interview_service.generate_summary(request.history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Coding Challenge ────────────────────────────────────────────────────────

@app.post("/api/interview/coding-challenge", response_model=CodingChallengeResponse)
async def get_coding_challenge(request: CodingChallengeRequest):
    """Generate a LeetCode-style coding challenge."""
    try:
        return interview_service.generate_coding_challenge(
            role=request.role,
            company=request.company,
            skills=request.skills,
            summary=getattr(request, 'summary', ""),
            experience=getattr(request, 'experience', None)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/interview/analyze-coding", response_model=CodingFeedbackResponse)
async def analyze_coding(request: CodingAnalysisRequest):
    """Analyze a candidate's coding challenge response."""
    try:
        return interview_service.analyze_coding_response(
            problem_title=request.problem_title,
            problem_description=request.problem_description,
            transcription=request.transcription,
            speech_duration_seconds=request.speech_duration_seconds,
            code_shared=request.code_shared,
            screenshot=request.screenshot,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Text-to-Speech ──────────────────────────────────────────────────────────

@app.post("/api/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest):
    """Convert text to speech."""
    try:
        return await tts_service.text_to_speech(request.text, request.voice_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Speech-to-Text ──────────────────────────────────────────────────────────

@app.post("/api/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    """Transcribe audio file to text."""
    try:
        audio_bytes = await audio.read()
        return await stt_service.transcribe_audio(audio_bytes, audio.filename or "audio.webm")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── PDF Extraction ──────────────────────────────────────────────────────────

@app.post("/api/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    """Extract text from a PDF file."""
    try:
        # pyrefly: ignore [missing-import]
        import pypdf
        content = await file.read()
        reader = pypdf.PdfReader(io.BytesIO(content))
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        return {"text": text}
    except ImportError:
        raise HTTPException(status_code=501, detail="pypdf is not installed on the server.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    print("Starting AI Career Agent backend directly...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


# ─── A2A Protocol Endpoints ──────────────────────────────────────────────────

@app.get("/api/a2a/agents")
def a2a_get_agents():
    """Return Agent Cards for all A2A agents (discovery endpoint)."""
    try:
        from app.agents.orchestrator import get_agent_cards
        return {"agents": get_agent_cards()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"A2A agent discovery failed: {str(e)}")


@app.post("/api/a2a/handoff", response_model=A2AHandoffResponse)
def a2a_handoff(request: A2AHandoffRequest):
    """Execute the full A2A Resume Agent → Interview Agent handoff."""
    try:
        from app.agents.orchestrator import run_a2a_handoff
        result = run_a2a_handoff(request.raw_text)
        return A2AHandoffResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"A2A handoff failed: {str(e)}")
