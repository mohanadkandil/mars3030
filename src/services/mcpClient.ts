// MCP client — routes all requests through the Python backend at localhost:8000
// The backend handles the raw MCP protocol to the AWS AgentCore gateway

const BACKEND_URL = 'http://localhost:8000';

// Initialize: check that the backend is reachable
export async function initSession(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'healthy';
  } catch (e) {
    console.error('Backend connection failed:', e);
    return false;
  }
}

// Query the knowledge base via backend /query endpoint
export async function queryKnowledgeBase(question: string): Promise<string> {
  try {
    const res = await fetch(`${BACKEND_URL}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: question }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      return `Error: ${err.detail || res.statusText}`;
    }
    const data = await res.json();
    return data.result || JSON.stringify(data, null, 2);
  } catch (e) {
    return `Connection error: ${(e as Error).message}`;
  }
}

// Get a description of available tools (for the UI)
export async function getToolDescriptions(): Promise<string[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/tools`);
    if (!res.ok) return [];
    const data = await res.json();
    // Backend returns raw MCP response: { result: { tools: [...] } }
    const tools: Array<{ name?: string; description?: string }> =
      data?.result?.tools || data?.tools || (Array.isArray(data) ? data : []);
    return tools.map(t =>
      `**${t.name || 'unknown'}**: ${t.description || 'No description'}`
    );
  } catch (e) {
    console.error('Failed to fetch tools:', e);
    return [];
  }
}
