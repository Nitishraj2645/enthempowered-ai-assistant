import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, CameraOff, Eye, Scan, Maximize2, Minimize2, Sparkles, RefreshCw } from 'lucide-react';

interface CameraVisionPanelProps {
  cameraStreamer: any;
  isCameraActive: boolean;
  onToggleCamera: () => void;
  onManualScan: () => void;
  isScanning?: boolean;
}

export function CameraVisionPanel({
  cameraStreamer,
  isCameraActive,
  onToggleCamera,
  onManualScan,
  isScanning = false,
}: CameraVisionPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [scanPulse, setScanPulse] = useState(false);

  useEffect(() => {
    if (isCameraActive && videoRef.current && cameraStreamer) {
      cameraStreamer.attachVideoElement(videoRef.current);
    }
  }, [isCameraActive, cameraStreamer]);

  const handleScanClick = () => {
    setScanPulse(true);
    setTimeout(() => setScanPulse(false), 800);
    onManualScan();
  };

  if (!isCameraActive) {
    return (
      <button
        onClick={onToggleCamera}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-400/40 text-white/70 hover:text-cyan-300 transition-all duration-300 backdrop-blur-xl shadow-lg text-xs font-mono tracking-wider group"
      >
        <Camera className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
        <span>Enable Camera Vision</span>
      </button>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative z-30 transition-all duration-500 ${
        isExpanded
          ? 'w-80 sm:w-96 rounded-3xl'
          : isMinimized
          ? 'w-48 rounded-2xl'
          : 'w-64 sm:w-72 rounded-3xl'
      } bg-slate-950/80 backdrop-blur-2xl border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.25)] overflow-hidden`}
    >
      {/* Video Container */}
      <div className="relative aspect-video w-full bg-black/90 overflow-hidden flex items-center justify-center">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover -scale-x-100"
        />

        {/* Vision Scanner Line */}
        <motion.div
          animate={{ y: ['-100%', '200%'] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00ffff] pointer-events-none opacity-80"
        />

        {/* AR Face Targeting Box */}
        <div className="absolute inset-6 border border-cyan-400/30 rounded-xl pointer-events-none flex flex-col justify-between p-1">
          <div className="flex justify-between">
            <div className="w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400" />
            <div className="w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400" />
          </div>
          <div className="flex justify-center items-center">
            <span className="text-[8px] font-mono uppercase tracking-widest text-cyan-400/70 bg-black/60 px-2 py-0.5 rounded-full border border-cyan-500/20">
              AI Vision Feed
            </span>
          </div>
          <div className="flex justify-between">
            <div className="w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400" />
            <div className="w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400" />
          </div>
        </div>

        {/* Scan Snapshot Flash Feedback */}
        <AnimatePresence>
          {scanPulse && (
            <motion.div
              initial={{ opacity: 0.9 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-cyan-100 pointer-events-none z-40"
            />
          )}
        </AnimatePresence>

        {/* Status Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-cyan-500/30">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[8px] font-mono uppercase font-bold text-cyan-300 tracking-wider">
            Rishu Watching
          </span>
        </div>

        {/* Window controls */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md bg-black/60 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
            title={isExpanded ? 'Shrink' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Camera Action Toolbar */}
      <div className="p-2.5 px-3 flex items-center justify-between gap-2 border-t border-white/5 bg-white/[0.02]">
        <button
          onClick={handleScanClick}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-[10px] font-mono font-bold tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] active:scale-95"
        >
          <Scan className="w-3.5 h-3.5 animate-spin-slow" />
          <span>Ask Rishu To Look</span>
        </button>

        <button
          onClick={onToggleCamera}
          className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 text-white/50 hover:text-red-300 transition-colors"
          title="Turn off camera"
        >
          <CameraOff className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
