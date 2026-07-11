"""Speech-to-Text Service — Gemini with OpenAI Whisper fallback."""

import tempfile
import os
import time
from app.config import settings


async def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> dict:
    """Transcribe audio using Gemini API (primary) or OpenAI Whisper (fallback)."""

    # Skip tiny payloads (likely silence)
    if len(audio_bytes) < 500:
        return {
            "transcription": "",
            "use_browser_stt": False,
            "message": "Audio too short / silent.",
        }

    # ── Try Gemini ────────────────────────────────────────────────────────
    if settings.has_gemini:
        # Try multiple models in case one is rate-limited
        models_to_try = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-1.5-flash"]
        
        for model_name in models_to_try:
            try:
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)

                suffix = os.path.splitext(filename)[1] or ".webm"
                with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                    tmp.write(audio_bytes)
                    tmp_path = tmp.name

                try:
                    audio_file = genai.upload_file(tmp_path, mime_type="audio/webm")
                    model = genai.GenerativeModel(model_name)
                    response = model.generate_content(
                        [
                            "Transcribe the following audio exactly as spoken. "
                            "Output ONLY the transcribed text, nothing else. "
                            "If the audio is silent or unintelligible, output an empty string.",
                            audio_file,
                        ]
                    )
                    transcript = response.text.strip()
                    
                    try:
                        audio_file.delete()
                    except Exception:
                        pass

                    print(f"🎤 Gemini STT ({model_name}): '{transcript[:80]}...'")
                    return {
                        "transcription": transcript if transcript else "",
                        "use_browser_stt": False,
                        "message": f"Transcription successful via Gemini ({model_name}).",
                    }
                finally:
                    os.unlink(tmp_path)

            except Exception as e:
                err_str = str(e)
                print(f"⚠️ Gemini STT ({model_name}) failed: {err_str[:200]}")
                if "429" in err_str or "quota" in err_str.lower():
                    continue  # Try next model
                else:
                    break  # Non-quota error, don't retry other models

    # ── Try OpenAI Whisper as fallback ─────────────────────────────────────
    if settings.has_openai:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)

            suffix = os.path.splitext(filename)[1] or ".webm"
            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            try:
                with open(tmp_path, "rb") as audio_file:
                    transcript = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        response_format="text",
                    )
                print(f"🎤 Whisper STT: '{transcript[:80]}...'")
                return {
                    "transcription": transcript,
                    "use_browser_stt": False,
                    "message": "Transcription successful via Whisper.",
                }
            finally:
                os.unlink(tmp_path)

        except Exception as e:
            print(f"⚠️ OpenAI Whisper STT failed: {e}")

    return {
        "transcription": "",
        "use_browser_stt": False,
        "message": "STT services temporarily rate-limited. Please wait a moment and try again.",
    }
