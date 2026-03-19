const API_BASE = import.meta.env.VITE_CERES_API_URL || 'http://localhost:8000';

export interface Source {
  filename: string;
  content: string;
  uri?: string;
}

export interface ChatResponse {
  response: string;
  sources: Source[];
  agent: string;
}

export interface QueryResponse {
  content: string;
  sources: Source[];
}

class CeresAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<{ name: string; tagline: string; status: string } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async chat(message: string): Promise<ChatResponse> {
    const res = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Chat request failed');
    }
    return res.json();
  }

  async queryKnowledgeBase(query: string): Promise<QueryResponse> {
    const res = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Query failed');
    }
    return res.json();
  }
}

export const ceresApi = new CeresAPI();
export default ceresApi;
