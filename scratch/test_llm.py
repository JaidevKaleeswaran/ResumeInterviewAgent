import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
api_key = os.getenv("GEMINI_API_KEY")
print(f"API Key present: {bool(api_key)}")

genai.configure(api_key=api_key)

print("\n--- Testing listing models ---")
try:
    models = genai.list_models()
    for m in models:
        print(f"Name: {m.name}, Supported Methods: {m.supported_generation_methods}")
except Exception as e:
    print(f"Listing failed: {e}")

print("\n--- Testing gemini-2.0-flash ---")
try:
    model = genai.GenerativeModel("gemini-2.0-flash")
    resp = model.generate_content("Say hello!")
    print(f"gemini-2.0-flash response: {resp.text}")
except Exception as e:
    print(f"gemini-2.0-flash failed: {e}")

print("\n--- Testing gemini-2.5-flash ---")
try:
    model = genai.GenerativeModel("gemini-2.5-flash")
    resp = model.generate_content("Say hello!")
    print(f"gemini-2.5-flash response: {resp.text}")
except Exception as e:
    print(f"gemini-2.5-flash failed: {e}")
