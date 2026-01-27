import type { Context } from '@netlify/functions';
import { jsonResponse, errorResponse } from './utils/db';

const FAL_API_URL = 'https://fal.run/fal-ai/flux/schnell';

interface GenerateImageRequest {
  prompt: string;
  apiKey: string;
}

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body = await req.json();
    const { prompt, apiKey } = body as GenerateImageRequest;

    if (!apiKey) {
      return errorResponse('FAL.ai API key is required', 400);
    }

    if (!prompt || prompt.trim().length === 0) {
      return errorResponse('Prompt is required', 400);
    }

    console.log('Generating image with prompt:', prompt.substring(0, 100));

    const response = await fetch(FAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        image_size: 'square', // square for header display
        num_inference_steps: 4, // FLUX Schnell is optimized for 4 steps
        num_images: 1,
        enable_safety_checker: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FAL.ai error:', response.status, errorText);
      let errorMessage = 'Image generation failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.detail || errorJson.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      return errorResponse(`FAL.ai: ${errorMessage}`, response.status);
    }

    const data = await response.json();

    // FAL.ai returns images in the 'images' array
    const imageUrl = data.images?.[0]?.url;

    if (!imageUrl) {
      console.error('No image URL in response:', data);
      return errorResponse('No image generated', 500);
    }

    console.log('Image generated successfully');

    return jsonResponse({
      imageUrl,
      prompt,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Image generation error:', errorMessage);
    return errorResponse(`Image generation error: ${errorMessage}`, 500);
  }
}
