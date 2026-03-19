import os
import cv2
import time
from detector import YOLOv8WorldDetector

def test_video_processing():
    video_path = "example_2.mp4"
    output_path = "test_output_full.mp4"
    
    if not os.path.exists(video_path):
        print(f"Error: Video not found at {video_path}")
        return

    # Initialize model
    print(f"Loading detector and starting test on {video_path}...")
    detector = YOLOv8WorldDetector()
    
    # Initialize video capture
    cap = cv2.VideoCapture(video_path)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    
    print(f"Video Info: {width}x{height}, {fps} FPS")
    
    # Initialize video writer
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    frame_count = 0
    start_time = time.time()

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Inference: YOLOv8 expects BGR directly from cv2
        results = detector.model.predict(
            frame, 
            conf=0.05, 
            verbose=False, 
            device=detector.device
        )[0]
        # breakpoint()  # For debugging: stop after first frame to inspect results
        # if len(results.boxes) > 0:
        #     breakpoint()  # For debugging: stop after first detection to inspect results
        # else:
        #     results = results[0]  # Get the first (and only) result for this frame

        # Example of how to access individual classes and boxes for debugging
        # Uncomment to debug specific detections
        
        # for box in results.boxes:
        #     class_id = int(box.cls[0])
        #     class_name = results.names[class_id]
        #     if class_name in ["plants", "trees", "saplings"]:
        #         breakpoint()  # Skip these classes for debugging
        #     confidence = float(box.conf[0])
        #     print(f"Detected: {class_name} with confidence {confidence:.2f}")
        

        # Plot annotations directly onto the frame (returns BGR)
        annotated_frame = results.plot(labels=False, line_width=3)
        # annotated_frame = results.plot()
        
        out.write(annotated_frame)
        frame_count += 1
        
        if frame_count % 50 == 0:
            print(f"Processed {frame_count} frames...")

    cap.release()
    out.release()
    
    # Performance metrics
    elapsed_time = time.time() - start_time
    fps_processing = frame_count / elapsed_time if elapsed_time > 0 else 0.0
    
    print(f"Test completed in {elapsed_time:.2f} seconds ({fps_processing:.2f} FPS).")
    print(f"Total frames processed: {frame_count}")
    print(f"Output saved to {output_path}")

if __name__ == "__main__":
    test_video_processing()