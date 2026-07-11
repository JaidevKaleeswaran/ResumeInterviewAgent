"""Interview Agent — A2A-compliant agent that conducts tailored mock interviews."""

import json
from python_a2a import A2AServer, TaskStatus, TaskState, AgentCard, AgentSkill


class InterviewAgent(A2AServer):
    """
    A2A Agent that receives structured resume profile data and generates
    tailored interview questions. Wraps the existing interview_service.
    """

    def __init__(self):
        super().__init__(
            agent_card=AgentCard(
                name="Interview Agent",
                description=(
                    "AI-powered Interview Coach agent. Receives a candidate's "
                    "structured profile (role, skills, experience) and generates "
                    "tailored behavioral and technical interview questions with "
                    "real-time feedback and analysis."
                ),
                url="http://localhost:5002",
                version="1.0.0",
                skills=[
                    AgentSkill(
                        name="Generate Interview Question",
                        description="Generate a tailored interview question based on candidate profile",
                        tags=["interview", "question", "career"],
                        examples=["Generate an interview question for a Software Engineer with React skills"],
                    ),
                    AgentSkill(
                        name="Analyze Interview Response",
                        description="Analyze a candidate's interview answer and provide detailed feedback",
                        tags=["interview", "analysis", "feedback"],
                        examples=["Analyze this interview response and score it"],
                    ),
                ],
            )
        )

    def handle_task(self, task):
        """Process an interview question generation task via the A2A protocol."""
        from app.services import interview_service

        # Extract the profile data from the A2A message
        message_data = task.message or {}
        content = message_data.get("content", {})
        text = content.get("text", "") if isinstance(content, dict) else str(content)

        if not text.strip():
            task.status = TaskStatus(
                state=TaskState.INPUT_REQUIRED,
                message={
                    "role": "agent",
                    "content": {
                        "type": "text",
                        "text": "Please provide the candidate's profile data to generate interview questions.",
                    },
                },
            )
            return task

        try:
            # Parse the profile data from the message text (expects JSON)
            profile = json.loads(text)

            role = "Professional"
            skills = profile.get("skills", [])
            summary = profile.get("summary", "")
            experience = profile.get("experience", [])

            # Determine role from experience if available
            if experience and len(experience) > 0:
                role = experience[0].get("title", role)

            # Generate the first interview question using existing service
            question_response = interview_service.generate_question(
                role=role,
                skills=skills,
                question_number=1,
                summary=summary,
                experience=experience,
            )

            # Package the result as an A2A artifact
            result = {
                "question": question_response.question,
                "question_number": question_response.question_number,
                "total_questions": question_response.total_questions,
                "role": role,
                "skills_used": skills[:8],
            }

            task.artifacts = [
                {
                    "parts": [
                        {
                            "type": "text",
                            "text": json.dumps(result, indent=2),
                        }
                    ]
                }
            ]
            task.status = TaskStatus(state=TaskState.COMPLETED)
        except json.JSONDecodeError:
            task.status = TaskStatus(
                state=TaskState.FAILED,
                message={
                    "role": "agent",
                    "content": {
                        "type": "text",
                        "text": "Invalid profile data format. Expected JSON with skills, summary, and experience.",
                    },
                },
            )
        except Exception as e:
            task.status = TaskStatus(
                state=TaskState.FAILED,
                message={
                    "role": "agent",
                    "content": {
                        "type": "text",
                        "text": f"Interview question generation failed: {str(e)}",
                    },
                },
            )

        return task
