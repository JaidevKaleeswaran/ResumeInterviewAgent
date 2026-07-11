import { useState, useRef, useCallback } from 'react';
import { api } from '../services/api';

/**
 * Hybrid live transcription hook.
 *
 * Strategy (runs BOTH simultaneously):
 *  1. Browser SpeechRecognition for instant live text (if available)
 *  2. Backend Whisper/Gemini as a quality backup sent every CHUNK_INTERVAL_MS
 *
 * Whichever produces text first wins. The backend result replaces the browser
 * result if it's longer (higher quality).
 */

const CHUNK_INTERVAL_MS = 6000;

export function useLiveTranscription() {
  const [transcription, setTranscription] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Recording refs
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const allChunksRef = useRef([]);
  const intervalRef = useRef(null);
  const activeRef = useRef(false);
  const transcriptRef = useRef('');

  // Audio level refs
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const levelFrameRef = useRef(null);

  // Browser STT refs
  const recognitionRef = useRef(null);
  const browserTranscriptRef = useRef('');

  // ── Audio level meter ─────────────────────────────────────────────────
  const startLevelMeter = useCallback((stream) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream).connect(analyser);
      analyser.fftSize = 256;
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buf);
        const avg = buf.reduce((s, v) => s + v, 0) / buf.length;
        setAudioLevel(avg);
        levelFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (_) { /* non-critical */ }
  }, []);

  const stopLevelMeter = useCallback(() => {
    if (levelFrameRef.current) cancelAnimationFrame(levelFrameRef.current);
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // ── Browser SpeechRecognition (instant but unreliable) ─────────────────
  const startBrowserSTT = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return; // Not available — backend-only mode

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const browserText = finalTranscript + interim;
      browserTranscriptRef.current = browserText;

      // Use browser text immediately if backend hasn't produced anything yet
      // or if browser has more text
      if (browserText.length > transcriptRef.current.length) {
        transcriptRef.current = browserText;
        setTranscription(browserText);
      }
    };

    recognition.onerror = (event) => {
      console.warn('Browser STT error (non-fatal):', event.error);
      // Don't set error state — backend is the primary, browser is bonus
    };

    recognition.onend = () => {
      // Auto-restart if still active
      if (activeRef.current) {
        try { recognition.start(); } catch (_) {}
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      console.log('Browser STT started (bonus layer)');
    } catch (_) {}
  }, []);

  const stopBrowserSTT = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
      recognitionRef.current = null;
    }
  }, []);

  // ── Backend STT flush (Now only called ONCE at the end) ───────────────
  const processFinalAudio = async (blob) => {
    if (!blob || blob.size < 1000) return;
    try {
      setStatus('processing');
      const result = await api.speechToText(blob);
      if (result.transcription && result.transcription.trim().length > 0) {
        // Backend produced text — override browser text entirely for final analysis
        // because backend (Whisper/Gemini) is much more accurate.
        transcriptRef.current = result.transcription;
        setTranscription(result.transcription);
      }
    } catch (err) {
      console.warn('Final STT processing failed:', err);
    } finally {
      setStatus('');
    }
  };

  // ── Public API ────────────────────────────────────────────────────────
  const startTranscription = useCallback(async () => {
    setError(null);
    setTranscription('');
    transcriptRef.current = '';
    browserTranscriptRef.current = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      allChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          allChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      activeRef.current = true;
      setStatus('listening');

      startLevelMeter(stream);

      // Start browser STT for visual feedback
      startBrowserSTT();


      return stream;
    } catch (err) {
      setError('Microphone access denied. Please allow mic access and reload.');
      throw err;
    }
  }, [startLevelMeter, startBrowserSTT]);

  const stopTranscription = useCallback(async () => {
    activeRef.current = false;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    stopBrowserSTT();
    stopLevelMeter();

    // Stop MediaRecorder
    const finalBlob = await new Promise((resolve) => {
      const rec = mediaRecorderRef.current;
      if (rec && rec.state === 'recording') {
        rec.onstop = () => {
          const blob = new Blob(allChunksRef.current, { type: 'audio/webm' });
          resolve(blob);
        };
        rec.stop();
      } else {
        resolve(allChunksRef.current.length
          ? new Blob(allChunksRef.current, { type: 'audio/webm' })
          : null);
      }
    });

    // Stop mic
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Final flush and wait for backend transcription
    if (finalBlob && finalBlob.size > 1000) {
      await processFinalAudio(finalBlob);
    }

    setStatus('');
    return { blob: finalBlob, text: transcriptRef.current.trim() };
  }, [processFinalAudio, stopLevelMeter, stopBrowserSTT]);

  return {
    transcription,
    setTranscription,
    status,
    error,
    audioLevel,
    startTranscription,
    stopTranscription,
  };
}
