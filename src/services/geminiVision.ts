const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface ActionStep {
  id: number;
  action: string;
  category: 'nutrition' | 'watering' | 'lighting' | 'pruning' | 'pest-control' | 'temperature' | 'harvesting' | 'other';
  priority: 'critical' | 'high' | 'medium' | 'low';
  targetPlant: string;
}

export interface PlantAnalysis {
  plants: { name: string; confidence: string }[];
  healthStatus: string;
  issues: string[];
  actionPlan: ActionStep[];
  summary: string;
}

/**
 * Capture a frame from a <video> element as a base-64 JPEG.
 */
export function captureFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, 0, 0);
  // Return the raw base-64 string (no data-url prefix)
  return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
}

const SYSTEM_PROMPT = `You are an expert botanist and agricultural scientist working in a Mars greenhouse.
Analyze images from a greenhouse camera feed and provide:

1. **Plant Identification**: List every plant species you can identify with confidence level (high/medium/low).
2. **Health Status**: Overall health assessment (Excellent / Good / Fair / Poor / Critical).
3. **Issues Detected**: Any problems you observe — diseases, nutrient deficiencies, pests, wilting, discoloration, over/under-watering, light stress, etc.
4. **Action Plan**: A prioritized list of specific actionable steps the crew should execute. Each step must have a category. Always include at least one nutrition-related step AND at least one lighting-related step (e.g. "Increase grow light intensity to 600 PPFD for zone A" or "Extend photoperiod by 2 hours to 18h/day"). Be specific (e.g. "Apply 2ml/L CalMag solution to P3" not "add nutrients").
5. **Summary**: A concise 1-2 sentence overall summary.

Respond ONLY with valid JSON matching this schema (no markdown fences):
{
  "plants": [{"name": "...", "confidence": "high|medium|low"}],
  "healthStatus": "Excellent|Good|Fair|Poor|Critical",
  "issues": ["..."],
  "actionPlan": [
    {
      "id": 1,
      "action": "specific step description",
      "category": "nutrition|watering|lighting|pruning|pest-control|temperature|harvesting|other",
      "priority": "critical|high|medium|low",
      "targetPlant": "plant name or 'all'"
    }
  ],
  "summary": "..."
}`;

/**
 * Send a base-64 image to OpenRouter (Gemini) and get structured plant analysis back.
 */
export async function analyzePlantImage(base64Image: string): Promise<PlantAnalysis> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('VITE_OPENROUTER_API_KEY is not set');

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
            { type: 'text', text: 'Analyze these plants.' },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text: string = data.choices?.[0]?.message?.content ?? '';

  // Strip potential markdown code fences
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned) as PlantAnalysis;
}
