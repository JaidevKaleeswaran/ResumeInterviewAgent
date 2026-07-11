import sys
import os
import json

# Add backend directory to sys.path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.resume_generator import generate_resume

def test_resume_generation():
    inputs = {
        "Construction Worker": "My name is John Doe. I've been working in construction for 10 years. I operate heavy machinery like excavators and bulldozers. I've worked on residential and commercial building projects, ensuring site safety and following blueprints. I live in Seattle, WA.",
        "Uber Driver": "I'm Jane Smith. I've been driving for Uber for 4 years in Chicago. I have a 4.98 rating and completed over 10,000 trips. I'm great with customer service, navigation, and time management. My car is always clean.",
        "Chef": "I am Gordon Baker, a Head Chef with 15 years of experience. I specialize in French cuisine. I managed a team of 20 kitchen staff at Le Petit Restaurant in New York. I created seasonal menus, managed inventory, and reduced food waste by 15%."
    }

    for role, text in inputs.items():
        print(f"\n{'='*50}\nTesting Role: {role}\n{'='*50}")
        try:
            response = generate_resume(text)
            print(response.formatted_text)
        except Exception as e:
            print(f"Error generating resume for {role}: {e}")

if __name__ == "__main__":
    test_resume_generation()
