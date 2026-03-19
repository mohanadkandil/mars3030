/**
 * Vision API Service
 * Handles communication with the YOLOv8-World vision backend (port 8001)
 */

const VISION_API_URL = 'http://localhost:8001';

export interface BackendDetection {
  box: [number, number, number, number]; // [x1, y1, x2, y2]
}

export interface VisionDetection {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  confidence: number;
  color: string;
  type: 'ripeness' | 'disease' | 'health';
}

/**
 * Maps backend detection format to frontend CameraFeed format
 */
export function mapDetections(
  detections: BackendDetection[],
  imgWidth: number,
  imgHeight: number,
  viewWidth: number = 430,
  viewHeight: number = 260
): VisionDetection[] {
  return detections.map((det, i) => {
    const [x1, y1, x2, y2] = det.box;
    
    // Normalize coordinates to 0-1 and then scale to view dimensions
    const x = (x1 / imgWidth) * viewWidth;
    const y = (y1 / imgHeight) * viewHeight;
    const w = ((x2 - x1) / imgWidth) * viewWidth;
    const h = ((y2 - y1) / imgHeight) * viewHeight;

    // Use a neutral detection color as we no longer have class names
    return {
      id: `real-${i}-${Date.now()}`,
      x, y, w, h,
      label: '', // Empty label
      confidence: 0, // No confidence shown
      color: '#22c55e', // Default green
      type: 'ripeness'
    };
  });
}

/**
 * Sends an image blob to the vision backend for detection
 */
export async function detectObjects(imageBlob: Blob): Promise<BackendDetection[]> {
  const formData = new FormData();
  formData.append('file', imageBlob, 'frame.jpg');

  try {
    const response = await fetch(`${VISION_API_URL}/detect`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Vision API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.detections;
  } catch (error) {
    console.error('Failed to fetch detections:', error);
    return [];
  }
}

/**
 * Returns the URL for the MJPEG live detection stream
 */
export function getVisionStreamUrl(videoBlob?: Blob): string {
  // If we have a video source, we could potentially POST it to get a stream,
  // but usually MJPEG is a GET endpoint. The current backend expects a POST file.
  // For a truly live setup, we'd use a webcam or persistent stream.
  return `${VISION_API_URL}/detect-video-stream`;
}

/**
 * Checks if the vision backend is reachable
 */
export async function checkVisionHealth(): Promise<{ status: string; model: string; device: string } | null> {
  try {
    const response = await fetch(`${VISION_API_URL}/health`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
