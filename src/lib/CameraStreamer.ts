/**
 * CameraStreamer handles webcam acquisition, video element rendering,
 * and high-efficiency JPEG frame extraction for Gemini Live Multimodal Vision.
 */

export class CameraStreamer {
  private mediaStream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isRunning: boolean = false;
  private streamIntervalId: number | null = null;

  constructor(
    private targetFps: number = 0.8, // Send 1 frame every ~1.25s for optimal Gemini Live balance
    private targetWidth: number = 512,
    private targetHeight: number = 384,
    private quality: number = 0.65
  ) {}

  async start(videoRef?: HTMLVideoElement | null): Promise<MediaStream> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      if (videoRef) {
        this.videoElement = videoRef;
        this.videoElement.srcObject = this.mediaStream;
        await this.videoElement.play().catch(e => console.warn("Video play interrupted", e));
      } else if (!this.videoElement) {
        this.videoElement = document.createElement('video');
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;
        this.videoElement.srcObject = this.mediaStream;
        await this.videoElement.play().catch(e => console.warn("Hidden video play error", e));
      }

      this.canvasElement = document.createElement('canvas');
      this.canvasElement.width = this.targetWidth;
      this.canvasElement.height = this.targetHeight;
      this.ctx = this.canvasElement.getContext('2d', { willReadFrequently: true });
      this.isRunning = true;

      return this.mediaStream;
    } catch (err) {
      console.error("CameraStreamer failed to start:", err);
      this.isRunning = false;
      throw err;
    }
  }

  attachVideoElement(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
    if (this.mediaStream) {
      this.videoElement.srcObject = this.mediaStream;
      this.videoElement.play().catch(e => console.warn("Video attach play error", e));
    }
  }

  /**
   * Captures a single compressed JPEG frame from the active camera
   */
  captureFrame(): string | null {
    if (!this.isRunning || !this.videoElement || !this.canvasElement || !this.ctx) {
      return null;
    }

    if (this.videoElement.readyState < 2) {
      return null; // Not ready yet
    }

    try {
      const vWidth = this.videoElement.videoWidth || 640;
      const vHeight = this.videoElement.videoHeight || 480;

      // Crop & center to maintain aspect ratio
      const targetAspect = this.targetWidth / this.targetHeight;
      const videoAspect = vWidth / vHeight;

      let sWidth = vWidth;
      let sHeight = vHeight;
      let sx = 0;
      let sy = 0;

      if (videoAspect > targetAspect) {
        sWidth = vHeight * targetAspect;
        sx = (vWidth - sWidth) / 2;
      } else {
        sHeight = vWidth / targetAspect;
        sy = (vHeight - sHeight) / 2;
      }

      this.ctx.drawImage(
        this.videoElement,
        sx, sy, sWidth, sHeight,
        0, 0, this.targetWidth, this.targetHeight
      );

      const dataUrl = this.canvasElement.toDataURL('image/jpeg', this.quality);
      // Strip data:image/jpeg;base64, prefix
      const base64Data = dataUrl.split(',')[1];
      return base64Data;
    } catch (err) {
      console.error("Failed to capture video frame:", err);
      return null;
    }
  }

  /**
   * Starts automatic background streaming of video frames to the callback
   */
  startStreaming(onFrame: (base64Jpeg: string) => void) {
    this.stopStreaming();
    const intervalMs = Math.round(1000 / this.targetFps);
    
    // Capture first frame immediately after 300ms
    setTimeout(() => {
      const initialFrame = this.captureFrame();
      if (initialFrame) {
        onFrame(initialFrame);
      }
    }, 400);

    this.streamIntervalId = window.setInterval(() => {
      const frame = this.captureFrame();
      if (frame) {
        onFrame(frame);
      }
    }, intervalMs);
  }

  stopStreaming() {
    if (this.streamIntervalId !== null) {
      clearInterval(this.streamIntervalId);
      this.streamIntervalId = null;
    }
  }

  stop() {
    this.stopStreaming();
    this.isRunning = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    this.canvasElement = null;
    this.ctx = null;
  }

  isActive(): boolean {
    return this.isRunning && !!this.mediaStream;
  }
}
