import os
import sys
from dotenv import load_dotenv

# Add app to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"), override=True)

from app.utils.llm_client import generate

try:
    print("Testing Gemini client...")
    res = generate("Say hello in 3 words.")
    print("Success!")
    print(f"Response: {res}")
except Exception as e:
    print(f"Failure: {e}")
