/**
 * AudioStreamer handles the capture of microphone input and playback of received audio chunks.
 * It uses the Web Audio API to process PCM data at specific sample rates and provides
 * AnalyserNodes for real-time 3D avatar lip-sync and volume metering.
 */

export class AudioStreamer {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;

  // Analysers for lip-sync & animation
  private outputAnalyser: AnalyserNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputGain: GainNode | null = null;
  private activeSources: AudioBufferSourceNode[] = [];

  private outputFreqData: Uint8Array = new Uint8Array(64);
  private inputFreqData: Uint8Array = new Uint8Array(64);

  constructor(private inputSampleRate: number = 16000, private outputSampleRate: number = 24000) {}

  private initAudioContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
    }
    
    if (!this.outputAnalyser && this.audioContext) {
      this.outputAnalyser = this.audioContext.createAnalyser();
      this.outputAnalyser.fftSize = 128;
      this.outputAnalyser.smoothingTimeConstant = 0.4;

      this.outputGain = this.audioContext.createGain();
      this.outputGain.gain.value = 1.0;

      this.outputAnalyser.connect(this.outputGain);
      this.outputGain.connect(this.audioContext.destination);
    }
  }

  async startCapture(onAudioData: (base64Data: string) => void) {
    try {
      this.initAudioContext();
      
      if (this.audioContext!.state === 'suspended') {
        await this.audioContext!.resume();
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      this.source = this.audioContext!.createMediaStreamSource(this.mediaStream);

      // Input analyser for user volume
      this.inputAnalyser = this.audioContext!.createAnalyser();
      this.inputAnalyser.fftSize = 128;
      this.inputAnalyser.smoothingTimeConstant = 0.3;
      this.source.connect(this.inputAnalyser);
      
      // We capture at the context's native rate and resample manually to 16kHz
      const bufferSize = 4096;
      this.scriptProcessor = this.audioContext!.createScriptProcessor(bufferSize, 1, 1);
      
      this.scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const resampledData = this.resample(inputData, this.audioContext!.sampleRate, this.inputSampleRate);
        
        const pcm16 = new Int16Array(resampledData.length);
        for (let i = 0; i < resampledData.length; i++) {
          const s = Math.max(-1, Math.min(1, resampledData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = "";
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64Data = btoa(binary);
        
        onAudioData(base64Data);
      };

      this.source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext!.destination);
    } catch (err) {
      console.error("AudioStreamer capture error:", err);
      throw err;
    }
  }

  private resample(data: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return data;
    const ratio = fromRate / toRate;
    const newLength = Math.round(data.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const pos = i * ratio;
      const index = Math.floor(pos);
      const frac = pos - index;
      if (index + 1 < data.length) {
        result[i] = data[index] * (1 - frac) + data[index + 1] * frac;
      } else {
        result[i] = data[index];
      }
    }
    return result;
  }

  stopCapture() {
    this.scriptProcessor?.disconnect();
    this.source?.disconnect();
    this.inputAnalyser?.disconnect();
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.scriptProcessor = null;
    this.source = null;
    this.inputAnalyser = null;
    this.mediaStream = null;
  }

  addAudioChunk(base64Data: string) {
    this.initAudioContext();

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 0x8000;
    }

    this.playChunk(float32);
  }

  private playChunk(data: Float32Array) {
    if (!this.audioContext || !this.outputAnalyser) return;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const audioBuffer = this.audioContext.createBuffer(1, data.length, this.outputSampleRate);
    audioBuffer.getChannelData(0).set(data);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Connect through the analyser to speakers
    source.connect(this.outputAnalyser);

    const startTime = Math.max(this.audioContext.currentTime, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;

    this.activeSources.push(source);
    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) this.activeSources.splice(idx, 1);
    };
  }

  /**
   * Returns speaking volume of Rishu (0.0 to 1.0) with vocal presence weighting for lip sync
   */
  getSpeakingVolume(): number {
    if (!this.outputAnalyser) return 0;
    const data = new Uint8Array(this.outputAnalyser.frequencyBinCount);
    this.outputAnalyser.getByteFrequencyData(data);
    
    // Average speech frequencies (bins 2 to 24 correspond to ~300Hz - 3400Hz speech)
    let sum = 0;
    const startBin = 2;
    const endBin = Math.min(28, data.length);
    for (let i = startBin; i < endBin; i++) {
      sum += data[i];
    }
    const avg = sum / (endBin - startBin);
    return Math.min(1.0, avg / 120.0);
  }

  /**
   * Returns listening volume from user mic (0.0 to 1.0)
   */
  getListeningVolume(): number {
    if (!this.inputAnalyser) return 0;
    const data = new Uint8Array(this.inputAnalyser.frequencyBinCount);
    this.inputAnalyser.getByteFrequencyData(data);
    
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    const avg = sum / data.length;
    return Math.min(1.0, avg / 80.0);
  }

  stopPlayback() {
    this.nextStartTime = 0;
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch (_) {}
    }
    this.activeSources = [];
  }

  async close() {
    this.stopPlayback();
    this.stopCapture();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
    }
    this.audioContext = null;
  }
}
