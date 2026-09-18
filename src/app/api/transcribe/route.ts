import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { foreignOrigin, readBody, runProcessor } from '@/listening/media-server';
import { validateSegments } from '@/listening/processing';

export const runtime = 'nodejs';
export const maxDuration = 600;

export async function POST(request: Request) {
  if (foreignOrigin(request)) return Response.json({ error: '请从当前 Inflow 页面发起处理。' }, { status: 403 });
  let directory: string | undefined;
  try {
    let file: FormDataEntryValue | null;
    try {
      const body = await readBody(request, 50 * 1024 * 1024 + 64 * 1024);
      file = (await new Response(new Uint8Array(body), { headers: { 'content-type': request.headers.get('content-type') ?? '' } }).formData()).get('file');
      if (!(file instanceof File) || !file.size || file.size > 50 * 1024 * 1024 ||
        (!/^(audio|video)\//.test(file.type) && !/\.(mp3|mp4|m4a|wav|ogg|webm|mov|flac|aac)$/i.test(file.name))) {
        throw new Error('请选择 50 MB 以内的音频或视频文件。');
      }
    } catch (error) { return Response.json({ error: error instanceof Error && /过大|请选择/.test(error.message) ? error.message : '无法读取媒体，请重新选择音频或视频文件。' }, { status: 400 }); }
    directory = await mkdtemp(path.join(tmpdir(), 'inflow-'));
    const input = path.join(directory, 'media');
    await writeFile(input, Buffer.from(await (file as File).arrayBuffer()));
    const result = await runProcessor('transcribe', request.signal, input) as { segments?: unknown };
    return Response.json({ segments: validateSegments(result?.segments) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '媒体处理失败，请重试。' }, { status: 503 });
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}
