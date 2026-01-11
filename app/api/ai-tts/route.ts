import { NextResponse } from 'next/server';
import { getOpenAIClient } from '@/lib/aiClient';
import path from 'path';
import fs from 'fs/promises';

function audioExtFromContentType(ct?: string | null): string {
  if (!ct) return '.mp3';
  const c = ct.toLowerCase();
  if (c.includes('mpeg')) return '.mp3';
  if (c.includes('mp3')) return '.mp3';
  if (c.includes('wav')) return '.wav';
  if (c.includes('x-wav')) return '.wav';
  if (c.includes('ogg')) return '.ogg';
  if (c.includes('aac')) return '.aac';
  if (c.includes('flac')) return '.flac';
  return '.mp3';
}

export async function POST(request: Request) {
  try {
    const { text, format: reqFormat='mp3', voiceId='audiobook_female_1' } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // const openai = getOpenAIClient();
    // const mp3 = await openai.audio.speech.create({
    //   model: "tts-1",
    //   voice: "alloy",
    //   input: text,
    // });
    // Choose output format (mp3|pcm|flac), default mp3
    const format = typeof reqFormat === 'string' && ['mp3','pcm','flac'].includes(reqFormat.toLowerCase())
      ? (reqFormat.toLowerCase() as 'mp3'|'pcm'|'flac')
      : 'mp3';

    const api_key = process.env.API_KEY;
    if (!api_key) {
      throw new Error('Missing API key for TTS service');
    }
    const ttsRes = await fetch('https://api.ppinfra.com/v3/minimax-speech-02-hd',{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api_key}`
      },
      body: JSON.stringify({ 
        text: text,
        voice_setting: { 
          voice_id: voiceId,
          speed: 0.9,
        },
        // output_format: 'hex',
        // stream: false,
        // audio_setting: { format:format || 'mp3' }
      })
    });

    if (!ttsRes.ok) {
      const errTxt = await ttsRes.text().catch(() => '');
      throw new Error(`TTS request failed: ${ttsRes.status} ${errTxt}`);
    }

    const ct = ttsRes.headers.get('content-type') || '';
    let buffer: Buffer | null = null;
    let ext = audioExtFromContentType(ct);

    if (ct.includes('audio')) {
      buffer = Buffer.from(await ttsRes.arrayBuffer());
    } else {
      // Some providers return JSON with base64 or a URL
      const data: any = await ttsRes.json().catch(() => ({}));
      let audioUrl: string | undefined = data?.audio_url || data?.url || data?.data?.audio_url;
      let audioHex: string | undefined = data?.audio; // per API: hex-encoded audio string
      let audioB64: string | undefined = data?.audioBase64 || data?.data?.audioBase64;

      if (audioUrl) {
        const binRes = await fetch(audioUrl);
        if (!binRes.ok) {
          const tx = await binRes.text().catch(() => '');
          throw new Error(`Failed to fetch TTS audio URL: ${binRes.status} ${tx}`);
        }
        const binCt = binRes.headers.get('content-type') || '';
        ext = audioExtFromContentType(binCt) || ext;
        buffer = Buffer.from(await binRes.arrayBuffer());
      } else if (audioHex && typeof audioHex === 'string') {
        // some APIs may prefix with 0x
        const cleanHex = audioHex.startsWith('0x') ? audioHex.slice(2) : audioHex;
        buffer = Buffer.from(cleanHex, 'hex');
        // use requested format for extension if known
        ext = `.${format}`;
      } else if (audioB64) {
        // Remove data URL prefix if present
        const commaIdx = audioB64.indexOf(',');
        if (audioB64.startsWith('data:') && commaIdx !== -1) {
          const header = audioB64.slice(0, commaIdx);
          if (header.includes('audio/')) {
            const mt = header.split(':')[1]?.split(';')[0];
            ext = audioExtFromContentType(mt) || ext;
          }
          audioB64 = audioB64.slice(commaIdx + 1);
        }
        buffer = Buffer.from(audioB64, 'base64');
        if (!ext || ext === '.mp3') {
          // if not overridden, fall back to requested format
          ext = `.${format}`;
        }
      } else {
        throw new Error('TTS response did not include audio content');
      }
    }

    if (!buffer) throw new Error('No audio buffer to save');

    const timestamp = Date.now();
    const filename = `${timestamp}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'audio');
    
    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/audio/${filename}`;

    return NextResponse.json({ url: publicUrl });

  } catch (error: any) {
    console.error('TTS Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
