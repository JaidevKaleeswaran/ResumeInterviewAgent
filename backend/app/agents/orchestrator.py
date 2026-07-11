"""A2A Orchestrator — coordinates the Resume Agent → Interview Agent handoff."""

import json
import threading
import time
from python_a2a import A2AClient, Message, TextContent, MessageRole

from app.agents.resume_agent import ResumeAgent
from app.agents.interview_agent import InterviewAgent


# Singleton agent instances
_resume_agent = None
_interview_agent = None
_agents_started = False


def get_resume_agent() -> ResumeAgent:
    global _resume_agent
    if _resume_agent is None:
        _resume_agent = ResumeAgent()
    return _resume_agent


def get_interview_agent() -> InterviewAgent:
    global _interview_agent
    if _interview_agent is None:
        _interview_agent = InterviewAgent()
    return _interview_agent


def start_agent_servers():
    """Start both A2A agent servers in background threads."""
    global _agents_started
    if _agents_started:
        return

    resume_agent = get_resume_agent()
    interview_agent = get_interview_agent()

    def run_resume():
        try:
            from python_a2a import run_server
            print("🤖 A2A: Resume Agent starting on port 5001...")
            run_server(resume_agent, host="0.0.0.0", port=5001)
        except Exception as e:
            print(f"⚠️ A2A Resume Agent server error: {e}")

    def run_interview():
        try:
            from python_a2a import run_server
            print("🎤 A2A: Interview Agent starting on port 5002...")
            run_server(interview_agent, host="0.0.0.0", port=5002)
        except Exception as e:
            print(f"⚠️ A2A Interview Agent server error: {e}")

    t1 = threading.Thread(target=run_resume, daemon=True)
    t2 = threading.Thread(target=run_interview, daemon=True)
    t1.start()
    t2.start()

    _agents_started = True
    # Give the Flask servers a moment to bind
    time.sleep(1)
    print("✅ A2A: Both agent servers are running.")


def get_agent_cards() -> list[dict]:
    """Return both agent cards as dictionaries for discovery."""
    resume_agent = get_resume_agent()
    interview_agent = get_interview_agent()

    cards = []
    for agent in [resume_agent, interview_agent]:
        card = agent.agent_card
        cards.append({
            "name": card.name,
            "description": card.description,
            "url": card.url,
            "version": card.version,
            "skills": [
                {
                    "name": s.name,
                    "description": s.description,
                    "tags": s.tags,
                    "examples": s.examples,
                }
                for s in card.skills
            ],
        })
    return cards


def run_a2a_handoff(raw_text: str) -> dict:
    """
    Execute the full A2A handoff:
    1. Send raw text to Resume Agent → get structured resume
    2. Send structured resume to Interview Agent → get first question
    Returns both the resume data and the interview question.
    """
    import uuid

    # ── Step 1: Resume Agent processes the raw text ──────────────────────
    print("📋 A2A Handoff: Step 1 — Sending text to Resume Agent...")
    resume_agent = get_resume_agent()

    # Build A2A message
    resume_message = Message(
        content=TextContent(text=raw_text),
        role=MessageRole.USER,
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
    )

    # Create and process task directly (in-process, no HTTP needed)
    from python_a2a import Task
    resume_task = Task(
        id=str(uuid.uuid4()),
        message=resume_message.to_dict(),
    )
    resume_task = resume_agent.handle_task(resume_task)

    # Extract resume data from artifact
    resume_data = {}
    resume_task_status = "unknown"
    if hasattr(resume_task, 'status') and resume_task.status:
        resume_task_status = str(resume_task.status.state.value) if hasattr(resume_task.status.state, 'value') else str(resume_task.status.state)

    if resume_task.artifacts:
        artifact_text = resume_task.artifacts[0].get("parts", [{}])[0].get("text", "{}")
        try:
            resume_data = json.loads(artifact_text)
        except json.JSONDecodeError:
            resume_data = {}

    if not resume_data:
        return {
            "success": False,
            "error": "Resume Agent failed to parse the input text.",
            "a2a_metadata": {
                "resume_agent": {
                    "name": "Resume Agent",
                    "task_id": resume_task.id,
                    "status": resume_task_status,
                },
            },
        }

    print(f"📋 A2A Handoff: Resume Agent completed. Extracted {len(resume_data.get('skills', []))} skills.")

    # ── Step 2: Interview Agent generates first question ────────────────
    print("🎤 A2A Handoff: Step 2 — Sending profile to Interview Agent...")
    interview_agent = get_interview_agent()

    interview_message = Message(
        content=TextContent(text=json.dumps(resume_data)),
        role=MessageRole.USER,
        message_id=str(uuid.uuid4()),
        conversation_id=str(uuid.uuid4()),
    )

    interview_task = Task(
        id=str(uuid.uuid4()),
        message=interview_message.to_dict(),
    )
    interview_task = interview_agent.handle_task(interview_task)

    # Extract question from artifact
    question_data = {}
    interview_task_status = "unknown"
    if hasattr(interview_task, 'status') and interview_task.status:
        interview_task_status = str(interview_task.status.state.value) if hasattr(interview_task.status.state, 'value') else str(interview_task.status.state)

    if interview_task.artifacts:
        artifact_text = interview_task.artifacts[0].get("parts", [{}])[0].get("text", "{}")
        try:
            question_data = json.loads(artifact_text)
        except json.JSONDecodeError:
            question_data = {}

    print(f"🎤 A2A Handoff: Interview Agent completed. Generated question #{question_data.get('question_number', '?')}.")

    return {
        "success": True,
        "resume": resume_data,
        "first_question": question_data,
        "a2a_metadata": {
            "protocol": "A2A (Agent-to-Agent)",
            "version": "1.0",
            "resume_agent": {
                "name": "Resume Agent",
                "task_id": resume_task.id,
                "status": resume_task_status,
                "skills_used": ["Parse Resume", "Extract Skills"],
            },
            "interview_agent": {
                "name": "Interview Agent",
                "task_id": interview_task.id,
                "status": interview_task_status,
                "skills_used": ["Generate Interview Question"],
            },
        },
    }
