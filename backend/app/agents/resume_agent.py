"""Resume Agent — A2A-compliant agent that parses resumes from raw text."""

import json
from python_a2a import A2AServer, TaskStatus, TaskState, AgentCard, AgentSkill


class ResumeAgent(A2AServer):
    """
    A2A Agent that receives unstructured text and returns a structured resume.
    Wraps the existing resume_generator service.
    """

    def __init__(self):
        super().__init__(
            agent_card=AgentCard(
                name="Resume Agent",
                description=(
                    "AI-powered Resume Builder agent. Receives unstructured text "
                    "about a candidate's experience and generates a structured, "
                    "ATS-optimized resume with skills, experience, and education."
                ),
                url="http://localhost:5001",
                version="1.0.0",
                skills=[
                    AgentSkill(
                        name="Parse Resume",
                        description="Extract structured resume data from unstructured text input",
                        tags=["resume", "parsing", "career"],
                        examples=["Parse my resume from this text: I worked at Google for 3 years..."],
                    ),
                    AgentSkill(
                        name="Extract Skills",
                        description="Identify and list professional skills from candidate text",
                        tags=["skills", "extraction"],
                        examples=["What skills does this candidate have?"],
                    ),
                ],
            )
        )

    def handle_task(self, task):
        """Process a resume parsing task via the A2A protocol."""
        from app.services import resume_generator

        # Extract the raw text from the A2A message
        message_data = task.message or {}
        content = message_data.get("content", {})
        raw_text = content.get("text", "") if isinstance(content, dict) else str(content)

        if not raw_text.strip():
            task.status = TaskStatus(
                state=TaskState.INPUT_REQUIRED,
                message={
                    "role": "agent",
                    "content": {
                        "type": "text",
                        "text": "Please provide your experience text so I can build your resume.",
                    },
                },
            )
            return task

        try:
            # Call the existing resume generation service
            result = resume_generator.generate_resume(raw_text)

            # Package the result as an A2A artifact
            resume_dict = result.resume.model_dump()
            task.artifacts = [
                {
                    "parts": [
                        {
                            "type": "text",
                            "text": json.dumps(resume_dict, indent=2),
                        }
                    ]
                }
            ]
            task.status = TaskStatus(state=TaskState.COMPLETED)
        except Exception as e:
            task.status = TaskStatus(
                state=TaskState.FAILED,
                message={
                    "role": "agent",
                    "content": {
                        "type": "text",
                        "text": f"Resume generation failed: {str(e)}",
                    },
                },
            )

        return task
