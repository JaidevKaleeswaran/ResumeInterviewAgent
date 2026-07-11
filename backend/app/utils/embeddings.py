"""Embeddings utility — uses Gemini embeddings (no torch dependency)."""

from __future__ import annotations

import numpy as np
from functools import lru_cache
from app.config import settings


def _embed_gemini(text: str) -> np.ndarray:
    """Generate embedding using Google Gemini API."""
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    result = genai.embed_content(
        model="models/gemini-embedding-001",
        content=text,
    )
    return np.array(result["embedding"], dtype=np.float32)


def _embed_openai(text: str) -> np.ndarray:
    """Fallback: generate embedding using OpenAI API."""
    from openai import OpenAI
    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return np.array(response.data[0].embedding, dtype=np.float32)


def embed(text: str) -> np.ndarray:
    """Generate embedding vector for a text string."""
    if settings.has_gemini:
        return _embed_gemini(text)
    elif settings.has_openai:
        return _embed_openai(text)
    else:
        # Last resort: simple bag-of-words hash embedding
        words = text.lower().split()
        vec = np.zeros(128, dtype=np.float32)
        for w in words:
            idx = hash(w) % 128
            vec[idx] += 1.0
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec


def embed_batch(texts: list[str]) -> np.ndarray:
    """Generate embedding vectors for a list of texts."""
    return np.array([embed(t) for t in texts])


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-8))
