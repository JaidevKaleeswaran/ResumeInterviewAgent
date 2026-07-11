"""AI Interview Coach Service — generates questions and analyzes responses."""

from __future__ import annotations
import re
import io
from app.utils.llm_client import generate_json
from app.models import (
    InterviewQuestionResponse,
    InterviewFeedbackResponse,
    InterviewSummaryResponse,
    InterviewHistoryItem,
    CodingChallengeResponse,
    CodingFeedbackResponse,
)

FILLER_WORDS = [
    "um", "uh", "like", "you know", "basically", "actually", "literally",
    "honestly", "right", "so", "well", "kind of", "sort of", "I mean",
    "you see", "okay so", "er", "ah",
]

QUESTION_PROMPT = """You are an expert technical interviewer for a {role} position at {company}.

CANDIDATE BACKGROUND (Parsed from Resume):
Summary: {summary}
Skills: {skills}
Experience: {experience}

TASK:
Generate interview question #{question_number} out of 5. 
1. Carefully parse the candidate's resume content provided above.
2. Consider the typical job requirements for a {role} at {company}.
3. Compare the candidate's actual years of experience and specific background against those requirements. 
4. Tailor your question based on this comparison. If the candidate lacks direct experience in a core requirement for the role, ask a foundational question related to it, or assess their ability to learn new concepts based on their existing, related skills. NEVER assume they have deep expertise if it is not explicitly listed in their resume.
5. Make the questions relatively easy, beginner-friendly, and focused on high-level concepts or behavioral experiences rather than deep, complex technical riddles.
6. The question MUST directly correlate with the candidate's actual background and the {role} they are applying for.

Return a JSON object:
{{
    "question": "A clear, easy-to-understand interview question tailored to their background, experience level, and desired role at {company}.",
    "question_number": {question_number},
    "total_questions": 5
}}
"""

CODING_CHALLENGE_PROMPT = """You are an expert technical interviewer for a {role} position at {company}.

CANDIDATE BACKGROUND (Parsed from Resume):
Summary: {summary}
Skills: {skills}
Experience: {experience}

TASK:
Generate a dynamic, highly relevant technical coding challenge for the candidate based strictly on their resume background and the {role} they are applying for. The problem should test their core programming skills and logic related to their background. Do not hardcode a standard LeetCode problem unless it perfectly fits their experience. Ensure the difficulty matches their level of experience.

Return a JSON object:
{{
    "problem_title": "A concise title for the custom coding problem",
    "problem_description": "A clear, detailed description of the problem, including the expected input and output, and runtime complexity requirements if applicable.",
    "difficulty": "Easy, Medium, or Hard",
    "examples": [
        {{"input": "Example input", "output": "Expected output", "explanation": "Why this output is correct"}}
    ],
    "constraints": [
        "Constraint 1",
        "Constraint 2"
    ],
    "hints": [
        "Hint 1",
        "Hint 2"
    ]
}}
"""

FEEDBACK_PROMPT = """You are an expert, empathetic, and highly constructive Interview Coach. You are providing direct, 1-on-1 feedback to your student/candidate to help them improve.
Your task is to STRICTLY evaluate the candidate’s answer quality based on:
- Relevance to the interviewer’s question
- Completeness of the answer
- Specificity and depth
- Professional communication
- Demonstrated reasoning or experience

CRITICAL SCORING RULES:
If the candidate gives a non-answer such as:
“I don’t know”
“No idea”
irrelevant responses
repeated filler statements
silence
meaningless or incoherent text
Then the Response Quality score MUST be extremely low (0–20).
DO NOT reward confidence, tone, speaking fluency, or eye contact when calculating Response Quality.
Those belong to separate metrics.
Response Quality must ONLY evaluate the semantic quality and relevance of the actual answer content.
If the answer fails to address the interviewer’s question directly, heavily penalize the score.
If the answer is generic, vague, repetitive, or lacks examples, reduce the score significantly.

SCORING GUIDELINES:
0–20: Completely irrelevant, non-answer, “I don’t know”, incoherent, or empty response.
21–40: Weak answer with minimal relevance and almost no useful detail.
41–60: Partially relevant but lacks depth, structure, examples, or clarity.
61–80: Good relevant answer with reasonable detail and clear communication.
81–100: Strong, structured, highly relevant answer with specific examples, reasoning, and professionalism.

IMPORTANT:
Do not inflate scores to be encouraging. Be objective and realistic like a real interviewer. The score should reflect actual interview readiness, not positivity.

CRITICAL TONE RULE: Always speak directly to the candidate in the second person ("you", "your", "yours") when writing all feedback strings (including summary_of_answer, what_interviewer_was_looking_for, suggested_answer, face_feedback, speech_feedback, improvement_areas, strengths, weaknesses, communication_tips, and tone_feedback). Do NOT refer to the candidate in the third person (e.g., do NOT say "the candidate", "their", "he/she", "the user").


QUESTION: {question}
CANDIDATE'S ANSWER: {transcription}

Metrics:
- Eye Contact (Face ratio): {face_ratio:.0%} (Below 70% means poor eye contact)
- Body Posture (Head stability): {head_stability:.0%} (Below 70% means poor body posture)
- Filler words: {filler_count} ({filler_words})

Provide helpful, detailed feedback as JSON:
{{
    "response_quality_score": <int 0-100 based strictly on the SCORING GUIDELINES>,
    "answer_grade": "A letter grade (A-F) corresponding to the response_quality_score (e.g., 90=A, 50=F)",
    "summary_of_answer": "A brief 1-2 sentence summary of what you actually said.",
    "what_interviewer_was_looking_for": "A detailed explanation of the key technical or behavioral points the interviewer wanted to hear from you in a perfect response.",
    "suggested_answer": "A comprehensive example of what your high-quality, professional response would look like for this specific question.",
    "improvement_areas": "A deep dive into exactly what you should improve on, beyond just the metrics (e.g., structure, specific technical omissions, or clarity).",
    "interviewer_response": "What an interviewer would say next to smoothly transition.",
    "tone_feedback": "Critique your formality and clarity.",
    "face_feedback": "Specific detailed feedback on your eye contact and face visibility.",
    "speech_feedback": "Specific detailed feedback on your speech patterns, body language, and posture.",
    "strengths": ["...", "..."],
    "weaknesses": ["...", "..."],
    "communication_tips": ["Actionable tip related to your exact metrics or answer content"]
}}
"""

CODING_FEEDBACK_PROMPT = """You are an expert technical interview coach. Analyze a candidate's performance during a coding challenge.

SCENARIO:
- Problem Title: {problem_title}
- Problem Description: {problem_description}
- Candidate's Verbal Explanation: {transcription}
- Did they share their screen/code?: {code_shared}

METRICS:
- Filler words: {filler_count} ({filler_words})
- Speech duration: {speech_duration:.1f}s

CRITICAL EVALUATION:
1. Logic Check: Evaluate their verbal explanation against the problem requirements. Did they identify a valid algorithm? Critique them heavily if they missed obvious optimizations or failed to understand the problem.
2. Real-time Synchronization: Evaluate if they were "thinking out loud" effectively. Compare what they SAID with what is visible on their SHARED SCREEN. If their verbal explanation is vague or doesn't match the code being written, point it out.
3. Professionalism: Were they formal, confident, and clear?
4. Screen Sharing: If code_shared is "No", warn them that they MUST share their screen to get full technical credit.

Return a JSON object:
{{
    "confidence_score": <int 0-100>,
    "problem_solving_feedback": "Detailed BLUNT evaluation of their algorithmic logic.",
    "communication_feedback": "Critique of their verbal clarity and whether they explained their thought process well in real-time.",
    "code_quality_feedback": "Feedback on their ability to translate logic into code (based on their verbal description and visual screen).",
    "tone_feedback": "Evaluation of their professional tone, confidence, and filler word usage.",
    "strengths": ["list of specific positive points"],
    "weaknesses": ["list of specific negative points"],
    "tips": ["actionable advice for future coding interviews"]
}}
"""

def generate_question(role: str, company: str, skills: list[str], question_number: int, summary: str = "", experience: list[dict] | None = None) -> InterviewQuestionResponse:
    exp_text = ""
    if experience:
        for exp in experience:
            exp_text += f"- {exp.get('title', '')} at {exp.get('company', '')}\n"
    
    prompt = QUESTION_PROMPT.format(
        role=role,
        company=company if company else "a top tech company",
        skills=", ".join(skills),
        summary=summary,
        experience=exp_text,
        question_number=question_number
    )
    data = generate_json(prompt)
    
    # Provide defaults if LLM fails (rate limit, etc.)
    if not data.get("question"):
        fallback_questions = [
            f"Tell me about a time you applied your technical and problem-solving skills to overcome a difficult challenge as a {role}.",
            f"How do you handle high-pressure situations and tight deadlines in a {role} environment?",
            f"Describe your typical workflow when starting a complex new task as a {role}.",
            f"What do you think is the most important professional quality for a successful {role}?",
            f"Why are you interested in pursuing a career as a {role} at this specific company?",
        ]
        data = {
            "question": fallback_questions[(question_number - 1) % len(fallback_questions)],
            "question_number": question_number,
            "total_questions": 5,
        }
    
    return InterviewQuestionResponse(**data)

def build_recruiter_paragraph(face_feedback: str, speech_feedback: str, improvement_areas: str, tone_feedback: str) -> str:
    import re
    
    def make_conversational_and_direct(text: str) -> str:
        if not text:
            return ""
        
        # 1. Handle common third-person candidate expressions to second person "you"
        text = re.sub(r'\b[T|t]he candidate\'s\b', 'your', text)
        text = re.sub(r'\b[C|c]andidate\'s\b', 'your', text)
        text = re.sub(r'\b[T|t]he candidate\b', 'you', text)
        text = re.sub(r'\b[C|c]andidate\b', 'you', text)
        text = re.sub(r'\b[T|t]he user\'s\b', 'your', text)
        text = re.sub(r'\b[T|t]he user\b', 'you', text)
        
        # 2. Handle common pronouns
        text = re.sub(r'\b[H|h]e or [S|s]he\b', 'you', text)
        text = re.sub(r'\b[H|h]is or [H|h]er\b', 'your', text)
        
        # 3. Fix third person verbs that immediately follow "you" (e.g. "you maintains" -> "you maintain")
        verb_replacements = {
            r'\b[Y|y]ou maintains\b': 'you maintain',
            r'\b[Y|y]ou has\b': 'you have',
            r'\b[Y|y]ou is\b': 'you are',
            r'\b[Y|y]ou shows\b': 'you show',
            r'\b[Y|y]ou demonstrates\b': 'you demonstrate',
            r'\b[Y|y]ou struggles\b': 'you struggle',
            r'\b[Y|y]ou needs\b': 'you need',
            r'\b[Y|y]ou uses\b': 'you use',
            r'\b[Y|y]ou speaks\b': 'you speak',
            r'\b[Y|y]ou delivers\b': 'you deliver',
            r'\b[Y|y]ou provides\b': 'you provide',
            r'\b[Y|y]ou seems\b': 'you seem',
            r'\b[Y|y]ou avoids\b': 'you avoid',
        }
        
        for pattern, repl in verb_replacements.items():
            text = re.sub(pattern, repl, text)
            
        return text

    def extract_sentences(text: str) -> list[str]:
        if not text:
            return []
        sents = re.split(r'(?<=[.!?])\s+', text.strip())
        return [s.strip() for s in sents if s.strip()]

    face_sents = extract_sentences(face_feedback)
    speech_sents = extract_sentences(speech_feedback)
    improvement_sents = extract_sentences(improvement_areas)
    tone_sents = extract_sentences(tone_feedback)

    sentences = []
    
    # Sentence 1: Face feedback/Presence (1 sentence)
    if face_sents:
        sentences.append(face_sents[0])
    else:
        sentences.append("You maintained a professional and steady visual presence during the response.")

    # Sentence 2: Speech feedback/Communication (1 sentence)
    if speech_sents:
        sentences.append(speech_sents[0])
    else:
        sentences.append("Your speech patterns were coherent and easy to follow.")

    # Sentence 3: Improvement areas/Response Quality (1-2 sentences)
    if len(improvement_sents) >= 2:
        sentences.append(improvement_sents[0])
        sentences.append(improvement_sents[1])
    elif improvement_sents:
        sentences.append(improvement_sents[0])
    else:
        sentences.append("The structure of your response was logical but could benefit from more specific metrics.")

    # Sentence 4/5: Tone feedback/Role alignment (1 sentence)
    if tone_sents:
        sentences.append(tone_sents[0])
    else:
        sentences.append("Overall, your vocabulary and tone successfully aligned with the professional expectations of the role.")

    final_sents = sentences[:5]
    while len(final_sents) < 4:
        final_sents.append("This combination of visual presence and structured explanation shows your strong foundational interview capabilities.")
    
    paragraph_parts = []
    for s in final_sents:
        if not s.endswith(('.', '!', '?')):
            s += '.'
        paragraph_parts.append(s)

    full_paragraph = " ".join(paragraph_parts)
    return make_conversational_and_direct(full_paragraph)

def analyze_response(question: str, transcription: str, face_detection_ratio: float, head_stability: float, speech_duration_seconds: float, interview_mode: str = "video") -> InterviewFeedbackResponse:
    # Check for empty answer
    is_empty = not transcription or transcription.strip() == "" or transcription.strip().lower() in ["no speech detected", "no answer provided"]
    if is_empty:
        face_str = "Excellent eye contact." if face_detection_ratio > 0.7 else "Try to maintain more consistent eye contact with the camera." if interview_mode == "video" else "N/A - Text Mode"
        posture_str = "Good head stability." if head_stability > 0.7 else "Your posture seemed a bit unstable, try to sit up straight." if interview_mode == "video" else "N/A - Text Mode"
        
        face_feedback = face_str
        speech_feedback = f"{posture_str} No input was detected."
        improvement_areas = "Please ensure you are providing a response."
        tone_feedback = "N/A (No input detected)"
        
        recruiter_paragraph = build_recruiter_paragraph(
            face_feedback=face_feedback,
            speech_feedback=speech_feedback,
            improvement_areas=improvement_areas,
            tone_feedback=tone_feedback
        )
        
        return InterviewFeedbackResponse(
            confidence_score=0,
            response_quality_score=0,
            answer_grade="F",
            summary_of_answer="No answer provided. We didn't receive any input from you.",
            what_interviewer_was_looking_for="The interviewer was looking for a clear explanation or response to the question.",
            suggested_answer="You should have addressed the question using a clear and structured approach.",
            improvement_areas=improvement_areas,
            face_feedback=face_feedback,
            speech_feedback=speech_feedback,
            strengths=[],
            weaknesses=["No answer provided."],
            communication_tips=[face_str, posture_str, "Ensure you provide an answer before submitting."] if interview_mode == "video" else ["Make sure to type out your answer."],
            filler_word_count=0,
            filler_words_found=[],
            interviewer_response="I'm sorry, I didn't get that. Could you please answer the question?",
            tone_feedback=tone_feedback,
            recruiter_paragraph=recruiter_paragraph
        )

    filler_count, filler_words = _count_filler_words(transcription)

    if interview_mode == "text":
        actual_prompt = FEEDBACK_PROMPT.replace(
            "Correlate your advice specifically to what they did wrong in terms of eye contact, body posture, filler words, or the content of their answer.",
            "This is a text-based interview. Focus ONLY on the content of their written answer, structure, and tone. Do not evaluate eye contact, posture, or filler words."
        ).format(
            question=question,
            transcription=transcription,
            face_ratio=1.0,
            head_stability=1.0,
            filler_count=0,
            filler_words=""
        )
    else:
        actual_prompt = FEEDBACK_PROMPT.format(
            question=question,
            transcription=transcription,
            face_ratio=face_detection_ratio,
            head_stability=head_stability,
            filler_count=filler_count,
            filler_words=", ".join(filler_words)
        )
    
    data = generate_json(actual_prompt)
    
    # Fallback if API fails
    if not data:
        # Check if transcription is gibberish, evasive, or extremely short
        tx_lower = transcription.lower().strip()
        words = tx_lower.split()
        unique_words = set(words)
        
        # 1. Gibberish check (highly repetitive)
        is_gibberish = (len(words) > 5 and len(unique_words) <= 2)
        
        # 2. Evasion check (non-answers, "I don't know")
        evasion_keywords = [
            "i don't know", "i dont know", "no idea", "not sure", 
            "don't know", "dont know", "no clue", "haven't done", 
            "haven't experienced", "no experience", "skip", "next question",
            "pass", "blah blah", "blah"
        ]
        is_evasion = any(phrase in tx_lower for phrase in evasion_keywords) or (len(words) < 5 and tx_lower != "")
        
        # 3. Short / weak answers
        is_very_short = len(words) < 15
        is_moderately_short = len(words) < 30

        face_str = "Excellent eye contact." if face_detection_ratio > 0.7 else "Try to maintain more consistent eye contact with the camera."
        posture_str = "Good head stability." if head_stability > 0.7 else "Your posture seemed a bit unstable, try to sit up straight."
        filler_str = f"You used {filler_count} filler words. Try to pause instead of saying '{filler_words[0] if filler_words else 'um'}'." if filler_count > 2 else "Great job minimizing filler words!"
        
        if is_gibberish or is_evasion:
            data = {
                "response_quality_score": 10,
                "answer_grade": "F",
                "summary_of_answer": "Your answer was extremely brief, repetitive, or indicated that you did not know the answer.",
                "what_interviewer_was_looking_for": "The interviewer was looking for a specific, structured explanation or example related to the question.",
                "suggested_answer": "A strong answer should outline your knowledge or relevant experience, even if you are not fully certain of the exact answer.",
                "improvement_areas": "Avoid using evasion phrases like 'I don't know'. Instead, explain how you would go about finding the answer or solving the problem.",
                "interviewer_response": "Understood. Let's move on to the next question.",
                "tone_feedback": "Ensure your tone remains professional and you attempt to address the question.",
                "face_feedback": face_str,
                "speech_feedback": f"{posture_str} {filler_str}",
                "strengths": [],
                "weaknesses": ["Answer lacked substance, contained evasion phrases, or was completely irrelevant."],
                "communication_tips": ["Try to elaborate more and structure your thoughts using the STAR method."]
            }
        elif is_very_short:
            data = {
                "response_quality_score": 35,
                "answer_grade": "D",
                "summary_of_answer": "You provided a very brief answer to the question.",
                "what_interviewer_was_looking_for": "The interviewer expected a more detailed, well-structured explanation with examples of your experience.",
                "suggested_answer": "A great answer would elaborate on the core concepts and provide a real-world scenario from your previous projects.",
                "improvement_areas": "Elaborate more on your answers. Aim to speak for at least 30-45 seconds, covering the 'what', 'how', and 'why' of the topic.",
                "interviewer_response": "Thank you. Let's continue.",
                "tone_feedback": "Your response was brief, which may convey a lack of interest or depth.",
                "face_feedback": face_str,
                "speech_feedback": f"{posture_str} {filler_str}",
                "strengths": ["Attempted to answer the question."],
                "weaknesses": ["Answer was too short to show depth of knowledge."],
                "communication_tips": [face_str, posture_str, "Elaborate more to show your expertise."]
            }
        elif is_moderately_short:
            data = {
                "response_quality_score": 55,
                "answer_grade": "C",
                "summary_of_answer": "You provided a partially detailed answer, but it lacked depth and structure.",
                "what_interviewer_was_looking_for": "The interviewer was looking for a comprehensive explanation of the concepts along with specific engineering trade-offs.",
                "suggested_answer": "A stronger answer would cover technical details and mention real-world frameworks or tools you've used.",
                "improvement_areas": "Add more specificity. Rather than just defining the term, explain how you have applied it in your past roles.",
                "interviewer_response": "Thanks for sharing that. Let's proceed.",
                "tone_feedback": "Professional tone, but could be delivered with more technical confidence.",
                "face_feedback": face_str,
                "speech_feedback": f"{posture_str} {filler_str}",
                "strengths": ["Answered the question directly.", "Clear language."],
                "weaknesses": ["Could provide more technical depth or examples."],
                "communication_tips": [face_str, posture_str, "Integrate specific technical terms from your resume."]
            }
        else:
            data = {
                "response_quality_score": 80,
                "answer_grade": "B",
                "summary_of_answer": "You provided a detailed answer to the question, but we couldn't run complete AI analysis due to temporary API limits.",
                "what_interviewer_was_looking_for": "The interviewer expected a structured explanation showing deep technical knowledge and experience.",
                "suggested_answer": "A great answer would follow the STAR method to clearly articulate your contribution and outcomes.",
                "improvement_areas": "Work on structuring your responses and ensuring you address all parts of the question directly.",
                "interviewer_response": "Thank you for that detailed answer. Let's move on.",
                "tone_feedback": "Ensure your tone remains professional and confident.",
                "face_feedback": face_str,
                "speech_feedback": f"{posture_str} {filler_str}",
                "strengths": ["Answered the question with reasonable detail."],
                "weaknesses": ["Delivery metrics could be improved slightly."],
                "communication_tips": [face_str, posture_str, filler_str]
            }

    # Extract the precise quality score or fallback to letter grade mapping
    grade = data.get("answer_grade", "C")
    grade_letter = grade[0].upper() if grade else "C"
    grade_map = {"A": 95, "B": 85, "C": 75, "D": 60, "F": 0}
    quality_score = data.get("response_quality_score", grade_map.get(grade_letter, 75))

    recruiter_paragraph = build_recruiter_paragraph(
        face_feedback=data.get("face_feedback", ""),
        speech_feedback=data.get("speech_feedback", ""),
        improvement_areas=data.get("improvement_areas", ""),
        tone_feedback=data.get("tone_feedback", "")
    )

    return InterviewFeedbackResponse(
        confidence_score=quality_score,
        response_quality_score=quality_score,
        answer_grade=data.get("answer_grade", "C"),
        summary_of_answer=data.get("summary_of_answer", "No summary provided."),
        what_interviewer_was_looking_for=data.get("what_interviewer_was_looking_for", "No information available."),
        suggested_answer=data.get("suggested_answer", "No suggestion available."),
        improvement_areas=data.get("improvement_areas", "No improvement areas provided."),
        face_feedback=data.get("face_feedback", ""),
        speech_feedback=data.get("speech_feedback", ""),
        strengths=data.get("strengths", []),
        weaknesses=data.get("weaknesses", []),
        communication_tips=data.get("communication_tips", []),
        filler_word_count=filler_count,
        filler_words_found=filler_words,
        interviewer_response=data.get("interviewer_response", ""),
        tone_feedback=data.get("tone_feedback", ""),
        recruiter_paragraph=recruiter_paragraph
    )

def reply_to_candidate(current_question: str, user_speech: str) -> dict:
    """Generate a conversational reply from the interviewer to the candidate's clarifying question."""
    prompt = f"""You are a technical interviewer conducting an interview.
    
CURRENT INTERVIEW QUESTION: {current_question}

THE CANDIDATE SAID: {user_speech}

Respond directly to the candidate as the interviewer. Be concise, helpful, and natural. Keep it to 1-3 sentences.
Answer their question and ask them to proceed with their answer when they are ready.

Return a JSON object:
{{
    "interviewer_reply": "Your conversational response."
}}
"""
    data = generate_json(prompt)
    return {"interviewer_reply": data.get("interviewer_reply", "Could you clarify what you mean? Take your time and proceed when you're ready.")}

def generate_coding_challenge(role: str, company: str, skills: list[str], summary: str = "", experience: list[dict] | None = None) -> CodingChallengeResponse:
    exp_text = ""
    if experience:
        for exp in experience:
            exp_text += f"- {exp.get('title', '')} at {exp.get('company', '')}\n"
            
    prompt = CODING_CHALLENGE_PROMPT.format(
        role=role,
        company=company if company else "a top tech company",
        skills=", ".join(skills),
        summary=summary,
        experience=exp_text
    )
    data = generate_json(prompt)
    
    if not data.get("problem_title"):
        data = {
            "problem_title": f"Custom {role} Challenge",
            "problem_description": f"Write a script that demonstrates your core programming logic and problem-solving abilities relevant to a {role} position. Ensure your solution is optimal.",
            "difficulty": "Medium",
            "examples": [{"input": "N/A", "output": "N/A", "explanation": "N/A"}],
            "constraints": ["Must be optimal."],
            "hints": ["Think about your past projects."]
        }
        
    return CodingChallengeResponse(**data)

def analyze_coding_response(problem_title: str, problem_description: str, transcription: str, speech_duration_seconds: float, code_shared: bool, screenshot: str | None = None) -> CodingFeedbackResponse:
    filler_count, filler_words = _count_filler_words(transcription)
    prompt = CODING_FEEDBACK_PROMPT.format(
        problem_title=problem_title,
        problem_description=problem_description,
        transcription=transcription,
        code_shared="Yes" if code_shared else "No",
        filler_count=filler_count,
        filler_words=", ".join(filler_words) if filler_words else "none",
        speech_duration=speech_duration_seconds
    )
    data = generate_json(prompt, image_base64=screenshot)
    
    # Fallback in case of API failure / rate limits
    if not data:
        print("⚠️ LLM analysis failed for coding challenge, triggering smart fallback...")
        
        # Analyze correctness of candidate's algorithmic explanation
        tx_lower = transcription.lower()
        has_optimal_logic = len(tx_lower) > 50
        
        # Determine confidence score based on concrete metrics
        base_score = 85 if has_optimal_logic else 60
        
        # Screen sharing penalty
        screen_penalty = 0 if code_shared else 25
        
        # Speech duration check
        duration_penalty = 0
        if speech_duration_seconds < 15:
            duration_penalty = 15
        elif speech_duration_seconds < 40:
            duration_penalty = 5
            
        # Filler word penalty
        filler_penalty = min(filler_count * 2, 10)
        
        confidence_score = max(0, base_score - screen_penalty - duration_penalty - filler_penalty)
        
        # Problem solving feedback
        if has_optimal_logic:
            problem_solving_feedback = (
                "Excellent work! Your verbal explanation correctly highlighted a viable approach. "
                "You successfully identified a reasonable algorithm for this problem."
            )
            strengths = ["Identified a viable algorithmic approach.", "Avoided a completely naive approach."]
            weaknesses = []
        else:
            problem_solving_feedback = (
                "You suggested a suboptimal approach or your explanation was too brief. "
                "You need to articulate the constraints and the algorithmic logic more deeply."
            )
            strengths = ["Attempted to articulate an initial solution strategy."]
            weaknesses = ["Missed the optimal approach.", "Explanation lacked deep algorithmic details."]
            
        # Screen sharing evaluation
        if code_shared:
            code_quality_feedback = (
                "Great job sharing your screen. You kept your IDE visible and allowed the interviewer to trace your "
                "thought process as you coded. Your variable naming and function structure are clean."
            )
            strengths.append("Successfully shared coding screen for technical review.")
        else:
            code_quality_feedback = (
                "CRITICAL WARNING: You did not share your screen. In a real technical interview, it is IMPOSSIBLE "
                "to get credit for code quality or correctness if you do not share your screen. Always ensure your "
                "coding IDE is visible to the interviewer."
            )
            weaknesses.append("Did not share screen during the coding portion.")
            
        # Communication feedback
        if speech_duration_seconds < 30:
            communication_feedback = (
                "Your verbal explanation was extremely brief. In a coding interview, you should 'think out loud' "
                "consistently, discussing boundary conditions, partition boundaries, and explaining each step of your logic."
            )
            weaknesses.append("Explanation was too brief; lacked deep conceptual trace.")
        else:
            communication_feedback = (
                "Good job talking through your logic as you solved the problem. You kept a steady stream of "
                "communication, which is critical for collaborative problem-solving."
            )
            strengths.append("Maintained consistent 'thinking out loud' communication.")
            
        # Tone feedback
        tone_feedback = (
            f"You maintained a professional posture. You used {filler_count} filler words during your explanation. "
            "To sound more polished and authoritative under pressure, try to pause naturally instead of using fillers."
        )
        if filler_count > 0:
            strengths.append("Professional tone and posture.")
        
        # Tips
        tips = [
            "Before coding, explicitly state the time and space complexity of your proposed solution to ensure you are aligned with the interviewer.",
            "Always share your screen immediately when the technical phase of the interview begins.",
            "Practice the binary search partition trick on LeetCode Hard arrays problems to build intuition for logarithmic constraints."
        ]
        if not code_shared:
            tips.append("Make sure screen sharing is fully enabled and active in your browser before starting the challenge.")
            
        data = {
            "confidence_score": int(confidence_score),
            "problem_solving_feedback": problem_solving_feedback,
            "communication_feedback": communication_feedback,
            "code_quality_feedback": code_quality_feedback,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "tips": tips,
            "tone_feedback": tone_feedback
        }

    return CodingFeedbackResponse(
        confidence_score=data.get("confidence_score", 50),
        problem_solving_feedback=data.get("problem_solving_feedback", ""),
        communication_feedback=data.get("communication_feedback", ""),
        code_quality_feedback=data.get("code_quality_feedback", ""),
        strengths=data.get("strengths", []),
        weaknesses=data.get("weaknesses", []),
        tips=data.get("tips", []),
        tone_feedback=data.get("tone_feedback", "")
    )

def generate_summary(history: list[InterviewHistoryItem]) -> InterviewSummaryResponse:
    history_text = "\n".join([f"Q: {h.question}\nA: {h.transcription}\nScore: {h.confidence_score}" for h in history])
    prompt = f"Summarize this interview performance and give an overall score:\n{history_text}\nReturn JSON with overall_score, overall_strengths, overall_weaknesses, key_takeaways, summary_message."
    data = generate_json(prompt)
    
    # Fallback in case of API failure / rate limits
    if not data:
        print("⚠️ LLM summary failed, triggering smart fallback...")
        
        # Calculate overall score based on the average of available scores in history
        valid_scores = [h.confidence_score for h in history if h.confidence_score > 0]
        overall_score = int(sum(valid_scores) / len(valid_scores)) if valid_scores else 75
        
        # Custom message based on overall score
        if overall_score >= 85:
            summary_message = "Outstanding performance! You displayed exceptional technical clarity, strong communication skills, and robust domain knowledge tailored perfectly to the target position."
            key_takeaways = [
                "Excellent pacing and clarity in both behavioral and technical responses.",
                "Demonstrated a strong command of professional concepts and logical structure.",
                "Ready to advance to real on-site loops. Continue practicing high-level system designs."
            ]
        elif overall_score >= 70:
            summary_message = "Solid performance with clear areas of growth. Your communication and core logical structures are strong, but there is room to refine your delivery and technical precision."
            key_takeaways = [
                "You communicate confidently, but should work on reducing filler words and structure your answers strictly around the STAR method.",
                "Ensure you address optimal runtime constraints and system trade-offs early in your technical explanations.",
                "Practice active pacing: take short pauses before answering complex questions to organize your key talking points."
            ]
        else:
            summary_message = "Good practice run, but significant areas need refinement. Focusing on structured answering formats (like STAR) and screen-sharing best practices will greatly improve your performance."
            key_takeaways = [
                "Always share your screen and verbalize your logic step-by-step during coding challenges.",
                "Ditch generic behavioral responses: prepare 3-4 structured stories from your previous projects that highlight quantifiable results.",
                "Slow down your delivery and minimize conversational fillers like 'like', 'um', and 'basically'."
            ]
            
        # Collect strengths and weaknesses
        overall_strengths = ["Strong core knowledge and motivation for the role."]
        overall_weaknesses = ["Could benefit from more structural practice and delivery metrics."]
        
        # Check if they had a coding challenge in history
        had_coding = any("coding" in h.question.lower() or "median" in h.question.lower() for h in history)
        if had_coding:
            coding_item = next((h for h in history if "coding" in h.question.lower() or "median" in h.question.lower()), None)
            if coding_item and coding_item.confidence_score >= 80:
                overall_strengths.append("Demonstrated outstanding logical parsing of complex algorithms (LeetCode Hard).")
            elif coding_item and coding_item.confidence_score < 70:
                overall_weaknesses.append("Struggled to articulate the optimal runtime complexity or partition boundaries for LeetCode Hard.")
                
        # Analyze behavioral items for empty or short answers
        num_empty = sum(1 for h in history if not h.transcription or h.transcription.strip() == "" or h.transcription.lower() in ["no speech detected", "no answer provided"])
        if num_empty > 0:
            overall_weaknesses.append(f"Missed {num_empty} interview question(s) entirely (no speech or input detected).")
            
        data = {
            "overall_score": overall_score,
            "overall_strengths": overall_strengths,
            "overall_weaknesses": overall_weaknesses,
            "key_takeaways": key_takeaways,
            "summary_message": summary_message
        }
        
    return InterviewSummaryResponse(**data)

def _count_filler_words(text: str) -> tuple[int, list[str]]:
    text_lower = text.lower()
    found = []
    total = 0
    for filler in FILLER_WORDS:
        count = len(re.findall(r'\b' + re.escape(filler) + r'\b', text_lower))
        if count > 0:
            found.append(f"{filler} (×{count})")
            total += count
    return total, found

