import { foreignOrigin, readBody, runProcessor } from '@/listening/media-server';

export const runtime = 'nodejs';
export const maxDuration = 600;

export async function POST(request: Request) {
  if (foreignOrigin(request)) return Response.json({ error: '请从当前 Inflow 页面发起翻译。' }, { status: 403 });
  let text: string;
  try {
    const body = JSON.parse((await readBody(request, 32 * 1024)).toString('utf8'));
    if (typeof body?.text !== 'string' || !body.text.trim() || body.text.length > 10000) throw new Error('请选择有效句子后再翻译。');
    text = body.text;
  } catch { return Response.json({ error: '翻译内容为空、过长或格式不正确。' }, { status: 400 }); }
  try {
    const result = await runProcessor('translate', request.signal, undefined, text) as { translation?: unknown };
    if (typeof result?.translation !== 'string' || !result.translation.trim()) throw new Error('未生成译文，请重试。');
    return Response.json({ translation: result.translation });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '翻译失败，请重试。' }, { status: 503 });
  }
}
