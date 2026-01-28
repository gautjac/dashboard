import type { Context } from '@netlify/functions';
import { jsonResponse, errorResponse } from './utils/db';

// Available FAL.ai models
const FAL_MODELS: Record<string, { url: string; steps: number }> = {
  'flux-schnell': { url: 'https://fal.run/fal-ai/flux/schnell', steps: 4 },
  'flux-dev': { url: 'https://fal.run/fal-ai/flux/dev', steps: 28 },
  'flux-pro-1.1-ultra': { url: 'https://fal.run/fal-ai/flux-pro/v1.1-ultra', steps: 25 },
  'flux-2-pro': { url: 'https://fal.run/fal-ai/flux-2-pro', steps: 25 },
  'nano-banana-pro': { url: 'https://fal.run/fal-ai/nano-banana-pro', steps: 30 },
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
    const { prompt, apiKey: rawApiKey, model = 'flux-schnell' } = body as GenerateImageRequest;

    // Trim the API key to remove any accidental whitespace
    const apiKey = rawApiKey?.trim();

    if (!apiKey) {
      return errorResponse('FAL.ai API key is required', 400);
    }

    if (!prompt || prompt.trim().length === 0) {
      return errorResponse('Prompt is required', 400);
    }

    // Get model config, default to flux-schnell
    const modelConfig = FAL_MODELS[model] || FAL_MODELS['flux-schnell'];

    console.log('Generating image with model:', model);
    console.log('Using endpoint:', modelConfig.url);
    console.log('API key length:', apiKey.length, 'first 4 chars:', apiKey.substring(0, 4));

    const requestBody = {
      prompt: prompt.trim(),
      image_size: 'landscape_16_9',
      num_inference_steps: modelConfig.steps,
      num_images: 1,
      enable_safety_checker: true,
    };

    console.log('Request body:', JSON.stringify(requestBody));

    const response = await fetch(modelConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
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
