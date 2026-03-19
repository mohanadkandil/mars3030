"""
Mars Greenhouse AI Agent
Uses Strands SDK to create an intelligent agent for Mars agriculture planning
"""
import os
import json
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

try:
    from strands import Agent, tool
    from strands.models import BedrockModel
    STRANDS_AVAILABLE = True
except ImportError:
    STRANDS_AVAILABLE = False
    print("Strands SDK not installed. Using fallback mode.")

from mcp_client import MCPClient
import asyncio

_mcp_client: Optional[MCPClient] = None


def get_mcp_client() -> MCPClient:
    global _mcp_client
    if _mcp_client is None:
        _mcp_client = MCPClient()
    return _mcp_client


if STRANDS_AVAILABLE:
    @tool
    def query_crop_knowledge(query: str) -> str:
        """
        Query the Mars crop knowledge base for information about growing crops on Mars.
        Use this tool to get information about:
        - Crop growing conditions (temperature, humidity, light)
        - Water and nutrient requirements
        - Mars environmental data
        - Greenhouse management best practices
        - Nutritional information for astronaut diets

        Args:
            query: The question or topic to search for in the knowledge base

        Returns:
            Relevant information from the Mars crop knowledge base
        """
        client = get_mcp_client()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(client.initialize())
            result = loop.run_until_complete(client.query_knowledge_base(query))
            return result
        except Exception as e:
            return f"Error querying knowledge base: {str(e)}"
        finally:
            loop.close()

    @tool
    def analyze_crop_viability(
        crop_name: str,
        temperature: float,
        water_availability: float,
        light_hours: float
    ) -> str:
        """
        Analyze whether a specific crop can survive in given conditions.

        Args:
            crop_name: Name of the crop (e.g., "tomato", "lettuce", "soybean")
            temperature: Average temperature in Celsius
            water_availability: Water availability as percentage (0-100)
            light_hours: Hours of light per day

        Returns:
            Analysis of crop viability in the given conditions
        """
        # Query the knowledge base for crop requirements
        client = get_mcp_client()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(client.initialize())
            crop_info = loop.run_until_complete(
                client.query_knowledge_base(f"What are the growing requirements for {crop_name}?")
            )

            analysis = f"""
## Crop Viability Analysis: {crop_name.title()}

### Input Conditions:
- Temperature: {temperature}°C
- Water Availability: {water_availability}%
- Light Hours: {light_hours}h/day

### Knowledge Base Information:
{crop_info}

### Preliminary Assessment:
Based on the conditions provided, the AI agent should analyze if {crop_name} can thrive.
"""
            return analysis
        except Exception as e:
            return f"Error: {str(e)}"
        finally:
            loop.close()

    @tool
    def get_mars_conditions() -> str:
        """
        Get current Mars environmental conditions and constraints for greenhouse farming.

        Returns:
            Mars environmental data relevant to greenhouse agriculture
        """
        client = get_mcp_client()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(client.initialize())
            result = loop.run_until_complete(
                client.query_knowledge_base("Mars environmental conditions for greenhouse farming")
            )
            return result
        except Exception as e:
            return f"Error: {str(e)}"
        finally:
            loop.close()

    @tool
    def calculate_nutrition_plan(crew_size: int, mission_days: int) -> str:
        """
        Calculate nutritional requirements for a Mars mission crew.

        Args:
            crew_size: Number of astronauts in the crew
            mission_days: Duration of the mission in days

        Returns:
            Nutritional requirements and recommended crop allocation
        """
        client = get_mcp_client()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(client.initialize())
            nutrition_info = loop.run_until_complete(
                client.query_knowledge_base("Daily nutritional requirements for astronauts")
            )
            return f"## Nutrition Plan\n\n**Crew:** {crew_size} | **Duration:** {mission_days} days\n\n{nutrition_info}"
        except Exception as e:
            return f"Error: {str(e)}"
        finally:
            loop.close()


class MarsGreenhouseAgent:
    """
    AI Agent for Mars greenhouse management
    Uses Strands SDK with Bedrock models and MCP tools
    """

    def __init__(self):
        self.agent = None
        self.mcp_client = get_mcp_client()

        if STRANDS_AVAILABLE:
            try:
                model = BedrockModel(
                    model_id="anthropic.claude-3-sonnet-20240229-v1:0",
                    region_name=os.getenv("AWS_REGION", "us-east-1")
                )

                self.agent = Agent(
                    model=model,
                    tools=[
                        query_crop_knowledge,
                        analyze_crop_viability,
                        get_mars_conditions,
                        calculate_nutrition_plan
                    ],
                    system_prompt="""You are CERES, an AI for Mars greenhouse management. Be concise and helpful. Use tools to get data from the knowledge base."""
                )
            except Exception as e:
                print(f"Could not initialize Strands agent: {e}")
                self.agent = None

    async def chat(self, message: str) -> dict:
        if self.agent:
            try:
                response = self.agent(message)
                return {"content": str(response), "sources": []}
            except Exception as e:
                print(f"Agent error: {e}")
                return await self._fallback_response(message)
        else:
            return await self._fallback_response(message)

    async def _fallback_response(self, message: str) -> dict:
        await self.mcp_client.initialize()
        result = await self.mcp_client.query_knowledge_base_structured(message)
        return result.to_dict()

    async def get_available_tools(self) -> list:
        await self.mcp_client.initialize()
        tools = await self.mcp_client.list_tools()
        return tools


_agent_instance: Optional[MarsGreenhouseAgent] = None


def get_agent() -> MarsGreenhouseAgent:
    global _agent_instance
    if _agent_instance is None:
        _agent_instance = MarsGreenhouseAgent()
    return _agent_instance
