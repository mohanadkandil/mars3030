import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, Response, StreamingResponse
from detector import YOLOv8WorldDetector

app = FastAPI()

# Initialize detector (Singleton)
detector = YOLOv8WorldDetector()

@app.get("/health")
async def health():
    return {"status": "ready", "model": os.getenv("MODEL_PATH", "yolov8s-world.pt"), "device": detector.device}

@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    contents = await file.read()
    try:
        _, detections = detector.detect_image(contents)
        return JSONResponse(content={"detections": detections})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect-render")
async def detect_render(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    contents = await file.read()
    try:
        annotated_bytes, _ = detector.detect_image(contents, render=True)
        return Response(content=annotated_bytes, media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect-video")
async def detect_video(file: UploadFile = File(...)):
    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")
    
    contents = await file.read()
    try:
        annotated_video_bytes = detector.detect_video(contents)
        return Response(content=annotated_video_bytes, media_type="video/mp4")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/detect-video-stream")
async def detect_video_stream(file: UploadFile = File(...)):
    if not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be a video")
    
    contents = await file.read()
    try:
        return StreamingResponse(detector.stream_video(contents), 
                                 media_type="multipart/x-mixed-replace; boundary=frame")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
