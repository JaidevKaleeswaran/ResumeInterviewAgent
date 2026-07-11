import { useState, useRef, useCallback } from 'react';

/**
 * Hook for screen sharing and recording using getDisplayMedia + MediaRecorder.
 * Records screen video with microphone audio into a single WebM blob.
 */
export function useScreenRecorder() {
  const [isSharing, setIsSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [error, setError] = useState(null);

  const screenStreamRef = useRef(null);
  const combinedStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  /**
   * Start screen sharing (no recording yet).
   * Returns the screen stream for preview.
   */
  const startScreenShare = useCallback(async () => {
    setError(null);

    // Check browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      const msg = 'Screen sharing is not supported in this browser. Please use Chrome, Edge, or Firefox on desktop.';
      setError(msg);
      throw new Error(msg);
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false, // We'll get audio separately from the microphone
      });

      screenStreamRef.current = screenStream;
      setIsSharing(true);

      // Listen for the user stopping screen share via the browser's built-in button
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      return screenStream;
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError('Screen sharing was cancelled. Please share your screen to continue with the coding challenge.');
      } else {
        setError(`Screen sharing failed: ${err.message}`);
      }
      throw err;
    }
  }, []);

  /**
   * Start recording the screen + microphone audio.
   */
  const startRecording = useCallback(async () => {
    if (!screenStreamRef.current) {
      throw new Error('Screen sharing must be started before recording.');
    }

    setError(null);
    chunksRef.current = [];
    setRecordingBlob(null);

    try {
      // Get microphone audio
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Combine screen video + mic audio into one stream
      const combinedStream = new MediaStream([
        ...screenStreamRef.current.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);
      combinedStreamRef.current = combinedStream;

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : 'video/webm';

      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordingBlob(blob);
        // Stop the mic audio tracks
        audioStream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect chunks every second
      setIsRecording(true);
    } catch (err) {
      setError(`Recording failed: ${err.message}`);
      throw err;
    }
  }, []);

  /**
   * Stop recording (but keep screen share active for preview).
   */
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        const recorder = mediaRecorderRef.current;
        const mimeType = recorder.mimeType;
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          setRecordingBlob(blob);
          resolve(blob);
        };
        recorder.stop();
        setIsRecording(false);
      } else {
        resolve(null);
      }
    });
  }, []);

  /**
   * Stop screen sharing entirely.
   */
  const stopScreenShare = useCallback(() => {
    stopRecording();
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (combinedStreamRef.current) {
      combinedStreamRef.current.getTracks().forEach((t) => t.stop());
      combinedStreamRef.current = null;
    }
    setIsSharing(false);
  }, [stopRecording]);

  return {
    isSharing,
    isRecording,
    recordingBlob,
    error,
    startScreenShare,
    startRecording,
    stopRecording,
    stopScreenShare,
  };
}
