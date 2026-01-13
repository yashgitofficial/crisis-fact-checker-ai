import { useState, useRef, useCallback, useEffect } from 'react';

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isProcessing: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  transcript: string;
  error: string | null;
  isSupported: boolean;
}

// Extend Window interface for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if Web Speech API is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Voice recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsRecording(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + ' ' + finalTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      setIsProcessing(false);
      
      switch (event.error) {
        case 'not-allowed':
          setError('Microphone access denied. Please allow microphone access and try again.');
          break;
        case 'no-speech':
          setError('No speech detected. Please try again.');
          break;
        case 'network':
          setError('Network error. Please check your connection.');
          break;
        default:
          setError(`Voice recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsRecording(false);
      setIsProcessing(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Voice recognition not available');
      return;
    }

    setTranscript('');
    setError(null);
    
    try {
      recognitionRef.current.start();
    } catch (err) {
      console.error('Error starting recognition:', err);
      // Recognition might already be running
      if ((err as Error).message?.includes('already started')) {
        recognitionRef.current.stop();
        setTimeout(() => {
          recognitionRef.current?.start();
        }, 100);
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      setIsProcessing(true);
      recognitionRef.current.stop();
    }
  }, [isRecording]);

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    transcript,
    error,
    isSupported,
  };
}
