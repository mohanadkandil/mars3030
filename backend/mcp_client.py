"""
MCP Client for Mars Crop Knowledge Base
Connects to the Syngenta knowledge base via MCP protocol
"""

import httpx
import json
from typing import Any, Optional
import asyncio


class MCPClient:
    """Client for interacting with the Mars Crop Knowledge Base MCP server"""

    def __init__(self, url: str = "https://kb-start-hack-gateway-buyjtibfpg.gateway.bedrock-agentcore.us-east-2.amazonaws.com/mcp"):
        self.url = url
        self.client = httpx.AsyncClient(timeout=60.0)
        self.request_id = 0

    def _next_id(self) -> int:
        self.request_id += 1
        return self.request_id

    async def _send_request(self, method: str, params: Optional[dict] = None) -> dict:
        """Send a JSON-RPC request to the MCP server"""
        payload = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": method,
        }
        if params:
            payload["params"] = params

        try:
            response = await self.client.post(
                self.url,
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"MCP Request Error: {e}")
            return {"error": str(e)}

    async def initialize(self) -> dict:
        """Initialize the MCP connection"""
        return await self._send_request("initialize", {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {
                "name": "mars-seed-lab",
                "version": "1.0.0"
            }
        })

    async def list_tools(self) -> dict:
        """List available tools from the MCP server"""
        return await self._send_request("tools/list")

    async def call_tool(self, tool_name: str, arguments: dict) -> dict:
        """Call a tool on the MCP server"""
        return await self._send_request("tools/call", {
            "name": tool_name,
            "arguments": arguments
        })

    async def list_resources(self) -> dict:
        """List available resources"""
        return await self._send_request("resources/list")

    async def read_resource(self, uri: str) -> dict:
        """Read a resource by URI"""
        return await self._send_request("resources/read", {
            "uri": uri
        })

    async def query_knowledge_base(self, query: str, max_results: int = 5) -> str:
        """
        Query the Mars crop knowledge base with a natural language question
        """
        # Call the knowledge base retrieval tool
        result = await self.call_tool("kb-start-hack-target___knowledge_base_retrieve", {
            "query": query,
            "max_results": max_results
        })

        if "result" in result:
            return self._format_result(result["result"])
        elif "error" in result:
            return f"Error querying knowledge base: {result['error']}"
        return json.dumps(result, indent=2)

    def _format_result(self, result: Any) -> str:
        """Format the MCP result for display"""
        if isinstance(result, dict):
            # Handle the nested response format from Syngenta KB
            if "content" in result:
                contents = result["content"]
                if isinstance(contents, list):
                    formatted_chunks = []
                    for c in contents:
                        if isinstance(c, dict) and "text" in c:
                            text = c["text"]
                            # Parse the nested JSON response
                            try:
                                parsed = json.loads(text)
                                if "statusCode" in parsed and "body" in parsed:
                                    body = json.loads(parsed["body"])
                                    if "retrieved_chunks" in body:
                                        for chunk in body["retrieved_chunks"]:
                                            content = chunk.get("content", "")
                                            source = chunk.get("location", {}).get("s3Location", {}).get("uri", "")
                                            if source:
                                                source = source.split("/")[-1]  # Get filename
                                            formatted_chunks.append(f"---\n📄 Source: {source}\n\n{content[:1500]}...")
                                        return "\n\n".join(formatted_chunks[:3])  # Top 3 results
                            except:
                                pass
                            formatted_chunks.append(text)
                        elif isinstance(c, dict):
                            formatted_chunks.append(str(c))
                        else:
                            formatted_chunks.append(str(c))
                    return "\n\n".join(formatted_chunks)
                return str(contents)
            return json.dumps(result, indent=2)
        return str(result)

    async def close(self):
        """Close the client connection"""
        await self.client.aclose()


# Synchronous wrapper for use in Strands tools
class SyncMCPClient:
    """Synchronous wrapper for MCPClient"""

    def __init__(self):
        self.async_client = MCPClient()
        self._loop = None

    def _get_loop(self):
        try:
            return asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            return loop

    def query(self, query: str) -> str:
        """Synchronously query the knowledge base"""
        loop = self._get_loop()
        return loop.run_until_complete(self.async_client.query_knowledge_base(query))

    def list_tools(self) -> dict:
        """List available MCP tools"""
        loop = self._get_loop()
        return loop.run_until_complete(self.async_client.list_tools())

    def call_tool(self, tool_name: str, arguments: dict) -> dict:
        """Call an MCP tool"""
        loop = self._get_loop()
        return loop.run_until_complete(self.async_client.call_tool(tool_name, arguments))
