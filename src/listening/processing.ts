export type Segment = { start: number; end: number; text: string; groups: string[] };

export function validateSegments(value: unknown): Segment[] {
  if (!Array.isArray(value) || !value.length || value.length > 2000) throw new Error('没有识别到可用句子，请换一段有清晰语音的媒体重试。');
  let previousEnd = 0;
  return value.map((item: unknown) => {
    const s = item as Segment | null;
    if (!s || !Number.isFinite(s.start) || !Number.isFinite(s.end) || s.start < previousEnd || s.end <= s.start ||
      typeof s.text !== 'string' || !s.text.trim() || s.text.length > 10000 || !Array.isArray(s.groups) || !s.groups.length ||
      s.groups.some(g => typeof g !== 'string' || !g.trim()) ||
      s.groups.join('').replace(/\s/gu, '') !== s.text.replace(/\s/gu, '')) {
      throw new Error('处理结果的时间范围或意群不完整，请重新处理。');
    }
    previousEnd = s.end;
    return { start: s.start, end: s.end, text: s.text, groups: s.groups };
  });
}
