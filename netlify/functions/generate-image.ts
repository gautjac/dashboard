import type { Context } from '@netlify/functions';
import { jsonResponse, errorResponse } from './utils/db';

// Available FAL.ai models
const FAL_MODELS: Record<string, { url: string; steps: number }> = {
  'flux-schnell': { url: 'https://fal.run/fal-ai/flux/schnell', steps: 4 },
  'flux-dev': { url: 'https://fal.run/fal-ai/flux/dev', steps: 28 },
  'flux-pro': { url: 'https://fal.run/fal-ai/flux-pro', steps: 25 },
  'flux-pro-1.1': { url: 'https://fal.run/fal-ai/flux-pro/v1.1', steps: 25 },
  'nana-banana-pro': { url: 'https://fal.run/fal-ai/nana-banana/pro', steps: 30 },
};

interface GenerateImageRequest {
  prompt: string;
  apiKey: string;
  model?: string;
}

export default async function handler(req: Request, _context: Context) {
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body = await req.json();
    const { prompt, apiKey, model = 'flux-schnell' } = body as GenerateImageRequest;

    if (!apiKey) {
      return errorResponse('FAL.ai API key is required', 400);
    }

    if (!prompt || prompt.trim().length === 0) {
      return errorResponse('Prompt is required', 400);
    }

    // Get model config, default to flux-schnell
    const modelConfig = FAL_MODELS[model] || FAL_MODELS['flux-schnell'];

    console.log('Generating image with model:', model, 'prompt:', prompt.substring(0, 100));

    const response = await fetch(modelConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: prompt,
        image_size: 'landscape_16_9', // wide panoramic for header banner
        num_inference_steps: modelConfig.steps,
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
