import os
import cv2
import numpy as np
import torch
import tempfile
import time
from ultralytics import YOLOWorld
from io import BytesIO
from PIL import Image

# Configuration
# Updated default confidence to match test_video.py experiments
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.05"))
MODEL_PATH = os.getenv("MODEL_PATH", "yolov8s-world.pt")
# The user seems to be detecting plants/trees based on comments, but keeping original CLASSES for now
# unless they are explicitly redefined elsewhere.
CLASSES = ["red tomato", "green tomato", "potato", "carrot", "lettuce", "cucumber", "red apple", "green apple", "oranges", "plants", "trees", "saplings", "robot arm"]

# CLASSES = ["Soil", "Rocks", "Plastic", "Plants", "Trees", "Saplings", "Robotic Arm", "Manipulator"]  # Updated classes based on user comments

class YOLOv8WorldDetector:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(YOLOv8WorldDetector, cls).__new__(cls)
            
            # Determine device
            cls._instance.device = 'cpu'
            if torch.backends.mps.is_available():
                cls._instance.device = 'mps'
            elif torch.cuda.is_available():
                cls._instance.device = 'cuda'
            
            print(f"Loading YOLOWorld model from {MODEL_PATH} on {cls._instance.device}...")
            
            # Monkeypatch torch.load for PyTorch 2.6+ compatibility
            original_load = torch.load
            def patched_load(*args, **kwargs):
                if 'weights_only' not in kwargs:
                    kwargs['weights_only'] = False
                return original_load(*args, **kwargs)
            torch.load = patched_load
            
            try:
                cls._instance.model = YOLOWorld(MODEL_PATH)
                cls._instance.model.to(cls._instance.device)
                # Pre-set the classes for zero-shot detection
                cls._instance.model.set_classes(CLASSES)
            finally:
                torch.load = original_load
                
        return cls._instance

    def detect_image(self, image_bytes: bytes, render: bool = False):
        # Convert bytes to PIL Image for consistency, though cv2 could be used
        img = Image.open(BytesIO(image_bytes)).convert("RGB")
        img_np = np.array(img)
        # YOLOv8 handles RGB/BGR, but results.plot() returns BGR
        frame_bgr = cv2.cvtColor(img_np, cv2.COLOR_RGB2BGR)

        # Run inference
        results = self.model.predict(frame_bgr, conf=CONFIDENCE_THRESHOLD, verbose=False, device=self.device)[0]

        if render:
            # Match test_video.py plotting: labels=False, line_width=3
            annotated_img = results.plot(labels=False, line_width=3)
            _, buffer = cv2.imencode(".jpg", annotated_img)
            return buffer.tobytes(), None

        detections = []
        for box in results.boxes:
            b = box.xyxy[0].tolist()
            conf = float(box.conf)
            cls_id = int(box.cls)
            class_name = CLASSES[cls_id]
            detections.append({"box": b, "confidence": conf, "class_name": class_name})
        
        return None, detections

    def stream_video(self, video_bytes: bytes):
        """Generator for streaming annotated frames."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_input:
            temp_input.write(video_bytes)
            temp_input_path = temp_input.name

        cap = cv2.VideoCapture(temp_input_path)
        
        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Inference directly on BGR frame
                results = self.model.predict(frame, conf=CONFIDENCE_THRESHOLD, verbose=False, device=self.device)[0]
                # Plot with test_video.py settings
                annotated_frame = results.plot(labels=False, line_width=3)
                
                _, buffer = cv2.imencode('.jpg', annotated_frame)
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        finally:
            cap.release()
            os.remove(temp_input_path)

    def detect_video(self, video_bytes: bytes):
        """Processes full video and returns as MP4 bytes."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as temp_input:
            temp_input.write(video_bytes)
            temp_input_path = temp_input.name

        temp_output_path = temp_input_path.replace(".mp4", "_out.mp4")

        cap = cv2.VideoCapture(temp_input_path)
        width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps    = cap.get(cv2.CAP_PROP_FPS) or 30.0
            
        print(f"Processing video: {width}x{height} at {fps} FPS")
        
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(temp_output_path, fourcc, fps, (width, height))

        frame_count = 0
        start_time = time.time()
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Inference directly on BGR frame
            results = self.model.predict(frame, conf=CONFIDENCE_THRESHOLD, verbose=False, device=self.device)[0]
            # Plot with test_video.py settings
            annotated_frame = results.plot(labels=False, line_width=3)
            out.write(annotated_frame)
            
            frame_count += 1
            if frame_count % 50 == 0:
                print(f"Processed {frame_count} frames...")

        cap.release()
        out.release()
        
        elapsed_time = time.time() - start_time
        fps_processing = frame_count / elapsed_time if elapsed_time > 0 else 0.0
        print(f"Total frames processed: {frame_count} in {elapsed_time:.2f}s ({fps_processing:.2f} FPS)")

        with open(temp_output_path, "rb") as f:
            processed_video_bytes = f.read()

        os.remove(temp_input_path)
        os.remove(temp_output_path)

        return processed_video_bytes
