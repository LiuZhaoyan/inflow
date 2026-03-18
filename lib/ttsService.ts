import fs from 'fs/promises';
import path from 'path';

// ============ 缓存机制 ============
type CacheEntry = {
  buffer: Buffer;
  timestamp: number;
};

const audioCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟 TTL

/**
 * 清理过期缓存
 */
function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of audioCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      audioCache.delete(key);
    }
  }
}

/**
 * 生成缓存 key
 */
function getCacheKey(text: string, voiceId: string): string {
  return `${voiceId}:${text}`;
}

// ============ 工具函数 ============

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

export interface TTSOptions {
  voiceId?: string;
  format?: 'mp3' | 'pcm' | 'flac' | 'wav';
  speed?: number;
  emotion?: string;
}

interface TtsJsonResponse {
  audio_url?: string;
  url?: string;
  audio?: string;
  audioBase64?: string;
  data?: {
    audio_url?: string;
    audioBase64?: string;
  };
}

interface TtsVoiceSetting {
  voice_id: string;
  speed: number;
  emotion?: string;
}

interface TtsAudioSetting {
  format: 'mp3' | 'pcm' | 'flac' | 'wav';
}

interface TtsRequestBody {
  text: string;
  stream: boolean;
  output_format: 'hex' | 'url';
  voice_setting: TtsVoiceSetting;
  audio_setting?: TtsAudioSetting;
}

/**
 * 低级函数：向 Minimax API 请求 hex 格式音频（用于实时播放、临时缓存）
 * 使用 stream=true 或 output_format=hex
 */
async function fetchAudioHex(text: string, options: TTSOptions = {}): Promise<{ buffer: Buffer; ext: string }> {
  const { voiceId = 'audiobook_female_1', format = 'mp3', speed = 1.0, emotion } = options;

  const api_key = process.env.API_KEY;
  const ttsApiUrl = process.env.TTS_API_URL;
  if (!api_key) {
    throw new Error('Missing API key for TTS service');
  }
  if (!ttsApiUrl) {
    throw new Error('Missing TTS_API_URL for TTS service');
  }

  const body: TtsRequestBody = {
    text: text,
    stream: false, // 非流式更稳定，hex 可立即获得完整音频
    output_format: 'hex',
    voice_setting: {
      voice_id: voiceId,
      speed: speed,
    },
    audio_setting: {
      format: format,
    },
  };

  if (emotion) {
    body.voice_setting.emotion = emotion;
  }

  const ttsRes = await fetch(ttsApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api_key}`,
    },
    body: JSON.stringify(body),
  });

  if (!ttsRes.ok) {
    const errTxt = await ttsRes.text().catch(() => '');
    throw new Error(`TTS hex fetch failed: ${ttsRes.status} ${errTxt}`);
  }

  const ct = ttsRes.headers.get('content-type') || '';
  let buffer: Buffer | null = null;
  let ext = audioExtFromContentType(ct);

  // 情况1：API 返回二进制音频（少见）
  if (ct.includes('audio')) {
    buffer = Buffer.from(await ttsRes.arrayBuffer());
  } else {
    const data = (await ttsRes.json().catch(() => ({}))) as TtsJsonResponse;
    const audioHex: string | undefined = data?.audio;

    if (audioHex && typeof audioHex === 'string') {
      const cleanHex = audioHex.startsWith('0x') ? audioHex.slice(2) : audioHex;
      buffer = Buffer.from(cleanHex, 'hex');
      ext = `.${format}`;
    } else {
      throw new Error('TTS hex response did not include hex audio content');
    }
  }

  if (!buffer) throw new Error('No audio buffer returned from TTS hex request');

  return { buffer, ext };
}

/**
 * 低级函数：向 Minimax API 请求 URL 格式音频（用于永久保存）
 * 使用 output_format=url，返回可直接下载的 URL
 */
async function fetchAudioUrlFromApi(text: string, options: TTSOptions = {}): Promise<string> {
  const { voiceId = 'audiobook_female_1', speed = 1.0, emotion } = options;

  const api_key = process.env.API_KEY;
  const ttsApiUrl = process.env.TTS_API_URL;
  if (!api_key) {
    throw new Error('Missing API key for TTS service');
  }
  if (!ttsApiUrl) {
    throw new Error('Missing TTS_API_URL for TTS service');
  }

  const body: TtsRequestBody = {
    text: text,
    stream: false,
    output_format: 'url',
    voice_setting: {
      voice_id: voiceId,
      speed: speed,
    },
  };

  if (emotion) {
    body.voice_setting.emotion = emotion;
  }

  const ttsRes = await fetch(ttsApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api_key}`,
    },
    body: JSON.stringify(body),
  });

  if (!ttsRes.ok) {
    const errTxt = await ttsRes.text().catch(() => '');
    throw new Error(`TTS URL fetch failed: ${ttsRes.status} ${errTxt}`);
  }

  const ct = ttsRes.headers.get('content-type') || '';
  if (ct.includes('audio')) {
    throw new Error('TTS api returned audio content instead of URL');
  }

  const data = (await ttsRes.json().catch(() => ({}))) as TtsJsonResponse;
  const audioUrl: string | undefined = data?.audio || data?.audio_url || data?.url;

  if (!audioUrl) {
    throw new Error('TTS URL response did not include audio URL');
  }

  return audioUrl;
}

export async function saveAudioFile(buffer: Buffer, ext: string, userId: string): Promise<string> {
  const timestamp = Date.now();
  const filename = `${timestamp}${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', userId, 'audio');

  await fs.mkdir(uploadDir, { recursive: true });

  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);

  return `/uploads/${userId}/audio/${filename}`;
}

/**
 * 高级函数：实时播放 + 临时缓存
 * 
 * @param text 待合成文本
 * @param options TTS 选项（voiceId、speed、format、emotion）
 * @returns 音频 Buffer，仅在内存保留，不落盘
 */
export async function requestTtsRealtime(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  const voiceId = options.voiceId || 'audiobook_female_1';
  const cacheKey = getCacheKey(text, voiceId);

  // 检查缓存
  cleanupExpiredCache();
  const cached = audioCache.get(cacheKey);
  if (cached) {
    return cached.buffer;
  }

  // 从 API 获取
  const { buffer } = await fetchAudioHex(text, options);

  // 写入缓存
  audioCache.set(cacheKey, {
    buffer,
    timestamp: Date.now(),
  });

  return buffer;
}

/**
 * 高级函数：临时 URL（不落盘）
 *
 * @param text 待合成文本
 * @param options TTS 选项（voiceId、speed、format、emotion）
 * @returns 第三方临时音频 URL
 */
export async function requestTtsTemporaryUrl(
  text: string,
  options: TTSOptions = {}
): Promise<string> {
  return fetchAudioUrlFromApi(text, options);
}

/**
 * 高级函数：永久保存 + 下载
 * 
 * @param text 待合成文本
 * @param options TTS 选项（voiceId、speed、format、emotion）
 * @param userId 用户 ID，用于组织文件存储
 * @returns 文件 URL（你自己的域名/路径）
 */
export async function requestTtsPersistent(
  text: string,
  options: TTSOptions = {},
  userId: string = 'default'
): Promise<string> {
  const { format = 'mp3' } = options;

  // 1. 获取临时 URL
  const tempUrl = await fetchAudioUrlFromApi(text, options);

  // 2. 下载音频
  const downloadRes = await fetch(tempUrl);
  if (!downloadRes.ok) {
    const tx = await downloadRes.text().catch(() => '');
    throw new Error(`Failed to download audio from TTS URL: ${downloadRes.status} ${tx}`);
  }

  const audioBuffer = Buffer.from(await downloadRes.arrayBuffer());
  const contentType = downloadRes.headers.get('content-type') || '';
  const ext = audioExtFromContentType(contentType) || `.${format}`;

  // 3. 保存到本地
  const localUrl = await saveAudioFile(audioBuffer, ext, userId);

  return localUrl;
}
