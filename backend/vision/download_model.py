import os
import torch
from ultralytics import YOLOWorld

# For PyTorch 2.6+ compatibility
def load_yolo_world(model_path):
    # Try loading with weights_only=False if it's from a trusted source (Ultralytics)
    # Alternatively, we can use a context manager if we want to be more specific, 
    # but for local development/trusted models, this is often the easiest fix for the breaking change.
    return YOLOWorld(model_path)

def list_available_models():
        """Return available YOLOWorld and YOLOWorldv2 model options."""
        models = {
            "YOLOWorld": [
                "yolov8n-world.pt",
                "yolov8s-world.pt",
                "yolov8m-world.pt",
                "yolov8l-world.pt",
                "yolov8x-world.pt",
            ],
            "YOLOWorldv2": [
                "yolov8n-worldv2.pt",
                "yolov8s-worldv2.pt",
                "yolov8m-worldv2.pt",
                "yolov8l-worldv2.pt",
                "yolov8x-worldv2.pt",
            ]
        }
        return models
def download_model():
    model_path = os.getenv("MODEL_PATH", "yolov8l-worldv2.pt")
    print(f"Starting download for {model_path}...")
    
    # In recent PyTorch, the default changed to weights_only=True which breaks many models.
    # We can try to monkeypatch torch.load if YOLOWorld doesn't expose the argument.
    import torch.serialization
    original_load = torch.load
    def patched_load(*args, **kwargs):
        if 'weights_only' not in kwargs:
            kwargs['weights_only'] = False
        return original_load(*args, **kwargs)
    
    torch.load = patched_load
    try:
        model = YOLOWorld(model_path)
    finally:
        torch.load = original_load
        
    print(f"Model {model_path} is ready.")

if __name__ == "__main__":
    download_model()
