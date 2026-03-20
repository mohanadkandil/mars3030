const FAL_API_URL = 'https://fal.run/fal-ai/nano-banana-2/edit';

/**
 * Send a base-64 image to fal.ai's Nano Banana 2 edit model
 * to generate an annotated version with plant labels & health overlays.
 */
export async function annotateImage(
  base64Image: string,
  analysisContext: string,
): Promise<string> {
  const apiKey = import.meta.env.VITE_FAL_API_KEY;
  if (!apiKey) throw new Error('VITE_FAL_API_KEY is not set');

  const prompt = `Keep the original photo exactly as-is. Overlay plant detection annotations on top of the image like a computer vision system would:

1. Identify every individual plant slot/pot/position in the image and assign each one a unique ID (P1, P2, P3, etc.)
2. Draw a distinct bounding box around EACH individual plant separately — never group plants together
3. Next to each bounding box, add a small label showing:
   - The plant ID (P1, P2, P3…)
   - Species name if identifiable
   - Health status icon: ✓ healthy, ⚠ warning, ✗ problem
   - Brief issue if detected (e.g. "yellowing leaves", "wilting", "nutrient deficiency")

Color code each box: bright green = healthy, yellow = minor issue, red = serious problem.

Analysis context: ${analysisContext}

Style: clean CV/AI detection overlay with thin boxes, small readable white text on dark label backgrounds. Do not alter the underlying photograph.`;

  const res = await fetch(FAL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      image_urls: [`data:image/jpeg;base64,${base64Image}`],
      num_images: 1,
      output_format: 'jpeg',
      resolution: '1K',
      sync_mode: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`fal.ai API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const url: string = data.images?.[0]?.url ?? '';

  if (!url) throw new Error('No annotated image returned from fal.ai');
  return url;
}
