import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Power, RefreshCcw, Mic, Sparkles } from "lucide-react";
import { Rishu3DAvatar, EmotionType } from "./Rishu3DAvatar";

interface WaveformProps {
  state: 'disconnected' | 'connecting' | 'connected';
  isSpeaking: boolean;
  isListening: boolean;
  emotion?: EmotionType;
  getSpeakingVolume?: () => number;
  getListeningVolume?: () => number;
  cameraActive?: boolean;
}

export function Waveform({
  state,
  isSpeaking,
  isListening,
  emotion = 'neutral',
  getSpeakingVolume,
  getListeningVolume,
  cameraActive = false,
}: WaveformProps) {
  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {state === 'connecting' ? (
        <div className="relative w-72 h-72 sm:w-88 sm:h-88 md:w-96 md:h-96 rounded-[3rem] bg-black/60 border border-cyan-500/30 flex flex-col items-center justify-center gap-4 backdrop-blur-2xl shadow-[0_0_40px_rgba(6,182,212,0.2)]">
          <RefreshCcw className="w-14 h-14 text-cyan-400 animate-spin" />
          <p className="text-xs font-mono text-cyan-300 tracking-[0.3em] uppercase font-bold animate-pulse">
            Connecting Neural Core...
          </p>
        </div>
      ) : (
        <Rishu3DAvatar
          state={state}
          isSpeaking={isSpeaking}
          isListening={isListening}
          emotion={emotion}
          getSpeakingVolume={getSpeakingVolume}
          getListeningVolume={getListeningVolume}
          cameraActive={cameraActive}
        />
      )}
    </div>
  );
}

interface MicButtonProps {
  state: 'disconnected' | 'connecting' | 'connected';
  onClick: () => void;
}

export function MicButton({ state, onClick }: MicButtonProps) {
  const isConnected = state === 'connected';

  return (
    <div className="relative flex flex-col items-center pointer-events-auto">
      {/* Decorative Glow Ring */}
      <AnimatePresence>
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1.15 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -inset-3 bg-red-500/20 rounded-full blur-2xl z-0 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <button
        id="mic-power-button"
        onClick={onClick}
        className={`relative z-10 flex items-center gap-2.5 px-8 py-3.5 rounded-full transition-all duration-500 font-display font-bold text-sm tracking-widest uppercase backdrop-blur-xl border ${
          isConnected 
            ? 'bg-red-500/20 border-red-500/50 text-red-200 hover:bg-red-500/30 shadow-[0_0_35px_rgba(239,68,68,0.35)]' 
            : 'bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 border-pink-400/40 text-white hover:border-pink-400 hover:scale-105 shadow-[0_0_35px_rgba(236,72,153,0.25)]'
        } active:scale-95 group overflow-hidden cursor-pointer`}
      >
        <div className="relative z-10 flex items-center gap-2.5">
          {isConnected ? (
            <>
              <div className="relative px-0.5">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]" />
              </div>
              <span className="drop-shadow-md">End Call</span>
            </>
          ) : (
            <>
              <motion.div
                animate={{ rotate: isConnected ? 0 : [0, 360] }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                className="p-0.5"
              >
                <Power className="w-4 h-4 text-pink-400" />
              </motion.div>
              <span className="drop-shadow-md">Call Rishu (Talk & See)</span>
            </>
          )}
        </div>
      </button>
    </div>
  );
}
