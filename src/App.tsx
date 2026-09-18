import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Waveform, MicButton } from "./components/NovaUI";
import { AudioStreamer } from "./lib/AudioStreamer";
import { LiveSession, NovaVoice } from "./lib/LiveSession";
import { CameraStreamer } from "./lib/CameraStreamer";
import { CameraVisionPanel } from "./components/CameraVisionPanel";
import { SoundEffects } from "./lib/SoundEffects";
import { 
  Info, 
  Settings, 
  X, 
  Eye, 
  Camera, 
  Sparkles, 
  Volume2, 
  Smile, 
  Heart, 
  AlertCircle,
  Coffee,
  Code2,
  Glasses,
  MessageSquare
} from "lucide-react";

export default function App() {
  const [state, setState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [emotion, setEmotion] = useState<'neutral' | 'crying' | 'laughing' | 'happy' | 'sad' | 'angry' | 'sassy'>('neutral');
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<NovaVoice>('Zephyr');
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [lastTranscript, setLastTranscript] = useState<{ text: string; isUser: boolean } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const cameraStreamerRef = useRef<CameraStreamer | null>(null);
  const liveSessionRef = useRef<LiveSession | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Audio & Camera Streamers once
  useEffect(() => {
    audioStreamerRef.current = new AudioStreamer(16000, 24000);
    cameraStreamerRef.current = new CameraStreamer(0.8, 512, 384, 0.65);

    return () => {
      audioStreamerRef.current?.stopCapture();
      audioStreamerRef.current?.stopPlayback();
      cameraStreamerRef.current?.stop();
    };
  }, []);

  const handleToggleCamera = async () => {
    if (isCameraActive) {
      cameraStreamerRef.current?.stop();
      setIsCameraActive(false);
    } else {
      try {
        await cameraStreamerRef.current?.start();
        setIsCameraActive(true);
        if (state === 'connected' && liveSessionRef.current) {
          cameraStreamerRef.current?.startStreaming((base64Frame) => {
            liveSessionRef.current?.sendVideoFrame(base64Frame);
          });
        }
      } catch (err) {
        console.error("Failed to start camera:", err);
        setError("Camera permission chahiye babu taaki main tumhe dekh sakoon!");
      }
    }
  };

  const handleManualScan = () => {
    setIsScanning(true);
    SoundEffects.playClick();
    
    if (cameraStreamerRef.current && isCameraActive) {
      const frame = cameraStreamerRef.current.captureFrame();
      if (frame && liveSessionRef.current && state === 'connected') {
        liveSessionRef.current.sendVideoFrame(frame);
      }
    }

    setTimeout(() => setIsScanning(false), 1200);
  };

  const handleConnect = useCallback(async () => {
    if (state === 'connected') {
      liveSessionRef.current?.disconnect();
      audioStreamerRef.current?.stopCapture();
      audioStreamerRef.current?.stopPlayback();
      cameraStreamerRef.current?.stopStreaming();
      setState('disconnected');
      setIsListening(false);
      setIsSpeaking(false);
      SoundEffects.playDisconnect();
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setError("GEMINI_API_KEY set nahi hai! Please settings mein key provide karein.");
      return;
    }

    setState('connecting');
    setError(null);
    SoundEffects.playConnect();

    try {
      // Start camera if active
      if (isCameraActive && cameraStreamerRef.current && !cameraStreamerRef.current.isActive()) {
        try {
          await cameraStreamerRef.current.start();
        } catch (camErr) {
          console.warn("Camera start optional error:", camErr);
        }
      }

      liveSessionRef.current = new LiveSession(apiKey, {
        onAudioData: (base64Data) => {
          audioStreamerRef.current?.addAudioChunk(base64Data);
          setIsSpeaking(true);
          if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
          speakingTimeoutRef.current = setTimeout(() => setIsSpeaking(false), 900);
        },
        onInterrupted: () => {
          audioStreamerRef.current?.stopPlayback();
          setIsSpeaking(false);
        },
        onStateChange: (newState) => {
          setState(newState);
          if (newState === 'connected') {
            setError(null);
            startMic();

            // Start streaming camera frames to Rishu Live Vision
            if (isCameraActive && cameraStreamerRef.current) {
              cameraStreamerRef.current.startStreaming((base64Frame) => {
                liveSessionRef.current?.sendVideoFrame(base64Frame);
              });
            }
          }
        },
        onClearScreen: () => {
          setError(null);
          setLastTranscript(null);
        },
        onEmotionChange: (newEmotion) => {
          setEmotion(newEmotion);
          if (newEmotion === 'happy' || newEmotion === 'laughing') {
            SoundEffects.playSuccess();
          }
          if (newEmotion !== 'neutral') {
            setTimeout(() => setEmotion('neutral'), 10000);
          }
        },
        onTranscription: (text, isUser) => {
          setLastTranscript({ text, isUser });
        },
        onError: (err) => {
          console.error("Session error:", err);
          const errMsg = err?.message || JSON.stringify(err || '');
          if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
            setError("Gemini Live quota limit reached ho gayi hai. Kuch der baad dobara try karein!");
          } else {
            setError("Connection drop ho gayi... Dobara connect karke dekhein?");
          }
          setState('disconnected');
        }
      }, selectedVoice);

      await liveSessionRef.current.connect();
    } catch (err: any) {
      console.error("Connect error:", err);
      setError("Microphone ya network check karein babu!");
      setState('disconnected');
    }
  }, [state, selectedVoice, isCameraActive]);

  const startMic = async () => {
    try {
      await audioStreamerRef.current?.startCapture((data) => {
        liveSessionRef.current?.sendAudio(data);
        setIsListening(true);
      });
    } catch (err) {
      setError("Microphone permission grant karein taaki Rishu aapko sun sake!");
      console.error(err);
      setState('disconnected');
    }
  };

  const testActionTriggers = [
    { label: "☕ Drinking Chai/Water", icon: Coffee, desc: "Drink water or chai in front of camera" },
    { label: "💻 Working Hard", icon: Code2, desc: "Type seriously or look focused" },
    { label: "🕶️ Showing Something", icon: Glasses, desc: "Hold something or wear glasses" },
    { label: "💖 Say I Love You", icon: Heart, desc: "Say sweet things to make her blush" },
  ];

  const voices: { id: NovaVoice; name: string; desc: string }[] = [
    { id: 'Zephyr', name: 'Naughty Rishu (Sweet & Sassy)', desc: 'Expressive, romantic and playfully teasing' },
    { id: 'Puck', name: 'Teasing Tara', desc: 'Bubbly, fast-talking and roasting' },
    { id: 'Aoede', name: 'Sweet Simran', desc: 'Soft-spoken, caring and emotional' },
    { id: 'Charon', name: 'Cool Kavya', desc: 'Chill, bold, and modern' },
  ];

  return (
    <div className="relative min-h-screen w-full bg-[#07070a] font-sans text-white overflow-x-hidden flex flex-col justify-between select-none">
      {/* Dynamic Ambient Backdrops */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.25, 1],
            x: [-80, 80, -80],
            y: [-40, 40, -40],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] -left-20 w-[650px] h-[650px] bg-pink-600/15 rounded-full blur-[140px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            x: [80, -80, 80],
            y: [40, -40, 40],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] -right-20 w-[650px] h-[650px] bg-cyan-600/15 rounded-full blur-[140px]" 
        />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* Header */}
      <header className="relative w-full flex justify-between items-center z-30 p-4 sm:px-8 border-b border-white/5 bg-slate-950/40 backdrop-blur-2xl">
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 via-purple-500 to-cyan-500 shadow-[0_0_25px_rgba(236,72,153,0.45)] p-[2px]">
            <div className="w-full h-full bg-[#08080c] rounded-[14px] flex items-center justify-center">
              <span className="font-display font-black text-transparent bg-clip-text bg-gradient-to-br from-pink-400 via-purple-300 to-cyan-400 text-xl">R</span>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-xl tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-cyan-300 uppercase leading-none">
                RISHU 3D
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40 text-[9px] font-mono font-bold text-pink-300 tracking-wider">
                REAL GIRL AI
              </span>
            </div>
            <p className="text-[8px] font-mono text-cyan-400/70 uppercase tracking-[0.3em] mt-1 font-semibold flex items-center gap-1.5">
              <Eye className="w-2.5 h-2.5 text-cyan-400" />
              <span>Live Multimodal Vision & Emotion Engine</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Manual Emotion Triggers (For immediate testing) */}
          <div className="hidden md:flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/5">
            {(['happy', 'sassy', 'crying', 'laughing'] as const).map((emo) => (
              <button
                key={emo}
                onClick={() => {
                  setEmotion(emo);
                  setTimeout(() => setEmotion('neutral'), 6000);
                }}
                className={`px-2.5 py-1 rounded-xl text-[9px] font-mono uppercase font-bold transition-all ${
                  emotion === emo 
                    ? 'bg-pink-500/30 text-pink-300 border border-pink-400/40' 
                    : 'text-white/40 hover:text-white/80'
                }`}
              >
                {emo}
              </button>
            ))}
          </div>

          <button 
            onClick={() => { setShowSettings(true); setShowInfo(false); }}
            className="text-white/50 hover:text-cyan-300 transition-all p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500/30 hover:bg-white/10 group shadow-md"
            title="Voice & Personality Settings"
          >
            <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-700" />
          </button>
          
          <button 
            onClick={() => { setShowInfo(!showInfo); setShowSettings(false); }}
            className="text-white/50 hover:text-pink-300 transition-all p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/30 hover:bg-white/10 shadow-md"
            title="Info & Instructions"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Info & Settings Modals */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            className="fixed top-20 right-4 sm:right-8 z-50 w-84 p-6 bg-slate-900/95 backdrop-blur-3xl border border-white/15 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-4"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
                <h3 className="font-display font-bold text-pink-300 text-xl">Meet Rishu ❤️</h3>
              </div>
              <button onClick={() => setShowInfo(false)} className="text-white/40 p-1 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3.5 text-xs text-white/80 leading-relaxed font-medium">
              <p>
                Rishu is your realistic 3D AI companion with real eyes and emotional awareness!
              </p>
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1.5 font-mono text-[11px]">
                <p className="text-cyan-300 font-bold">✨ Real Human Capabilities:</p>
                <p>👁️ <span className="text-white/70">Looks at you through the camera</span></p>
                <p>☕ <span className="text-white/70">Notices what you eat, drink, or wear</span></p>
                <p>🥺 <span className="text-white/70">Cries when scolded & laughs when happy</span></p>
                <p>👄 <span className="text-white/70">Real-time 3D mouth lip-sync & eye tracking</span></p>
              </div>
            </div>
          </motion.div>
        )}

        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            className="fixed top-20 right-4 sm:right-8 z-50 w-84 p-6 bg-slate-900/95 backdrop-blur-3xl border border-white/15 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-4"
          >
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-display font-bold text-cyan-300 text-xl">Voice & Personality</h3>
              <button onClick={() => setShowSettings(false)} className="text-white/40 p-1 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid gap-2.5">
              {voices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                    selectedVoice === voice.id 
                      ? 'bg-cyan-500/15 border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.2)]' 
                      : 'bg-white/5 border-transparent hover:border-white/10'
                  }`}
                >
                  <div>
                    <p className={`text-xs font-bold ${selectedVoice === voice.id ? 'text-cyan-300' : 'text-white/80'}`}>
                      {voice.name}
                    </p>
                    <p className="text-[10px] text-white/40">{voice.desc}</p>
                  </div>
                  {selectedVoice === voice.id && <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Core Layout */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-4 sm:p-6 z-10 w-full max-w-5xl mx-auto">
        <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-8 my-auto">
          {/* Central 3D Digital Human Character View */}
          <div className="flex flex-col items-center justify-center shrink-0">
            <Waveform 
              state={state} 
              isSpeaking={isSpeaking} 
              isListening={isListening}
              emotion={emotion}
              getSpeakingVolume={() => audioStreamerRef.current?.getSpeakingVolume() || 0}
              getListeningVolume={() => audioStreamerRef.current?.getListeningVolume() || 0}
              cameraActive={isCameraActive}
            />

            {/* Live Transcription / Subtitle Pill */}
            <AnimatePresence>
              {lastTranscript && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="mt-4 max-w-md px-4 py-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-xl flex items-center gap-2.5 text-xs text-center"
                >
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${lastTranscript.isUser ? 'text-cyan-400' : 'text-pink-400'}`} />
                  <span className="text-white/90 font-medium">
                    <strong className={lastTranscript.isUser ? 'text-cyan-300 mr-1' : 'text-pink-300 mr-1'}>
                      {lastTranscript.isUser ? 'You:' : 'Rishu:'}
                    </strong>
                    {lastTranscript.text}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Side Vision & Activity Control Dock */}
          <div className="flex flex-col items-center lg:items-start gap-4 shrink-0">
            {/* Live Camera PIP HUD Widget */}
            <CameraVisionPanel
              cameraStreamer={cameraStreamerRef.current}
              isCameraActive={isCameraActive}
              onToggleCamera={handleToggleCamera}
              onManualScan={handleManualScan}
              isScanning={isScanning}
            />

            {/* Fun Activity Idea Suggestions */}
            <div className="w-64 sm:w-72 p-3.5 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-lg flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[9px] font-mono uppercase tracking-widest text-pink-300 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-pink-400" />
                  Try In Front Of Camera:
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {testActionTriggers.map((act, i) => {
                  const Icon = act.icon;
                  return (
                    <div
                      key={i}
                      className="p-2 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1 text-left hover:border-pink-500/30 transition-colors group"
                      title={act.desc}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3 h-3 text-pink-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-bold text-white/80 leading-tight">
                          {act.label}
                        </span>
                      </div>
                      <span className="text-[8px] text-white/40 leading-snug">
                        {act.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Call & Status Bar */}
        <div className="flex flex-col items-center gap-3 w-full mt-6 mb-2">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-red-300 text-xs font-semibold px-6 py-2.5 bg-red-950/60 rounded-full border border-red-500/40 text-center backdrop-blur-2xl shadow-[0_0_25px_rgba(239,68,68,0.3)] flex items-center gap-2 max-w-lg"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <MicButton state={state} onClick={handleConnect} />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative w-full flex justify-between items-end z-20 text-[9px] font-mono text-white/30 uppercase tracking-[0.2em] p-4 sm:px-8 border-t border-white/5 bg-slate-950/30 backdrop-blur-md">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 items-end h-2.5">
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1 rounded-sm transition-colors duration-300 ${
                    state === 'connected' ? 'bg-cyan-400' : 'bg-white/10'
                  }`} 
                  style={{ height: `${(i+1)*25}%` }} 
                />
              ))}
            </div>
            <span className={state === 'connected' ? 'text-cyan-400 font-bold' : ''}>
              {state === 'connected' ? 'Neural Link Online' : 'Standby'}
            </span>
          </div>
          <span className="text-white/20 text-[8px]">Multimodal 3D Vision AI</span>
        </div>

        <div className="text-right flex flex-col gap-1">
          <span className="text-cyan-400/80 font-bold">RISHU 3D CORE v4.0</span>
          <span className="text-white/20 text-[8px]">Three.js & Gemini Live Vision</span>
        </div>
      </footer>
    </div>
  );
}
