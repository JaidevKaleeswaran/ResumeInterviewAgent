"""Resume Scoring & Feedback Service."""

from app.utils.llm_client import generate_json
from app.models import ResumeData, ResumeScoringResponse

SCORING_PROMPT = """You are an expert resume reviewer and ATS (Applicant Tracking System) specialist.
Evaluate the following resume and provide detailed scoring and feedback.

RESUME DATA:
Name: {name}
Summary: {summary}
Skills: {skills}
Experience: {experience}
Projects: {projects}
Education: {education}
Achievements: {achievements}
Certifications: {certifications}

Evaluate on these criteria:
1. ATS Compatibility (format, keywords, structure) — 25 points
2. Content Quality (action verbs, quantification, impact) — 25 points
3. Completeness (all sections filled, adequate detail) — 25 points
4. Professional Presentation (summary, skills organization) — 25 points

Return a JSON object with EXACTLY these fields:
{{
    "score": <integer 0-100>,
    "strengths": [
        "Specific strength 1 with details",
        "Specific strength 2 with details",
        "Specific strength 3 with details"
    ],
    "weaknesses": [
        "Specific weakness 1 with details",
        "Specific weakness 2 with details"
    ],
    "suggestions": [
        "Actionable suggestion 1",
        "Actionable suggestion 2",
        "Actionable suggestion 3",
        "Actionable suggestion 4"
    ]
}}

Be specific and actionable. Reference actual content from the resume in your feedback.
"""


def score_resume(resume: ResumeData) -> ResumeScoringResponse:
    """Score a resume and provide detailed feedback."""
    prompt = SCORING_PROMPT.format(
        name=resume.name,
        summary=resume.summary,
        skills=", ".join(str(s) for s in (resume.skills if isinstance(resume.skills, list) else [resume.skills])),
        experience=str(resume.experience),
        projects=str(resume.projects),
        education=str(resume.education),
        achievements=str(resume.achievements),
        certifications=str(resume.certifications),
    )
    data = generate_json(prompt)

    return ResumeScoringResponse(
        score=data.get("score", 0),
        strengths=data.get("strengths", []),
        weaknesses=data.get("weaknesses", []),
        suggestions=data.get("suggestions", []),
    )
