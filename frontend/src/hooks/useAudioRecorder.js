import { useState, useRef, useCallback } from 'react';

/**
 * Hook for recording audio using the MediaRecorder API.
 */
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [stream, setStream] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = useCallback(async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);

      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setAudioBlob(null);
      return audioStream;
    } catch (err) {
      console.error('Failed to start audio recording:', err);
      throw err;
    }
  }, []);

  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        const recorder = mediaRecorderRef.current;
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          setAudioBlob(blob);
          
          // Stop all tracks from the stream
          if (recorder.stream) {
            recorder.stream.getTracks().forEach((track) => track.stop());
          }
          setStream(null);
          resolve(blob);
        };
        recorder.stop();
        setIsRecording(false);
      } else {
        resolve(null);
      }
    });
  }, []);

  return {
    isRecording,
    audioBlob,
    stream,
    startRecording,
    stopRecording,
  };
}
