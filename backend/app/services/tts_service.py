"""Text-to-Speech Service — ElevenLabs with browser fallback."""

from __future__ import annotations

import base64
import httpx
from app.config import settings
from app.models import TTSResponse

ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1/text-to-speech"


async def text_to_speech(text: str, voice_id: str | None = None) -> TTSResponse:
    """Convert text to speech using ElevenLabs API or signal browser fallback."""

    if not settings.has_elevenlabs:
        # Signal the frontend to use browser SpeechSynthesis
        return TTSResponse(
            audio_base64=None,
            fallback_text=text,
            use_browser_tts=True,
        )

    vid = voice_id or settings.ELEVENLABS_VOICE_ID

    try:
        print(f"🔊 ElevenLabs: Generating speech for '{text[:50]}...'")
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{ELEVENLABS_API_URL}/{vid}",
                headers={
                    "xi-api-key": settings.ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "text": text,
                    "model_id": settings.ELEVENLABS_MODEL_ID,
                    "voice_settings": {
                        "stability": 0.5,
                        "similarity_boost": 0.75,
                    },
                },
                timeout=30.0,
            )
            response.raise_for_status()

            audio_base64 = base64.b64encode(response.content).decode("utf-8")
            return TTSResponse(
                audio_base64=audio_base64,
                fallback_text=None,
                use_browser_tts=False,
            )

    except Exception:
        # Fallback to browser TTS on any error
        return TTSResponse(
            audio_base64=None,
            fallback_text=text,
            use_browser_tts=True,
        )
