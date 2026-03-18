// MCP (Model Context Protocol) client for the Mars Crop Knowledge Base
// Endpoint: AWS AgentCore gateway with streamable HTTP transport

const MCP_ENDPOINT = 'https://kb-start-hack-gateway-buyjtibfpg.gateway.bedrock-agentcore.us-east-2.amazonaws.com/mcp';

interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPToolInfo {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

let requestId = 0;
const nextId = () => ++requestId;

// Session ID for streamable HTTP MCP
let sessionId: string | null = null;

async function mcpRequest(method: string, params?: Record<string, unknown>): Promise<MCPResponse> {
  const body: MCPRequest = {
    jsonrpc: '2.0',
    id: nextId(),
    method,
    ...(params ? { params } : {}),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  };
  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  const res = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  // Capture session ID from response
  const sid = res.headers.get('Mcp-Session-Id');
  if (sid) sessionId = sid;

  const contentType = res.headers.get('Content-Type') || '';

  // Handle SSE (text/event-stream) responses
  if (contentType.includes('text/event-stream')) {
    const text = await res.text();
    // Parse SSE: find last "data:" line with JSON
    const lines = text.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('data:')) {
        const jsonStr = line.slice(5).trim();
        if (jsonStr) {
          return JSON.parse(jsonStr) as MCPResponse;
        }
      }
    }
    throw new Error('No data in SSE response');
  }

  return (await res.json()) as MCPResponse;
}

// Initialize MCP session
export async function initSession(): Promise<boolean> {
  try {
    const res = await mcpRequest('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'AresFarm', version: '1.0.0' },
    });
    if (res.error) {
      console.error('MCP init error:', res.error);
      return false;
    }
    // Send initialized notification
    await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });
    return true;
  } catch (e) {
    console.error('MCP init failed:', e);
    return false;
  }
}

// List available tools from the knowledge base
export async function listTools(): Promise<MCPToolInfo[]> {
  try {
    const res = await mcpRequest('tools/list');
    if (res.error) {
      console.error('MCP tools/list error:', res.error);
      return [];
    }
    const result = res.result as { tools?: MCPToolInfo[] };
    return result?.tools || [];
  } catch (e) {
    console.error('MCP tools/list failed:', e);
    return [];
  }
}

// Call a tool (query the knowledge base)
export async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    const res = await mcpRequest('tools/call', { name, arguments: args });
    if (res.error) {
      return `Error: ${res.error.message}`;
    }
    const result = res.result as { content?: Array<{ type: string; text?: string }> };
    if (result?.content) {
      return result.content
        .filter(c => c.type === 'text' && c.text)
        .map(c => c.text)
        .join('\n\n');
    }
    return JSON.stringify(res.result, null, 2);
  } catch (e) {
    return `Connection error: ${(e as Error).message}`;
  }
}

// High-level: query the knowledge base with a natural language question
// Tries the most likely tool name patterns for KB queries
export async function queryKnowledgeBase(question: string): Promise<string> {
  // First, discover available tools if we haven't yet
  const tools = await listTools();

  if (tools.length === 0) {
    return 'Could not connect to the Mars Crop Knowledge Base. Make sure the MCP endpoint is accessible and CORS is configured (you may need a proxy for browser access).';
  }

  // Find the best tool - look for common KB query tool patterns
  const queryTool = tools.find(t =>
    t.name.toLowerCase().includes('query') ||
    t.name.toLowerCase().includes('search') ||
    t.name.toLowerCase().includes('retrieve') ||
    t.name.toLowerCase().includes('ask') ||
    t.name.toLowerCase().includes('knowledge')
  ) || tools[0]; // fallback to first tool

  // Try common parameter names for the query
  const paramNames = ['query', 'question', 'input', 'text', 'prompt'];
  const schema = queryTool.inputSchema as { properties?: Record<string, unknown> } | undefined;
  const schemaProps = schema?.properties || {};
  const paramName = paramNames.find(p => p in schemaProps) || paramNames[0];

  return callTool(queryTool.name, { [paramName]: question });
}

// Get a description of available tools (for the UI)
export async function getToolDescriptions(): Promise<string[]> {
  const tools = await listTools();
  return tools.map(t => `**${t.name}**: ${t.description || 'No description'}`);
}
