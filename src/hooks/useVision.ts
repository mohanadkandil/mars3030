import { useState, useEffect, useRef } from 'react';
import { 
  VisionDetection, 
  detectObjects, 
  mapDetections, 
  checkVisionHealth 
} from '../services/visionApi';

export function useVision(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  isActive: boolean = true,
  interval: number = 2000 // Detect every 2 seconds
) {
  const [detections, setDetections] = useState<VisionDetection[]>([]);
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [modelInfo, setModelInfo] = useState<{ model: string; device: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize canvas for frame extraction
  useEffect(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
  }, []);

  // Check backend health on mount
  useEffect(() => {
    const checkStatus = async () => {
      const health = await checkVisionHealth();
      if (health) {
        setIsBackendReady(true);
        setModelInfo({ model: health.model, device: health.device });
      } else {
        setIsBackendReady(false);
      }
    };
    checkStatus();
  }, []);

  // Detection loop
  useEffect(() => {
    if (!isActive || !isBackendReady || !videoRef.current) return;

    const captureAndDetect = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.paused || video.ended) return;

      // Set canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current frame
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const backendDets = await detectObjects(blob);
        const mappedDets = mapDetections(
          backendDets, 
          canvas.width, 
          canvas.height, 
          430, 260
        );
        
        setDetections(mappedDets);
      }, 'image/jpeg', 0.8);
    };

    const timer = setInterval(captureAndDetect, interval);
    return () => clearInterval(timer);
  }, [isActive, isBackendReady, videoRef, interval]);

  return { 
    detections, 
    isBackendReady, 
    modelInfo 
  };
}
