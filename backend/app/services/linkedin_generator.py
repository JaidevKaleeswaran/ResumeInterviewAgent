"""LinkedIn Profile Generator Service."""

from app.utils.llm_client import generate_json
from app.models import LinkedInData, LinkedInResponse

LINKEDIN_PROMPT = """You are an expert LinkedIn profile optimizer and career coach.
Based on the following input about a person, generate a professional LinkedIn profile.

INPUT:
{raw_text}

Return a JSON object with EXACTLY these fields:
{{
    "headline": "A compelling professional headline (max 120 characters). Use format: Title | Expertise | Value Proposition",
    "about": "A compelling 'About' section (max 2000 characters). Write in first person. Include: who you are, what you do, what drives you, key achievements, and a call to action. Use short paragraphs.",
    "experience": [
        {{
            "title": "Job Title",
            "company": "Company Name",
            "duration": "Start - End",
            "description": "3-4 bullet points using action verbs and metrics. Format for LinkedIn (more conversational than resume)."
        }}
    ],
    "skills": ["Skill 1", "Skill 2", "...up to 15 most relevant skills for LinkedIn endorsements"],
    "recommendations": [
        "A suggested recommendation request message (who to ask and what to say)"
    ]
}}

IMPORTANT:
- The headline should be keyword-rich and compelling
- The about section should tell a story, not just list achievements
- Experience descriptions should be more conversational than a resume
- Skills should be ordered by relevance to the person's career goals
- Include at least one recommendation suggestion
"""


def generate_linkedin(raw_text: str) -> LinkedInResponse:
    """Generate a LinkedIn profile from unstructured text or profile data."""
    prompt = LINKEDIN_PROMPT.format(raw_text=raw_text)
    data = generate_json(prompt)

    linkedin = LinkedInData(**data)
    return LinkedInResponse(linkedin=linkedin)
