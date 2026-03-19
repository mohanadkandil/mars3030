"""
FastAPI Server for Mars Greenhouse AI Agent
Exposes chat and knowledge base endpoints
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import asyncio

from mars_agent import get_agent, MarsGreenhouseAgent
from mcp_client import MCPClient

app = FastAPI(
    title="RedHarvester API",
    description="AI Agent API for Mars Greenhouse Management",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    agent: str = "RedHarvester"
    tools_used: List[str] = []


class KBQueryRequest(BaseModel):
    query: str


class KBQueryResponse(BaseModel):
    result: str
    source: str = "Mars Crop Knowledge Base"


class CropAnalysisRequest(BaseModel):
    crop_name: str
    temperature: float
    water_availability: float
    light_hours: float


class CropAnalysisResponse(BaseModel):
    crop_name: str
    viable: bool
    confidence: float
    analysis: str
    recommendations: List[str]


class NutritionPlanRequest(BaseModel):
    crew_size: int
    mission_days: int


class SimulationRequest(BaseModel):
    seed_traits: dict
    environments: List[dict]


# Endpoints
@app.get("/")
async def root():
    return {
        "name": "RedHarvester API",
        "status": "online",
        "description": "Mars Greenhouse AI Agent",
        "endpoints": {
            "/chat": "Chat with the AI agent",
            "/query": "Query the knowledge base directly",
            "/analyze": "Analyze crop viability",
            "/nutrition": "Get nutrition plan",
            "/tools": "List available MCP tools"
        }
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with the RedHarvester AI agent.
    The agent has access to the Mars crop knowledge base and can analyze
    crop viability, nutrition planning, and greenhouse management.
    """
    try:
        agent = get_agent()
        response = await agent.chat(request.message)
        return ChatResponse(
            response=response,
            agent="RedHarvester",
            tools_used=[]  # Could track which tools were used
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/query", response_model=KBQueryResponse)
async def query_knowledge_base(request: KBQueryRequest):
    """
    Query the Mars crop knowledge base directly without agent reasoning.
    Useful for raw data retrieval.
    """
    try:
        client = MCPClient()
        result = await client.query_knowledge_base(request.query)
        return KBQueryResponse(result=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze", response_model=CropAnalysisResponse)
async def analyze_crop(request: CropAnalysisRequest):
    """
    Analyze whether a specific crop can survive in given environmental conditions.
    """
    try:
        # Query knowledge base for crop requirements
        client = MCPClient()
        crop_info = await client.query_knowledge_base(
            f"What are the optimal growing conditions for {request.crop_name}? "
            f"Include temperature range, water needs, and light requirements."
        )

        # Simple viability check (in production, this would be more sophisticated)
        viable = True
        confidence = 0.7
        recommendations = []

        # Basic temperature check
        if request.temperature < 10:
            viable = False
            confidence = 0.3
            recommendations.append(f"Temperature ({request.temperature}°C) is too low for most crops")
        elif request.temperature > 40:
            viable = False
            confidence = 0.3
            recommendations.append(f"Temperature ({request.temperature}°C) is too high")

        # Water check
        if request.water_availability < 30:
            viable = False
            confidence = min(confidence, 0.4)
            recommendations.append(f"Water availability ({request.water_availability}%) is insufficient")

        # Light check
        if request.light_hours < 6:
            recommendations.append(f"Consider supplemental lighting (only {request.light_hours}h natural light)")
            confidence = min(confidence, 0.6)

        if viable:
            recommendations.append(f"{request.crop_name.title()} appears viable in these conditions")
            recommendations.append("Monitor closely during initial growth phase")

        return CropAnalysisResponse(
            crop_name=request.crop_name,
            viable=viable,
            confidence=confidence,
            analysis=crop_info,
            recommendations=recommendations
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/nutrition")
async def get_nutrition_plan(request: NutritionPlanRequest):
    """
    Calculate nutritional requirements and crop allocation for a Mars mission.
    """
    try:
        client = MCPClient()

        # Query for nutritional requirements
        nutrition_info = await client.query_knowledge_base(
            "What are the daily nutritional requirements for astronauts on Mars? "
            "Include calories, protein, carbohydrates, fats, vitamins and minerals."
        )

        # Query for recommended crops
        crops_info = await client.query_knowledge_base(
            "What crops are best suited for a Mars greenhouse to meet astronaut nutritional needs? "
            "Consider protein sources, vegetables, and calorie-dense options."
        )

        total_person_days = request.crew_size * request.mission_days
        estimated_calories_needed = total_person_days * 2500  # ~2500 cal/person/day

        return {
            "mission_parameters": {
                "crew_size": request.crew_size,
                "mission_days": request.mission_days,
                "total_person_days": total_person_days,
                "estimated_total_calories": estimated_calories_needed
            },
            "nutritional_requirements": nutrition_info,
            "recommended_crops": crops_info,
            "recommendations": [
                "Prioritize high-protein crops like soybeans and quinoa",
                "Include fast-growing leafy greens for vitamins",
                "Maintain crop rotation for soil health",
                "Plan 20% buffer for crop failures"
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/tools")
async def list_tools():
    """
    List available tools from the MCP knowledge base server.
    """
    try:
        client = MCPClient()
        tools = await client.list_tools()
        return tools
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "terra-mind-api"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
