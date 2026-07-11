"""Unified LLM client supporting Gemini (primary) and OpenAI (fallback)."""

import json
import re
from app.config import settings


def _call_gemini(prompt: str, json_mode: bool = True, image_base64: str | None = None, model_name: str | None = None) -> str:
    """Call Google Gemini API with optional image support."""
    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)
    selected_model = model_name or settings.GEMINI_MODEL
    model = genai.GenerativeModel(selected_model)

    generation_config = {}
    if json_mode:
        generation_config["response_mime_type"] = "application/json"

    content = [prompt]
    if image_base64:
        # Handle data URL or raw base64
        if ";" in image_base64 and "," in image_base64:
            mime_type = image_base64.split(';')[0].split(':')[1]
            data = image_base64.split(',')[1]
        else:
            mime_type = 'image/png'
            data = image_base64
        
        content.append({
            'mime_type': mime_type,
            'data': data
        })

    response = model.generate_content(
        content,
        generation_config=generation_config if generation_config else None,
    )
    return response.text


def _call_openai(prompt: str, json_mode: bool = True, image_base64: str | None = None) -> str:
    """Call OpenAI API as fallback."""
    from openai import OpenAI

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    messages = []
    if image_base64:
        # Format for gpt-4o/gpt-4o-mini multimodal
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_base64 if image_base64.startswith("data:") else f"data:image/png;base64,{image_base64}"}
                    }
                ]
            }
        ]
    else:
        messages = [{"role": "user", "content": prompt}]

    kwargs = {}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.7,
        **kwargs,
    )
    return response.choices[0].message.content


def generate(prompt: str, json_mode: bool = True, image_base64: str | None = None) -> str:
    """Generate text using available LLM. Tries Gemini first (with model fallbacks), then OpenAI."""
    if settings.has_gemini:
        # Fallback list of models in case the primary is rate-limited / quota-exceeded
        primary_model = settings.GEMINI_MODEL
        fallback_models = [m for m in ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"] if m != primary_model]
        gemini_models = [primary_model] + fallback_models
        
        last_exception = None
        for model_name in gemini_models:
            try:
                return _call_gemini(prompt, json_mode, image_base64, model_name=model_name)
            except Exception as e:
                last_exception = e
                print(f"⚠️ Gemini ({model_name}) failed: {e}. Trying fallback...")
                
        # If all Gemini models fail, try OpenAI
        if settings.has_openai:
            print(f"⚠️ All Gemini models failed. Falling back to OpenAI...")
            try:
                return _call_openai(prompt, json_mode, image_base64)
            except Exception as openai_err:
                print(f"❌ OpenAI fallback failed: {openai_err}")
                
        # Raise the last Gemini exception if everything failed
        if last_exception:
            raise last_exception
    elif settings.has_openai:
        return _call_openai(prompt, json_mode, image_base64)
    else:
        raise RuntimeError(
            "No LLM API key configured. Set GEMINI_API_KEY or OPENAI_API_KEY in .env"
        )


def generate_json(prompt: str, image_base64: str | None = None) -> dict:
    """Generate and parse JSON from LLM response with robust fallback."""
    raw = ""
    try:
        raw = generate(prompt, json_mode=True, image_base64=image_base64)
        # Clean potential markdown code fences
        cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip()
        cleaned = re.sub(r"```\s*$", "", cleaned).strip()
        # Find the first { and last } to isolate JSON if text is present
        start = cleaned.find('{')
        end = cleaned.rfind('}')
        if start != -1 and end != -1:
            cleaned = cleaned[start:end+1]
        return json.loads(cleaned)
    except Exception as e:
        print(f"❌ JSON Parsing Error: {str(e)}")
        if raw:
            print(f"🔍 Raw Output: {raw}")
        # Return an empty dict to avoid crashing, though the caller might still fail validation
        return {}
