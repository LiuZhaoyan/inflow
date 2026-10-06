export type VideoMask = { enabled: boolean; x: number; y: number; width: number; height: number };
export type MaskHandle = 'move' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
export type PictureBounds = { x: number; y: number; width: number; height: number };

export const initialVideoMask: VideoMask = { enabled: true, x: 0.08, y: 0.76, width: 0.84, height: 0.18 };

export function validateVideoMask(value: unknown): VideoMask | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('视频字幕遮罩无效。');
  const mask = value as VideoMask;
  const { enabled, x, y, width, height } = mask;
  if (typeof enabled !== 'boolean' || [x, y, width, height].some(item => typeof item !== 'number' || !Number.isFinite(item)) ||
    x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 + 1e-9 || y + height > 1 + 1e-9) throw new Error('视频字幕遮罩无效。');
  return { enabled, x, y, width, height };
}

export function containedVideoBounds(width: number, height: number, videoWidth: number, videoHeight: number): PictureBounds | null {
  if (width <= 0 || height <= 0 || videoWidth <= 0 || videoHeight <= 0) return null;
  const scale = Math.min(width / videoWidth, height / videoHeight);
  const pictureWidth = videoWidth * scale, pictureHeight = videoHeight * scale;
  return { x: (width - pictureWidth) / 2, y: (height - pictureHeight) / 2, width: pictureWidth, height: pictureHeight };
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function adjustVideoMask(mask: VideoMask, handle: MaskHandle, dx: number, dy: number): VideoMask {
  if (handle === 'move') return { ...mask, x: clamp(mask.x + dx, 0, 1 - mask.width), y: clamp(mask.y + dy, 0, 1 - mask.height) };
  let left = mask.x, top = mask.y, right = left + mask.width, bottom = top + mask.height;
  const minWidth = Math.min(0.02, mask.width), minHeight = Math.min(0.02, mask.height);
  if (handle.includes('w')) left = clamp(left + dx, 0, right - minWidth);
  if (handle.includes('e')) right = clamp(right + dx, left + minWidth, 1);
  if (handle.includes('n')) top = clamp(top + dy, 0, bottom - minHeight);
  if (handle.includes('s')) bottom = clamp(bottom + dy, top + minHeight, 1);
  return { ...mask, x: left, y: top, width: right - left, height: bottom - top };
}
