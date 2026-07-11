import os
import httpx
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def check_elevenlabs():
    api_key = os.getenv("ELEVENLABS_API_KEY")
    print(f"Checking ElevenLabs key: {api_key[:5]}...")
    async with httpx.AsyncClient() as client:
        # Check voices
        response = await client.get(
            "https://api.elevenlabs.io/v1/voices",
            headers={"xi-api-key": api_key}
        )
        if response.status_code == 200:
            print("✅ ElevenLabs: voices_read permission OK")
        else:
            print(f"❌ ElevenLabs: voices_read permission FAILED: {response.status_code} - {response.text}")

        # Check TTS (minimal text)
        response = await client.post(
            "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM",
            headers={"xi-api-key": api_key, "Content-Type": "application/json"},
            json={"text": "hi", "model_id": "eleven_multilingual_v2"}
        )
        if response.status_code == 200:
            print("✅ ElevenLabs: text_to_speech permission OK")
        else:
            print(f"❌ ElevenLabs: text_to_speech permission FAILED: {response.status_code} - {response.text}")

async def check_openai():
    api_key = os.getenv("OPENAI_API_KEY")
    print(f"Checking OpenAI key: {api_key[:5]}...")
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {api_key}"}
        )
        if response.status_code == 200:
            print("✅ OpenAI key is valid!")
        else:
            print(f"❌ OpenAI key invalid: {response.status_code} - {response.text}")

async def main():
    await check_elevenlabs()
    await check_openai()

if __name__ == "__main__":
    asyncio.run(main())
