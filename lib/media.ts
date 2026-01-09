import path from 'path';
import fs from 'fs/promises';

function guessExtensionFromContentType(contentType?: string | null): string {
  if (!contentType) return '.png';
  if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg';
  if (contentType.includes('png')) return '.png';
  if (contentType.includes('webp')) return '.webp';
  if (contentType.includes('gif')) return '.gif';
  return '.png';
}

function guessExtensionFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const pathname = u.pathname;
    const idx = pathname.lastIndexOf('.');
    if (idx !== -1) {
      const ext = pathname.substring(idx).toLowerCase();
      if (ext.match(/^\.(png|jpg|jpeg|webp|gif|bmp|svg)$/)) {
        return ext === '.jpeg' ? '.jpg' : ext;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveImageFromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to fetch image: ${res.status} ${text}`);
  }

  const contentType = res.headers.get('content-type');
  const byUrl = guessExtensionFromUrl(url);
  const ext = byUrl || guessExtensionFromContentType(contentType);

  const buffer = Buffer.from(await res.arrayBuffer());

  const timestamp = Date.now();
  const filename = `${timestamp}${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'images');

  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);

  const publicUrl = `/uploads/images/${filename}`;
  return publicUrl;
}
