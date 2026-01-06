// app/api/ai-depict/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Check if AI-depict feature is enabled
    const isEnabled = process.env.ENABLE_AI_DEPICT === 'true';
    if (!isEnabled) {
      return NextResponse.json(
        { error: 'AI-depict feature is not enabled' },
        { status: 503 }
      );
    }
  
      const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const apiKey = process.env.API_KEY;
    const apiUrl = process.env.AI_DEPICT_API_URL || 'https://api.openai.com/v1/images/generations';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: prompt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image Generation API Error:', response.status, errorText);
      throw new Error(`Image API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.images?.[0];

    if (!imageUrl) {
      console.error('Unexpected API response structure:', data);
      throw new Error('No image URL found in response');
    }

    return NextResponse.json({ imageUrl });

  } catch (error) {
    console.error('AI Depict Route Error:', error);
    return NextResponse.json(
      { error: (error as any).message || 'Failed to generate image' }, 
      { status: 500 }
    );
  }
}