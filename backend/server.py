"""
FastAPI Server for Mars Greenhouse AI Agent
Exposes chat and knowledge base endpoints
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

from mars_agent import get_agent, MarsGreenhouseAgent
from mcp_client import MCPClient

app = FastAPI(
    title="CERES API",
    description="Crop Environment Resource & Evaluation System — AI Agent for Mars Greenhouse Management",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None


class Source(BaseModel):
    filename: str
    content: str
    uri: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    sources: List[Source] = []
    agent: str = "CERES"


class KBQueryRequest(BaseModel):
    query: str


class CropAnalysisRequest(BaseModel):
    crop_name: str
    temperature: float
    water_availability: float
    light_hours: float


class NutritionPlanRequest(BaseModel):
    crew_size: int
    mission_days: int


@app.get("/")
async def root():
    return {
        "name": "CERES",
        "tagline": "Crop Environment Resource & Evaluation System",
        "status": "online",
        "description": "AI Agent for Mars Greenhouse Management — Powered by Syngenta Knowledge Base",
        "endpoints": {
            "/chat": "Chat with CERES",
            "/query": "Query the knowledge base directly",
            "/analyze": "Analyze crop viability",
            "/nutrition": "Get nutrition plan for crew",
            "/tools": "List available MCP tools",
            "/health": "Health check"
        }
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        agent = get_agent()
        result = await agent.chat(request.message)
        sources = [Source(**s) for s in result.get("sources", [])]
        return ChatResponse(
            response=result.get("content", ""),
            sources=sources,
            agent="CERES"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query")
async def query_knowledge_base(request: KBQueryRequest):
    try:
        client = MCPClient()
        await client.initialize()
        result = await client.query_knowledge_base_structured(request.query)
        await client.close()
        return {
            "content": result.content,
            "sources": result.sources
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze")
async def analyze_crop(request: CropAnalysisRequest):
    try:
        client = MCPClient()
        await client.initialize()
        result = await client.query_knowledge_base_structured(
            f"What are the optimal growing conditions for {request.crop_name}? "
            f"Include temperature range, water needs, and light requirements."
        )
        await client.close()

        viable = True
        confidence = 0.85
        recommendations = []

        if request.temperature < 10:
            viable = False
            confidence = 0.3
            recommendations.append(f"Temperature ({request.temperature}°C) is below minimum")
        elif request.temperature > 40:
            viable = False
            confidence = 0.3
            recommendations.append(f"Temperature ({request.temperature}°C) exceeds maximum")

        if request.water_availability < 30:
            viable = False
            confidence = min(confidence, 0.4)
            recommendations.append(f"Water ({request.water_availability}%) critically low")

        if request.light_hours < 6:
            confidence = min(confidence, 0.5)
            recommendations.append(f"Supplemental lighting needed ({request.light_hours}h)")

        if viable:
            recommendations.insert(0, f"{request.crop_name.title()} is viable")

        return {
            "crop_name": request.crop_name,
            "viable": viable,
            "confidence": round(confidence, 2),
            "analysis": result.content,
            "sources": result.sources,
            "recommendations": recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/nutrition")
async def get_nutrition_plan(request: NutritionPlanRequest):
    try:
        client = MCPClient()
        await client.initialize()

        nutrition = await client.query_knowledge_base_structured(
            "Daily nutritional requirements for astronauts on Mars"
        )
        crops = await client.query_knowledge_base_structured(
            "Best crops for Mars greenhouse to meet astronaut nutrition"
        )
        await client.close()

        total_person_days = request.crew_size * request.mission_days

        return {
            "mission_parameters": {
                "crew_size": request.crew_size,
                "mission_days": request.mission_days,
                "total_person_days": total_person_days,
                "daily_calorie_target": 2800,
                "estimated_total_calories": total_person_days * 2800
            },
            "nutritional_requirements": nutrition.content,
            "recommended_crops": crops.content,
            "sources": nutrition.sources + crops.sources,
            "recommendations": [
                "Prioritize high-protein crops: soybeans, quinoa, lentils",
                "Include fast-growing leafy greens for vitamins",
                "Add calorie-dense root vegetables",
                "Plan 25% production buffer for failures"
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tools")
async def list_tools():
    try:
        client = MCPClient()
        await client.initialize()
        tools = await client.list_tools()
        await client.close()
        return tools
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ceres-api", "agent": "CERES"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
