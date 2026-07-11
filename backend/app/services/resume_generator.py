"""Resume Generator Service — extracts structured data from unstructured text."""

from __future__ import annotations

from app.utils.llm_client import generate_json
from app.models import ResumeData, ResumeResponse

RESUME_PROMPT = """You are an expert career coach and professional resume writer specializing in ATS (Applicant Tracking Systems). 
Analyze the following unstructured text and extract a highly structured, professional, and ATS-optimized resume.

CRITICAL INSTRUCTION: You MUST base the resume strictly on the user's provided input. Do NOT hallucinate or assume a "Software Engineer" background unless explicitly stated. If the user describes a different profession (e.g., Uber driver, teacher, plumber), build the resume specifically for THAT profession using their details. Do NOT invent technical skills or projects that the user did not provide.

INPUT TEXT:
{raw_text}

Extract and return a JSON object with EXACTLY these fields:
{{
    "name": "Full name (Professional casing)",
    "email": "Email address",
    "phone": "Phone number",
    "location": "City, State",
    "summary": "A compelling 2-3 sentence executive summary. Use high-impact action verbs and quantify achievements if possible.",
    "skills": [
        "Skill 1 (e.g. Python)",
        "Skill 2 (e.g. Data Analysis)",
        "Skill 3 (e.g. Project Management)"
    ],
    "projects": [
        {{
            "name": "Project Name",
            "description": "Professional description highlighting technical challenges and results. Use bullet points (quantify if possible).",
            "technologies": ["tech1", "tech2"]
        }}
    ],
    "experience": [
        {{
            "title": "Professional Job Title",
            "company": "Company Name",
            "location": "City, State",
            "duration": "Month Year – Month Year (or 'Present')",
            "description": "Highly professional bullet points of achievements. Each bullet MUST start on a new line with a bullet character (•). Each bullet MUST follow: Action Verb + Task/Project + Quantifiable Result (e.g., 'Increased efficiency by 20%')."
        }}
    ],
    "education": [
        {{
            "degree": "Degree and Major",
            "school": "University Name",
            "location": "City, State",
            "year": "Month Year",
            "gpa": "GPA (if above 3.5, otherwise omit)"
        }}
    ],
    "achievements": ["Key professional or academic achievements with metrics"],
    "certifications": ["Professional certifications"]
}}

SKILLS FORMATTING RULE: Group skills by category using the format "Category: value1, value2, value3". Use logical groups such as: Databases, ETL Tools, Scripting/Languages, Cloud Platforms, Big Data, Version Manager, Automation Tools, Reporting Tools, Tools, Frameworks. Only include categories that have skills from the user's input.

ATS RULES:
- Use standard section headers.
- Quantify impact with numbers, percentages, or dollar amounts.
- Focus on hard skills and technical results.
- Use reverse-chronological order for experience.
"""


def analyze_resume_for_gaps(raw_text: str) -> dict:
    """
    Analyze the user's raw text for missing key resume details.
    Generates 2-4 professional, helpful clarifying questions if gaps are found.
    """
    if not raw_text or len(raw_text.strip()) < 20:
        # Extremely short text -> definitely need clarifying questions
        return {
            "has_missing_info": True,
            "questions": [
                "Could you tell us your full name, email, and location?",
                "What target role are you applying for, and what are your main skills?",
                "Can you describe 1 or 2 of your key work experiences or projects?"
            ]
        }

    analysis_prompt = f"""You are an expert resume writer and career coach.
Analyze the following candidate's raw professional experience / draft resume text.
Identify key missing details that would make their resume stand out (e.g., missing contact details, missing timelines/dates for jobs, missing technical skills/tools, missing projects, or lack of quantitative achievements/metrics).

CRITICAL INSTRUCTION: You MUST verify if the candidate provided their Full Name. If their name is NOT present in the text, your FIRST question MUST ask for their full name and contact information.

INPUT TEXT:
{raw_text}

Generate 2 to 4 highly specific, polite, and helpful clarifying questions that, if answered, would drastically improve their resume quality. Focus on capturing their name (if missing), dates, tools used, metrics, or missing contact info.

Return a JSON object with EXACTLY these fields:
{{
    "has_missing_info": true or false,
    "questions": ["Question 1?", "Question 2?", "Question 3?"]
}}
"""
    try:
        result = generate_json(analysis_prompt)
        if isinstance(result, dict) and "questions" in result:
            questions = [q for q in result["questions"] if q and isinstance(q, str)]
            return {
                "has_missing_info": bool(result.get("has_missing_info", len(questions) > 0)),
                "questions": questions[:4]  # limit to max 4 questions
            }
    except Exception as e:
        print(f"⚠️ Resume gap analysis failed: {e}")

    # Fallback to no gaps if the analyzer fails
    return {"has_missing_info": False, "questions": []}


def generate_resume(raw_text: str, answers: dict = None) -> ResumeResponse:
    """Generate a structured resume from unstructured text input, optionally integrating answers to clarifying questions."""
    combined_text = raw_text
    if answers:
        answers_str = "\n".join([f"Q: {q}\nA: {a}" for q, a in answers.items() if a])
        if answers_str:
            combined_text += f"\n\n--- ADDITIONAL CLARIFYING DETAILS PROVIDED BY USER ---\n{answers_str}"

    prompt = RESUME_PROMPT.format(raw_text=combined_text)
    data = generate_json(prompt)
    if not data or not any(data.values()):
        raise ValueError("AI failed to extract any resume data. The input text might be too short or invalid.")

    resume = ResumeData(**data)

    # Generate formatted text version
    formatted = _format_resume_text(resume)

    return ResumeResponse(resume=resume, formatted_text=formatted)


def _format_resume_text(r: ResumeData) -> str:
    """Create a high-quality plain-text formatted version of the resume."""
    lines = []
    lines.append(f"{r.name.upper()}")
    contact = " | ".join(filter(None, [r.email, r.phone, r.location]))
    if contact:
        lines.append(contact)
    lines.append("-" * len(lines[0]))

    if r.summary:
        lines.append(f"\nPROFESSIONAL SUMMARY")
        lines.append(f"{'-' * 40}")
        lines.append(r.summary)

    if r.skills:
        lines.append(f"\nSKILLS")
        lines.append(f"{'-' * 40}")
        skills_list = r.skills if isinstance(r.skills, list) else [r.skills]
        lines.append(" • ".join(str(s) for s in skills_list))

    if r.experience:
        lines.append(f"\nEXPERIENCE")
        lines.append(f"{'-' * 40}")
        for exp in r.experience:
            lines.append(f"\n{exp.get('title', '')} — {exp.get('company', '')}")
            lines.append(f"{exp.get('duration', '')}")
            desc = exp.get("description", "")
            if isinstance(desc, list):
                desc = "\n".join(f"• {d}" for d in desc)
            elif desc:
                desc = str(desc)
            lines.append(desc)

    if r.projects:
        lines.append(f"\nPROJECTS")
        lines.append(f"{'-' * 40}")
        for proj in r.projects:
            tech_raw = proj.get("technologies", [])
            tech = ", ".join(str(t) for t in (tech_raw if isinstance(tech_raw, list) else [tech_raw]))
            lines.append(f"\n{proj.get('name', '')} [{tech}]")
            desc = proj.get("description", "")
            if isinstance(desc, list):
                desc = "\n".join(f"• {d}" for d in desc)
            elif desc:
                desc = str(desc)
            lines.append(desc)

    if r.education:
        lines.append(f"\nEDUCATION")
        lines.append(f"{'-' * 40}")
        for edu in r.education:
            gpa = f" — GPA: {edu.get('gpa', '')}" if edu.get("gpa") else ""
            lines.append(f"{edu.get('degree', '')} — {edu.get('school', '')} ({edu.get('year', '')}){gpa}")

    if r.achievements:
        lines.append(f"\nACHIEVEMENTS")
        lines.append(f"{'-' * 40}")
        for ach in r.achievements:
            lines.append(f"• {ach}")

    if r.certifications:
        lines.append(f"\nCERTIFICATIONS")
        lines.append(f"{'-' * 40}")
        for cert in r.certifications:
            lines.append(f"• {cert}")

    return "\n".join(lines)
