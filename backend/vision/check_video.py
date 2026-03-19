import cv2
import os

def check_metadata(video_path):
    if not os.path.exists(video_path):
        return f"{video_path} not found"
    
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    duration = frame_count / fps if fps > 0 else 0
    cap.release()
    
    return {
        "path": video_path,
        "fps": fps,
        "frames": frame_count,
        "duration": duration,
        "resolution": (width, height)
    }

if __name__ == "__main__":
    print(check_metadata("example_video.mp4"))
    print(check_metadata("test_output.mp4"))
