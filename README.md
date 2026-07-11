# 🚀 AI Career Agent — Multimodal Interview Coaching

An AI-powered career development platform that helps students generate resumes, build LinkedIn profiles, match with jobs, and practice interviews with real-time video and speech analysis.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![Python](https://img.shields.io/badge/Python-3.11-green) ![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal) ![License](https://img.shields.io/badge/license-MIT-purple)

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📄 **Resume Generator** | Paste unstructured text → get an ATS-optimized resume |
| 💼 **LinkedIn Profile** | Auto-generated LinkedIn headline, about, experience |
| 🎯 **Job Matching** | Semantic similarity matching with 12 job descriptions |
| 📊 **Resume Scoring** | Score (0-100) with strengths, weaknesses, suggestions |
| 🎥 **Interview Coach** | Live video + speech + AI feedback with confidence scoring |

## 🏗️ Architecture

```
Frontend (React + Vite)  ←→  Backend (Python FastAPI)  ←→  AI Services
├─ Dashboard UI              ├─ Resume Generator            ├─ Gemini API
├─ Interview Coach           ├─ LinkedIn Generator           ├─ Sentence Transformers
├─ Face Detection            ├─ Job Matcher (Embeddings)     ├─ ElevenLabs (optional)
└─ Speech Recognition        ├─ Resume Scorer                └─ Whisper (optional)
                             └─ Interview Analyzer
```

## 🚀 Quick Start

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Gemini API Key** (free at [aistudio.google.com](https://aistudio.google.com/))

### 1. Clone & Setup

```bash
# Create .env file
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 2. Start Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Mac/Linux
# venv\Scripts\activate       # Windows

pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the App

Visit **http://localhost:5173** in your browser.

## 📋 Demo Flow

1. **Resume Tab**: Paste your achievements → Click "Generate Resume"
2. **LinkedIn Tab**: Auto-generates from your resume data
3. **Jobs Tab**: Auto-matches your profile with job descriptions
4. **Score Tab**: AI evaluates your resume (0-100)
5. **Interview Tab**: Select a role → Start mock interview → Camera opens → Answer questions → Get AI coaching

## 🔐 API Keys

| Key | Required | Free Tier | Purpose |
|-----|----------|-----------|---------|
| `GEMINI_API_KEY` | ✅ Yes | ✅ Yes | LLM for all AI features |
| `OPENAI_API_KEY` | ❌ Optional | 💰 Paid | Whisper STT (browser fallback works) |
| `ELEVENLABS_API_KEY` | ❌ Optional | ✅ Limited | Premium TTS voices (browser fallback works) |

## 🌍 SDG Alignment

- **SDG 4** — Quality Education
- **SDG 8** — Decent Work & Economic Growth
- **SDG 10** — Reduced Inequalities

## 📁 Project Structure

```
ai-career-agent/
├── frontend/                  # React + Vite
│   ├── src/
│   │   ├── components/        # UI components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API client
│   │   └── styles/            # CSS design system
│   └── package.json
├── backend/                   # Python FastAPI
│   ├── app/
│   │   ├── services/          # Business logic
│   │   ├── utils/             # LLM client, embeddings
│   │   ├── main.py            # API routes
│   │   ├── models.py          # Pydantic models
│   │   └── config.py          # Settings
│   └── requirements.txt
├── .env.example
└── README.md
```

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite 6, CSS (glassmorphism dark theme)
- **Backend**: FastAPI, Pydantic, uvicorn
- **AI**: Gemini API, Sentence Transformers (all-MiniLM-L6-v2)
- **Optional**: ElevenLabs TTS, OpenAI Whisper STT
