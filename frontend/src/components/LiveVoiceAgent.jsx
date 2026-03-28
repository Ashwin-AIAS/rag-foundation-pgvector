import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function LiveVoiceAgent() {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Disconnected');
  const wsRef = useRef(null);
  
  // Audio Input/Output context
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const microphoneRef = useRef(null);
  
  // Playback queue tracking
  const playbackTimeRef = useRef(0);

  const startSession = async () => {
    try {
      setStatus('Connecting...');
      
      // 1. Establish WebSocket
      const ws = new WebSocket('ws://localhost:8000/ws/live-rag');
      wsRef.current = ws;

      // 2. Setup Audio Context (Force 16kHz for Gemini)
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const actx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = actx;
      playbackTimeRef.current = actx.currentTime;

      // 3. Request Microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      // 4. Setup Audio Processing for Input
      microphoneRef.current = actx.createMediaStreamSource(stream);
      // Deprecated but works perfectly for inline raw PCM capture without external static files
      processorRef.current = actx.createScriptProcessor(4096, 1, 1);
      
      processorRef.current.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          // Convert Float32 (from browser) to Int16 (expected by Gemini)
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          ws.send(pcm16.buffer);
        }
      };

      // Connect input graph
      microphoneRef.current.connect(processorRef.current);
      processorRef.current.connect(actx.destination);

      // 5. Handle WebSocket Events
      ws.onopen = () => {
        setIsActive(true);
        setStatus('Listening');
      };

      ws.onmessage = async (event) => {
        // We receive incoming audio bytes from Gemini to play
        setStatus('Speaking');
        const arrayBuffer = await event.data.arrayBuffer();
        
        // Convert Int16 (from Gemini) to Float32 (for browser)
        const int16 = new Int16Array(arrayBuffer);
        const float32 = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 0x8000;
        }

        const audioBuffer = actx.createBuffer(1, float32.length, 16000);
        audioBuffer.copyToChannel(float32, 0);

        const source = actx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(actx.destination);
        
        // Queue scheduling for smooth gapless playback
        const scheduleTime = Math.max(actx.currentTime, playbackTimeRef.current);
        source.start(scheduleTime);
        playbackTimeRef.current = scheduleTime + audioBuffer.duration;
        
        // Reset status to Listening after playback finishes
        source.onended = () => {
          if (actx.currentTime >= playbackTimeRef.current - 0.1) {
             setStatus('Listening');
          }
        };
      };

      ws.onclose = () => {
        stopSession();
      };

    } catch (err) {
      console.error(err);
      setStatus('Error accessing mic or server');
      stopSession();
    }
  };

  const stopSession = () => {
    setIsActive(false);
    setStatus('Disconnected');
    
    // Cleanup WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Cleanup Audio
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    playbackTimeRef.current = 0;
  };

  useEffect(() => {
    return () => {
      stopSession(); // Cleanup on unmount
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl border" style={{ borderColor: 'rgba(5b, 155, 213, 0.2)', background: 'rgba(14, 14, 20, 0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="flex items-center gap-4 mb-2">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isActive ? stopSession : startSession}
          className="flex items-center gap-2 px-6 py-3 rounded-full font-bold"
          style={{ 
            fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.1em',
            background: isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(91, 155, 213, 0.1)',
            borderColor: isActive ? 'rgba(239, 68, 68, 0.5)' : 'rgba(91, 155, 213, 0.5)',
            borderWidth: '1px',
            color: isActive ? '#ef4444' : '#5b9bd5',
            boxShadow: isActive ? '0 0 20px rgba(239, 68, 68, 0.2)' : '0 0 20px rgba(91, 155, 213, 0.2)'
          }}
        >
          {isActive ? (
            <>
               <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
               STOP LIVE AGENT
            </>
          ) : (
             <>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
               START LIVE AGENT
             </>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {isActive && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 mt-2"
          >
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '11px', color: status === 'Speaking' ? '#4ade80' : '#f5f0e8', opacity: 0.8 }}>
              STATUS: {status.toUpperCase()}
            </span>
            {status === 'Speaking' && (
               <div className="flex gap-1 items-center h-4 mx-2">
                 {[1, 2, 3, 4].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ height: ['4px', '16px', '4px'] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                      className="w-1 bg-green-400 rounded-full"
                    />
                 ))}
               </div>
            )}
            {status === 'Listening' && (
               <div className="flex gap-1 items-center h-4 mx-2">
                 {[1, 2, 3].map(i => (
                    <motion.div 
                      key={i}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1.5 h-1.5 bg-blue-400 rounded-full"
                    />
                 ))}
               </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
