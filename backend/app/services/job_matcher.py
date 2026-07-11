"""Job Matching Engine — uses sentence embeddings to match user profiles with jobs."""

from __future__ import annotations

from app.utils.embeddings import embed, cosine_similarity
from app.utils.sample_jobs import SAMPLE_JOBS
from app.models import JobMatch, JobMatchResponse


def _profile_to_text(skills: list[str], summary: str, experience: list[dict], projects: list[dict]) -> str:
    """Convert user profile fields into a single text document for embedding."""
    parts = []
    if summary:
        parts.append(summary)
    if skills:
        skills_list = skills if isinstance(skills, list) else [skills]
        parts.append("Skills: " + ", ".join(str(s) for s in skills_list))
    for exp in experience:
        parts.append(f"{exp.get('title', '')} at {exp.get('company', '')}: {exp.get('description', '')}")
    for proj in projects:
        tech_raw = proj.get("technologies", [])
        tech_list = tech_raw if isinstance(tech_raw, list) else [tech_raw]
        tech = ", ".join(str(t) for t in tech_list)
        parts.append(f"Project {proj.get('name', '')}: {proj.get('description', '')} ({tech})")
    return " ".join(parts)


def _job_to_text(job: dict) -> str:
    """Convert a job description into a single text document for embedding."""
    skills = ", ".join(job.get("skills", []))
    return f"{job['title']} at {job['company']}: {job['description']} Required skills: {skills}"


def match_jobs(
    skills: list[str],
    summary: str = "",
    experience: list[dict] | None = None,
    projects: list[dict] | None = None,
) -> JobMatchResponse:
    """Match user profile against sample job descriptions using embeddings."""
    experience = experience or []
    projects = projects or []

    # Create profile text and embed it
    profile_text = _profile_to_text(skills, summary, experience, projects)
    profile_embedding = embed(profile_text)

    # Score each job
    scored_jobs = []
    user_skills_lower = {s.lower() for s in skills}

    for job in SAMPLE_JOBS:
        job_text = _job_to_text(job)
        job_embedding = embed(job_text)

        # Compute similarity
        similarity = cosine_similarity(profile_embedding, job_embedding)

        # Find matched and missing skills
        job_skills = job.get("skills", [])
        required = {s.lower() for s in job_skills}
        matched = user_skills_lower & required
        missing = required - user_skills_lower

        # Convert match percentage (cosine sim is 0-1, boost it to feel meaningful)
        match_pct = round(min(similarity * 100 * 1.3, 99), 1)

        scored_jobs.append(
            JobMatch(
                title=job["title"],
                company=job["company"],
                description=job["description"],
                match_percentage=match_pct,
                url=job.get("url", ""),
                matched_skills=[s for s in job_skills if s.lower() in matched],
                missing_skills=[s for s in job_skills if s.lower() in missing],
            )
        )

    # Sort by match percentage and return top 5
    scored_jobs.sort(key=lambda x: x.match_percentage, reverse=True)
    return JobMatchResponse(matches=scored_jobs[:5])
